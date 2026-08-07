import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAI, AI_MODELS } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

const LinkedInResultSchema = z.object({
  improved: z.string().describe("The rewritten, optimized version of the LinkedIn text"),
  changes: z.array(z.string()).max(5).describe("Brief bullets explaining what was changed and why"),
  keywords: z.array(z.string()).max(8).describe("Industry keywords added or reinforced in the optimized text"),
});

export type LinkedInOptimizationResult = z.infer<typeof LinkedInResultSchema>;

const TARGET_TYPE_LABELS: Record<string, string> = {
  about: "About section (profile summary)",
  headline: "Professional headline",
  experience: "Experience bullet / description",
  skills_summary: "Skills summary",
};

export interface LinkedInOptimizerInput {
  targetType: "about" | "headline" | "experience" | "skills_summary";
  originalText: string;
  targetRole?: string;
}

export async function optimizeLinkedInText(input: LinkedInOptimizerInput): Promise<LinkedInOptimizationResult> {
  const fallback: LinkedInOptimizationResult = {
    improved: input.originalText,
    changes: ["AI optimization unavailable — API key not configured."],
    keywords: [],
  };

  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("linkedin-optimizer");
    return fallback;
  }

  const typeLabel = TARGET_TYPE_LABELS[input.targetType] ?? input.targetType;
  const roleNote = input.targetRole ? ` The candidate is targeting the role: "${input.targetRole}".` : "";

  const prompt = `You are a LinkedIn profile optimization expert. Optimize the following LinkedIn ${typeLabel}.${roleNote}

ORIGINAL TEXT:
${input.originalText}

Rewrite it to be more compelling, keyword-rich, and ATS-friendly while preserving the authentic voice and factual content. Do not invent experience, credentials, or skills. For headlines: keep under 220 characters. For About sections: write in first person, max 2,600 characters. For experience bullets: use strong action verbs and quantify impact where evident.`;

  try {
    const response = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(LinkedInResultSchema, "linkedin_optimization"),
      temperature: 0.5,
    });

    const result = response.choices[0]?.message?.parsed;
    if (!result) throw new InvalidAIResponseError("linkedin-optimizer: empty parsed response");
    return result;
  } catch (err) {
    logAIError("linkedin-optimizer", err);
    return fallback;
  }
}
