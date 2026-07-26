import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";

const jobDraftSchema = z.object({
  description: z.string().describe("2-4 paragraph overview of the role and the team"),
  responsibilities: z.array(z.string()).describe("5-8 specific day-to-day responsibilities"),
  requirements: z.array(z.string()).describe("4-7 specific must-have qualifications"),
  benefits: z.array(z.string()).describe("3-6 benefits/perks, generic ones are fine if the recruiter gave none"),
  required_skills: z.array(z.string()).describe("6-12 concrete skills/technologies, suitable as filter tags"),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;

const SYSTEM_PROMPT = `You are an expert technical recruiter writing a job posting. Given a job title, its employment type/experience level, and the recruiter's rough notes, produce a clear, specific, non-generic job posting. Avoid vague corporate filler ("fast-paced environment", "wear many hats") unless the recruiter's notes actually support it. Ground every section in the title and notes given -- do not invent a company, product, or benefits not implied by the input.`;

const FALLBACK: JobDraft = {
  description: "Enable OpenAI API key to generate a role-specific description.",
  responsibilities: [],
  requirements: [],
  benefits: [],
  required_skills: [],
};

/**
 * Drafts a job posting (description/responsibilities/requirements/benefits/
 * required_skills) for a recruiter to review and edit before publishing --
 * never auto-submitted. Returns a placeholder if OpenAI is not available.
 */
export async function generateJobDescriptionDraft(input: {
  title: string;
  department?: string;
  employmentType: string;
  experienceLevel: string;
  keyPoints: string;
}): Promise<JobDraft> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Returning fallback job draft.");
    return FALLBACK;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Title: ${input.title}`,
            input.department ? `Department: ${input.department}` : "",
            `Employment type: ${input.employmentType.replace("_", " ")}`,
            `Experience level: ${input.experienceLevel}`,
            input.keyPoints.trim() ? `Recruiter's notes:\n${input.keyPoints.trim()}` : "Recruiter's notes: (none given -- use judgement based on the title alone)",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: zodResponseFormat(jobDraftSchema, "job_draft"),
      temperature: 0.5,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("AI job draft returned no structured output.");
    return result;
  } catch (err) {
    console.error("generateJobDescriptionDraft: OpenAI call failed", err);
    return FALLBACK;
  }
}
