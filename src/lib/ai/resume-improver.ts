import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import type { ParsedResumeData } from "@/types/database";

const improvementSchema = z.object({
  improved_summary: z.string(),
  improved_experience: z.array(
    z.object({
      company_name: z.string(),
      job_title: z.string(),
      improved_bullets: z.array(z.string()).describe("Rewritten, achievement-driven bullet points"),
    })
  ),
  suggested_missing_skills: z.array(z.string()),
  ats_keywords_to_add: z.array(z.string()),
  grammar_fixes: z.array(z.string()).describe("Notable grammar/clarity issues found and how they were fixed"),
  generated_achievement_statements: z.array(z.string()).describe("New quantified achievement statements the candidate could add, based on their experience"),
});

export type ResumeImprovementResult = z.infer<typeof improvementSchema>;

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist. Given a candidate's parsed resume, rewrite it to be more competitive:
- Rewrite the professional summary to be punchy, specific, and keyword-rich.
- Rewrite each role's bullet points to be achievement-driven (action verb + what was done + quantified impact where plausible).
- Fix grammar and clarity issues.
- Suggest ATS keywords relevant to the candidate's field that are currently missing.
- Suggest skills the candidate is likely close to but doesn't list.
- Generate 2-4 new achievement statement ideas grounded in their actual experience (label them clearly as suggestions, not fabricated facts to insert unverified).
Never invent employers, titles, or dates that are not in the original data.`;

/**
 * Powers the "Improve My Resume" feature: rewrites summary/experience,
 * suggests missing skills, ATS keywords, and generates achievement
 * statement ideas. Returns placeholder content if OpenAI is not available.
 */
export async function improveResume(parsed: ParsedResumeData): Promise<ResumeImprovementResult> {
  const fallback: ResumeImprovementResult = {
    improved_summary: "Enable OpenAI API key to get AI-powered resume improvements.",
    improved_experience: (parsed.experience ?? []).map((exp) => ({
      company_name: exp.company_name,
      job_title: exp.job_title,
      improved_bullets: ["Add OpenAI API key to enable resume rewriting suggestions"],
    })),
    suggested_missing_skills: [],
    ats_keywords_to_add: [],
    grammar_fixes: [],
    generated_achievement_statements: [],
  };

  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Resume improvement unavailable.");
    return fallback;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Candidate resume data:\n${JSON.stringify(parsed, null, 2).slice(0, 12000)}` },
      ],
      response_format: zodResponseFormat(improvementSchema, "resume_improvement"),
      temperature: 0.4,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("AI resume improvement returned no structured output.");
    return result;
  } catch (err) {
    console.error("improveResume: OpenAI call failed", err);
    return fallback;
  }
}
