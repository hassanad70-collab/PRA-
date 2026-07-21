"use server";

import { revalidatePath } from "next/cache";

import { extractTextFromFile } from "@/lib/ai/extract-text";
import { generateEmbedding, toVectorLiteral } from "@/lib/ai/embeddings";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { scoreResumeATS } from "@/lib/ai/ats-scorer";
import { improveResume } from "@/lib/ai/resume-improver";
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
    revalidatePath("/candidate/resume");
    revalidatePath("/candidate/profile");
    revalidatePath("/candidate/dashboard");
    return { success: false, error: "Resume uploaded, but AI parsing failed. You can retry from your profile." };
  }

  revalidatePath("/candidate/resume");
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/dashboard");

  return { success: true, resumeId: resume.id };
}

/**
 * Runs the AI pipeline for a resume: extract text -> parse -> populate
 * profile -> embed -> ATS score -> job matching. Uses the admin client
 * because it writes across several tables on behalf of the "system".
 */
async function processResume(resumeId: string, candidateId: string, buffer: Buffer, mimeType: string) {
  const admin = createAdminClient();

  const rawText = await extractTextFromFile(buffer, mimeType);
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Could not extract readable text from this file.");
  }

  const parsed: ParsedResumeData = await parseResumeText(rawText);
  const embedding = await generateEmbedding(rawText);

  await admin
    .from("resumes")
    .update({
      raw_text: rawText,
      parsed_data: parsed,
      parse_status: "completed",
      parsed_at: new Date().toISOString(),
      ...(embedding ? { embedding: toVectorLiteral(embedding) as unknown as number[] } : {}),
    })
    .eq("id", resumeId);

  await populateCandidateProfileFromResume(candidateId, parsed);

  const atsResult = await scoreResumeATS(rawText, parsed);
  const keywordDensity = Object.fromEntries(atsResult.keyword_density.map((k) => [k.keyword, k.count]));

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

  // Genuinely fire-and-forget: don't block the upload response on matching
  // every published job. generateMatchesForResume never throws (every query
  // is null-guarded or wrapped internally), so this can't affect parse_status.
  generateMatchesForResume(resumeId, candidateId).catch((err) => {
    console.error("generateMatchesForResume failed for resume", resumeId, err);
  });
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

  revalidatePath("/candidate/resume");
  return { success: true };
}

export interface ImproveResumeResult extends ActionResult {
  improvement?: Awaited<ReturnType<typeof improveResume>>;
}

/** Powers the "Improve My Resume" button. */
export async function improveResumeAction(resumeId: string): Promise<ImproveResumeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: resume } = await supabase
    .from("resumes")
    .select("parsed_data, candidate_id")
    .eq("id", resumeId)
    .single();

  if (!resume || resume.candidate_id !== user.id) {
    return { success: false, error: "Resume not found." };
  }
  if (!resume.parsed_data) {
    return { success: false, error: "This resume hasn't finished AI parsing yet." };
  }

  try {
    const improvement = await improveResume(resume.parsed_data as ParsedResumeData);
    return { success: true, improvement };
  } catch (err) {
    console.error("improveResumeAction failed", err);
    return { success: false, error: "Could not generate improvements right now. Please try again." };
  }
}
