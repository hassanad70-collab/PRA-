"use server";

import { revalidateCandidatePath } from "@/lib/revalidate-candidate-path";
import { generateExperienceSuggestion, generateSkillsSuggestion, generateSummarySuggestion } from "@/lib/ai/resume-builder";
import { extractTextFromFile } from "@/lib/ai/extract-text";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { generateResumeDocx } from "@/lib/documents/resume-docx";
import { generateResumePdf } from "@/lib/documents/resume-pdf";
import { diffImportedResumeAgainstDraft } from "@/lib/resume-builder/merge";
import { createDraftSeededFromProfile, deleteResumeDraft, getResumeDraftWithSections } from "@/lib/queries/resume-builder";
import { logSuggestionEvent } from "@/lib/resume-intelligence/suggestion-events";
import { createClient } from "@/lib/supabase/server";
import type {
  AiEligibleSectionType,
  ImportFieldDiff,
  ResumeDraft,
  ResumeSectionContentMap,
  ResumeSectionType,
} from "@/types/database";
import type { ActionResult } from "./auth";

const ALLOWED_IMPORT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

async function requireCandidate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Confirms the draft belongs to the signed-in candidate before any read/write. */
async function loadOwnedDraft(draftId: string, candidateId: string) {
  const draft = await getResumeDraftWithSections(draftId);
  if (!draft || draft.candidate_id !== candidateId) return null;
  return draft;
}

export interface CreateDraftResult extends ActionResult {
  draft?: ResumeDraft;
}

export async function createDraft(title?: string): Promise<CreateDraftResult> {
  const { user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  try {
    const draft = await createDraftSeededFromProfile(user.id, title);
    revalidateCandidatePath("/candidate/resume-builder");
    return { success: true, draft };
  } catch (err) {
    console.error("createDraft failed", err);
    return { success: false, error: "Failed to create a new resume draft." };
  }
}

export async function deleteDraft(draftId: string): Promise<ActionResult> {
  const { user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  await deleteResumeDraft(draftId, user.id);
  revalidateCandidatePath("/candidate/resume-builder");
  return { success: true };
}

export interface RegenerateSectionResult extends ActionResult {
  suggestion?: unknown;
}

/** Runs the AI on one section and stores the result as a pending suggestion -- never overwrites `content` until accepted. */
export async function regenerateSection(draftId: string, sectionType: AiEligibleSectionType): Promise<RegenerateSectionResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft) return { success: false, error: "Resume draft not found." };

  const section = draft.sections.find((s) => s.section_type === sectionType);
  if (!section) return { success: false, error: "Section not found." };

  let suggestion: unknown;
  try {
    if (sectionType === "summary") {
      const personalInfo = draft.sections.find((s) => s.section_type === "personal_info")
        ?.content as ResumeSectionContentMap["personal_info"];
      const skills = draft.sections.find((s) => s.section_type === "skills")?.content as ResumeSectionContentMap["skills"];
      suggestion = await generateSummarySuggestion({
        currentSummary: (section.content as ResumeSectionContentMap["summary"]).text,
        currentPosition: personalInfo?.current_position,
        topSkills: skills?.items,
      });
    } else if (sectionType === "experience") {
      suggestion = await generateExperienceSuggestion(section.content as ResumeSectionContentMap["experience"]);
    } else {
      const skillsContent = section.content as ResumeSectionContentMap["skills"];
      suggestion = await generateSkillsSuggestion({ currentSkills: skillsContent.items ?? [] });
    }
  } catch (err) {
    console.error("regenerateSection AI call failed", sectionType, err);
    return { success: false, error: "Could not generate a suggestion right now. Please try again." };
  }

  const { error } = await supabase
    .from("resume_draft_sections")
    .update({ ai_suggestion: suggestion, status: "ai_suggested", updated_at: new Date().toISOString() })
    .eq("id", section.id);
  if (error) return { success: false, error: error.message };

  await logSuggestionEvent(supabase, {
    candidateId: user.id,
    source: "resume_builder",
    suggestionType: sectionType,
    draftId,
    sectionId: section.id,
    beforeValue: section.content,
    afterValue: suggestion,
  });

  revalidateCandidatePath(`/candidate/resume-builder/${draftId}`);
  return { success: true, suggestion };
}

export async function acceptSectionSuggestion(sectionId: string): Promise<ActionResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: section } = await supabase
    .from("resume_draft_sections")
    .select("id, draft_id, ai_suggestion, resume_drafts!inner(candidate_id)")
    .eq("id", sectionId)
    .single();
  if (!section || (section.resume_drafts as unknown as { candidate_id: string })?.candidate_id !== user.id) {
    return { success: false, error: "Section not found." };
  }
  if (!section.ai_suggestion) return { success: false, error: "No pending suggestion to accept." };

  const { error } = await supabase
    .from("resume_draft_sections")
    .update({ content: section.ai_suggestion, ai_suggestion: null, status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", sectionId);
  if (error) return { success: false, error: error.message };

  await markLatestPendingEventForSection(supabase, sectionId, "accepted");

  revalidateCandidatePath(`/candidate/resume-builder/${section.draft_id}`);
  return { success: true };
}

/** Finds the most recent still-pending suggestion event for a section and decides it -- see decideSuggestionEvent in actions/resume-intelligence.ts, which this mirrors for the case where the UI only has a section_id, not the event id. */
async function markLatestPendingEventForSection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sectionId: string,
  outcome: "accepted" | "rejected"
) {
  const { data: pending } = await supabase
    .from("resume_suggestion_events")
    .select("id")
    .eq("section_id", sectionId)
    .eq("outcome", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    await supabase
      .from("resume_suggestion_events")
      .update({ outcome, decided_at: new Date().toISOString() })
      .eq("id", pending.id);
  }
}

