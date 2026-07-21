"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { basicInfoSchema, educationSchema, experienceSchema, skillSchema } from "@/lib/validations/profile";
import type { ActionResult } from "./auth";

async function requireCandidate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

function toDbPayload(input: ReturnType<typeof basicInfoSchema.parse>) {
  return {
    headline: input.headline || null,
    summary: input.summary || null,
    current_position: input.currentPosition || null,
    current_company: input.currentCompany || null,
    years_of_experience: input.yearsOfExperience ?? undefined,
    location: input.location || null,
    city: input.city || null,
    country: input.country || null,
    expected_salary_min: input.expectedSalaryMin ?? null,
    expected_salary_max: input.expectedSalaryMax ?? null,
    notice_period_days: input.noticePeriodDays ?? null,
    willing_to_relocate: input.willingToRelocate ?? false,
    linkedin_url: input.linkedinUrl || null,
    github_url: input.githubUrl || null,
    portfolio_url: input.portfolioUrl || null,
    website_url: input.websiteUrl || null,
  };
}

export async function updateBasicInfo(formData: FormData): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = basicInfoSchema.safeParse({ ...raw, willingToRelocate: raw.willingToRelocate === "on" || raw.willingToRelocate === "true" });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { error } = await ctx.supabase.from("candidates").update(toDbPayload(parsed.data)).eq("id", ctx.userId);
  if (error) return { success: false, error: error.message };

  await ctx.supabase.rpc("recompute_profile_completion", { p_candidate_id: ctx.userId });

  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/dashboard");
  return { success: true };
}

export async function addExperience(formData: FormData): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = experienceSchema.safeParse({ ...raw, isCurrent: raw.isCurrent === "on" || raw.isCurrent === "true" });
  if (!parsed.success) return { success: false, error: "Please fill in all required fields." };

  const { error } = await ctx.supabase.from("candidate_experience").insert({
    candidate_id: ctx.userId,
    company_name: parsed.data.companyName,
    job_title: parsed.data.jobTitle,
    location: parsed.data.location || null,
    start_date: parsed.data.startDate,
    end_date: parsed.data.isCurrent ? null : parsed.data.endDate || null,
    is_current: parsed.data.isCurrent,
    description: parsed.data.description || null,
  });

  if (error) return { success: false, error: error.message };
  await ctx.supabase.rpc("recompute_profile_completion", { p_candidate_id: ctx.userId });
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };
  const { error } = await ctx.supabase.from("candidate_experience").delete().eq("id", id).eq("candidate_id", ctx.userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function addEducation(formData: FormData): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = educationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Please fill in all required fields." };

  const { error } = await ctx.supabase.from("candidate_education").insert({
    candidate_id: ctx.userId,
    institution: parsed.data.institution,
    degree: parsed.data.degree || null,
    field_of_study: parsed.data.fieldOfStudy || null,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null,
    grade: parsed.data.grade || null,
  });

  if (error) return { success: false, error: error.message };
  await ctx.supabase.rpc("recompute_profile_completion", { p_candidate_id: ctx.userId });
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function deleteEducation(id: string): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };
  const { error } = await ctx.supabase.from("candidate_education").delete().eq("id", id).eq("candidate_id", ctx.userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function addSkill(formData: FormData): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = skillSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Please enter a valid skill." };

  const { error } = await ctx.supabase.from("candidate_skills").upsert(
    {
      candidate_id: ctx.userId,
      skill_name: parsed.data.skillName,
      proficiency: parsed.data.proficiency,
      years_experience: parsed.data.yearsExperience ?? null,
      is_ai_extracted: false,
    },
    { onConflict: "candidate_id,skill_name" }
  );

  if (error) return { success: false, error: error.message };
  await ctx.supabase.rpc("recompute_profile_completion", { p_candidate_id: ctx.userId });
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };
  const { error } = await ctx.supabase.from("candidate_skills").delete().eq("id", id).eq("candidate_id", ctx.userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/candidate/profile");
  return { success: true };
}

export async function toggleSavedJob(jobId: string): Promise<ActionResult & { saved?: boolean }> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "You must be signed in." };

  const { data: existing } = await ctx.supabase
    .from("saved_jobs")
    .select("id")
    .eq("candidate_id", ctx.userId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await ctx.supabase.from("saved_jobs").delete().eq("id", existing.id);
    revalidatePath("/candidate/jobs");
    return { success: true, saved: false };
  }

  await ctx.supabase.from("saved_jobs").insert({ candidate_id: ctx.userId, job_id: jobId });
  revalidatePath("/candidate/jobs");
  return { success: true, saved: true };
}
