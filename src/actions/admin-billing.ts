"use server";

import { forbidden } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

export interface BillingOverview {
  total_companies: number;
  active_subscriptions: number;
  trialing: number;
  past_due: number;
  cancelled: number;
  plan_breakdown: Record<string, number> | null;
  mrr_cents: number;
  total_invoiced_cents: number;
  outstanding_cents: number;
}

export interface SubscriptionRow {
  id: string;
  company_id: string;
  plan: string;
  status: string;
  billing_email: string | null;
  billing_name: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
}

export async function getBillingOverview(): Promise<BillingOverview | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_billing_overview");
  if (error) { console.error("get_billing_overview", error); return null; }
  return data as BillingOverview;
}

export async function getSubscriptions(limit = 50): Promise<SubscriptionRow[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("*, companies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getSubscriptions", error); return []; }
  return (data ?? []) as SubscriptionRow[];
}

export async function getRecentInvoices(limit = 20) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("*, companies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
