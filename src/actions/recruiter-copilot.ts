"use server";

import { interpretCopilotQuery } from "@/lib/ai/recruiter-copilot";
import { isAIEnabled } from "@/lib/ai/openai";
import { answerCopilotIntent } from "@/lib/queries/copilot";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export interface AskCopilotResult extends ActionResult {
  answer?: string;
}

/**
 * Recruiter Copilot (Phase 5). Stateless per-query -- no persisted chat
 * history table, since every example query this phase targets is a
 * standalone question, not part of a multi-turn conversation that needs
 * memory.
 */
export async function askCopilot(query: string): Promise<AskCopilotResult> {
  const trimmed = query.trim();
  if (!trimmed) return { success: false, error: "Ask a question first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: recruiter } = await supabase.from("recruiters").select("company_id").eq("id", user.id).maybeSingle();
  if (!recruiter) return { success: false, error: "Only recruiters can use the Copilot." };

  const { data: allowed } = await supabase.rpc("has_capability", { p_capability: "use_ai_features" });
  if (!allowed) return { success: false, error: "You don't have permission to use AI features." };

  if (!isAIEnabled()) {
    return { success: true, answer: "Enable the OpenAI API key to use the Recruiter Copilot." };
  }

  const intentResult = await interpretCopilotQuery(trimmed);
  const answer = await answerCopilotIntent(recruiter.company_id, intentResult);

  return { success: true, answer };
}
