import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

const SalaryEstimateSchema = z.object({
  min: z.number().describe("Lower bound of estimated annual salary"),
  median: z.number().describe("Midpoint / most likely salary"),
  max: z.number().describe("Upper bound of estimated annual salary"),
  currency: z.string().default("USD"),
  context: z.string().describe("2–3 sentence explanation of the estimate — what drives this range for this role"),
  market_notes: z.array(z.string()).max(4).describe("Key factors that could push salary higher or lower"),
  disclaimer: z.string().describe("One sentence reminding the user this is an AI estimate, not real-time market data"),
});

export type SalaryEstimate = z.infer<typeof SalaryEstimateSchema>;

export interface SalaryInput {
  targetRole: string;
  location?: string;
  yearsExperience?: number;
  skills?: string;
}

export interface SalaryInsightsProvider {
  estimate(input: SalaryInput): Promise<SalaryEstimate>;
}

async function estimateWithAI(input: SalaryInput): Promise<SalaryEstimate> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("salary-insights");
    return {
      min: 0, median: 0, max: 0, currency: "USD",
      context: "AI salary estimates are unavailable — API key not configured.",
      market_notes: [],
      disclaimer: "This is an AI-generated estimate and does not reflect real-time market data.",
    };
  }

  const locationNote = input.location ? ` in ${input.location}` : " (location not specified — using global average)";
  const expNote = input.yearsExperience != null ? ` with ${input.yearsExperience} years of experience` : "";
  const skillsNote = input.skills ? ` Key skills: ${input.skills}.` : "";

  const prompt = `You are a compensation analysis assistant. Estimate the salary range for the following profile:

Role: ${input.targetRole}${locationNote}${expNote}${skillsNote}

Provide an annual salary estimate in the local currency (default USD if location is generic). Be realistic and specific — use your knowledge of compensation data, cost of living, and market demand for this role. Do not fabricate data; if the location is unusual or the role is very niche, say so in context.`;

  try {
    const response = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(SalaryEstimateSchema, "salary_estimate"),
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.parsed;
    if (!result) throw new InvalidAIResponseError("salary-insights: empty parsed response");
    return result;
  } catch (err) {
    logAIError("salary-insights", err);
    throw err;
  }
}

export const salaryInsightsProvider: SalaryInsightsProvider = {
  estimate: estimateWithAI,
};

export async function getSalaryEstimate(input: SalaryInput): Promise<SalaryEstimate> {
  return salaryInsightsProvider.estimate(input);
}
