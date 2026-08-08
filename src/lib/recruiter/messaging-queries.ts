import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Message, MessageThread, OfferWithContext } from "@/types/database";

export interface ThreadListItem {
  id: string;
  candidate_id: string;
  job_id: string | null;
  subject: string | null;
  last_message_at: string;
  recruiter_unread_count: number;
  candidate_name: string;
  candidate_email: string;
  job_title: string | null;
  last_body: string | null;
}

export async function getRecruiterThreads(recruiterId: string): Promise<ThreadListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_threads")
    .select(
      `id, candidate_id, job_id, subject, last_message_at, recruiter_unread_count,
       candidate:candidates(profile:profiles(full_name, email)),
       job:jobs(title),
       messages(body, created_at)`
    )
    .eq("recruiter_id", recruiterId)
    .order("last_message_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((t) => {
    const candidate = (Array.isArray(t.candidate) ? t.candidate[0] : t.candidate) as unknown as
      | { profile: { full_name: string; email: string } | null }
      | null;
    const profile = candidate
      ? (Array.isArray(candidate.profile) ? candidate.profile[0] : candidate.profile) as unknown as
          | { full_name: string; email: string }
          | null
      : null;
    const job = (Array.isArray(t.job) ? t.job[0] : t.job) as { title: string } | null;
    const msgs = (t.messages ?? []) as Array<{ body: string; created_at: string }>;
    const lastMsg = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    return {
      id: t.id,
      candidate_id: t.candidate_id,
      job_id: t.job_id,
      subject: t.subject,
      last_message_at: t.last_message_at,
      recruiter_unread_count: t.recruiter_unread_count,
      candidate_name: profile?.full_name ?? "Candidate",
      candidate_email: profile?.email ?? "",
      job_title: job?.title ?? null,
      last_body: lastMsg?.body ?? null,
    };
  });
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as Message[];
}

export async function getThread(threadId: string): Promise<MessageThread | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();
  return data as MessageThread | null;
}

export async function getOffersForCompany(companyId: string): Promise<OfferWithContext[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(
      `*, job:jobs(id, title, location), candidate:candidates(id, profile:profiles(full_name, email)), recruiter:recruiters(profile:profiles(full_name, email))`
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<OfferWithContext[]>();
  return data ?? [];
}

export async function getOffersForJob(jobId: string): Promise<OfferWithContext[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(
      `*, job:jobs(id, title, location), candidate:candidates(id, profile:profiles(full_name, email)), recruiter:recruiters(profile:profiles(full_name, email))`
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .returns<OfferWithContext[]>();
  return data ?? [];
}

export async function getOfferTemplates(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offer_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
