import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";

export type CandidateMessageType = "interview_invite" | "rejection" | "offer";

const messageSchema = z.object({
  subject: z.string(),
  body: z.string().describe("Plain-text email body, ready to copy and send as-is or lightly edit"),
});

export type CandidateMessageDraft = z.infer<typeof messageSchema>;

export interface CandidateMessageContext {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  recruiterName: string;
  interview?: {
    scheduledAt: string;
    interviewType: string;
    locationOrLink: string | null;
  };
}

const SYSTEM_PROMPTS: Record<CandidateMessageType, string> = {
  interview_invite: `You are a recruiter drafting an interview invitation email to a candidate. Warm, professional, concise. Include the interview date/time, type, and location/link exactly as given -- never invent scheduling details not provided.`,
  rejection: `You are a recruiter drafting a rejection email to a candidate who did not move forward. Kind, respectful, brief -- no generic corporate platitudes, no false promises about future roles unless told to include them.`,
  offer: `You are a recruiter drafting a message to a candidate letting them know they're moving to the offer stage, inviting them to discuss details with the team. Warm and professional. Do not state specific compensation, start date, or other terms not provided -- direct them to a follow-up conversation for those.`,
};

const FALLBACK: CandidateMessageDraft = {
  subject: "Enable OpenAI API key to generate this draft.",
  body: "Enable OpenAI API key to generate this draft.",
};

/**
 * Drafts candidate-facing message text (interview invite / rejection /
 * offer) for a recruiter to review, edit, and send through their own email
 * client -- this project has no email-sending infrastructure, so nothing is
 * sent automatically. Returns a placeholder if OpenAI is not available.
 */
export async function generateCandidateMessage(
  type: CandidateMessageType,
  context: CandidateMessageContext
): Promise<CandidateMessageDraft> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning fallback candidate message.");
    return FALLBACK;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[type] },
        {
          role: "user",
          content: [
            `Candidate name: ${context.candidateName}`,
            `Job title: ${context.jobTitle}`,
            `Company: ${context.companyName}`,
            `Recruiter name (sign-off): ${context.recruiterName}`,
            context.interview
              ? `Interview: ${context.interview.interviewType} on ${context.interview.scheduledAt}${context.interview.locationOrLink ? ` at/via ${context.interview.locationOrLink}` : ""}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: zodResponseFormat(messageSchema, "candidate_message"),
      temperature: 0.5,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("AI message draft returned no structured output.");
    return result;
  } catch (err) {
    console.error("generateCandidateMessage: OpenAI call failed", err);
    return FALLBACK;
  }
}
