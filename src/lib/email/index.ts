import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SendEmailOptions {
  templateKey?: string;
  to: { email: string; name?: string };
  from?: { email: string; name?: string };
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: Record<string, string>;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

/** Render a template by replacing {{variable}} placeholders. */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/** Queue an email for sending. Returns the queued email id. */
export async function queueEmail(opts: SendEmailOptions): Promise<string> {
  const admin = createAdminClient();

  let htmlBody = opts.htmlBody;
  let textBody = opts.textBody ?? "";
  let subject = opts.subject;

  if (opts.variables) {
    htmlBody = renderTemplate(htmlBody, opts.variables);
    textBody = renderTemplate(textBody, opts.variables);
    subject = renderTemplate(subject, opts.variables);
  }

  const { data, error } = await admin
    .from("email_queue")
    .insert({
      template_key: opts.templateKey ?? null,
      to_email: opts.to.email,
      to_name: opts.to.name ?? null,
      from_email: opts.from?.email ?? "noreply@pra-talent.com",
      from_name: opts.from?.name ?? "PRA Talent Intelligence",
      subject,
      html_body: htmlBody,
      text_body: textBody || null,
      metadata: opts.metadata ?? {},
      scheduled_at: opts.scheduledAt?.toISOString() ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`queueEmail failed: ${error?.message}`);
  return data.id;
}

/** Queue an email from a template key + variables. */
export async function queueTemplateEmail(
  templateKey: string,
  to: { email: string; name?: string },
  variables: Record<string, string>
): Promise<string> {
  const admin = createAdminClient();

  const { data: tpl, error: tplErr } = await admin
    .from("email_templates")
    .select("subject, html_body, text_body")
    .eq("key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (tplErr || !tpl) throw new Error(`Template '${templateKey}' not found or inactive.`);

  return queueEmail({
    templateKey,
    to,
    subject: tpl.subject,
    htmlBody: tpl.html_body,
    textBody: tpl.text_body ?? undefined,
    variables,
  });
}

/**
 * Attempt to send a queued email via Resend and record the result.
 *
 * In production (VERCEL_ENV === "production") without RESEND_API_KEY the
 * email is marked failed — undelivered mail must not silently succeed.
 * In development/preview, the send is skipped and marked as sent_stub so
 * the happy path still flows without credentials.
 */
export async function sendQueuedEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: email, error } = await admin
    .from("email_queue")
    .select("*")
    .eq("id", emailId)
    .single();

  if (error || !email) return { success: false, error: "Email not found" };

  const resendKey = process.env.RESEND_API_KEY;
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!resendKey) {
    if (isProduction) {
      const msg = "RESEND_API_KEY is not configured in production";
      await admin
        .from("email_queue")
        .update({
          status: "failed",
          last_error: msg,
          attempts: (email.attempts as number) + 1,
        })
        .eq("id", emailId);
      await admin.from("email_events").insert({
        email_id: emailId,
        event_type: "failed",
        metadata: { reason: msg },
      });
      return { success: false, error: msg };
    }

    // Development / preview: stub delivery so the rest of the pipeline works.
    await admin
      .from("email_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_id: "stub-dev",
        attempts: (email.attempts as number) + 1,
      })
      .eq("id", emailId);
    await admin.from("email_events").insert({
      email_id: emailId,
      event_type: "sent_stub",
      metadata: { reason: "RESEND_API_KEY not set; development stub" },
    });
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${email.from_name} <${email.from_email}>`,
        to: email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email,
        subject: email.subject,
        html: email.html_body,
        text: email.text_body ?? undefined,
      }),
    });

    const newAttempts = (email.attempts as number) + 1;

    if (!res.ok) {
      const errText = await res.text();
      await admin
        .from("email_queue")
        .update({ last_error: errText, attempts: newAttempts })
        .eq("id", emailId);
      await admin.from("email_events").insert({
        email_id: emailId,
        event_type: "failed",
        metadata: { status: res.status, body: errText.slice(0, 500) },
      });
      return { success: false, error: errText };
    }

    const json = (await res.json()) as { id?: string };
    await admin
      .from("email_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_id: json.id ?? null,
        attempts: newAttempts,
      })
      .eq("id", emailId);
    await admin.from("email_events").insert({ email_id: emailId, event_type: "sent" });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await admin
      .from("email_queue")
      .update({
        last_error: msg,
        attempts: (email.attempts as number) + 1,
      })
      .eq("id", emailId);
    await admin.from("email_events").insert({
      email_id: emailId,
      event_type: "failed",
      metadata: { reason: msg },
    });
    return { success: false, error: msg };
  }
}
