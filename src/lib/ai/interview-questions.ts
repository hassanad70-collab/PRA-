import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { buildJobText } from "./job-matcher";
import type { Job } from "@/types/database";

const questionSchema = z.object({
  question: z.string(),
  expected_answer: z.string().describe("What a strong answer covers -- an interviewer's reference, not a script"),
  evaluation_criteria: z.string().describe("What to listen for when scoring the candidate's answer"),
});

const questionSetSchema = z.object({
  technical: z.array(questionSchema).describe("3-5 questions testing hands-on skill with this role's required stack"),
  behavioral: z.array(questionSchema).describe("3-5 past-behavior questions (\"tell me about a time...\")"),
  situational: z.array(questionSchema).describe("2-4 hypothetical scenario questions relevant to this role"),
  case_study: z.array(questionSchema).describe("1-3 open-ended problem-solving exercises relevant to this role"),
});

export type InterviewQuestionSet = z.infer<typeof questionSetSchema>;

const SYSTEM_PROMPT = `You are an experienced technical interviewer building a structured interview question bank for a specific job opening. Generate questions that actually probe for this role's stated requirements -- not generic filler. Each question needs an interviewer-facing expected_answer (what a strong response covers) and evaluation_criteria (what to listen for), so a human interviewer with no prior context on this role can run a fair, consistent interview from this bank alone.`;

const FALLBACK: InterviewQuestionSet = {
  technical: [
    {
      question: "Walk me through a recent project that used the core skills required for this role.",
      expected_answer: "Enable OpenAI API key to generate role-specific expected answers.",
      evaluation_criteria: "Enable OpenAI API key to generate role-specific evaluation criteria.",
    },
  ],
  behavioral: [
    {
      question: "Tell me about a time you had to meet a difficult deadline.",
      expected_answer: "Enable OpenAI API key to generate role-specific expected answers.",
      evaluation_criteria: "Enable OpenAI API key to generate role-specific evaluation criteria.",
    },
  ],
  situational: [],
  case_study: [],
};

/**
 * Generates a job-specific interview question bank (interview_questions
 * table, migration 0008). Returns a small generic fallback set rather than
 * throwing if OpenAI is not available -- same pattern as runAIScreening and
 * analyzeJobMatch.
 */
export async function generateInterviewQuestions(
  job: Pick<Job, "title" | "description" | "requirements" | "required_skills" | "nice_to_have_skills" | "experience_level" | "min_experience_years" | "education_requirement">
): Promise<InterviewQuestionSet> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning fallback interview questions.");
    return FALLBACK;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildJobText(job) },
      ],
      response_format: zodResponseFormat(questionSetSchema, "interview_question_set"),
      temperature: 0.4,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("AI question generation returned no structured output.");
    return result;
  } catch (err) {
    console.error("generateInterviewQuestions: OpenAI call failed", err);
    return FALLBACK;
  }
}
