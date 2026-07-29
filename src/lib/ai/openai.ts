import "server-only";

import OpenAI from "openai";

let client: OpenAI | null | false = null; // null = uninitialized, false = unavailable, OpenAI = initialized

/**
 * This project intentionally routes through OpenRouter (an OpenAI-API-
 * compatible gateway), not OpenAI's own endpoint directly -- OPENAI_API_KEY
 * holds an OpenRouter key (format "sk-or-v1-..."), which OpenAI's real API
 * correctly rejects as invalid since it isn't a namespace OpenAI issues.
 * The `openai` SDK works against any OpenAI-compatible endpoint via
 * `baseURL`, so no second client/library is needed -- every existing AI
 * wrapper keeps calling getOpenAI()/AI_MODELS exactly as before. Base URL
 * and model names are read from env vars (not hardcoded) so a future
 * provider swap is a config change, not a code change.
 */
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_REASONING_MODEL = "openai/gpt-4o-mini";
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

/**
 * Lazily-instantiated AI client, shared across a single server process.
 * Returns null if OPENAI_API_KEY is not set (AI features disabled gracefully).
 */
export function getOpenAI(): OpenAI | null {
  if (client === null) {
    if (!process.env.OPENAI_API_KEY) {
      client = false; // Mark as unavailable
      return null;
    }
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
    });
  }
  return client === false ? null : client;
}

/**
 * Check if the AI provider is available for use.
 */
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export const AI_MODELS = {
  reasoning: process.env.AI_MODEL_REASONING || DEFAULT_REASONING_MODEL,
  embedding: process.env.AI_MODEL_EMBEDDING || DEFAULT_EMBEDDING_MODEL,
};
