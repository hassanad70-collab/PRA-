"use server";

import { revalidateCandidatePath } from "@/lib/revalidate-candidate-path";
import { revalidateRecruiterPath } from "@/lib/revalidate-recruiter-path";
import { generateInterviewQuestions } from "@/lib/ai/interview-questions";
import { summarizeInterview } from "@/lib/ai/interview-summary";
import { createClient } from "@/lib/supabase/server";
import { interviewFeedbackSchema, scheduleInterviewSchema } from "@/lib/validations/interview";
import { INTERVIEW_COMPETENCIES } from "@/types/database";
import type { CompetencyRatings, InterviewQuestionCategory, InterviewStatus, StarEvaluation } from "@/types/database";
import type { ActionResult } from "./auth";

async function requireRecruiter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: recruiter } = await supabase.from("recruiters").select("id").eq("id", user.id).single();
  if (!recruiter) return null;
  return { supabase, userId: user.id };
}

/**
 * Regenerates the job's interview question bank from scratch. Questions are
 * fully AI-owned (no manual editing exists yet), so a delete+insert is safe.
 */
export async function generateInterviewQuestionsForJob(jobId: string): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Only recruiters can generate interview questions." };

  const { data: job } = await ctx.supabase
    .from("jobs")
    .select(
      "id, title, description, requirements, required_skills, nice_to_have_skills, experience_level, min_experience_years, education_requirement"
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { success: false, error: "Job not found." };

  const questionSet = await generateInterviewQuestions(job);

  const { error: deleteError } = await ctx.supabase.from("interview_questions").delete().eq("job_id", jobId);
  if (deleteError) return { success: false, error: deleteError.message };

  const rows = (
    Object.entries(questionSet) as [InterviewQuestionCategory, (typeof questionSet)["technical"]][]
  ).flatMap(([category, questions]) =>
    questions.map((q) => ({
      job_id: jobId,
      category,
      question: q.question,
      expected_answer: q.expected_answer,
      evaluation_criteria: q.evaluation_criteria,
    }))
  );

  if (rows.length) {
    const { error: insertError } = await ctx.supabase.from("interview_questions").insert(rows);
    if (insertError) return { success: false, error: insertError.message };
  }

  revalidateRecruiterPath(`/jobs/${jobId}`);
  return { success: true };
}

const ADVANCEABLE_STATUSES = ["submitted", "screening", "shortlisted"];

export async function scheduleInterview(applicationId: string, jobId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Only recruiters can schedule interviews." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = scheduleInterviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { error } = await ctx.supabase.from("interviews").insert({
    application_id: applicationId,
    scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
    duration_minutes: parsed.data.durationMinutes,
    interview_type: parsed.data.interviewType,
    location_or_link: parsed.data.locationOrLink || null,
    created_by: ctx.userId,
  });
  if (error) return { success: false, error: error.message };

  // Advance the pipeline stage, but don't clobber a later stage (offer/hired/rejected).
  await ctx.supabase.from("applications").update({ status: "interview" }).eq("id", applicationId).in("status", ADVANCEABLE_STATUSES);

  revalidateRecruiterPath(`/applications/${applicationId}`);
  revalidateRecruiterPath(`/jobs/${jobId}/candidates`);
  revalidateCandidatePath("/candidate/applications");
  return { success: true };
}

export async function updateInterviewStatus(interviewId: string, applicationId: string, status: InterviewStatus): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Only recruiters can update interviews." };

  const { error } = await ctx.supabase.from("interviews").update({ status }).eq("id", interviewId);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath(`/applications/${applicationId}`);
  revalidateCandidatePath("/candidate/applications");
  return { success: true };
}

export async function submitInterviewFeedback(
  interviewId: string,
  applicationId: string,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Only recruiters can submit interview feedback." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = interviewFeedbackSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Please select a hiring recommendation." };

  const star_evaluation: StarEvaluation = {
    situation: parsed.data.situation || "",
    task: parsed.data.task || "",
    action: parsed.data.action || "",
    result: parsed.data.result || "",
  };

  const competency_ratings: CompetencyRatings = {};
  for (const competency of INTERVIEW_COMPETENCIES) {
    const raw_ = formData.get(`competency_${competency}`);
    const value = raw_ ? Number(raw_) : NaN;
    if (Number.isFinite(value) && value >= 1 && value <= 5) competency_ratings[competency] = value;
  }

  const { error } = await ctx.supabase
    .from("interviews")
    .update({
      feedback: parsed.data.feedback || null,
      star_evaluation,
      competency_ratings,
      hiring_recommendation: parsed.data.hiringRecommendation,
      status: "completed",
    })
    .eq("id", interviewId);

  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath(`/applications/${applicationId}`);
  return { success: true };
}

export interface GenerateInterviewSummaryResult extends ActionResult {
  summary?: string;
}

/** Interview Intelligence (Phase 8) AI Summary -- generated on demand from
 * whatever feedback/star_evaluation/competency_ratings already exist on the
 * interview (via the existing submitInterviewFeedback flow), persisted into
 * interviews.ai_summary (migration 0026) so it isn't regenerated on every view. */
export async function generateInterviewSummary(interviewId: string, applicationId: string): Promise<GenerateInterviewSummaryResult> {
  const ctx = await requireRecruiter();
  if (!ctx) return { success: false, error: "Only recruiters can generate an interview summary." };

  const { data: interview } = await ctx.supabase
    .from("interviews")
    .select(
      `feedback, star_evaluation, competency_ratings, interview_type,
      application:applications(job:jobs(title), candidate:candidates(profile:profiles(full_name)))`
    )
    .eq("id", interviewId)
    .single()
    .returns<{
      feedback: string | null;
      star_evaluation: StarEvaluation | null;
      competency_ratings: CompetencyRatings | null;
      interview_type: string;
      application: { job: { title: string } | null; candidate: { profile: { full_name: string } | null } | null } | null;
    }>();

  if (!interview) return { success: false, error: "Interview not found." };

  const summary = await summarizeInterview(interview.feedback, interview.star_evaluation, interview.competency_ratings, {
    jobTitle: interview.application?.job?.title ?? "the role",
    candidateName: interview.application?.candidate?.profile?.full_name ?? "the candidate",
    interviewType: interview.interview_type,
  });

  const { error } = await ctx.supabase.from("interviews").update({ ai_summary: summary }).eq("id", interviewId);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath(`/applications/${applicationId}`);
  return { success: true, summary };
}
