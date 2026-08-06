"use server";

import { revalidateCandidatePath } from "@/lib/revalidate-candidate-path";
import { runSectionAiOperation, analyzeJobDescription } from "@/lib/ai/resume-studio-ops";
import { getStudioDraft, getDraftVersions } from "@/lib/queries/studio";
import { createClient } from "@/lib/supabase/server";
import type {
  ResumeDraftSection,
  ResumeDraftVersion,
  SectionAiOperation,
} from "@/types/database";
import type { ActionResult } from "./auth";
import type { ResumeTemplate } from "@/lib/resume-studio";

async function requireCandidate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!candidate) return null;

  return { supabase, userId: user.id, candidateId: candidate.id as string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section content updates (used by autosave)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateSectionContentStudio(
  sectionId: string,
  draftId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const { error } = await ctx.supabase
    .from("resume_draft_sections")
    .update({ content, status: "edited", updated_at: new Date().toISOString() })
    .eq("id", sectionId)
    .eq("draft_id", draftId);

  if (error) return { success: false, error: error.message };

  await ctx.supabase
    .from("resume_drafts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", draftId);

  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section ordering (drag & drop)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateSectionOrder(
  draftId: string,
  orderedSectionIds: string[]
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const updates = orderedSectionIds.map((id, i) =>
    ctx.supabase
      .from("resume_draft_sections")
      .update({ order_index: i })
      .eq("id", id)
      .eq("draft_id", draftId)
  );

  await Promise.all(updates);
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTemplate(
  draftId: string,
  template: ResumeTemplate
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("resume_drafts")
    .update({ template, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  if (error) return { success: false, error: error.message };
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft title
// ─────────────────────────────────────────────────────────────────────────────

export async function updateDraftTitle(
  draftId: string,
  title: string
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("resume_drafts")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  if (error) return { success: false, error: error.message };
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Job description
// ─────────────────────────────────────────────────────────────────────────────

export async function updateJobDescription(
  draftId: string,
  jobDescriptionText: string
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("resume_drafts")
    .update({ job_description_text: jobDescriptionText, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  if (error) return { success: false, error: error.message };
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

export interface AnalyzeJobDescriptionResult extends ActionResult {
  skills?: string[];
  keywords?: string[];
  responsibilities?: string[];
  technologies?: string[];
  summary?: string;
}

export async function analyzeJobDescriptionAction(
  draftId: string,
  jobDescriptionText: string
): Promise<AnalyzeJobDescriptionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const result = await analyzeJobDescription(jobDescriptionText);
  return { success: true, ...result };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI operations
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionAiOpResult extends ActionResult {
  text?: string;
  suggestions?: string[];
}

export async function sectionAiOperation(
  draftId: string,
  sectionId: string,
  sectionType: string,
  operation: SectionAiOperation,
  currentContentText: string
): Promise<SectionAiOpResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const section = draft.sections.find((s) => s.id === sectionId);
  if (!section) return { success: false, error: "Section not found" };

  const result = await runSectionAiOperation({
    operation,
    sectionType,
    currentContent: currentContentText,
    jobDescription: draft.job_description_text ?? undefined,
  });

  // Log suggestion event (fire-and-forget)
  ctx.supabase
    .from("resume_suggestion_events")
    .insert({
      draft_id: draftId,
      section_id: sectionId,
      section_type: sectionType,
      suggestion_type: operation,
      candidate_id: ctx.candidateId,
    })
    .then(() => {});

  return { success: true, text: result.text, suggestions: result.suggestions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Version history
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveVersionResult extends ActionResult {
  version?: ResumeDraftVersion;
}

export async function saveVersion(
  draftId: string,
  label?: string
): Promise<SaveVersionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const { data, error } = await ctx.supabase
    .from("resume_draft_versions")
    .insert({
      draft_id: draftId,
      candidate_id: ctx.candidateId,
      label: label ?? null,
      sections_snapshot: draft.sections,
      template: draft.template ?? "modern",
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, version: data as ResumeDraftVersion };
}

export async function restoreVersion(
  draftId: string,
  versionId: string
): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const versions = await getDraftVersions(draftId, ctx.candidateId);
  const version = versions.find((v) => v.id === versionId);
  if (!version) return { success: false, error: "Version not found" };

  const sections = version.sections_snapshot as ResumeDraftSection[];

  const updates = sections.map((s) =>
    ctx.supabase
      .from("resume_draft_sections")
      .update({ content: s.content, status: s.status, order_index: s.order_index })
      .eq("id", s.id)
      .eq("draft_id", draftId)
  );

  await Promise.all(updates);
  await ctx.supabase
    .from("resume_drafts")
    .update({ template: version.template, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate & archive
// ─────────────────────────────────────────────────────────────────────────────

export interface DuplicateDraftResult extends ActionResult {
  newDraftId?: string;
}

export async function duplicateDraft(draftId: string): Promise<DuplicateDraftResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const draft = await getStudioDraft(draftId, ctx.candidateId);
  if (!draft) return { success: false, error: "Draft not found" };

  const { data: newDraft, error } = await ctx.supabase
    .from("resume_drafts")
    .insert({
      candidate_id: ctx.candidateId,
      title: `${draft.title} (Copy)`,
      status: "draft",
      template: draft.template ?? "modern",
      job_description_text: draft.job_description_text,
    })
    .select("id")
    .single();

  if (error || !newDraft) return { success: false, error: error?.message ?? "Failed to duplicate" };

  const sectionInserts = draft.sections.map((s) => ({
    draft_id: newDraft.id,
    section_type: s.section_type,
    content: s.content,
    status: s.status,
    order_index: s.order_index,
  }));

  await ctx.supabase.from("resume_draft_sections").insert(sectionInserts);
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true, newDraftId: newDraft.id };
}

export async function archiveDraft(draftId: string): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("resume_drafts")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  if (error) return { success: false, error: error.message };
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}

export async function unarchiveDraft(draftId: string): Promise<ActionResult> {
  const ctx = await requireCandidate();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("resume_drafts")
    .update({ archived: false, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("candidate_id", ctx.candidateId);

  if (error) return { success: false, error: error.message };
  revalidateCandidatePath("/candidate/workspace/studio");
  return { success: true };
}
