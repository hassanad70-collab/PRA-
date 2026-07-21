import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import type { Job, ParsedResumeData } from "@/types/database";
import { buildCandidateText, buildJobText } from "./job-matcher";

const screeningSchema = z.object({
  overall_score: z.number().min(0).max(100),
  experience_score: z.number().min(0).max(100),
  skill_match_score: z.number().min(0).max(100),
  education_match_score: z.number().min(0).max(100),
  culture_fit_score: z.number().min(0).max(100).describe("Estimated based on tone, career choices, and stated values"),
  leadership_score: z.number().min(0).max(100).describe("Evidence of leadership, ownership, mentoring, or management"),
  communication_score: z.number().min(0).max(100).describe("Clarity and quality of written communication in the resume"),
  technical_score: z.number().min(0).max(100),
  ai_summary: z.string().describe("3-4 sentence recruiter-facing screening summary"),
  interview_recommendation: z.enum(["strong_yes", "yes", "neutral", "no", "strong_no"]),
});

export type ScreeningResultAI = z.infer<typeof screeningSchema>;

const SYSTEM_PROMPT = `You are an AI screening engine for an enterprise ATS, evaluating a candidate who has formally applied to a role. Provide rigorous, unbiased scores across each competency dimension based only on evidence in the resume. Do not consider name, gender, ethnicity-coded information, or age — evaluate skills and experience only. interview_recommendation should reflect your holistic judgement of whether this candidate merits a human interview.`;

/**
 * Runs a deeper AI screening pass once a candidate formally applies to a
 * job (as opposed to the lighter-weight passive job_matches scoring that
 * runs against every active job). Returns default scores if OpenAI is not available.
 */
export async function runAIScreening(
  job: Pick<Job, "title" | "description" | "requirements" | "required_skills" | "nice_to_have_skills" | "experience_level" | "min_experience_years" | "education_requirement">,
  parsed: ParsedResumeData,
  yearsOfExperience: number
): Promise<ScreeningResultAI> {
  const openai = getOpenAI();

  if (!openai) {
    console.warn("OpenAI API not configured. Returning default screening scores.");
    return {
      overall_score: 50,
      experience_score: 50,
      skill_match_score: 50,
      education_match_score: 50,
      culture_fit_score: 50,
      leadership_score: 50,
      communication_score: 50,
      technical_score: 50,
      ai_summary: "Enable OpenAI API key to enable detailed AI screening.",
      interview_recommendation: "neutral",
    };
  }

  const completion = await openai.beta.chat.completions.parse({
    model: AI_MODELS.reasoning,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `JOB:\n${buildJobText(job)}\n\nCANDIDATE:\n${buildCandidateText(parsed, yearsOfExperience)}`,
      },
    ],
    response_format: zodResponseFormat(screeningSchema, "screening_result"),
    temperature: 0.2,
  });

  const result = completion.choices[0].message.parsed;
  if (!result) throw new Error("AI screening returned no structured output.");
  return result;
}
