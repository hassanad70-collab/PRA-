"use server";

import { revalidateCandidatePath } from "@/lib/revalidate-candidate-path";
import { extractTextFromFile } from "@/lib/ai/extract-text";
import { generateEmbedding, toVectorLiteral } from "@/lib/ai/embeddings";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { scoreResumeATS } from "@/lib/ai/ats-scorer";
import { generateAchievementStatements, generateAtsKeywordSuggestions } from "@/lib/ai/resume-improver";
import { generateExperienceSuggestion, generateSkillsSuggestion, generateSummarySuggestion } from "@/lib/ai/resume-builder";
import { logSuggestionEvent } from "@/lib/resume-intelligence/suggestion-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ParsedResumeData } from "@/types/database";
import type { ActionResult } from "./auth";
import { generateMatchesForResume } from "./matching";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export interface UploadResumeResult extends ActionResult {
  resumeId?: string;
}

/**
 * Full resume upload pipeline:
 * 1. Upload the file to Supabase Storage (private, per-candidate folder).
 * 2. Create the `resumes` row.
 * 3. Extract raw text, run the AI parser, and populate the candidate profile.
 * 4. Generate an embedding and AI ATS score.
 * 5. Kick off AI job matching against every published job.
 */
export async function uploadResume(formData: FormData): Promise<UploadResumeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Please select a file to upload." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only PDF and Word documents are supported." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File must be smaller than 10MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) return { success: false, error: uploadError.message };

  // The "resumes" bucket is private (supabase/migrations/0010_storage.sql),
  // so getPublicUrl() would produce a URL that always 403s. Use a signed URL
  // instead; callers that need a fresh link later should re-sign at request
  // time since this one expires.
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("resumes")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (signedUrlError || !signedUrlData) {
    return { success: false, error: "Failed to generate a resume access link." };
  }

  const { data: existingPrimary } = await supabase
    .from("resumes")
    .select("id")
    .eq("candidate_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  const { data: resume, error: insertError } = await supabase
    .from("resumes")
    .insert({
      candidate_id: user.id,
      file_name: file.name,
      file_url: signedUrlData.signedUrl,
      file_path: filePath,
      file_type: file.type,
      file_size_bytes: file.size,
      parse_status: "processing",
      is_primary: !existingPrimary,
    })
    .select("id")
    .single();

  if (insertError || !resume) {
    return { success: false, error: insertError?.message ?? "Failed to save resume record." };
  }

  if (!existingPrimary) {
    await supabase.from("candidates").update({ primary_resume_id: resume.id }).eq("id", user.id);
  }

  try {
    await processResume(resume.id, user.id, buffer, file.type);
  } catch (err) {
    const admin = createAdminClient();
    await admin
      .from("resumes")
      .update({ parse_status: "failed", parse_error: err instanceof Error ? err.message : "Unknown error" })
      .eq("id", resume.id);
    revalidateCandidatePath("/candidate/resume");
    revalidateCandidatePath("/candidate/profile");
    revalidateCandidatePath("/candidate/dashboard");
    return { success: false, error: "Resume uploaded, but AI parsing failed. You can retry from your profile." };
  }

  revalidateCandidatePath("/candidate/resume");
  revalidateCandidatePath("/candidate/profile");
  revalidateCandidatePath("/candidate/dashboard");

  return { success: true, resumeId: resume.id };
}

/**
 * Runs the AI pipeline for a resume: extract text -> parse -> populate
 * profile -> embed -> ATS score -> job matching. Uses the admin client
 * because it writes across several tables on behalf of the "system".
 */
