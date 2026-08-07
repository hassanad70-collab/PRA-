import "server-only";

import { getOpenAI, AI_MODELS } from "./openai";
import { logAIError, logMissingApiKey } from "./errors";

export async function generatePortfolioItemDescription(
  title: string,
  technologies: string[],
  type: string
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("portfolio-ai");
    return "";
  }

  const techNote = technologies.length > 0 ? ` Technologies used: ${technologies.join(", ")}.` : "";
  const prompt = `Write a compelling 2–3 sentence portfolio description for a ${type} titled "${title}".${techNote} Highlight the purpose, approach, and impact. Be concise and professional. Return only the description text, no labels or quotes.`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    logAIError("portfolio-ai", err);
    return "";
  }
}
