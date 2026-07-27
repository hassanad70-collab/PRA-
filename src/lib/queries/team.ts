import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Capability, RecruiterInvite, RecruiterRole } from "@/types/database";

// This project's Supabase client has no generated `Database` generic (see
// src/lib/queries/jobs.ts's getPublishedJobs), so narrowing an embedded
// relation's column list away from "*" needs an explicit `.returns<T>()`.
interface CompanyMemberRow {
  id: string;
  role: RecruiterRole;
  job_title: string | null;
  created_at: string;
  profile: { full_name: string; email: string } | null;
}

export async function getCompanyMembers(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recruiters")
    .select("id, role, job_title, created_at, profile:profiles(full_name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
    .returns<CompanyMemberRow[]>();
  return data ?? [];
}

/** Reads role_capabilities directly rather than duplicating the mapping in TS -- same source of truth has_capability() uses. */
export async function getMyCapabilities(role: RecruiterRole) {
  const supabase = await createClient();
  const { data } = await supabase.from("role_capabilities").select("capability").eq("role", role);
  return new Set((data ?? []).map((r) => r.capability as Capability));
}

export async function getPendingInvites(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recruiter_invites")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as RecruiterInvite[];
}

/**
 * Looks up an invite by its token for the public accept page -- the visitor
 * has no session yet, so this goes through the admin client rather than a
 * (nonexistent, for an anonymous visitor) RLS-permitted read.
 */
export async function getInviteByToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("recruiter_invites")
    .select("*, company:companies(name)")
    .eq("token", token)
    .maybeSingle();
  return data as (RecruiterInvite & { company: { name: string } | null }) | null;
}