async function processResume(resumeId: string, candidateId: string, buffer: Buffer, mimeType: string) {
  const rawText = await extractTextFromFile(buffer, mimeType);
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Could not extract readable text from this file.");
  }

  const embedding = await generateEmbedding(rawText);
  const admin = createAdminClient();
  if (embedding) {
    await admin
      .from("resumes")
      .update({ embedding: toVectorLiteral(embedding) as unknown as number[] })
      .eq("id", resumeId);
  }

  await parseAndScoreResume(resumeId, candidateId, rawText);

  // Genuinely fire-and-forget: don't block the upload response on matching
  // every published job. generateMatchesForResume never throws (every query
  // is null-guarded or wrapped internally), so this can't affect parse_status.
  generateMatchesForResume(resumeId, candidateId).catch((err) => {
    console.error("generateMatchesForResume failed for resume", resumeId, err);
  });
}

/**
 * The parse-and-score half of the pipeline, split out from processResume so
 * reparseResume() (a candidate-triggered retry for a resume that previously
 * landed in "completed_partial") can rerun exactly this step against the
 * already-stored raw_text, without re-extracting text or re-uploading the
 * file. This is also the single place that writes parsed_data and calls the
 * ATS scorer, so the two always run against the identical ParsedResumeData
 * object -- there is no second/duplicate parsing path anywhere else.
 */
async function parseAndScoreResume(resumeId: string, candidateId: string, rawText: string) {
  const admin = createAdminClient();

  const { data: parsed, success } = await parseResumeText(rawText);

  await admin
    .from("resumes")
    .update({
      raw_text: rawText,
      parsed_data: parsed,
      parse_status: success ? "completed" : "completed_partial",
      parse_error: success
        ? null
        : "AI structured extraction did not complete for this resume (raw text and ATS score are still available). Try again.",
      parsed_at: new Date().toISOString(),
    })
    .eq("id", resumeId);

  if (success) {
    await populateCandidateProfileFromResume(candidateId, parsed);
  }

  const atsResult = await scoreResumeATS(rawText, parsed);
  const keywordDensity = Object.fromEntries(atsResult.keyword_density.map((k) => [k.keyword, k.count]));

  // ats_scores is append-only per attempt (the admin candidate-detail view
  // lists every row as history) -- a manual reparse just adds a newer row,
  // which getLatestAtsScore/atsScore.resume_id naturally picks up as current.
  await admin.from("ats_scores").insert({
    resume_id: resumeId,
    candidate_id: candidateId,
    overall_score: Math.round(atsResult.overall_score),
    experience_score: Math.round(atsResult.experience_score),
    skills_score: Math.round(atsResult.skills_score),
    formatting_score: Math.round(atsResult.formatting_score),
    education_score: Math.round(atsResult.education_score),
    achievements_score: Math.round(atsResult.achievements_score),
    recruiter_readability_score: Math.round(atsResult.recruiter_readability_score),
    keyword_density: keywordDensity,
    weaknesses: atsResult.weaknesses,
    suggestions: atsResult.suggestions,
    ai_model: "gpt-4o-mini",
  });

  await admin.rpc("recompute_profile_completion", { p_candidate_id: candidateId });
}

/**
 * Retries AI structured extraction + ATS scoring for a resume already stuck
 * in "completed_partial", reusing its stored raw_text -- no re-upload
 * required. See parseAndScoreResume's doc comment for why this is the same
 * code path the initial upload uses, not a second implementation.
 */
export async function reparseResume(resumeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, raw_text")
    .eq("id", resumeId)
    .eq("candidate_id", user.id)
    .single();
  if (!resume?.raw_text) return { success: false, error: "This resume has no extracted text to reparse." };

  try {
    await parseAndScoreResume(resumeId, user.id, resume.raw_text);
  } catch (err) {
    console.error("reparseResume failed", err);
    return { success: false, error: "Could not reparse this resume right now. Please try again." };
  }

  revalidateCandidatePath("/candidate/resume");
  revalidateCandidatePath("/candidate/profile");
  revalidateCandidatePath("/candidate/dashboard");
  return { success: true };
}

/**
 * Populates candidate_experience / candidate_education / candidate_skills /
 * etc. from AI-extracted resume data. AI-extracted rows are tagged so we
 * never clobber data the candidate entered manually.
 */
