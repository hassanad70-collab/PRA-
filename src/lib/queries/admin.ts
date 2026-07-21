import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AdminDashboardStats {
  total_companies: number;
  total_recruiters: number;
  total_candidates: number;
  active_jobs: number;
  published_jobs: number;
  total_jobs: number;
  total_applications: number;
  total_interviews: number;
  total_resumes: number;
  storage_bytes: number;
  hiring_funnel: Record<string, number>;
}

export async function getActiveCompaniesLite() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return data ?? [];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
  if (error) {
    console.error("getAdminDashboardStats failed", error);
    return null;
  }
  return data as AdminDashboardStats;
}

export async function getTopCompaniesByJobs(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_top_companies_by_jobs", { p_limit: limit });
  if (error) {
    console.error("getTopCompaniesByJobs failed", error);
    return [];
  }
  return (data ?? []) as { company_id: string; company_name: string; jobs_count: number; applications_count: number }[];
}

export async function getTopRecruitersByActivity(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_top_recruiters_by_activity", { p_limit: limit });
  if (error) {
    console.error("getTopRecruitersByActivity failed", error);
    return [];
  }
  return (data ?? []) as {
    recruiter_id: string;
    full_name: string;
    company_name: string;
    jobs_count: number;
    applications_count: number;
  }[];
}

/** Monthly counts for a timestamp column on a table, bucketed client-side (same approach as getMonthlyApplicationTrend). */
async function getMonthlyTrend(table: "applications" | "jobs", dateColumn: string, months: number) {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data } = await supabase.from(table).select(dateColumn).gte(dateColumn, since.toISOString());
  const rows = (data ?? []) as unknown as Record<string, string>[];

  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    const raw = row[dateColumn];
    if (!raw) return;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export async function getMonthlyApplicationsTrend(months = 6) {
  return getMonthlyTrend("applications", "applied_at", months);
}

export async function getMonthlyCandidatesTrend(months = 6) {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("role", "candidate")
    .gte("created_at", since.toISOString());

  const buckets = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const d = new Date(row.created_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export async function getMonthlyJobsTrend(months = 6) {
  return getMonthlyTrend("jobs", "created_at", months);
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Users (cross-role)
// ---------------------------------------------------------------------------

export interface AdminUserFilters {
  search?: string;
  role?: UserRole;
  status?: "active" | "disabled" | "deleted";
  page?: number;
  pageSize?: number;
}

export async function getAdminUsers(filters: AdminUserFilters): Promise<Paginated<Record<string, unknown>>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("profiles").select("*", { count: "exact" });

  if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status === "deleted") query = query.not("deleted_at", "is", null);
  else if (filters.status === "disabled") query = query.eq("is_active", false).is("deleted_at", null);
  else if (filters.status === "active") query = query.eq("is_active", true).is("deleted_at", null);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) console.error("getAdminUsers failed", error);

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1) };
}

export async function getAdminUserDetail(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return null;

  if (profile.role === "recruiter" || profile.role === "hr_manager") {
    const { data: recruiter } = await supabase
      .from("recruiters")
      .select("*, company:companies(*)")
      .eq("id", userId)
      .maybeSingle();
    return { profile, recruiter, candidate: null };
  }

  if (profile.role === "candidate") {
    const { data: candidate } = await supabase.from("candidates").select("*").eq("id", userId).maybeSingle();
    return { profile, recruiter: null, candidate };
  }

  return { profile, recruiter: null, candidate: null };
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export interface AdminCompanyFilters {
  search?: string;
  status?: "active" | "disabled" | "deleted";
  page?: number;
  pageSize?: number;
}

export async function getAdminCompanies(filters: AdminCompanyFilters): Promise<Paginated<Record<string, unknown>>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("companies").select("*", { count: "exact" });

  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.status === "deleted") query = query.not("deleted_at", "is", null);
  else if (filters.status === "disabled") query = query.eq("is_active", false).is("deleted_at", null);
  else if (filters.status === "active") query = query.eq("is_active", true).is("deleted_at", null);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) console.error("getAdminCompanies failed", error);

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1) };
}

