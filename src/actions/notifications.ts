"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  job_alert: boolean;
  job_match: boolean;
  interview: boolean;
  offer: boolean;
  digest: boolean;
  ai_rec: boolean;
  email_alerts: boolean;
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, userId: user.id };
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const { supabase } = await requireAuth();
  const { data } = await supabase.rpc("get_unread_notification_count");
  return (data as number) ?? 0;
}

export async function markRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { supabase } = await requireAuth();
  await supabase.rpc("mark_notifications_read", { p_ids: ids });
  revalidatePath("/candidate/dashboard");
}

export async function markAllRead(): Promise<void> {
  const { supabase, userId } = await requireAuth();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
  revalidatePath("/candidate/dashboard");
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { supabase, userId } = await requireAuth();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return { job_alert: true, job_match: true, interview: true, offer: true, digest: true, ai_rec: true, email_alerts: true };
  }
  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  const { supabase, userId } = await requireAuth();
  await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
}

/**
 * Server helper — creates an in-app notification for any user.
 * Uses admin client so it can be called from cron workers/server actions.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  options: {
    link?: string;
    data?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: options.link ?? null,
    data: options.data ?? {},
    is_read: false,
  });
}
