import "server-only";

import { AI_MODELS, getOpenAI } from "./openai";

/**
 * Generates a 1536-dim embedding vector for the given text using
 * text-embedding-3-small. Used to power semantic job <-> resume matching
 * via pgvector. Returns null if OpenAI is not available.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAI();

  if (!openai) {
    console.warn("OpenAI API not configured. Embeddings unavailable.");
    return null;
  }

  const input = text.slice(0, 30000); // guard against oversized payloads

  try {
    const response = await openai.embeddings.create({
      model: AI_MODELS.embedding,
      input,
    });
    return response.data[0].embedding;
  } catch (err) {
    // A configured key doesn't guarantee a successful call (rate limits,
    // quota, transient network errors, etc.) — treat any failure the same
    // as "not configured" rather than crashing the caller (job publish,
    // resume upload) with an unhandled 500.
    console.error("generateEmbedding: OpenAI call failed", err);
    return null;
  }
}

/** Formats a pgvector column value from a JS number array. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
