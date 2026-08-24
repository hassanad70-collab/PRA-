import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { queueTemplateEmail } from "@/lib/email";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// In production (or any Vercel environment), the webhook secret MUST be
// configured. Without it we'd process unverified payloads from anyone,
// which could trigger fraudulent billing state changes.
// In local development the secret is optional so engineers can test without
// setting up a Stripe CLI proxy.
const IS_PRODUCTION_LIKE =
  process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;

/** Maximum age (seconds) of an accepted Stripe webhook — replay protection. */
const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Map Stripe price IDs to internal plan slugs.
 * Configure these env vars in the Stripe dashboard once products are created:
 *   STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PROFESSIONAL, STRIPE_PRICE_ID_ENTERPRISE
 */
function priceIdToPlan(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_ID_STARTER) map[process.env.STRIPE_PRICE_ID_STARTER] = "starter";
  if (process.env.STRIPE_PRICE_ID_PROFESSIONAL) map[process.env.STRIPE_PRICE_ID_PROFESSIONAL] = "professional";
  if (process.env.STRIPE_PRICE_ID_ENTERPRISE) map[process.env.STRIPE_PRICE_ID_ENTERPRISE] = "enterprise";
  return map[priceId] ?? null;
}

/** Derive plan from Stripe subscription items array. Returns null if unmapped. */
function normalizePlan(items: unknown): string | null {
  const arr = items as Array<{ price?: { id?: string } }> | undefined;
  // Use the first line item's price ID for plan resolution.
  return priceIdToPlan(arr?.[0]?.price?.id);
}

function mapSubStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    cancelled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
    paused: "suspended",
  };
  return map[stripeStatus] ?? "active";
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: { id?: string; type?: string; data?: unknown };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Fail-closed: reject all requests in production-like environments when the
  // webhook secret is not configured. Without signature verification, any actor
  // can POST arbitrary billing events and trigger fraudulent plan changes.
  if (IS_PRODUCTION_LIKE && !STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured — rejecting request");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Verify signature + timestamp when secret is configured.
  if (STRIPE_WEBHOOK_SECRET) {
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }
    try {
      const sigValid = await verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      if (!sigValid) {
        return NextResponse.json({ error: "Invalid Stripe signature or stale timestamp" }, { status: 400 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signature verification failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const eventType = event.type ?? "unknown";
  const stripeEventId = event.id ?? null;

  const admin = createAdminClient();

  // Persist to billing_events before processing (idempotent via unique constraint).
  if (stripeEventId) {
    const { error: logError } = await admin.from("billing_events").upsert(
      {
        event_type: eventType,
        stripe_event_id: stripeEventId,
        payload: event as Record<string, unknown>,
        processed: false,
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true }
    );
    if (logError) {
      console.error("billing_events upsert failed:", logError);
    }
  }

  // Process known event types.
  try {
    await handleStripeEvent(admin, eventType, event.data as Record<string, unknown>);

    if (stripeEventId) {
      await admin
        .from("billing_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("stripe_event_id", stripeEventId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing error";
    console.error(`Stripe webhook processing failed for ${eventType}:`, msg);
    if (stripeEventId) {
      await admin
        .from("billing_events")
        .update({ error: msg })
        .eq("stripe_event_id", stripeEventId);
    }
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(
  admin: ReturnType<typeof createAdminClient>,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  const obj = data?.object as Record<string, unknown> | undefined;

  switch (type) {
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const stripeSubId = obj?.id as string | undefined;
      const plan = normalizePlan((obj?.items as Record<string, unknown>)?.data);
      const status = obj?.status as string | undefined;
      if (!stripeSubId) break;

      await admin
        .from("subscriptions")
        .update({
          ...(plan && { plan }),
          ...(status && { status }),
          current_period_start: obj?.current_period_start
            ? new Date((obj.current_period_start as number) * 1000).toISOString()
            : null,
          current_period_end: obj?.current_period_end
            ? new Date((obj.current_period_end as number) * 1000).toISOString()
            : null,
          cancel_at_period_end: Boolean(obj?.cancel_at_period_end),
          trial_ends_at: obj?.trial_end
            ? new Date((obj.trial_end as number) * 1000).toISOString()
            : null,
        })
        .eq("stripe_subscription_id", stripeSubId);

      // Keep denormalized plan/status on companies for fast plan checks.
      const { data: sub } = await admin
        .from("subscriptions")
        .select("company_id")
        .eq("stripe_subscription_id", stripeSubId)
        .maybeSingle();

      if (sub?.company_id && (plan || status)) {
        await admin
          .from("companies")
          .update({
            ...(plan && { subscription_plan: plan }),
            ...(status && { subscription_status: mapSubStatus(status) }),
          })
          .eq("id", sub.company_id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubId = obj?.id as string | undefined;
      if (!stripeSubId) break;

      await admin
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", stripeSubId);

      // Keep companies table in sync.
      const { data: sub } = await admin
        .from("subscriptions")
        .select("company_id")
        .eq("stripe_subscription_id", stripeSubId)
        .maybeSingle();
      if (sub?.company_id) {
        await admin
          .from("companies")
          .update({ subscription_status: "cancelled" })
          .eq("id", sub.company_id);
      }
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const stripeInvId = obj?.id as string | undefined;
      if (!stripeInvId) break;

      const customerId = obj?.customer as string | undefined;
      if (!customerId) break;

      const { data: sub } = await admin
        .from("subscriptions")
        .select("company_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (!sub?.company_id) break;

      // Upsert invoice record.
      await admin.from("invoices").upsert(
        {
          company_id: sub.company_id,
          stripe_invoice_id: stripeInvId,
          amount_due: (obj?.amount_due as number) ?? 0,
          amount_paid: (obj?.amount_paid as number) ?? 0,
          currency: (obj?.currency as string) ?? "usd",
          status: (obj?.status as string) ?? "open",
          invoice_url: (obj?.hosted_invoice_url as string) ?? null,
          paid_at: obj?.status_transitions
            ? new Date(((obj.status_transitions as Record<string, number>).paid_at ?? 0) * 1000).toISOString()
            : null,
        },
        { onConflict: "stripe_invoice_id" }
      );

      // Queue a payment_failed notification to the billing admin.
      if (type === "invoice.payment_failed") {
        const { data: company } = await admin
          .from("companies")
          .select("name, subscription_plan")
          .eq("id", sub.company_id)
          .maybeSingle();

        // Find the company's billing contact or any admin recruiter.
        const { data: subscription } = await admin
          .from("subscriptions")
          .select("billing_email, billing_name")
          .eq("company_id", sub.company_id)
          .maybeSingle();

        const billingEmail = subscription?.billing_email ?? (obj?.customer_email as string | undefined);

        if (billingEmail && company) {
          await queueTemplateEmail("payment_failed", { email: billingEmail, name: subscription?.billing_name ?? undefined }, {
            company_admin_name: subscription?.billing_name ?? "Account Admin",
            plan: company.subscription_plan ?? "your",
          }).catch((err) => {
            console.error("Failed to queue payment_failed email:", err);
          });
        }
      }
      break;
    }

    default:
      // Unknown event type — logged to billing_events, no processing required.
      break;
  }
}

/**
 * Verify Stripe webhook signature using Web Crypto (no stripe SDK required).
 * Also enforces the 5-minute tolerance to prevent replay attacks.
 */
async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf("=");
    if (idx > 0) acc[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    return acc;
  }, {});

  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  // Replay protection: reject webhooks older than WEBHOOK_TOLERANCE_SECONDS.
  const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (isNaN(webhookAge) || webhookAge > WEBHOOK_TOLERANCE_SECONDS || webhookAge < -60) {
    console.error(`Stripe webhook timestamp out of tolerance: age=${webhookAge}s`);
    return false;
  }

  const signed = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signed));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks.
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}
