import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AiWorkspaceResume } from "@/types/database";

/**
 * Fetch the current user's workspace resume. Returns null if none uploaded.
 */
export async function getWorkspaceResume(userId: string): Promise<AiWorkspaceResume | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_workspace_resumes")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as AiWorkspaceResume) ?? null;
}

/**
 * Save (upsert) a workspace resume for the user.
 * Only one row per user — this replaces the previous context.
 */
export async function saveWorkspaceResume(
  userId: string,
  rawText: string,
  options: { fileName?: string; parsedJson?: Record<string, unknown>; source?: "paste" | "upload" }
): Promise<AiWorkspaceResume | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_workspace_resumes")
    .upsert(
      {
        user_id: userId,
        raw_text: rawText,
        file_name: options.fileName ?? null,
        parsed_json: options.parsedJson ?? null,
        source: options.source ?? "paste",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("saveWorkspaceResume error:", error.message);
    return null;
  }
  return data as AiWorkspaceResume;
}

/**
 * Delete the user's workspace resume context.
 */
export async function deleteWorkspaceResume(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_workspace_resumes")
    .delete()
    .eq("user_id", userId);
  return !error;
}
