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

/** Attempt to send a queued email and record the result. Stubs without RESEND_API_KEY. */
export async function sendQueuedEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: email, error } = await admin
    .from("email_queue")
    .select("*")
    .eq("id", emailId)
    .single();

  if (error || !email) return { success: false, error: "Email not found" };

  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    await admin
      .from("email_queue")
      .update({ status: "sent", sent_at: new Date().toISOString(), provider_id: "stub-no-key" })
      .eq("id", emailId);

    await admin.from("email_events").insert({
      email_id: emailId,
      event_type: "sent_stub",
      metadata: { reason: "RESEND_API_KEY not configured" },
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
        text: email.text_body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await admin
        .from("email_queue")
        .update({ last_error: errText })
        .eq("id", emailId);
      return { success: false, error: errText };
    }

    const json = (await res.json()) as { id?: string };
    await admin
      .from("email_queue")
      .update({ status: "sent", sent_at: new Date().toISOString(), provider_id: json.id ?? null })
      .eq("id", emailId);

    await admin.from("email_events").insert({ email_id: emailId, event_type: "sent" });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await admin.from("email_queue").update({ last_error: msg }).eq("id", emailId);
    return { success: false, error: msg };
  }
}
