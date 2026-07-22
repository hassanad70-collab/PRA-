import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import type { ParsedResumeData } from "@/types/database";

const experienceSchema = z.object({
  company_name: z.string(),
  job_title: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable().describe("ISO date (YYYY-MM-DD) or YYYY-MM if day unknown"),
  end_date: z.string().nullable().describe("ISO date, or null if current"),
  is_current: z.boolean(),
  description: z.string().nullable(),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field_of_study: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  grade: z.string().nullable(),
});

const certificateSchema = z.object({
  name: z.string(),
  issuing_organization: z.string().nullable(),
  issue_date: z.string().nullable(),
});

const languageSchema = z.object({
  language: z.string(),
  proficiency: z.enum(["basic", "conversational", "fluent", "native"]),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  technologies: z.array(z.string()),
});

const achievementSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
});

const resumeExtractionSchema = z.object({
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  current_position: z.string().nullable(),
  years_of_experience: z.number().describe("Total years of professional experience, estimated from work history"),
  expected_salary: z.string().nullable(),
  summary: z.string().nullable().describe("A 2-4 sentence professional summary synthesized from the resume"),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(z.string()).describe("Flat list of technical and soft skills mentioned or clearly implied"),
  certificates: z.array(certificateSchema),
  languages: z.array(languageSchema),
  projects: z.array(projectSchema),
  achievements: z.array(achievementSchema),
});

export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;

const SYSTEM_PROMPT = `You are an expert resume parser used inside an enterprise ATS. Extract structured data from raw resume text with high precision. Rules:
- Never invent information that is not present or strongly implied in the text.
- Dates should be normalized to ISO format (YYYY-MM-DD or YYYY-MM) where possible.
- years_of_experience should be a realistic estimate computed from the work history date ranges, not a number pulled from the text unless work history is unavailable.
- skills should include both explicitly listed skills and skills clearly demonstrated in experience/project descriptions.
- If a field is not present in the resume, use null (or an empty array for list fields).`;

/**
 * Extracts structured candidate data from raw resume text using an LLM with
 * a strict JSON schema. Powers the AI Resume Parser + Profile Auto-Generation
 * features. Returns minimal data if OpenAI is not available.
 */
export async function parseResumeText(rawText: string): Promise<ParsedResumeData> {
  const fallback: ParsedResumeData = {
    summary: "Resume uploaded. Enable OpenAI API key to extract structured data.",
    experience: [],
    education: [],
    skills: [],
    certificates: [],
    languages: [],
    projects: [],
    achievements: [],
  };

  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning empty resume data.");
    return fallback;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Resume text:\n\n${rawText.slice(0, 20000)}` },
      ],
      response_format: zodResponseFormat(resumeExtractionSchema, "resume_extraction"),
      temperature: 0.1,
    });

    const parsed = completion.choices[0].message.parsed;
    if (!parsed) throw new Error("AI resume parsing returned no structured output.");
    return parsed as ParsedResumeData;
  } catch (err) {
    // A configured key doesn't guarantee a successful call (rate limits,
    // quota, transient network errors, malformed output, etc.) — degrade to
    // the same fallback as "not configured" instead of crashing the upload.
    console.error("parseResumeText: OpenAI call failed", err);
    return fallback;
  }
}
