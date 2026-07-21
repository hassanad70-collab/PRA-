import "server-only";

import OpenAI from "openai";

let client: OpenAI | null | false = null; // null = uninitialized, false = unavailable, OpenAI = initialized

/**
 * Lazily-instantiated OpenAI client, shared across a single server process.
 * Returns null if OPENAI_API_KEY is not set (AI features disabled gracefully).
 */
export function getOpenAI(): OpenAI | null {
  if (client === null) {
    if (!process.env.OPENAI_API_KEY) {
      client = false; // Mark as unavailable
      return null;
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client === false ? null : client;
}

/**
 * Check if OpenAI API is available for use.
 */
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export const AI_MODELS = {
  reasoning: "gpt-4o-mini",
  embedding: "text-embedding-3-small",
} as const;
