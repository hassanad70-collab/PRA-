import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Durable, append-only log of every AI writing suggestion shown to a
 * candidate -- one mechanism across both existing sources (the Resume
 * Builder's per-section suggestions and the Resume Intelligence Hub's
 * Rewrite & Optimize module), per Unit C.
 *
 * `source`/`suggestion_type` are plain `text` columns, not Postgres enums
 * or CHECK constraints (see migration 0020) -- these constants are the
 * single source of truth instead, so a future Resume Intelligence module
 * (Units D/F/G and beyond) can introduce a new value here without a
 * migration. Only `outcome` is DB-constrained, since a suggestion's
 * lifecycle (pending/accepted/rejected) is genuinely stable regardless of
 * how many suggestion types exist.
 *
 * Rows are immutable after creation except `outcome`/`decided_at`,
 * enforced by a trigger in the database -- this module never attempts to
 * update any other column post-insert.
 */

export const SUGGESTION_SOURCES = ["resume_builder", "rewrite_optimize"] as const;
export type SuggestionSource = (typeof SUGGESTION_SOURCES)[number];

export const SUGGESTION_TYPES = ["summary", "experience", "skills", "achievement", "ats_keyword"] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export type SuggestionOutcome = "pending" | "accepted" | "rejected";

export interface SuggestionEvent {
  id: string;
  candidate_id: string;
  source: SuggestionSource;
  draft_id: string | null;
  section_id: string | null;
  suggestion_type: SuggestionType;
  target_id: string | null;
  before_value: unknown;
  after_value: unknown;
  outcome: SuggestionOutcome;
  ai_model: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface LogSuggestionEventInput {
  candidateId: string;
  source: SuggestionSource;
  suggestionType: SuggestionType;
  afterValue: unknown;
  beforeValue?: unknown;
  draftId?: string;
  sectionId?: string;
  targetId?: string;
  aiModel?: string;
}

/** Inserts one pending suggestion-event row. Returns null (logged, not thrown) on failure so a logging hiccup never blocks the suggestion itself from being shown. */
export async function logSuggestionEvent(
  supabase: SupabaseClient,
  input: LogSuggestionEventInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from("resume_suggestion_events")
    .insert({
      candidate_id: input.candidateId,
      source: input.source,
      suggestion_type: input.suggestionType,
      after_value: input.afterValue,
      before_value: input.beforeValue ?? null,
      draft_id: input.draftId ?? null,
      section_id: input.sectionId ?? null,
      target_id: input.targetId ?? null,
      ai_model: input.aiModel ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("logSuggestionEvent failed", error);
    return null;
  }
  return data.id as string;
}

/** Recent suggestion-event history for the candidate -- powers the Resume Intelligence Hub's History module. */
export async function getSuggestionHistory(supabase: SupabaseClient, candidateId: string, limit = 20): Promise<SuggestionEvent[]> {
  const { data, error } = await supabase
    .from("resume_suggestion_events")
    .select("*")
    .eq("candidate_id", candidateId)
    .neq("outcome", "pending")
    .order("decided_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getSuggestionHistory failed", error);
    return [];
  }
  return data as SuggestionEvent[];
}
