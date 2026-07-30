"use server";

import { forbidden } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) forbidden();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "super_admin") forbidden();
}

export interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailQueueRow {
  id: string;
  template_key: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_templates")
    .select("*")
    .order("category")
    .order("name");
  return (data ?? []) as EmailTemplate[];
}

export async function getEmailQueue(status?: string, limit = 50): Promise<EmailQueueRow[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  let q = admin
    .from("email_queue")
    .select("id,template_key,to_email,to_name,subject,status,attempts,max_attempts,last_error,scheduled_at,sent_at,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as EmailQueueRow[];
}

export async function getEmailStats(): Promise<Record<string, number>> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin.from("email_queue").select("status");
  if (!data) return {};
  return data.reduce((acc: Record<string, number>, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

export async function updateEmailTemplate(
  key: string,
  updates: { subject?: string; html_body?: string; text_body?: string; is_active?: boolean }
): Promise<ActionResult> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("email_templates").update(updates).eq("key", key);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/email");
  return { success: true };
}

export async function cancelQueuedEmail(emailId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_queue")
    .update({ status: "cancelled" })
    .eq("id", emailId)
    .eq("status", "pending");
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/email");
  return { success: true };
}
