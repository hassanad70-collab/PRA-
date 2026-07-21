import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import type { ParsedResumeData } from "@/types/database";

const atsScoreSchema = z.object({
  overall_score: z.number().min(0).max(100),
  experience_score: z.number().min(0).max(100),
  skills_score: z.number().min(0).max(100),
  formatting_score: z.number().min(0).max(100),
  education_score: z.number().min(0).max(100),
  achievements_score: z.number().min(0).max(100),
  recruiter_readability_score: z.number().min(0).max(100),
  keyword_density: z
    .array(z.object({ keyword: z.string(), count: z.number() }))
    .describe("Top 10 most relevant keywords found and their occurrence count"),
  weaknesses: z.array(z.string()).describe("3-6 concrete weaknesses of this resume"),
  suggestions: z.array(z.string()).describe("3-6 concrete, actionable suggestions to improve the resume"),
});

export type AtsScoreResult = z.infer<typeof atsScoreSchema>;

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume auditor used by an enterprise recruiting platform. Score the resume objectively on a 0-100 scale for each dimension:
- experience_score: relevance, seniority progression, and depth of the work history.
- skills_score: breadth and market relevance of listed/demonstrated skills.
- formatting_score: ATS-parseability — clear sections, consistent dates, no dense paragraphs, appropriate length.
- education_score: relevance and completeness of educational background.
- achievements_score: presence of quantified, outcome-driven achievements (numbers, %, impact) vs. generic duty descriptions.
- recruiter_readability_score: how quickly a human recruiter could understand this candidate's fit in a 10-second skim.
- overall_score: a holistic weighted score reflecting general ATS + recruiter competitiveness.
Be specific and critical in weaknesses/suggestions — avoid generic advice.`;

/**
 * Generates a full AI ATS score for a resume: overall + sub-scores, keyword
 * density, weaknesses, and improvement suggestions.
 * Returns default scores if OpenAI is not available.
 */
export async function scoreResumeATS(rawText: string, parsed: ParsedResumeData): Promise<AtsScoreResult> {
  const openai = getOpenAI();

  if (!openai) {
    console.warn("OpenAI API not configured. Returning default ATS scores.");
    return {
      overall_score: 50,
      experience_score: 50,
      skills_score: 50,
      formatting_score: 50,
      education_score: 50,
      achievements_score: 50,
      recruiter_readability_score: 50,
      keyword_density: [],
      weaknesses: ["Enable OpenAI API to get detailed resume analysis"],
      suggestions: ["Add your OpenAI API key to .env.local to enable AI-powered resume scoring"],
    };
  }

  const completion = await openai.beta.chat.completions.parse({
    model: AI_MODELS.reasoning,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Raw resume text:\n\n${rawText.slice(0, 18000)}\n\nStructured extraction (for reference):\n${JSON.stringify(
          parsed
        ).slice(0, 4000)}`,
      },
    ],
    response_format: zodResponseFormat(atsScoreSchema, "ats_score"),
    temperature: 0.2,
  });

  const result = completion.choices[0].message.parsed;
  if (!result) throw new Error("AI ATS scoring returned no structured output.");
  return result;
}
