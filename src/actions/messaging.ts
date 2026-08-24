"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { dispatchNotification } from "@/lib/notifications/dispatch";

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

  // Fire-and-forget: notify candidate of new message
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pra-eta-umber.vercel.app";
  dispatchNotification({
    userId: candidateId,
    type: "system",
    title: "New message from recruiter",
    message: `${recruiter.company?.name ?? "A recruiter"} sent you a message.`,
    link: "/candidate/messages",
    email: {
      subject: "You have a new message on PRA Talent Intelligence",
      htmlBody: `<p>You have received a new message from <strong>${recruiter.company?.name ?? "a recruiter"}</strong> on PRA Talent Intelligence.</p><p><a href="${siteUrl}/en/candidate/messages">View message</a></p>`,
      textBody: `You have a new message from ${recruiter.company?.name ?? "a recruiter"} on PRA Talent Intelligence. Visit ${siteUrl}/en/candidate/messages to read it.`,
    },
  });

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

  // Fire-and-forget: notify recruiter of candidate reply
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pra-eta-umber.vercel.app";
  dispatchNotification({
    userId: thread.recruiter_id,
    type: "system",
    title: "New message from candidate",
    message: "A candidate replied to your message.",
    link: "/recruiter/messages",
    email: {
      subject: "A candidate replied on PRA Talent Intelligence",
      htmlBody: `<p>A candidate has replied to your message on PRA Talent Intelligence.</p><p><a href="${siteUrl}/en/recruiter/messages">View message</a></p>`,
      textBody: `A candidate replied to your message on PRA Talent Intelligence. Visit ${siteUrl}/en/recruiter/messages to read it.`,
    },
  });

  revalidatePath("/candidate/messages");
}

// ----------------------------------------------------------------
// Mark thread as read
// ----------------------------------------------------------------

export async function markThreadReadAction(threadId: string, role: "recruiter" | "candidate"): Promise<void> {
  const supabase = await createClient();

  // Auth guard: require a valid session before touching any data.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const col = role === "recruiter" ? "recruiter_unread_count" : "candidate_unread_count";
  const threadOwnerCol = role === "recruiter" ? "recruiter_id" : "candidate_id";

  // Only zero out the unread count if the calling user actually owns this side
  // of the thread. The extra .eq(threadOwnerCol, user.id) means a candidate
  // cannot reset a recruiter's unread counter and vice-versa.
  await supabase
    .from("message_threads")
    .update({ [col]: 0 })
    .eq("id", threadId)
    .eq(threadOwnerCol, user.id);

  // Mark the other party's messages as read. RLS on messages ensures this user
  // is a thread member before allowing the update.
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .neq("sender_role", role);
}
