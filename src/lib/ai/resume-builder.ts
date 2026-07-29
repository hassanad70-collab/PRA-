import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";
import type { ResumeSectionContentMap } from "@/types/database";

/**
 * Section-granular counterpart to resume-improver.ts's improveResume()
 * (which rewrites a whole resume in one call) -- the builder needs to
 * regenerate exactly one section (Summary, Experience, or Skills) at a
 * time without touching the others, per the approved editing workflow.
 * Only these three are AI-eligible; every other section is either a
 * factual record from the candidate's profile or their own manual entry,
 * and is never rewritten by AI (never invent employers, titles, dates,
 * degrees, or certifications not already in the candidate's data).
 */

const SHARED_RULES =
  "Never invent employers, job titles, companies, dates, degrees, or any factual detail not present in the candidate's own data. If there isn't enough information to improve something meaningfully, keep it close to the original rather than fabricating specifics.";

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const summarySchema = z.object({
  text: z.string().describe("A punchy, specific, keyword-rich professional summary, 2-4 sentences."),
});

export async function generateSummarySuggestion(input: {
  currentSummary?: string;
  currentPosition?: string;
  yearsOfExperience?: number;
  topSkills?: string[];
}): Promise<ResumeSectionContentMap["summary"]> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("resume-builder.generateSummarySuggestion");
    return { text: input.currentSummary ?? "Enable the OpenAI API key to generate a summary suggestion." };
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer. Rewrite the candidate's professional summary. ${SHARED_RULES}`,
        },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
      response_format: zodResponseFormat(summarySchema, "summary_suggestion"),
      temperature: 0.4,
    });
    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError();
    return result;
  } catch (err) {
    logAIError("resume-builder.generateSummarySuggestion", err);
    return { text: input.currentSummary ?? "" };
  }
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

const experienceEntrySchema = z.object({
  company_name: z.string(),
  job_title: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  description: z.string().describe("Rewritten, achievement-driven bullet points as a single string (one per line)."),
});

const experienceSchema = z.object({ entries: z.array(experienceEntrySchema) });

export async function generateExperienceSuggestion(
  entries: ResumeSectionContentMap["experience"]
): Promise<ResumeSectionContentMap["experience"]> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("resume-builder.generateExperienceSuggestion");
    return entries;
  }
  if (entries.length === 0) return entries;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer and ATS optimization specialist. Rewrite each role's description as achievement-driven bullet points (action verb + what was done + quantified impact where plausible). Keep company_name, job_title, location, and dates exactly as given -- only rewrite "description". ${SHARED_RULES}`,
        },
        { role: "user", content: JSON.stringify(entries, null, 2) },
      ],
      response_format: zodResponseFormat(experienceSchema, "experience_suggestion"),
      temperature: 0.4,
    });
    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError();
    return result.entries.map((e) => ({
      company_name: e.company_name,
      job_title: e.job_title,
      location: e.location ?? undefined,
      start_date: e.start_date ?? undefined,
      end_date: e.end_date ?? undefined,
      is_current: e.is_current,
      description: e.description ?? undefined,
    }));
  } catch (err) {
    logAIError("resume-builder.generateExperienceSuggestion", err);
    return entries;
  }
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

const skillsSchema = z.object({
  items: z.array(z.string()).describe("The candidate's existing skills, lightly reordered/normalized, plus any clearly-implied additions."),
  suggested_additions: z.array(z.string()).describe("Skills the candidate is likely close to based on their experience, but doesn't list -- shown separately, not merged in automatically."),
});

export async function generateSkillsSuggestion(input: {
  currentSkills: string[];
  experienceSummary?: string;
}): Promise<{ items: string[]; suggested_additions: string[] }> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("resume-builder.generateSkillsSuggestion");
    return { items: input.currentSkills, suggested_additions: [] };
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        {
          role: "system",
          content: `You are an ATS optimization specialist. Normalize and lightly reorder the candidate's existing skill list (most relevant first), and separately suggest additional skills they likely have based on their experience but haven't listed. ${SHARED_RULES}`,
        },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
      response_format: zodResponseFormat(skillsSchema, "skills_suggestion"),
      temperature: 0.4,
    });
    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError();
    return result;
  } catch (err) {
    logAIError("resume-builder.generateSkillsSuggestion", err);
    return { items: input.currentSkills, suggested_additions: [] };
  }
}
