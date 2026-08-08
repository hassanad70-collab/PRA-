"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

// ----------------------------------------------------------------
// Shared: find or create a thread between a recruiter and candidate
// ----------------------------------------------------------------

async function findOrCreateThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recruiterId: string,
  candidateId: string,
  companyId: string,
  jobId?: string | null
): Promise<string> {
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("recruiter_id", recruiterId)
    .eq("candidate_id", candidateId)
    .single();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("message_threads")
    .insert({
      company_id: companyId,
      recruiter_id: recruiterId,
      candidate_id: candidateId,
      job_id: jobId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create thread");
  return data.id;
}

// ----------------------------------------------------------------
// Recruiter: send a message to a candidate
// ----------------------------------------------------------------

export async function recruiterSendMessageAction(
  candidateId: string,
  body: string,
  jobId?: string | null
): Promise<{ threadId: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) throw new Error("Forbidden");

  const supabase = await createClient();
  const threadId = await findOrCreateThread(supabase, recruiter.id, candidateId, recruiter.company_id, jobId);

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_role: "recruiter",
    sender_id: recruiter.id,
    body: body.trim(),
  });

  if (error) throw new Error(error.message);

  // Update thread metadata
  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      candidate_unread_count: supabase.rpc("coalesce", {}) as unknown as number, // bump via raw update
    })
    .eq("id", threadId);

  // Simple unread bump — increment candidate_unread_count
  await supabase.rpc("increment_unread" as never, { p_thread_id: threadId, p_role: "candidate" }).maybeSingle();

  revalidatePath("/recruiter/messages");
  return { threadId };
}

// ----------------------------------------------------------------
// Candidate: send a reply
// ----------------------------------------------------------------

export async function candidateSendMessageAction(
  threadId: string,
  body: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");

  const supabase = await createClient();

  // Verify this thread belongs to this candidate
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, recruiter_id")
    .eq("id", threadId)
    .eq("candidate_id", user.id)
    .single();

  if (!thread) throw new Error("Thread not found");

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_role: "candidate",
    sender_id: user.id,
    body: body.trim(),
  });

  if (error) throw new Error(error.message);

  await supabase
    .from("message_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/candidate/messages");
}

// ----------------------------------------------------------------
// Mark thread as read
// ----------------------------------------------------------------

export async function markThreadReadAction(threadId: string, role: "recruiter" | "candidate"): Promise<void> {
  const supabase = await createClient();
  const col = role === "recruiter" ? "recruiter_unread_count" : "candidate_unread_count";
  await supabase.from("message_threads").update({ [col]: 0 }).eq("id", threadId);
  await supabase.from("messages").update({ is_read: true }).eq("thread_id", threadId).neq("sender_role", role);
}
