import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getPublishedJobs(filters?: {
  search?: string;
  location?: string;
  employmentType?: string;
  companyId?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters?.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters?.employmentType) query = query.eq("employment_type", filters.employmentType);
  if (filters?.companyId) query = query.eq("company_id", filters.companyId);

  const { data } = await query;
  return data ?? [];
}

export async function getCompanyBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("*").eq("slug", slug).is("deleted_at", null).single();
  return data;
}

export async function getJobBySlug(companyId: string, slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .single();
  return data;
}

export async function getJobById(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*, company:companies(*)").eq("id", jobId).single();
  return data;
}

export async function getRecruiterJobs(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getRecruiterContext(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("recruiters").select("*, company:companies(*)").eq("id", userId).single();
  return data;
}
