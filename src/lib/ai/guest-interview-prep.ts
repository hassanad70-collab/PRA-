import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

const questionSchema = z.object({
  question: z.string(),
  suggestedAnswer: z.string().describe("A strong answer framework — what to include and why"),
  tip: z.string().describe("One coaching tip specific to this question type"),
});

const GuestInterviewSchema = z.object({
  technical: z.array(questionSchema).max(4).describe("Role-specific technical or skills-based questions"),
  behavioral: z.array(questionSchema).max(4).describe("Past-behavior questions using the STAR format"),
  situational: z.array(questionSchema).max(3).describe("Hypothetical scenario questions"),
  hrAndCultural: z.array(questionSchema).max(3).describe("HR screening questions and culture-fit questions"),
  starExample: z.object({
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
    context: z.string().describe("Which question type this STAR example best answers"),
  }).describe("A tailored STAR story outline the candidate can adapt for behavioral questions"),
  openingPitch: z.string().describe("A polished 60-second elevator pitch ('Tell me about yourself') tailored to this role"),
  questionsToAsk: z.array(z.string()).max(4).describe("Smart questions the candidate should ask the interviewer"),
});

export type GuestInterviewResult = z.infer<typeof GuestInterviewSchema>;

export interface GuestInterviewInput {
  position: string;
  jobDescription: string;
  resumeText: string;
  experienceLevel: string;
}

const SYSTEM_PROMPT = `You are an expert interview coach who has prepared thousands of candidates for competitive hiring processes. Given a candidate's background and a job they are targeting, generate a comprehensive, role-specific interview preparation guide. The guide must:
- Ask questions that will actually be asked for THIS specific role — not generic filler
- Provide suggested answers that are frameworks, not scripts (teach them how to think, not what to memorize)
- Include a coaching tip for each question based on common mistakes candidates make
- Create a tailored STAR story outline from what you know about the candidate's background
- Write an opening pitch that sounds natural and confident

Return only the structured JSON.`;

export async function generateGuestInterviewPrep(input: GuestInterviewInput): Promise<GuestInterviewResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("guest-interview-prep.generateGuestInterviewPrep");
    return null;
  }

  const prompt = `Target Position: ${input.position}
Experience Level: ${input.experienceLevel}

Job Description:
${input.jobDescription.slice(0, 2000)}

Candidate Background:
${input.resumeText.slice(0, 2000)}

Generate a comprehensive interview preparation guide tailored to THIS candidate for THIS specific role.`;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(GuestInterviewSchema, "interview_prep"),
      temperature: 0.4,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty parsed output from guest-interview-prep");
    return result;
  } catch (err) {
    logAIError("guest-interview-prep.generateGuestInterviewPrep", err);
    return null;
  }
}
