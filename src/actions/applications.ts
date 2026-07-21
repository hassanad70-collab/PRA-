"use server";

import { revalidatePath } from "next/cache";

import { runAIScreening } from "@/lib/ai/screening";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, Job, ParsedResumeData } from "@/types/database";
import type { ActionResult } from "./auth";

export interface ApplyResult extends ActionResult {
  applicationId?: string;
}

/**
 * Candidate applies to a job. Creates the application row, then kicks off
 * a deep AI screening pass so recruiters see AI scores the moment the
 * application lands in their pipeline.
 */
export async function applyToJob(jobId: string, resumeId: string, coverLetterText?: string): Promise<ApplyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in to apply." };

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job || job.status !== "published") {
    return { success: false, error: "This job is no longer accepting applications." };
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("candidate_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, error: "You've already applied to this job." };

  const { data: resume } = await supabase
    .from("resumes")
    .select("id")
    .eq("id", resumeId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!resume) return { success: false, error: "Resume not found." };

  let coverLetterId: string | null = null;
  if (coverLetterText?.trim()) {
    const { data: cl } = await supabase
      .from("cover_letters")
      .insert({ candidate_id: user.id, content: coverLetterText.trim() })
      .select("id")
      .single();
    coverLetterId = cl?.id ?? null;
  }

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: user.id,
      resume_id: resumeId,
      cover_letter_id: coverLetterId,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error || !application) {
    return { success: false, error: error?.message ?? "Failed to submit application." };
  }

  runScreeningPipeline(application.id, job as Job, resumeId, user.id).catch(() => {});

  revalidatePath("/candidate/applications");
  revalidatePath(`/recruiter/jobs/${jobId}/candidates`);

  return { success: true, applicationId: application.id };
}

async function runScreeningPipeline(applicationId: string, job: Job, resumeId: string, candidateId: string) {
  const admin = createAdminClient();

  await admin.from("applications").update({ status: "screening" }).eq("id", applicationId);

  const { data: resume } = await admin.from("resumes").select("parsed_data").eq("id", resumeId).single();
  const { data: candidateRow } = await admin
    .from("candidates")
    .select("years_of_experience")
    .eq("id", candidateId)
    .single();

  if (!resume?.parsed_data) return;

  try {
    const result = await runAIScreening(job, resume.parsed_data as ParsedResumeData, candidateRow?.years_of_experience ?? 0);

    await admin.from("screening_results").upsert(
      {
        application_id: applicationId,
        overall_score: Math.round(result.overall_score),
        experience_score: Math.round(result.experience_score),
        skill_match_score: Math.round(result.skill_match_score),
        education_match_score: Math.round(result.education_match_score),
        culture_fit_score: Math.round(result.culture_fit_score),
        leadership_score: Math.round(result.leadership_score),
        communication_score: Math.round(result.communication_score),
        technical_score: Math.round(result.technical_score),
        ai_summary: result.ai_summary,
        interview_recommendation: result.interview_recommendation,
        ai_model: "gpt-4o-mini",
      },
      { onConflict: "application_id" }
    );

    await admin.from("applications").update({ status: "shortlisted" }).eq("id", applicationId);
    await rerankApplications(job.id);
  } catch {
    // Leave status at "screening" — a recruiter can still review manually.
  }
}

async function rerankApplications(jobId: string) {
  const admin = createAdminClient();
  const { data: results } = await admin
    .from("screening_results")
    .select("id, application_id, overall_score, applications!inner(job_id)")
    .eq("applications.job_id", jobId)
    .order("overall_score", { ascending: false });

  if (!results) return;
  await Promise.allSettled(
    results.map((r, index) => admin.from("screening_results").update({ rank_position: index + 1 }).eq("id", r.id))
  );
}

export async function withdrawApplication(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/applications");
  return { success: true };
}

/** Recruiter updates an application's pipeline status. */
export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: recruiter } = await supabase.from("recruiters").select("id").eq("id", user.id).single();
  if (!recruiter) return { success: false, error: "Only recruiters can update application status." };

  const { data: updated, error } = await supabase
    .from("applications")
    .update({ status, status_reason: reason ?? null })
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!updated) return { success: false, error: "You don't have permission to update this application." };

  revalidatePath("/recruiter", "layout");
  return { success: true };
}
