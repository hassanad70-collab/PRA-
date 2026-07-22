import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import type { Job, ParsedResumeData } from "@/types/database";

const matchAnalysisSchema = z.object({
  match_score: z.number().min(0).max(100),
  strengths: z.array(z.string()).describe("3-6 specific reasons this candidate fits the role"),
  weaknesses: z.array(z.string()).describe("2-5 gaps relative to the role requirements"),
  missing_skills: z.array(z.string()).describe("Required/nice-to-have skills the candidate does not demonstrate"),
  recommended_skills: z.array(z.string()).describe("Skills the candidate should learn to be a stronger fit"),
  match_reasons: z.array(z.string()).describe("Short bullet reasons summarizing the overall match"),
  interview_probability: z.number().min(0).max(100).describe("Estimated probability this candidate gets an interview"),
  ai_summary: z.string().describe("2-3 sentence recruiter-facing summary of this match"),
});

export type MatchAnalysisResult = z.infer<typeof matchAnalysisSchema>;

const SYSTEM_PROMPT = `You are an AI recruiter analyzing candidate-job fit for an enterprise ATS. Compare the candidate's profile against the job's requirements and produce a rigorous, specific match analysis. Be honest about gaps — do not inflate scores. match_score should reflect overall fit combining required skills coverage, experience level, and education requirements.`;

export function buildJobText(job: Pick<Job, "title" | "description" | "requirements" | "required_skills" | "nice_to_have_skills" | "experience_level" | "min_experience_years" | "education_requirement">) {
  return [
    `Title: ${job.title}`,
    `Experience level: ${job.experience_level}, minimum ${job.min_experience_years} years`,
    job.education_requirement ? `Education requirement: ${job.education_requirement}` : "",
    `Required skills: ${job.required_skills.join(", ")}`,
    job.nice_to_have_skills?.length ? `Nice to have: ${job.nice_to_have_skills.join(", ")}` : "",
    `Description: ${job.description}`,
    job.requirements?.length ? `Requirements: ${job.requirements.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCandidateText(parsed: ParsedResumeData, yearsOfExperience: number) {
  return [
    `Current position: ${parsed.current_position ?? "N/A"}`,
    `Years of experience: ${yearsOfExperience}`,
    `Summary: ${parsed.summary ?? "N/A"}`,
    `Skills: ${(parsed.skills ?? []).join(", ")}`,
    `Experience: ${(parsed.experience ?? [])
      .map((e) => `${e.job_title} at ${e.company_name} (${e.start_date ?? "?"} - ${e.end_date ?? "present"}): ${e.description ?? ""}`)
      .join(" | ")}`,
    `Education: ${(parsed.education ?? []).map((e) => `${e.degree ?? ""} ${e.field_of_study ?? ""} - ${e.institution}`).join(" | ")}`,
  ].join("\n");
}

/**
 * Deep AI analysis of a candidate/job pair. Combines with vector cosine
 * similarity (computed separately in SQL via match_jobs_for_resume /
 * match_candidates_for_job) to produce the final job_matches row.
 * Returns default analysis if OpenAI is not available.
 */
export async function analyzeJobMatch(
  job: Pick<Job, "title" | "description" | "requirements" | "required_skills" | "nice_to_have_skills" | "experience_level" | "min_experience_years" | "education_requirement">,
  parsed: ParsedResumeData,
  yearsOfExperience: number
): Promise<MatchAnalysisResult> {
  const fallback: MatchAnalysisResult = {
    match_score: 50,
    strengths: ["Resume data successfully extracted"],
    weaknesses: ["Enable OpenAI to get detailed match analysis"],
    missing_skills: [],
    recommended_skills: [],
    match_reasons: ["Add OpenAI API key to enable AI-powered matching"],
    interview_probability: 50,
    ai_summary: "Add your OpenAI API key to enable detailed match analysis.",
  };

  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning default job match analysis.");
    return fallback;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `JOB:\n${buildJobText(job)}\n\nCANDIDATE:\n${buildCandidateText(parsed, yearsOfExperience)}`,
        },
      ],
      response_format: zodResponseFormat(matchAnalysisSchema, "match_analysis"),
      temperature: 0.2,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("AI job matching returned no structured output.");
    return result;
  } catch (err) {
    console.error("analyzeJobMatch: OpenAI call failed", err);
    return fallback;
  }
}
