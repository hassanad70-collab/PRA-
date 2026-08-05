import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

const CoverLetterSchema = z.object({
  subject: z.string().describe("Email subject line for the application"),
  greeting: z.string().describe("Opening salutation — use hiring manager name if provided, else 'Dear Hiring Team'"),
  openingParagraph: z.string().describe("Strong hook that immediately shows why this candidate is an exceptional fit"),
  bodyParagraph1: z.string().describe("Specific achievements and experience most relevant to this role, with numbers where possible"),
  bodyParagraph2: z.string().describe("Why this company specifically — shows research, genuine interest, and cultural fit"),
  closingParagraph: z.string().describe("Confident call to action and professional close"),
  signOff: z.string().describe("Sign-off phrase only, e.g. 'Sincerely,' or 'Best regards,'"),
  tips: z.array(z.string()).max(4).describe("Quick personalization tips the applicant should apply before sending"),
});

export type CoverLetterResult = z.infer<typeof CoverLetterSchema>;

export type CoverLetterTone = "professional" | "enthusiastic" | "executive" | "conversational";
export type CoverLetterLength = "short" | "medium" | "long";

export interface CoverLetterInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  position: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  hiringManager?: string;
}

const WORD_TARGETS: Record<CoverLetterLength, string> = {
  short: "200–250 words",
  medium: "300–350 words",
  long: "400–450 words",
};

const SYSTEM_PROMPT = `You are an expert career coach and cover letter writer who knows exactly what makes hiring managers stop and read. Write compelling, authentic cover letters that:
- Are highly specific to this role and company — zero generic boilerplate
- Lead with a strong hook that immediately establishes fit
- Back claims with concrete examples and metrics whenever the resume provides them
- Sound genuinely human — not AI-generated, not formulaic
- Match the requested tone exactly
- Stay within the requested word target
Return only the structured JSON with no extra commentary.`;

export async function generateCoverLetter(input: CoverLetterInput): Promise<CoverLetterResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("cover-letter.generateCoverLetter");
    return null;
  }

  const prompt = `Company: ${input.companyName}
Position: ${input.position}
Tone: ${input.tone}
Target length: ${WORD_TARGETS[input.length]}
${input.hiringManager ? `Hiring manager: ${input.hiringManager}` : ""}

Job Description:
${input.jobDescription.slice(0, 2500)}

Candidate Background (from resume):
${input.resumeText.slice(0, 2500)}

Write a highly targeted cover letter that positions this candidate as the ideal hire for this specific role at this specific company.`;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(CoverLetterSchema, "cover_letter"),
      temperature: 0.45,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty parsed output from cover-letter");
    return result;
  } catch (err) {
    logAIError("cover-letter.generateCoverLetter", err);
    return null;
  }
}
