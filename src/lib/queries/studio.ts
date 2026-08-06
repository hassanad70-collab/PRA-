import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ResumeDraft, ResumeDraftSection, ResumeDraftVersion, ResumeDraftWithSections } from "@/types/database";

export async function getStudioDraft(draftId: string, candidateId: string): Promise<ResumeDraftWithSections | null> {
  const supabase = await createClient();
  const [{ data: draft }, { data: sections }] = await Promise.all([
    supabase
      .from("resume_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("candidate_id", candidateId)
      .single(),
    supabase
      .from("resume_draft_sections")
      .select("*")
      .eq("draft_id", draftId)
      .order("order_index"),
  ]);
  if (!draft) return null;
  return { ...(draft as ResumeDraft), sections: (sections ?? []) as ResumeDraftSection[] };
}

export async function getDraftVersions(draftId: string, candidateId: string): Promise<ResumeDraftVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_draft_versions")
    .select("*")
    .eq("draft_id", draftId)
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as ResumeDraftVersion[];
}

export async function getActiveDrafts(candidateId: string): Promise<ResumeDraft[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_drafts")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("archived", false)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ResumeDraft[];
}

export async function getArchivedDrafts(candidateId: string): Promise<ResumeDraft[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_drafts")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("archived", true)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ResumeDraft[];
}
