import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { queueEmail, sendQueuedEmail } from "@/lib/email";

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  email?: {
    subject: string;
    htmlBody: string;
    textBody?: string;
  };
}

/**
 * Insert an in-app notification and optionally fire a transactional email.
 * The email path is fire-and-forget — failures are silently swallowed so
 * the caller's main action is never blocked.
 */
export async function dispatchNotification(p: NotificationPayload): Promise<void> {
  const admin = createAdminClient();

  await admin.from("notifications").insert({
    user_id: p.userId,
    type: p.type,
    title: p.title,
    message: p.message,
    link: p.link ?? null,
    is_read: false,
    data: p.data ?? {},
  });

  if (!p.email) return;

  // Fire-and-forget — do not await, failures are non-fatal
  (async () => {
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", p.userId)
        .single();

      if (!profile?.email) return;

      const emailId = await queueEmail({
        to: { email: profile.email, name: profile.full_name ?? undefined },
        subject: p.email!.subject,
        htmlBody: p.email!.htmlBody,
        textBody: p.email?.textBody,
        metadata: { notification_type: p.type, user_id: p.userId },
      });

      await sendQueuedEmail(emailId);
    } catch {
      // intentional no-op — email failure must not propagate
    }
  })();
}
