"use server";

import { generateCandidateMessage, type CandidateMessageDraft, type CandidateMessageType } from "@/lib/ai/candidate-message-drafter";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

// This project's Supabase client has no generated `Database` generic (see
// src/lib/queries/jobs.ts's getPublishedJobs for the full explanation), so
// narrowing this nested embed away from "*, relation(*)" needs an explicit
// `.returns<T>()` to keep postgrest-js's fallback parser from misinferring
// `job`/`candidate` as arrays instead of nullable objects.
interface ApplicationMessageContext {
  job: { title: string; company: { name: string } | null } | null;
  candidate: { profile: { full_name: string } | null } | null;
}

/**
 * Drafts candidate-facing message text for a recruiter to review and send
 * through their own email client. Reads all context through the caller's
 * own RLS-scoped session (not the admin client), so a recruiter can never
 * draft a message for an application outside their company -- the query
 * below simply returns nothing for one.
 */
export async function draftCandidateMessage(
  applicationId: string,
  messageType: CandidateMessageType
): Promise<ActionResult & { draft?: CandidateMessageDraft }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: recruiter } = await supabase.from("recruiters").select("id").eq("id", user.id).single();
  if (!recruiter) return { success: false, error: "Only recruiters can draft candidate messages." };

  const { data: app } = await supabase
    .from("applications")
    .select("job:jobs(title, company:companies(name)), candidate:candidates(profile:profiles(full_name))")
    .eq("id", applicationId)
    .maybeSingle()
    .returns<ApplicationMessageContext>();
  if (!app?.job) return { success: false, error: "Application not found." };

  let interviewContext;
  if (messageType === "interview_invite") {
    const { data: interview } = await supabase
      .from("interviews")
      .select("scheduled_at, interview_type, location_or_link")
      .eq("application_id", applicationId)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!interview) return { success: false, error: "Schedule an interview first so its details can be included." };
    interviewContext = {
      scheduledAt: interview.scheduled_at,
      interviewType: interview.interview_type,
      locationOrLink: interview.location_or_link,
    };
  }

  const draft = await generateCandidateMessage(messageType, {
    candidateName: app.candidate?.profile?.full_name ?? "the candidate",
    jobTitle: app.job.title,
    companyName: app.job.company?.name ?? "our company",
    recruiterName: user.user_metadata?.full_name ?? "The hiring team",
    interview: interviewContext,
  });

  return { success: true, draft };
}
