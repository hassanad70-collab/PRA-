import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

/**
 * Focused, single-purpose generators for the Resume Intelligence Hub's
 * "Rewrite & Optimize" module -- the achievement and ATS-keyword
 * counterparts to resume-builder.ts's generateSummarySuggestion /
 * generateExperienceSuggestion / generateSkillsSuggestion (reused there
 * unchanged for the Summary/Bullet/Skills tools instead of being
 * reimplemented here, since they already produce exactly this shape from
 * the same kind of profile data). This replaces the old bundled
 * improveResume() call -- splitting it up means each tool can be
 * regenerated and reviewed independently, matching the accept/reject
 * workflow already proven by the Resume Builder's per-section suggestions.
 */

interface ExperienceInput {
  company_name: string;
  job_title: string;
  description?: string | null;
}

const achievementsSchema = z.object({
  statements: z
    .array(z.string())
    .describe(
      "2-4 new, quantified achievement statement ideas grounded in the candidate's actual experience -- suggestions only, never fabricated facts to insert unverified."
    ),
});

export async function generateAchievementStatements(input: {
  summary?: string | null;
  experience: ExperienceInput[];
}): Promise<string[]> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("resume-improver.generateAchievementStatements");
    return [];
  }
  if (!input.experience.length) return [];

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer. Based on the candidate's summary and work experience, generate 2-4 new quantified achievement statement ideas they could add to their resume. Ground every idea in what's actually described -- never invent employers, numbers, or outcomes that aren't a plausible extension of the real experience given. These are ideas for the candidate to verify and adjust, not asserted facts.",
        },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
      response_format: zodResponseFormat(achievementsSchema, "achievement_statements"),
      temperature: 0.5,
    });
    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError();
    return result.statements;
  } catch (err) {
    logAIError("resume-improver.generateAchievementStatements", err);
    return [];
  }
}

const atsKeywordsSchema = z.object({
  keywords: z
    .array(z.string())
    .describe("5-10 ATS keywords relevant to the candidate's field that are currently missing from their profile."),
});

export async function generateAtsKeywordSuggestions(input: {
  currentPosition?: string | null;
  skills: string[];
  experience: ExperienceInput[];
}): Promise<string[]> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("resume-improver.generateAtsKeywordSuggestions");
    return [];
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        {
          role: "system",
          content:
            "You are an ATS optimization specialist. Based on the candidate's target role, skills, and experience, suggest ATS keywords relevant to their field that are currently missing and would strengthen how their profile matches job descriptions. Only suggest keywords genuinely relevant to their demonstrated background.",
        },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
      response_format: zodResponseFormat(atsKeywordsSchema, "ats_keyword_suggestions"),
      temperature: 0.3,
    });
    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError();
    return result.keywords;
  } catch (err) {
    logAIError("resume-improver.generateAtsKeywordSuggestions", err);
    return [];
  }
}
