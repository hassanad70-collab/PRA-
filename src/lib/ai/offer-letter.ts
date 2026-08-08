import "server-only";

import { getOpenAI, AI_MODELS } from "./openai";
import { logAIError, logMissingApiKey } from "./errors";

export interface OfferLetterInput {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  startDate?: string | null;
  expiryDate?: string | null;
  recruiterName?: string;
  additionalNotes?: string;
}

const SYSTEM_PROMPT = `You are an HR professional writing a formal job offer letter. Write a professional, warm, and clear offer letter. Use formal paragraph format (not bullet points). Include: opening congratulations, the role details, compensation, start date if provided, expiry date if provided, and a welcoming close. Keep it under 400 words. Do not invent company perks, benefits, or policies not given in the input.`;

const FALLBACK = (input: OfferLetterInput) => `Dear ${input.candidateName},

We are pleased to extend this offer of employment for the position of ${input.jobTitle} at ${input.companyName}.

${input.salaryMin && input.salaryMax ? `Your annual compensation will be ${input.currency ?? "USD"} ${input.salaryMin.toLocaleString()} – ${input.salaryMax.toLocaleString()}.` : ""}
${input.startDate ? `Your proposed start date is ${input.startDate}.` : ""}
${input.expiryDate ? `Please respond by ${input.expiryDate}.` : ""}

We look forward to welcoming you to the team.

Sincerely,
${input.recruiterName ?? "The Hiring Team"}
${input.companyName}`;

export async function generateOfferLetter(input: OfferLetterInput): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("offer-letter.generateOfferLetter");
    return FALLBACK(input);
  }

  const userContent = [
    `Candidate name: ${input.candidateName}`,
    `Job title: ${input.jobTitle}`,
    `Company: ${input.companyName}`,
    input.salaryMin && input.salaryMax
      ? `Compensation: ${input.currency ?? "USD"} ${input.salaryMin.toLocaleString()} – ${input.salaryMax.toLocaleString()} per year`
      : "",
    input.startDate ? `Start date: ${input.startDate}` : "",
    input.expiryDate ? `Offer expiry: ${input.expiryDate}` : "",
    input.recruiterName ? `Recruiter / signing name: ${input.recruiterName}` : "",
    input.additionalNotes?.trim() ? `Additional notes from recruiter: ${input.additionalNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });
    return response.choices[0]?.message?.content?.trim() ?? FALLBACK(input);
  } catch (err) {
    logAIError("offer-letter.generateOfferLetter", err);
    return FALLBACK(input);
  }
}
