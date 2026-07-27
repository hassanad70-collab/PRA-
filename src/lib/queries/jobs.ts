import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Company, EmploymentType, ExperienceLevel, Job } from "@/types/database";

// This project's Supabase client isn't wired with a generated `Database`
// generic (see src/types/database.ts's header comment), so postgrest-js
// falls back to its own naive select-string parser for result types. That
// parser can't reliably resolve an embedded relation's cardinality
// (one-to-one vs one-to-many) once the select string stops being exactly
// "*, relation(*)" -- it silently infers `company` as an array instead of a
// nullable object for any narrower column list. `.returns<T>()` sidesteps
// that by declaring the actual shape explicitly, same as every query below
// that embeds a narrowed `company:companies(...)`.
interface PublishedJobListItem {
  id: string;
  title: string;
  location: string | null;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  updated_at: string;
  company: Pick<Company, "id" | "name" | "slug" | "logo_url"> | null;
}

// Every `embedding`-excluding select string below (jobs.* minus that one
// vector(1536) column, used only by src/actions/matching.ts's own targeted
// selects) is written out as a literal at each call site rather than
// shared via a `${...}`-interpolated constant: supabase-js infers a
// query's result type by parsing its select string as a TypeScript literal
// type, and interpolation collapses that to `any`/wrong join cardinality.
// If this column list needs to change, update it everywhere it appears
// (this file's getJobById, and src/actions/matching.ts's two job selects).

export async function getPublishedJobs(filters?: {
  search?: string;
  location?: string;
  employmentType?: string;
  companyId?: string;
}) {
  const supabase = await createClient();
  // List/card view -- only ever renders this subset (verified against every
  // current caller: the homepage/jobs-list previews, /jobs, /candidate/jobs,
  // the company profile's job list, and sitemap.ts).
  let query = supabase
    .from("jobs")
    .select("id, title, location, employment_type, experience_level, updated_at, company:companies(id, name, slug, logo_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters?.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters?.employmentType) query = query.eq("employment_type", filters.employmentType);
  if (filters?.companyId) query = query.eq("company_id", filters.companyId);

  // Scalability guard-rail, not a UX change: this was previously unbounded.
  // 200 is well above current real usage, so today's behavior (every
  // published job shown) is unaffected; it just stops the public job board,
  // sitemap generation, and homepage previews from scanning the entire
  // table once real usage grows well past that.
  const { data } = await query.limit(200).returns<PublishedJobListItem[]>();
  return data ?? [];
}

// cache() dedupes identical calls within a single request/render pass --
// getJobById and getCompanyBySlug were each hit twice per page load
// (once from generateMetadata, once from the page component itself), and
// getRecruiterContext once per layout + once per child page.
export const getCompanyBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("*").eq("slug", slug).is("deleted_at", null).single();
  return data;
});

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

export const getJobById = cache(async (jobId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, company_id, recruiter_id, title, slug, department, description, responsibilities, requirements, benefits, employment_type, experience_level, min_experience_years, education_requirement, required_skills, nice_to_have_skills, location, is_remote, salary_min, salary_max, salary_currency, headcount, status, is_archived, duplicated_from, views_count, applications_count, published_at, closes_at, created_at, updated_at, company:companies(*)"
    )
    .eq("id", jobId)
    .single()
    .returns<Job & { company: Company | null }>();
  return data;
});

// Company data is never read from this list (see src/app/recruiter/jobs/page.tsx
// -- company name comes from getRecruiterContext instead), so the
// company:companies(*) join here was fetching and discarding a full company
// row per job.
export async function getRecruiterJobs(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, status, department, location, applications_count")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export const getRecruiterContext = cache(async (userId: string) => {
  const supabase = await createClient();
  // companies.pending_owner_id (added in migration 0019, for ownership
  // transfer) references recruiters(id), creating a second FK path between
  // recruiters and companies alongside recruiters.company_id -- PostgREST
  // can no longer infer which one this embed means without the explicit
  // constraint name, and errors "more than one relationship was found"
  // otherwise (which getRecruiterContext then silently swallowed into a
  // null return, redirecting every /recruiter/* page in a loop).
  const { data } = await supabase
    .from("recruiters")
    .select("*, company:companies!recruiters_company_id_fkey(*)")
    .eq("id", userId)
    .single();
  return data;
});