export async function rejectSectionSuggestion(sectionId: string): Promise<ActionResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: section } = await supabase
    .from("resume_draft_sections")
    .select("id, draft_id, status, resume_drafts!inner(candidate_id)")
    .eq("id", sectionId)
    .single();
  if (!section || (section.resume_drafts as unknown as { candidate_id: string })?.candidate_id !== user.id) {
    return { success: false, error: "Section not found." };
  }

  const { error } = await supabase
    .from("resume_draft_sections")
    .update({ ai_suggestion: null, updated_at: new Date().toISOString() })
    .eq("id", sectionId);
  if (error) return { success: false, error: error.message };

  await markLatestPendingEventForSection(supabase, sectionId, "rejected");

  revalidateCandidatePath(`/candidate/resume-builder/${section.draft_id}`);
  return { success: true };
}

export async function updateSectionContent(sectionId: string, content: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: section } = await supabase
    .from("resume_draft_sections")
    .select("id, draft_id, resume_drafts!inner(candidate_id)")
    .eq("id", sectionId)
    .single();
  if (!section || (section.resume_drafts as unknown as { candidate_id: string })?.candidate_id !== user.id) {
    return { success: false, error: "Section not found." };
  }

  const { error } = await supabase
    .from("resume_draft_sections")
    .update({ content, status: "edited", updated_at: new Date().toISOString() })
    .eq("id", sectionId);
  if (error) return { success: false, error: error.message };

  revalidateCandidatePath(`/candidate/resume-builder/${section.draft_id}`);
  return { success: true };
}

export interface ImportDiffResult extends ActionResult {
  diffs?: ImportFieldDiff[];
}

/** Parses an uploaded resume and returns field-level diffs for review -- writes nothing yet. */
export async function importResumeIntoDraft(draftId: string, formData: FormData): Promise<ImportDiffResult> {
  const { user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft) return { success: false, error: "Resume draft not found." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Please select a file to import." };
  if (!ALLOWED_IMPORT_TYPES.includes(file.type)) return { success: false, error: "Only PDF and Word documents are supported." };
  if (file.size > 10 * 1024 * 1024) return { success: false, error: "File must be smaller than 10MB." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromFile(buffer, file.type);
    if (!rawText || rawText.trim().length < 50) {
      return { success: false, error: "Could not extract readable text from this file." };
    }
    const { data: parsed, success } = await parseResumeText(rawText);
    if (!success) {
      return { success: false, error: "Could not extract structured data from this resume right now. Please try again." };
    }
    const diffs = diffImportedResumeAgainstDraft(draft.sections, parsed);
    return { success: true, diffs };
  } catch (err) {
    console.error("importResumeIntoDraft failed", err);
    return { success: false, error: "Could not read that file. Please try a different one." };
  }
}

/** Applies only the diffs the candidate explicitly accepted -- see importResumeIntoDraft. */
export async function applyImportedFields(draftId: string, accepted: ImportFieldDiff[]): Promise<ActionResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft) return { success: false, error: "Resume draft not found." };

  const bySectionType = new Map(draft.sections.map((s) => [s.section_type, s]));

  for (const diff of accepted) {
    const section = bySectionType.get(diff.section_type);
    if (!section) continue;

    // Whole-section diffs (list-shaped sections) already carry their target
    // shape from diffImportedResumeAgainstDraft (e.g. skills as
    // `{ items: [...] }`, everything else as a raw array) -- use it as-is.
    // Scalar diffs (personal_info.*, summary.text) only replace that one
    // field within the section's existing content.
    const nextContent: unknown =
      diff.field === "__whole_section__"
        ? diff.importedValue
        : { ...(section.content as Record<string, unknown>), [diff.field]: diff.importedValue };

    const { error } = await supabase
      .from("resume_draft_sections")
      .update({ content: nextContent, status: "edited", updated_at: new Date().toISOString() })
      .eq("id", section.id);
    if (error) return { success: false, error: error.message };
  }

  revalidateCandidatePath(`/candidate/resume-builder/${draftId}`);
  return { success: true };
}

export interface FinalizeDraftResult extends ActionResult {
  pdfUrl?: string;
  docxUrl?: string;
}

export async function finalizeResumeDraft(draftId: string, format: "pdf" | "docx" | "both"): Promise<FinalizeDraftResult> {
  const { supabase, user } = await requireCandidate();
  if (!user) return { success: false, error: "You must be signed in." };

  const draft = await loadOwnedDraft(draftId, user.id);
  if (!draft) return { success: false, error: "Resume draft not found." };

  try {
    let pdfUrl: string | undefined;
    let docxUrl: string | undefined;

    if (format === "pdf" || format === "both") {
      pdfUrl = await generateResumePdf(draft, user.id, supabase);
    }
    if (format === "docx" || format === "both") {
      docxUrl = await generateResumeDocx(draft, user.id, supabase);
    }

    const { error } = await supabase
      .from("resume_drafts")
      .update({
        status: "finalized",
        // Lightweight version counter (Unit C) -- a count of finalize
        // events, not a content snapshot; see migration 0020.
        version: draft.version + 1,
        ...(pdfUrl ? { finalized_pdf_url: pdfUrl } : {}),
        ...(docxUrl ? { finalized_docx_url: docxUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);
    if (error) return { success: false, error: error.message };

    revalidateCandidatePath(`/candidate/resume-builder/${draftId}`);
    return { success: true, pdfUrl, docxUrl };
  } catch (err) {
    console.error("finalizeResumeDraft failed", err);
    return { success: false, error: "Failed to generate the resume document. Please try again." };
  }
}

export type { ResumeSectionType };
