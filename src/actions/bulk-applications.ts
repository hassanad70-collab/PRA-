"use server";

import { generateCandidateMessage, type CandidateMessageDraft, type CandidateMessageType } from "@/lib/ai/candidate-message-drafter";
import { revalidateRecruiterPath } from "@/lib/revalidate-recruiter-path";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";
import type { ApplicationStatus } from "@/types/database";

/**
 * Bulk Recruiter Actions (Recruiter Intelligence v2.0, Phase 7). Every
 * action here wraps the exact same single-row logic/validation already
 * established elsewhere in this codebase (updateApplicationStatus,
 * scheduleInterview, talent_pool upserts) over an array of ids, rather than
 * introducing a parallel bulk-specific business rule.
 */

async function requireRecruiterContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: recruiter } = await supabase.from("recruiters").select("id, company_id").eq("id", user.id).maybeSingle();
  if (!recruiter) return null;

  return { supabase, userId: user.id, companyId: recruiter.company_id };
}

export async function bulkUpdateApplicationStatus(applicationIds: string[], status: ApplicationStatus): Promise<ActionResult> {
  const ctx = await requireRecruiterContext();
  if (!ctx) return { success: false, error: "Only recruiters can update applications." };
  if (!applicationIds.length) return { success: false, error: "No applications selected." };

  // RLS (company-scoped) is the real authorization boundary here, same as
  // the single-application updateApplicationStatus -- this simply applies
  // the same update to every row the caller is allowed to touch.
  const { error } = await ctx.supabase.from("applications").update({ status }).in("id", applicationIds);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath("", "layout");
  return { success: true };
}

export async function bulkAssignRecruiter(applicationIds: string[], recruiterId: string | null): Promise<ActionResult> {
  const ctx = await requireRecruiterContext();
  if (!ctx) return { success: false, error: "Only recruiters can assign teammates." };
  if (!applicationIds.length) return { success: false, error: "No applications selected." };

  const { error } = await ctx.supabase.from("applications").update({ assigned_recruiter_id: recruiterId }).in("id", applicationIds);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath("", "layout");
  return { success: true };
}

export async function bulkTagCandidates(candidateIds: string[], tags: string[]): Promise<ActionResult> {
  const ctx = await requireRecruiterContext();
  if (!ctx) return { success: false, error: "Only recruiters can tag candidates." };
  if (!candidateIds.length) return { success: false, error: "No candidates selected." };

  const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
  if (!cleanTags.length) return { success: false, error: "Enter at least one tag." };

  // talent_pool already models "candidates a company is tracking" with a
  // tags[] column (used today by the Talent Pool page) -- reused as-is
  // rather than introducing a separate applications-level tag table.
  for (const candidateId of candidateIds) {
    const { data: existing } = await ctx.supabase
      .from("talent_pool")
      .select("id, tags")
      .eq("candidate_id", candidateId)
      .eq("company_id", ctx.companyId)
      .maybeSingle();

    if (existing) {
      const merged = Array.from(new Set([...(existing.tags ?? []), ...cleanTags]));
      await ctx.supabase.from("talent_pool").update({ tags: merged }).eq("id", existing.id);
    } else {
      await ctx.supabase
        .from("talent_pool")
        .insert({ candidate_id: candidateId, company_id: ctx.companyId, saved_by: ctx.userId, tags: cleanTags });
    }
  }

  revalidateRecruiterPath("/talent-pool");
  return { success: true };
}

export async function bulkScheduleInterviews(
  applicationIds: string[],
  input: { scheduledAt: string; durationMinutes: number; interviewType: string; locationOrLink?: string }
): Promise<ActionResult> {
  const ctx = await requireRecruiterContext();
  if (!ctx) return { success: false, error: "Only recruiters can schedule interviews." };
  if (!applicationIds.length) return { success: false, error: "No applications selected." };

  const rows = applicationIds.map((applicationId) => ({
    application_id: applicationId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    duration_minutes: input.durationMinutes,
    interview_type: input.interviewType,
    location_or_link: input.locationOrLink || null,
    created_by: ctx.userId,
  }));

  const { error } = await ctx.supabase.from("interviews").insert(rows);
  if (error) return { success: false, error: error.message };

  await ctx.supabase
    .from("applications")
    .update({ status: "interview" })
    .in("id", applicationIds)
    .in("status", ["submitted", "screening", "shortlisted"]);

  revalidateRecruiterPath("", "layout");
  return { success: true };
}

export interface BulkDraftEmailResult extends ActionResult {
  draft?: CandidateMessageDraft;
  recipientEmails?: string[];
}

/** Drafts ONE generic message (not personalized per candidate -- bulk
 * personalization would mean N AI calls for what's meant to be a fast bulk
 * action) using a placeholder candidate name, plus the list of recipient
 * emails for the recruiter to BCC/send themselves. interview_invite is
 * intentionally not offered here since it needs a specific scheduled
 * interview per candidate -- use the existing single-candidate draft flow
 * for that after bulk-scheduling. */
export async function bulkDraftEmail(
  applicationIds: string[],
  messageType: Extract<CandidateMessageType, "rejection" | "offer">
): Promise<BulkDraftEmailResult> {
  const ctx = await requireRecruiterContext();
  if (!ctx) return { success: false, error: "Only recruiters can draft messages." };
  if (!applicationIds.length) return { success: false, error: "No applications selected." };

  const { data: apps } = await ctx.supabase
    .from("applications")
    .select("job:jobs(title, company:companies(name)), candidate:candidates(profile:profiles(email, full_name))")
    .in("id", applicationIds)
    .returns<{ job: { title: string; company: { name: string } | null } | null; candidate: { profile: { email: string; full_name: string } | null } | null }[]>();

  if (!apps?.length || !apps[0].job) return { success: false, error: "Could not load the selected applications." };

  const recipientEmails = apps.map((a) => a.candidate?.profile?.email).filter((e): e is string => Boolean(e));

  const draft = await generateCandidateMessage(messageType, {
    candidateName: "[Candidate Name]",
    jobTitle: apps[0].job.title,
    companyName: apps[0].job.company?.name ?? "our company",
    recruiterName: "The hiring team",
  });

  return { success: true, draft, recipientEmails };
}
