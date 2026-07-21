"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateEmbedding, toVectorLiteral } from "@/lib/ai/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { jobFormSchema, parseListField } from "@/lib/validations/job";
import type { ActionResult } from "./auth";
import { generateMatchesForJob } from "./matching";

async function requireRecruiter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("id, company_id")
    .eq("id", user.id)
    .single();

  if (!recruiter) return null;
  return { supabase, userId: user.id, companyId: recruiter.company_id };
}

function buildEmbeddingText(input: {
  title: string;
  description: string;
  requiredSkills: string[];
  responsibilities: string[];
  requirements: string[];
}) {
  return [
    input.title,
    input.description,
    `Required skills: ${input.requiredSkills.join(", ")}`,
    `Responsibilities: ${input.responsibilities.join(" ")}`,
    `Requirements: ${input.requirements.join(" ")}`,
  ].join("\n");
}

export interface JobActionResult extends ActionResult {
  jobId?: string;
}

export async function createJob(formData: FormData): Promise<JobActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "You must be a recruiter to create jobs." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = jobFormSchema.safeParse({
    ...raw,
    isRemote: raw.isRemote === "true" || raw.isRemote === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const data = parsed.data;
  const requiredSkills = parseListField(data.requiredSkills);
  const responsibilities = parseListField(data.responsibilities);
  const requirements = parseListField(data.requirements);
  const benefits = parseListField(data.benefits);
  const niceToHave = parseListField(data.niceToHaveSkills);

  let slug = slugify(data.title);
  const { data: existing } = await ctx.supabase
    .from("jobs")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: job, error } = await ctx.supabase
    .from("jobs")
    .insert({
      company_id: ctx.companyId,
      recruiter_id: ctx.userId,
      title: data.title,
      slug,
      department: data.department || null,
      description: data.description,
      responsibilities,
      requirements,
      benefits,
      employment_type: data.employmentType,
      experience_level: data.experienceLevel,
      min_experience_years: data.minExperienceYears,
      education_requirement: data.educationRequirement || null,
      required_skills: requiredSkills,
      nice_to_have_skills: niceToHave,
      location: data.location || null,
      is_remote: data.isRemote,
      salary_min: data.salaryMin || null,
      salary_max: data.salaryMax || null,
      salary_currency: data.salaryCurrency,
      headcount: data.headcount,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !job) return { success: false, error: error?.message ?? "Failed to create job." };

  revalidatePath("/recruiter/jobs");
  return { success: true, jobId: job.id };
}

export async function updateJob(jobId: string, formData: FormData): Promise<JobActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "You must be a recruiter to edit jobs." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = jobFormSchema.safeParse({
    ...raw,
    isRemote: raw.isRemote === "true" || raw.isRemote === "on",
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const data = parsed.data;
  const requiredSkills = parseListField(data.requiredSkills);
  const responsibilities = parseListField(data.responsibilities);
  const requirements = parseListField(data.requirements);
  const benefits = parseListField(data.benefits);
  const niceToHave = parseListField(data.niceToHaveSkills);

  const { error } = await ctx.supabase
    .from("jobs")
    .update({
      title: data.title,
      department: data.department || null,
      description: data.description,
      responsibilities,
      requirements,
      benefits,
      employment_type: data.employmentType,
      experience_level: data.experienceLevel,
      min_experience_years: data.minExperienceYears,
      education_requirement: data.educationRequirement || null,
      required_skills: requiredSkills,
      nice_to_have_skills: niceToHave,
      location: data.location || null,
      is_remote: data.isRemote,
      salary_min: data.salaryMin || null,
      salary_max: data.salaryMax || null,
      salary_currency: data.salaryCurrency,
      headcount: data.headcount,
    })
    .eq("id", jobId)
    .eq("company_id", ctx.companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/recruiter/jobs/${jobId}`);
  revalidatePath("/recruiter/jobs");
  return { success: true, jobId };
}

/** Publishes a job: generates its embedding and kicks off AI candidate matching. */
export async function publishJob(jobId: string): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "You must be a recruiter to publish jobs." };

  const { data: job } = await ctx.supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", ctx.companyId)
    .single();
  if (!job) return { success: false, error: "Job not found." };
  if (job.status !== "draft") return { success: false, error: "Only draft jobs can be published." };

  const embeddingText = buildEmbeddingText({
    title: job.title,
    description: job.description,
    requiredSkills: job.required_skills ?? [],
    responsibilities: job.responsibilities ?? [],
    requirements: job.requirements ?? [],
  });

  const admin = createAdminClient();
  const embedding = await generateEmbedding(embeddingText);

  const { error } = await admin
    .from("jobs")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      ...(embedding ? { embedding: toVectorLiteral(embedding) as unknown as number[] } : {}),
    })
    .eq("id", jobId)
    .eq("company_id", ctx.companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/recruiter/jobs");
  revalidatePath("/candidate/jobs");

  generateMatchesForJob(jobId).catch(() => {});

  return { success: true };
}

export async function closeJob(jobId: string): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { error } = await ctx.supabase
    .from("jobs")
    .update({ status: "closed" })
    .eq("id", jobId)
    .eq("company_id", ctx.companyId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/recruiter/jobs");
  return { success: true };
}

export async function archiveJob(jobId: string): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { error } = await ctx.supabase
    .from("jobs")
    .update({ status: "archived", is_archived: true })
    .eq("id", jobId)
    .eq("company_id", ctx.companyId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/recruiter/jobs");
  return { success: true };
}

export async function duplicateJob(jobId: string): Promise<JobActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { data: original } = await ctx.supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", ctx.companyId)
    .single();
  if (!original) return { success: false, error: "Job not found." };

  const slug = `${slugify(original.title)}-copy-${Date.now().toString(36)}`;

  const { data: job, error } = await ctx.supabase
    .from("jobs")
    .insert({
      company_id: ctx.companyId,
      recruiter_id: ctx.userId,
      title: `${original.title} (Copy)`,
      slug,
      department: original.department,
      description: original.description,
      responsibilities: original.responsibilities,
      requirements: original.requirements,
      benefits: original.benefits,
      employment_type: original.employment_type,
      experience_level: original.experience_level,
      min_experience_years: original.min_experience_years,
      education_requirement: original.education_requirement,
      required_skills: original.required_skills,
      nice_to_have_skills: original.nice_to_have_skills,
      location: original.location,
      is_remote: original.is_remote,
      salary_min: original.salary_min,
      salary_max: original.salary_max,
      salary_currency: original.salary_currency,
      headcount: original.headcount,
      status: "draft",
      duplicated_from: original.id,
    })
    .select("id")
    .single();

  if (error || !job) return { success: false, error: error?.message ?? "Failed to duplicate job." };

  revalidatePath("/recruiter/jobs");
  return { success: true, jobId: job.id };
}

export async function createJobAndRedirect(formData: FormData) {
  const result = await createJob(formData);
  if (result.success && result.jobId) {
    redirect(`/recruiter/jobs/${result.jobId}`);
  }
}
