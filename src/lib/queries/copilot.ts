import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getInterviewsForCompany } from "@/lib/queries/interviews";
import type { CopilotIntentResult } from "@/lib/ai/recruiter-copilot";

interface CopilotApplicationRow {
  id: string;
  status: string;
  job: { title: string } | null;
  candidate: { profile: { full_name: string } | null } | null;
  screening_result: {
    overall_score: number | null;
    leadership_score: number | null;
    interview_recommendation: string | null;
  } | null;
}

async function fetchCompanyApplications(companyId: string, roleKeyword?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select(
      `id, status,
      job:jobs!inner(title, company_id),
      candidate:candidates(profile:profiles(full_name)),
      screening_result:screening_results(overall_score, leadership_score, interview_recommendation)`
    )
    .eq("job.company_id", companyId)
    .limit(500);

  if (roleKeyword) query = query.ilike("job.title", `%${roleKeyword}%`);

  const { data, error } = await query.returns<CopilotApplicationRow[]>();
  if (error) {
    console.error("fetchCompanyApplications (copilot) failed", error);
    return [];
  }
  return data ?? [];
}

const TOP_N = 5;

export async function answerTopCandidates(companyId: string, roleKeyword: string | null): Promise<string> {
  const applications = await fetchCompanyApplications(companyId, roleKeyword);
  const ranked = applications
    .filter((a) => a.screening_result?.overall_score != null)
    .sort((a, b) => (b.screening_result!.overall_score ?? 0) - (a.screening_result!.overall_score ?? 0))
    .slice(0, TOP_N);

  if (!ranked.length) {
    return roleKeyword
      ? `No screened candidates found for roles matching "${roleKeyword}" yet.`
      : "No screened candidates in your pipeline yet.";
  }

  const lines = ranked.map(
    (a, i) => `${i + 1}. ${a.candidate?.profile?.full_name ?? "Candidate"} — score ${a.screening_result?.overall_score} — ${a.job?.title}`
  );
  return `${roleKeyword ? `Top candidates for "${roleKeyword}"` : "Top candidates in your pipeline"}:\n${lines.join("\n")}`;
}

export async function answerLeadershipExperience(companyId: string): Promise<string> {
  const applications = await fetchCompanyApplications(companyId, null);
  const withLeadership = applications
    .filter((a) => (a.screening_result?.leadership_score ?? 0) >= 70)
    .sort((a, b) => (b.screening_result?.leadership_score ?? 0) - (a.screening_result?.leadership_score ?? 0))
    .slice(0, TOP_N);

  if (!withLeadership.length) {
    return "No candidates with strong leadership scores found in your pipeline yet.";
  }

  const lines = withLeadership.map(
    (a) => `- ${a.candidate?.profile?.full_name ?? "Candidate"} — leadership score ${a.screening_result?.leadership_score} — ${a.job?.title}`
  );
  return `Candidates with strong leadership experience:\n${lines.join("\n")}`;
}

export async function answerInterviewPriority(companyId: string): Promise<string> {
  const supabase = await createClient();
  const applications = await fetchCompanyApplications(companyId, null);
  const notYetInterviewed = applications.filter((a) => !["hired", "rejected", "withdrawn", "interview", "offer"].includes(a.status));

  const { data: existingInterviews } = await supabase
    .from("interviews")
    .select("application_id")
    .in(
      "application_id",
      notYetInterviewed.map((a) => a.id)
    );
  const interviewedIds = new Set((existingInterviews ?? []).map((i) => i.application_id));

  const priority = notYetInterviewed
    .filter((a) => !interviewedIds.has(a.id))
    .filter((a) => a.screening_result?.interview_recommendation != null)
    .sort((a, b) => (b.screening_result?.overall_score ?? 0) - (a.screening_result?.overall_score ?? 0))
    .slice(0, TOP_N);

  if (!priority.length) {
    return "No pending candidates are ready for an interview decision right now.";
  }

  const lines = priority.map(
    (a, i) =>
      `${i + 1}. ${a.candidate?.profile?.full_name ?? "Candidate"} — ${a.screening_result?.interview_recommendation?.replace("_", " ")} — ${a.job?.title}`
  );
  return `Recommended interview order:\n${lines.join("\n")}`;
}

export async function answerMissingSkills(companyId: string): Promise<string> {
  const supabase = await createClient();
  const { data: jobIds } = await supabase.from("jobs").select("id").eq("company_id", companyId);
  const ids = (jobIds ?? []).map((j) => j.id);
  if (!ids.length) return "No open jobs to analyze yet.";

  const { data: matches } = await supabase.from("job_matches").select("missing_skills").in("job_id", ids);
  const counts = new Map<string, number>();
  (matches ?? []).forEach((m) => {
    (m.missing_skills ?? []).forEach((s: string) => counts.set(s, (counts.get(s) ?? 0) + 1));
  });

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!top.length) return "No missing-skills data available for your pipeline yet.";

  return `Most common missing skills across your pipeline:\n${top.map(([skill, count]) => `- ${skill} (${count} candidates)`).join("\n")}`;
}

export async function answerTodaysInterviews(companyId: string): Promise<string> {
  const interviews = await getInterviewsForCompany(companyId);
  const now = new Date();
  const todays = interviews.filter((iv) => {
    const d = new Date(iv.scheduled_at);
    return d.toDateString() === now.toDateString();
  });

  if (!todays.length) return "No interviews scheduled today.";

  const lines = todays.map(
    (iv) =>
      `- ${new Date(iv.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${
        iv.application?.candidate?.profile?.full_name ?? "Candidate"
      } for ${iv.application?.job?.title} (${iv.status})`
  );
  return `Today's interviews (${todays.length}):\n${lines.join("\n")}`;
}

export async function answerCopilotIntent(companyId: string, result: CopilotIntentResult): Promise<string> {
  switch (result.intent) {
    case "top_candidates":
      return answerTopCandidates(companyId, result.role_keyword);
    case "leadership_experience":
      return answerLeadershipExperience(companyId);
    case "interview_priority":
      return answerInterviewPriority(companyId);
    case "missing_skills":
      return answerMissingSkills(companyId);
    case "todays_interviews":
      return answerTodaysInterviews(companyId);
    case "unsupported":
    default:
      return "I can help with: top candidates (overall or for a specific role), leadership experience, who to interview first, missing skills in your pipeline, or a summary of today's interviews. Try rephrasing your question along those lines.";
  }
}