async function populateCandidateProfileFromResume(candidateId: string, parsed: ParsedResumeData) {
  const admin = createAdminClient();

  const candidateUpdate: Record<string, unknown> = {};
  if (parsed.current_position) candidateUpdate.current_position = parsed.current_position;
  if (parsed.summary) candidateUpdate.summary = parsed.summary;
  if (typeof parsed.years_of_experience === "number") candidateUpdate.years_of_experience = parsed.years_of_experience;
  if (parsed.address) candidateUpdate.address = parsed.address;

  if (Object.keys(candidateUpdate).length > 0) {
    const { data: current } = await admin
      .from("candidates")
      .select("summary, current_position, years_of_experience")
      .eq("id", candidateId)
      .single();

    // Only fill in fields the candidate hasn't already set manually.
    const safeUpdate: Record<string, unknown> = {};
    if (candidateUpdate.summary && !current?.summary) safeUpdate.summary = candidateUpdate.summary;
    if (candidateUpdate.current_position && !current?.current_position)
      safeUpdate.current_position = candidateUpdate.current_position;
    if (!current?.years_of_experience) safeUpdate.years_of_experience = candidateUpdate.years_of_experience;

    if (Object.keys(safeUpdate).length > 0) {
      await admin.from("candidates").update(safeUpdate).eq("id", candidateId);
    }
  }

  if (parsed.experience?.length) {
    await admin.from("candidate_experience").delete().eq("candidate_id", candidateId);
    await admin.from("candidate_experience").insert(
      parsed.experience.map((e) => ({
        candidate_id: candidateId,
        company_name: e.company_name,
        job_title: e.job_title,
        location: e.location ?? null,
        start_date: e.start_date ?? null,
        end_date: e.end_date ?? null,
        is_current: e.is_current ?? false,
        description: e.description ?? null,
      }))
    );
  }

  if (parsed.education?.length) {
    await admin.from("candidate_education").delete().eq("candidate_id", candidateId);
    await admin.from("candidate_education").insert(
      parsed.education.map((e) => ({
        candidate_id: candidateId,
        institution: e.institution,
        degree: e.degree ?? null,
        field_of_study: e.field_of_study ?? null,
        start_date: e.start_date ?? null,
        end_date: e.end_date ?? null,
        grade: e.grade ?? null,
      }))
    );
  }

  if (parsed.skills?.length) {
    const rows = Array.from(new Set(parsed.skills.map((s) => s.trim()).filter(Boolean))).map((skill) => ({
      candidate_id: candidateId,
      skill_name: skill,
      is_ai_extracted: true,
    }));
    await admin.from("candidate_skills").upsert(rows, { onConflict: "candidate_id,skill_name", ignoreDuplicates: true });
  }

  if (parsed.certificates?.length) {
    await admin.from("candidate_certificates").delete().eq("candidate_id", candidateId);
    await admin.from("candidate_certificates").insert(
      parsed.certificates.map((c) => ({
        candidate_id: candidateId,
        name: c.name,
        issuing_organization: c.issuing_organization ?? null,
        issue_date: c.issue_date ?? null,
      }))
    );
  }

  if (parsed.languages?.length) {
    const rows = parsed.languages.map((l) => ({
      candidate_id: candidateId,
      language: l.language,
      proficiency: l.proficiency,
    }));
    await admin.from("candidate_languages").upsert(rows, { onConflict: "candidate_id,language" });
  }

  if (parsed.projects?.length) {
    await admin.from("candidate_projects").delete().eq("candidate_id", candidateId);
    await admin.from("candidate_projects").insert(
      parsed.projects.map((p) => ({
        candidate_id: candidateId,
        name: p.name,
        description: p.description ?? null,
        technologies: p.technologies ?? [],
      }))
    );
  }

  if (parsed.achievements?.length) {
    await admin.from("candidate_achievements").delete().eq("candidate_id", candidateId);
    await admin.from("candidate_achievements").insert(
      parsed.achievements.map((a) => ({
        candidate_id: candidateId,
        title: a.title,
        description: a.description ?? null,
      }))
    );
  }
}

