import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";

/**
 * Recruiter Copilot (Recruiter Intelligence v2.0, Phase 5). Deliberately
 * NOT a general RAG/tool-calling agent -- this project has no vector store
 * or retrieval pipeline for free-text Q&A (the only existing embeddings
 * usage is job<->resume matching, a narrow, different shape). Building a
 * full agentic framework for a handful of recruiter questions would be
 * over-engineering; instead, one small AI call classifies the query into a
 * fixed, known intent (+ an optional role keyword), and a fully
 * deterministic executor (see src/lib/queries/copilot.ts) maps that intent
 * to existing query functions and formats the answer as plain text -- no
 * second AI call, so there's nothing left to hallucinate once the intent is
 * classified correctly.
 */
export const COPILOT_INTENTS = [
  "top_candidates",
  "leadership_experience",
  "interview_priority",
  "missing_skills",
  "todays_interviews",
  "unsupported",
] as const;
export type CopilotIntent = (typeof COPILOT_INTENTS)[number];

const intentSchema = z.object({
  intent: z.enum(COPILOT_INTENTS),
  role_keyword: z
    .string()
    .nullable()
    .describe("A specific role/job-title keyword mentioned in the query (e.g. 'Backend Engineer'), or null if none is mentioned"),
});

export type CopilotIntentResult = z.infer<typeof intentSchema>;

const SYSTEM_PROMPT = `You classify a recruiter's question into exactly one supported intent so a deterministic system can answer it from real hiring data. Supported intents:
- top_candidates: asking for the best/strongest candidates overall, or for a specific role (extract the role as role_keyword)
- leadership_experience: asking which candidates have leadership experience
- interview_priority: asking who to interview first / next / soonest
- missing_skills: asking what skills are missing across the candidate pipeline
- todays_interviews: asking for a summary of today's interviews
- unsupported: anything that doesn't clearly match one of the above
Only extract role_keyword when a specific job title or role is actually named in the question.`;

/** Classifies a recruiter's natural-language question into a known intent.
 * Falls back to "unsupported" if OpenAI isn't configured -- never throws. */
export async function interpretCopilotQuery(query: string): Promise<CopilotIntentResult> {
  const fallback: CopilotIntentResult = { intent: "unsupported", role_keyword: null };

  const openai = getOpenAI();
  if (!openai) {
    console.warn("OpenAI API not configured. Copilot query classification unavailable.");
    return fallback;
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      response_format: zodResponseFormat(intentSchema, "copilot_intent"),
      temperature: 0,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("Copilot intent classification returned no structured output.");
    return result;
  } catch (err) {
    console.error("interpretCopilotQuery: OpenAI call failed", err);
    return fallback;
  }
}
