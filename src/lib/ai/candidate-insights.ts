import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";
import type { Job, ParsedResumeData } from "@/types/database";
import { buildCandidateText, buildJobText } from "./job-matcher";

/**
 * The AI Insight panel (Recruiter Intelligence v2.0, Phase 2) shows ten
 * fields, but only five of them are genuinely new content an AI needs to
 * generate: risks, missing skills / experience summary / ATS explanation /
 * recommendation all already exist on job_matches, ats_scores, and
 * screening_results, and are rendered directly rather than regenerated here
 * (reuse-first -- see the panel component). This schema covers only what
 * doesn't already exist anywhere.
 */
const candidateInsightSchema = z.object({
  risks: z.array(z.string()).describe("Potential concerns a recruiter should weigh, distinct from missing skills (e.g. employment gaps, frequent job-hopping, unclear seniority)"),
  red_flags: z.array(z.string()).describe("Serious, specific concerns worth flagging explicitly -- leave empty if none"),
  hiring_confidence_score: z.number().min(0).max(100).describe("Holistic confidence this candidate should be hired for this specific role"),
  suggested_interview_focus: z.string().describe("1-2 sentences on what the interviewer should probe most, given this candidate's specific profile"),
  suggested_questions: z.array(z.string()).min(2).max(5).describe("Specific interview questions tailored to this candidate's resume, not generic role questions"),
});

export type CandidateInsightAI = z.infer<typeof candidateInsightSchema>;

const SYSTEM_PROMPT = `You are an AI hiring analyst helping a recruiter prepare to evaluate and interview a candidate who has already been screened. You are given the job, the candidate's resume, and their existing AI screening scores. Do not repeat strengths, missing skills, or a general summary -- those are already shown elsewhere. Focus only on: risks worth weighing, genuine red flags (leave empty if none apply -- do not invent concerns), a hiring confidence score, and specific interview prep tailored to this candidate. Base everything only on evidence in the resume; do not consider name, gender, ethnicity-coded information, or age.`;

/** Generates the AI Insight panel's additive fields for a specific
 * application. Returns a fallback (empty risk assessment, neutral
 * confidence) if OpenAI is not configured -- never throws. */
export async function generateCandidateInsight(
  job: Pick<Job, "title" | "description" | "requirements" | "required_skills" | "nice_to_have_skills" | "experience_level" | "min_experience_years" | "education_requirement">,
  parsed: ParsedResumeData,
  yearsOfExperience: number,
  existingSummary: string | null
): Promise<CandidateInsightAI> {
  const fallback: CandidateInsightAI = {
    risks: [],
    red_flags: [],
    hiring_confidence_score: 50,
    suggested_interview_focus: "Enable the OpenAI API key to generate tailored interview prep.",
    suggested_questions: [],
  };

  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("candidate-insights.generateCandidateInsight");
    return fallback;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `JOB:\n${buildJobText(job)}\n\nCANDIDATE:\n${buildCandidateText(parsed, yearsOfExperience)}${
            existingSummary ? `\n\nEXISTING AI SCREENING SUMMARY:\n${existingSummary}` : ""
          }`,
        },
      ],
      response_format: zodResponseFormat(candidateInsightSchema, "candidate_insight"),
      temperature: 0.3,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("AI candidate insight returned no structured output.");
    return result;
  } catch (err) {
    logAIError("candidate-insights.generateCandidateInsight", err);
    return fallback;
  }
}