export async function setPrimaryResume(resumeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  await supabase.from("resumes").update({ is_primary: false }).eq("candidate_id", user.id);
  const { error } = await supabase.from("resumes").update({ is_primary: true }).eq("id", resumeId).eq("candidate_id", user.id);
  if (error) return { success: false, error: error.message };

  await supabase.from("candidates").update({ primary_resume_id: resumeId }).eq("id", user.id);

  revalidateCandidatePath("/candidate/resume");
  return { success: true };
}

export interface ResumeExperienceSuggestion {
  id: string;
  jobTitle: string;
  companyName: string;
  current: string | null;
  suggested: string;
  eventId: string | null;
}

export interface LabeledSuggestion {
  value: string;
  eventId: string | null;
}

export interface ResumeSuggestions {
  summary: { current: string | null; suggested: string; eventId: string | null };
  experience: ResumeExperienceSuggestion[];
  skillAdditions: LabeledSuggestion[];
  achievements: LabeledSuggestion[];
  atsKeywords: LabeledSuggestion[];
}

export interface GenerateResumeSuggestionsResult extends ActionResult {
  suggestions?: ResumeSuggestions;
}

/**
 * Powers the Resume Intelligence Hub's "Rewrite & Optimize" module. Runs
 * every decomposed writing tool in parallel against the candidate's real
 * profile data (not a resume's parsed snapshot) -- summary and experience
 * bullets reuse the exact same functions the Resume Builder already uses
 * for its per-section suggestions, so there's one rewriter/bullet-optimizer
 * implementation, not two. Every suggestion actually shown gets a durable
 * event row (Unit C) so it can later be accepted/rejected and shown in the
 * History module -- logged here, decided via decideSuggestionEvent in
 * actions/resume-intelligence.ts once the candidate reviews it.
 */