export async function getAdminCompanyDetail(companyId: string) {
  const supabase = await createClient();
  const [{ data: company }, { count: recruiterCount }, stats] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("recruiters").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.rpc("get_company_dashboard_stats", { p_company_id: companyId }),
  ]);

  return {
    company,
    recruiterCount: recruiterCount ?? 0,
    stats: (stats.data ?? null) as {
      total_jobs: number;
      open_jobs: number;
      closed_jobs: number;
      total_candidates: number;
      applications_this_month: number;
      average_ats_score: number | null;
    } | null,
  };
}

// ---------------------------------------------------------------------------
// Recruiters
// ---------------------------------------------------------------------------

export interface AdminRecruiterFilters {
  search?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminRecruiters(filters: AdminRecruiterFilters): Promise<Paginated<Record<string, unknown>>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("recruiters")
    .select("*, profile:profiles!inner(*), company:companies(*)", { count: "exact" });

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`, { referencedTable: "profiles" });
  }
  if (filters.companyId) query = query.eq("company_id", filters.companyId);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) console.error("getAdminRecruiters failed", error);

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1) };
}

export async function getRecruiterPerformance(recruiterId: string) {
  const supabase = await createClient();
  const [{ count: jobsCount }, { data: jobIds }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("recruiter_id", recruiterId),
    supabase.from("jobs").select("id").eq("recruiter_id", recruiterId),
  ]);

  const ids = (jobIds ?? []).map((j) => j.id);
  if (!ids.length) return { jobsCount: jobsCount ?? 0, applicationsCount: 0, hiredCount: 0 };

  const [{ count: applicationsCount }, { count: hiredCount }] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", ids),
    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", ids).eq("status", "hired"),
  ]);

  return { jobsCount: jobsCount ?? 0, applicationsCount: applicationsCount ?? 0, hiredCount: hiredCount ?? 0 };
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export interface AdminCandidateFilters {
  search?: string;
  status?: "active" | "disabled" | "deleted";
  page?: number;
  pageSize?: number;
}

export async function getAdminCandidates(filters: AdminCandidateFilters): Promise<Paginated<Record<string, unknown>>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("candidates").select("*, profile:profiles!inner(*)", { count: "exact" });

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`, { referencedTable: "profiles" });
  }
  if (filters.status === "deleted") query = query.not("profiles.deleted_at", "is", null);
  else if (filters.status === "disabled") query = query.eq("profiles.is_active", false);
  else if (filters.status === "active") query = query.eq("profiles.is_active", true);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) console.error("getAdminCandidates failed", error);

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1) };
}

export async function getAdminCandidateDetail(candidateId: string) {
  const supabase = await createClient();

  const [
    { data: profile },
    { data: candidate },
    { data: resumes },
    { data: atsScores },
    { data: jobMatches },
    { data: applications },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", candidateId).single(),
    supabase.from("candidates").select("*").eq("id", candidateId).single(),
    supabase.from("resumes").select("*").eq("candidate_id", candidateId).order("uploaded_at", { ascending: false }),
    supabase
      .from("ats_scores")
      .select("*, resume:resumes(file_name)")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_matches")
      .select("*, job:jobs(title, company:companies(name))")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("*, job:jobs(title, company:companies(name))")
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false }),
  ]);

  return {
    profile,
    candidate,
    resumes: resumes ?? [],
    atsScores: atsScores ?? [],
    jobMatches: jobMatches ?? [],
    applications: applications ?? [],
  };
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

export interface AdminAuditLogFilters {
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminAuditLogs(filters: AdminAuditLogFilters): Promise<Paginated<Record<string, unknown>>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("audit_logs").select("*, actor:profiles(id, full_name, email, role)", { count: "exact" });

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) console.error("getAdminAuditLogs failed", error);

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1) };
}

export async function getDistinctAuditActions() {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("action").limit(500);
  return Array.from(new Set((data ?? []).map((r) => r.action))).sort();
}

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

export async function getSystemSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("*");
  const map = new Map((data ?? []).map((row) => [row.key, row]));
  return map;
}
