import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Log the raw event immediately before any processing
  const admin = createAdminClient();

  let event: { id?: string; type?: string; data?: unknown };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Verify signature when secret is configured (using Web Crypto — no stripe SDK required)
  if (STRIPE_WEBHOOK_SECRET && sig) {
    try {
      const sigValid = await verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      if (!sigValid) {
        return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signature verification failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const eventType = event.type ?? "unknown";
  const stripeEventId = event.id ?? null;

  // Persist to billing_events (idempotent via unique constraint on stripe_event_id)
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

  // Process known event types
  try {
    await handleStripeEvent(eventType, event.data as Record<string, unknown>);

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
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
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
          plan: plan ?? "free",
          status: status ?? "active",
          current_period_start: obj?.current_period_start
            ? new Date((obj.current_period_start as number) * 1000).toISOString()
            : null,
          current_period_end: obj?.current_period_end
            ? new Date((obj.current_period_end as number) * 1000).toISOString()
            : null,
          cancel_at_period_end: Boolean(obj?.cancel_at_period_end),
        })
        .eq("stripe_subscription_id", stripeSubId);

      // Keep denormalized plan on companies
      if (plan || status) {
        const { data: sub } = await admin
          .from("subscriptions")
          .select("company_id")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle();
        if (sub?.company_id) {
          await admin
            .from("companies")
            .update({
              ...(plan && { subscription_plan: plan }),
              ...(status && { subscription_status: mapSubStatus(status) }),
            })
            .eq("id", sub.company_id);
        }
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
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const stripeInvId = obj?.id as string | undefined;
      if (!stripeInvId) break;
      // Upsert invoice record
      const customerId = obj?.customer as string | undefined;
      if (customerId) {
        const { data: sub } = await admin
          .from("subscriptions")
          .select("company_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (sub?.company_id) {
          await admin.from("invoices").upsert(
            {
              company_id: sub.company_id,
              stripe_invoice_id: stripeInvId,
              amount_due: (obj?.amount_due as number) ?? 0,
              amount_paid: (obj?.amount_paid as number) ?? 0,
              currency: (obj?.currency as string) ?? "usd",
              status: (obj?.status as string) ?? "open",
              invoice_url: (obj?.hosted_invoice_url as string) ?? null,
              paid_at: obj?.status === "paid" ? new Date().toISOString() : null,
            },
            { onConflict: "stripe_invoice_id" }
          );
        }
      }
      break;
    }

    default:
      // Unknown event — logged, not processed
      break;
  }
}

function normalizePlan(items: unknown): string | null {
  // Very rough — in production you'd map Stripe price IDs to plan slugs
  const arr = items as Array<{ price?: { nickname?: string } }> | undefined;
  const nickname = arr?.[0]?.price?.nickname?.toLowerCase();
  if (!nickname) return null;
  if (nickname.includes("enterprise")) return "enterprise";
  if (nickname.includes("professional")) return "professional";
  if (nickname.includes("starter")) return "starter";
  return "free";
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

/** Verify Stripe webhook signature using Web Crypto (no SDK required). */
async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split("=");
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
  }, {});

  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

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

  return computed === v1;
}
