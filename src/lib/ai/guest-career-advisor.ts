import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

const GuestCareerSchema = z.object({
  summary: z.string().describe("2–3 sentence career assessment — honest, encouraging, and specific to the profile"),
  nextRole: z.object({
    title: z.string(),
    timeframe: z.string().describe("Realistic timeframe, e.g. '6–12 months'"),
    requirements: z.array(z.string()).max(4).describe("The 3–4 most critical things needed to land this role"),
  }),
  careerPath: z.array(z.object({
    step: z.number(),
    title: z.string(),
    timeframe: z.string(),
    description: z.string().describe("One sentence on what defines this stage"),
  })).max(4),
  skillGaps: z.array(z.object({
    skill: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    reason: z.string().describe("Why this specific skill matters for their path"),
    howToLearn: z.string().describe("Concrete first step to acquire it"),
  })).max(5),
  certifications: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    timeToComplete: z.string().describe("e.g. '2–4 weeks'"),
  })).max(3),
  salaryRange: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().default("USD"),
    note: z.string().describe("Context on the range — market conditions, location factors, etc."),
  }).nullable(),
  weeklyGoals: z.array(z.string()).max(5).describe("Specific, actionable goals the candidate can start THIS week"),
  marketInsight: z.string().describe("Current market conditions, demand outlook, and competitive positioning for this professional profile"),
});

export type GuestCareerResult = z.infer<typeof GuestCareerSchema>;

export interface GuestCareerInput {
  currentRole: string;
  yearsExperience: number;
  skills: string;
  targetRole?: string;
  location?: string;
  education?: string;
}

const SYSTEM_PROMPT = `You are a senior career advisor with 15+ years of experience helping professionals accelerate their careers. Given a professional's background, produce a comprehensive, personalized career intelligence report that is:
- Specific to their exact profile (no generic career advice)
- Honest about gaps and opportunities
- Actionable — every recommendation has a clear next step
- Market-aware — grounded in current job market realities
- Encouraging without being unrealistic

Salary ranges should reflect current market rates for the specified location (default to US market if unspecified). Return only the structured JSON.`;

export async function generateGuestCareerAdvice(input: GuestCareerInput): Promise<GuestCareerResult | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("guest-career-advisor.generateGuestCareerAdvice");
    return null;
  }

  const profile = [
    `Current Role: ${input.currentRole}`,
    `Years of Experience: ${input.yearsExperience}`,
    `Key Skills: ${input.skills}`,
    input.targetRole && `Target Role/Direction: ${input.targetRole}`,
    input.location && `Location: ${input.location}`,
    input.education && `Education: ${input.education}`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Professional Profile:\n${profile}\n\nGenerate a comprehensive, personalized career intelligence report with specific, actionable recommendations.`,
        },
      ],
      response_format: zodResponseFormat(GuestCareerSchema, "career_advice"),
      temperature: 0.35,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty parsed output from guest-career-advisor");
    return result;
  } catch (err) {
    logAIError("guest-career-advisor.generateGuestCareerAdvice", err);
    return null;
  }
}
