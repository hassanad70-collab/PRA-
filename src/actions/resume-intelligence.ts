"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/**
 * Marks a pending suggestion event (from either the Resume Builder or the
 * Rewrite & Optimize module -- see src/lib/resume-intelligence/suggestion-events.ts)
 * as accepted or rejected. Shared by both call sites so there's one
 * decision-recording code path, not two.
 *
 * Only `outcome`/`decided_at` are ever written here -- every other column is
 * immutable at the database layer (migration 0020's trigger), so this
 * intentionally never touches them. The `.eq("outcome", "pending")` guard
 * means an already-decided event silently no-ops rather than being
 * re-decided.
 */
export async function decideSuggestionEvent(eventId: string, outcome: "accepted" | "rejected"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("resume_suggestion_events")
    .update({ outcome, decided_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("candidate_id", user.id)
    .eq("outcome", "pending");

  if (error) return { success: false, error: error.message };
  return { success: true };
}
