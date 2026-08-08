import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ActivityEventType = "application" | "message" | "offer_response";

export interface ActivityItem {
  id: string;
  type: ActivityEventType;
  icon: string;
  title: string;
  subtitle: string | null;
  href: string;
  occurred_at: string;
}

async function getCompanyJobIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<string[]> {
  const { data } = await supabase.from("jobs").select("id").eq("company_id", companyId);
  return data?.map((j) => j.id) ?? [];
}

export async function getRecentActivity(companyId: string, hours = 24): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const jobIds = await getCompanyJobIds(supabase, companyId);
  if (!jobIds.length) return [];

  const [appsRes, messagesRes, offersRes] = await Promise.all([
    // New applications
    supabase
      .from("applications")
      .select("id, submitted_at, job_id, jobs(title)")
      .in("job_id", jobIds)
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .limit(15),

    // Candidate messages (recruiter needs to see)
    supabase
      .from("messages")
      .select("id, created_at, body, thread:message_threads!inner(company_id, job_id, jobs(title))")
      .eq("message_threads.company_id", companyId)
      .eq("sender_role", "candidate")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(15),

    // Offer responses
    supabase
      .from("offers")
      .select("id, responded_at, status, offer_title, job_id, jobs(title)")
      .eq("company_id", companyId)
      .in("status", ["accepted", "declined"])
      .gte("responded_at", since)
      .order("responded_at", { ascending: false })
      .limit(15),
  ]);

  const items: ActivityItem[] = [];

  for (const app of appsRes.data ?? []) {
    const job = (Array.isArray(app.jobs) ? app.jobs[0] : app.jobs) as { title: string } | null;
    items.push({
      id: `app-${app.id}`,
      type: "application",
      icon: "📥",
      title: "New application received",
      subtitle: job?.title ?? null,
      href: `/recruiter/applications/${app.id}`,
      occurred_at: app.submitted_at ?? app.id,
    });
  }

  for (const msg of messagesRes.data ?? []) {
    const thread = (Array.isArray(msg.thread) ? msg.thread[0] : msg.thread) as
      | { job_id: string | null; jobs: { title: string } | { title: string }[] | null }
      | null;
    const job = thread?.jobs
      ? (Array.isArray(thread.jobs) ? thread.jobs[0] : thread.jobs) as { title: string } | null
      : null;
    items.push({
      id: `msg-${msg.id}`,
      type: "message",
      icon: "💬",
      title: "New message from candidate",
      subtitle: job?.title ?? null,
      href: `/recruiter/messages`,
      occurred_at: msg.created_at,
    });
  }

  for (const offer of offersRes.data ?? []) {
    const job = (Array.isArray(offer.jobs) ? offer.jobs[0] : offer.jobs) as { title: string } | null;
    const verb = offer.status === "accepted" ? "accepted" : "declined";
    items.push({
      id: `offer-${offer.id}`,
      type: "offer_response",
      icon: offer.status === "accepted" ? "🎉" : "❌",
      title: `Offer ${verb}`,
      subtitle: job?.title ?? offer.offer_title,
      href: `/recruiter/offers`,
      occurred_at: offer.responded_at!,
    });
  }

  // Merge + sort by occurred_at desc, limit 20
  items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  return items.slice(0, 20);
}