export async function generateResumeSuggestions(): Promise<GenerateResumeSuggestionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const [{ data: candidate }, { data: experience }, { data: skills }] = await Promise.all([
    supabase.from("candidates").select("summary, current_position, years_of_experience").eq("id", user.id).single(),
    supabase
      .from("candidate_experience")
      .select("id, company_name, job_title, location, start_date, end_date, is_current, description")
      .eq("candidate_id", user.id)
      .order("start_date", { ascending: false }),
    supabase.from("candidate_skills").select("skill_name").eq("candidate_id", user.id),
  ]);

  const experienceRows = experience ?? [];
  const skillNames = (skills ?? []).map((s) => s.skill_name);
  const experienceForAi = experienceRows.map((e) => ({
    company_name: e.company_name,
    job_title: e.job_title,
    location: e.location ?? undefined,
    start_date: e.start_date ?? undefined,
    end_date: e.end_date ?? undefined,
    is_current: e.is_current,
    description: e.description ?? undefined,
  }));

  try {
    const [summaryResult, experienceResult, skillsResult, achievements, atsKeywords] = await Promise.all([
      generateSummarySuggestion({
        currentSummary: candidate?.summary ?? undefined,
        currentPosition: candidate?.current_position ?? undefined,
        yearsOfExperience: candidate?.years_of_experience ?? undefined,
        topSkills: skillNames.slice(0, 5),
      }),
      generateExperienceSuggestion(experienceForAi),
      generateSkillsSuggestion({ currentSkills: skillNames, experienceSummary: candidate?.summary ?? undefined }),
      generateAchievementStatements({
        summary: candidate?.summary,
        experience: experienceRows.map((e) => ({ company_name: e.company_name, job_title: e.job_title, description: e.description })),
      }),
      generateAtsKeywordSuggestions({
        currentPosition: candidate?.current_position,
        skills: skillNames,
        experience: experienceRows.map((e) => ({ company_name: e.company_name, job_title: e.job_title, description: e.description })),
      }),
    ]);

    // generateExperienceSuggestion is order-preserving by contract, but
    // matching on company+title (rather than array index) stays correct
    // even if that contract ever loosens.
    const roleKey = (companyName: string, jobTitle: string) => companyName + " :: " + jobTitle;
    const suggestionByRole = new Map(experienceResult.map((e) => [roleKey(e.company_name, e.job_title), e.description]));

    const summarySuggested = summaryResult.text ?? "";
    const summaryChanged = summarySuggested.trim() !== "" && summarySuggested.trim() !== (candidate?.summary ?? "").trim();

    const experienceWithDiffs = experienceRows.map((e) => {
      const suggested = suggestionByRole.get(roleKey(e.company_name, e.job_title)) ?? e.description ?? "";
      const changed = suggested.trim() !== "" && suggested.trim() !== (e.description ?? "").trim();
      return { row: e, suggested, changed };
    });

    const newSkills = skillsResult.suggested_additions.filter(
      (s) => !skillNames.some((existing) => existing.toLowerCase() === s.toLowerCase())
    );
    const newKeywords = atsKeywords.filter((k) => !skillNames.some((existing) => existing.toLowerCase() === k.toLowerCase()));

    // Every suggestion actually shown to the candidate gets a durable event
    // row; items filtered out above (no real change / already-known skill)
    // are never logged, keeping the audit log free of no-op noise. Logged
    // sequentially (not Promise.all) so each insert's result lines up with
    // its source item without needing a second pass to re-associate them.
    const summaryEventId = summaryChanged
      ? await logSuggestionEvent(supabase, {
          candidateId: user.id,
          source: "rewrite_optimize",
          suggestionType: "summary",
          beforeValue: candidate?.summary ?? null,
          afterValue: summarySuggested,
        })
      : null;

    const experienceEventIds: (string | null)[] = [];
    for (const e of experienceWithDiffs) {
      if (e.changed) {
        experienceEventIds.push(
          await logSuggestionEvent(supabase, {
            candidateId: user.id,
            source: "rewrite_optimize",
            suggestionType: "experience",
            targetId: e.row.id,
            beforeValue: e.row.description,
            afterValue: e.suggested,
          })
        );
      } else {
        experienceEventIds.push(null);
      }
    }

    const skillEventIds: (string | null)[] = [];
    for (const s of newSkills) {
      skillEventIds.push(
        await logSuggestionEvent(supabase, { candidateId: user.id, source: "rewrite_optimize", suggestionType: "skills", afterValue: s })
      );
    }

    const achievementEventIds: (string | null)[] = [];
    for (const a of achievements) {
      achievementEventIds.push(
        await logSuggestionEvent(supabase, { candidateId: user.id, source: "rewrite_optimize", suggestionType: "achievement", afterValue: a })
      );
    }

    const keywordEventIds: (string | null)[] = [];
    for (const k of newKeywords) {
      keywordEventIds.push(
        await logSuggestionEvent(supabase, { candidateId: user.id, source: "rewrite_optimize", suggestionType: "ats_keyword", afterValue: k })
      );
    }

    const suggestions: ResumeSuggestions = {
      summary: { current: candidate?.summary ?? null, suggested: summarySuggested, eventId: summaryEventId },
      experience: experienceWithDiffs.map((e, i) => ({
        id: e.row.id,
        jobTitle: e.row.job_title,
        companyName: e.row.company_name,
        current: e.row.description,
        suggested: e.suggested,
        eventId: experienceEventIds[i],
      })),
      skillAdditions: newSkills.map((s, i) => ({ value: s, eventId: skillEventIds[i] })),
      achievements: achievements.map((a, i) => ({ value: a, eventId: achievementEventIds[i] })),
      atsKeywords: newKeywords.map((k, i) => ({ value: k, eventId: keywordEventIds[i] })),
    };

    return { success: true, suggestions };
  } catch (err) {
    console.error("generateResumeSuggestions failed", err);
    return { success: false, error: "Could not generate suggestions right now. Please try again." };
  }
}
