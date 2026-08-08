import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Message, Offer } from "@/types/database";

export interface CandidateThreadListItem {
  id: string;
  recruiter_id: string;
  job_id: string | null;
  subject: string | null;
  last_message_at: string;
  candidate_unread_count: number;
  recruiter_name: string;
  company_name: string;
  job_title: string | null;
  last_body: string | null;
}

export async function getCandidateThreads(candidateId: string): Promise<CandidateThreadListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_threads")
    .select(
      `id, recruiter_id, job_id, subject, last_message_at, candidate_unread_count,
       recruiter:recruiters(profile:profiles(full_name), company:companies(name)),
       job:jobs(title),
       messages(body, created_at)`
    )
    .eq("candidate_id", candidateId)
    .order("last_message_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((t) => {
    const recruiter = (Array.isArray(t.recruiter) ? t.recruiter[0] : t.recruiter) as unknown as
      | { profile: { full_name: string } | null; company: { name: string } | null }
      | null;
    const profile = recruiter
      ? (Array.isArray(recruiter.profile) ? recruiter.profile[0] : recruiter.profile) as unknown as { full_name: string } | null
      : null;
    const company = recruiter
      ? (Array.isArray(recruiter.company) ? recruiter.company[0] : recruiter.company) as unknown as { name: string } | null
      : null;
    const job = (Array.isArray(t.job) ? t.job[0] : t.job) as { title: string } | null;
    const msgs = (t.messages ?? []) as Array<{ body: string; created_at: string }>;
    const lastMsg = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    return {
      id: t.id,
      recruiter_id: t.recruiter_id,
      job_id: t.job_id,
      subject: t.subject,
      last_message_at: t.last_message_at,
      candidate_unread_count: t.candidate_unread_count,
      recruiter_name: profile?.full_name ?? "Recruiter",
      company_name: company?.name ?? "",
      job_title: job?.title ?? null,
      last_body: lastMsg?.body ?? null,
    };
  });
}

export async function getCandidateMessages(threadId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as Message[];
}

export interface CandidateOfferWithContext extends Offer {
  job: { id: string; title: string; location: string | null };
  company: { name: string; logo_url: string | null };
}

export async function getCandidateOffers(candidateId: string): Promise<CandidateOfferWithContext[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(`*, job:jobs(id, title, location), company:companies(name, logo_url)`)
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .returns<CandidateOfferWithContext[]>();
  return data ?? [];
}
