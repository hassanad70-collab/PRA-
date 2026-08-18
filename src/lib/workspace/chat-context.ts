import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { getActiveGoal, getLatestAssessment } from "@/lib/queries/career-coach";

export interface ContextResult {
  systemContext: string;
  sourceLabels: string[];
}

/**
 * Assembles only the context sources relevant to the given domain.
 * Keeps token count low, latency low, and context quality high.
 */
export async function assembleContextForDomain(
  userId: string,
  domain: string
): Promise<ContextResult> {
  switch (domain) {
    case "resume":
      return assembleResumeContext(userId);
    case "ats":
      return assembleAtsContext(userId);
    case "cover-letter":
      return assembleCoverLetterContext(userId);
    case "interview":
      return assembleInterviewContext(userId);
    case "career":
      return assembleCareerContext(userId);
    case "job-search":
      return assembleJobSearchContext(userId);
    default:
      return assembleGeneralContext(userId);
  }
}

// ─── Domain-specific assemblers ──────────────────────────────────────────────

async function assembleGeneralContext(userId: string): Promise<ContextResult> {
  const [resume, profile] = await Promise.all([
    getWorkspaceResume(userId),
    getProfileHeadline(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (profile) {
    parts.push(`Candidate profile: ${profile}`);
    labels.push("Profile");
  }
  if (resume?.raw_text) {
    parts.push(`Resume summary:\n---\n${resume.raw_text.slice(0, 1500)}\n---`);
    labels.push("Resume");
  }

  return build(parts, labels);
}

async function assembleResumeContext(userId: string): Promise<ContextResult> {
  const resume = await getWorkspaceResume(userId);
  if (!resume?.raw_text) {
    return {
      systemContext: "The candidate has not uploaded a resume yet. Encourage them to upload one at /candidate/workspace/resumes.",
      sourceLabels: [],
    };
  }
  return build(
    [`Candidate resume:\n---\n${resume.raw_text.slice(0, 4000)}\n---`],
    ["Resume"]
  );
}

async function assembleAtsContext(userId: string): Promise<ContextResult> {
  const [resume, atsScore] = await Promise.all([
    getWorkspaceResume(userId),
    getLatestAtsScore(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (resume?.raw_text) {
    parts.push(`Candidate resume:\n---\n${resume.raw_text.slice(0, 3000)}\n---`);
    labels.push("Resume");
  }
  if (atsScore !== null) {
    parts.push(`Latest ATS score: ${atsScore}/100`);
    labels.push("ATS Score");
  }

  return build(parts, labels);
}

async function assembleCoverLetterContext(userId: string): Promise<ContextResult> {
  const [resume, latestApp] = await Promise.all([
    getWorkspaceResume(userId),
    getLatestApplication(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (resume?.raw_text) {
    parts.push(`Candidate resume:\n---\n${resume.raw_text.slice(0, 2000)}\n---`);
    labels.push("Resume");
  }
  if (latestApp) {
    parts.push(`Most recent application: ${latestApp.role} at ${latestApp.company}`);
    labels.push("Target Role");
  }

  return build(parts, labels);
}

async function assembleInterviewContext(userId: string): Promise<ContextResult> {
  const [resume, latestApp] = await Promise.all([
    getWorkspaceResume(userId),
    getLatestApplication(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (resume?.raw_text) {
    parts.push(`Candidate resume:\n---\n${resume.raw_text.slice(0, 2000)}\n---`);
    labels.push("Resume");
  }
  if (latestApp) {
    parts.push(`Interviewing for: ${latestApp.role} at ${latestApp.company} (status: ${latestApp.status})`);
    labels.push("Application");
  }

  return build(parts, labels);
}

async function assembleCareerContext(userId: string): Promise<ContextResult> {
  const [resume, profile, activeGoal] = await Promise.all([
    getWorkspaceResume(userId),
    getProfileHeadline(userId),
    getActiveGoal(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (profile) {
    parts.push(`Candidate profile: ${profile}`);
    labels.push("Profile");
  }
  if (resume?.raw_text) {
    parts.push(`Resume overview:\n---\n${resume.raw_text.slice(0, 1500)}\n---`);
    labels.push("Resume");
  }

  if (activeGoal) {
    const goalLines = [
      `Career goal: "${activeGoal.title}"`,
      `Target role: ${activeGoal.target_role}`,
      activeGoal.current_role && `Current role: ${activeGoal.current_role}`,
      activeGoal.target_date && `Target date: ${activeGoal.target_date}`,
    ].filter(Boolean).join("; ");
    parts.push(goalLines);
    labels.push("Career Goal");

    const assessment = await getLatestAssessment(userId, activeGoal.id);
    if (assessment) {
      const assessLines = [
        assessment.strengths.length && `Strengths: ${assessment.strengths.slice(0, 3).join(", ")}`,
        assessment.skill_gaps.length && `Key skill gaps: ${assessment.skill_gaps.slice(0, 4).map((g) => g.skill).join(", ")}`,
        assessment.suggested_roles.length && `Suggested roles: ${assessment.suggested_roles.slice(0, 3).join(", ")}`,
      ].filter(Boolean).join(". ");
      if (assessLines) {
        parts.push(`Career assessment summary: ${assessLines}`);
        labels.push("Assessment");
      }
    }
  }

  return build(parts, labels);
}

async function assembleJobSearchContext(userId: string): Promise<ContextResult> {
  const [profile, appStats] = await Promise.all([
    getProfileHeadline(userId),
    getApplicationStats(userId),
  ]);

  const parts: string[] = [];
  const labels: string[] = [];

  if (profile) {
    parts.push(`Candidate profile: ${profile}`);
    labels.push("Profile");
  }
  if (appStats) {
    parts.push(`Application activity: ${appStats}`);
    labels.push("Applications");
  }

  return build(parts, labels);
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getProfileHeadline(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("current_position, years_of_experience")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  const parts = [data.full_name];
  if (candidate?.current_position) parts.push(`currently ${candidate.current_position}`);
  if (candidate?.years_of_experience != null) parts.push(`${candidate.years_of_experience} years experience`);
  return parts.join(", ");
}

async function getLatestAtsScore(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ats_scores")
    .select("overall_score")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.overall_score ?? null;
}

async function getLatestApplication(
  userId: string
): Promise<{ role: string; company: string; status: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("status, job:jobs(title, company:companies(name))")
    .eq("candidate_id", userId)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const job = data.job as unknown as { title: string; company: { name: string } | null } | null;
  if (!job) return null;
  return {
    role: job.title,
    company: job.company?.name ?? "Unknown Company",
    status: data.status,
  };
}

async function getApplicationStats(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("status")
    .eq("candidate_id", userId)
    .order("applied_at", { ascending: false })
    .limit(20);

  if (!data?.length) return null;
  const total = data.length;
  const active = data.filter((a) => ["pending", "reviewing", "interview"].includes(a.status)).length;
  return `${total} total applications, ${active} active`;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

function build(parts: string[], labels: string[]): ContextResult {
  return {
    systemContext: parts.length > 0 ? parts.join("\n\n") : "",
    sourceLabels: labels,
  };
}
