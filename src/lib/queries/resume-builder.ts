import "server-only";

import { getCandidateFullProfile } from "@/lib/queries/candidate";
import { createClient } from "@/lib/supabase/server";
import type {
  ResumeDraft,
  ResumeDraftSection,
  ResumeDraftWithSections,
  ResumeSectionContentMap,
  ResumeSectionType,
} from "@/types/database";

const SECTION_ORDER: ResumeSectionType[] = [
  "personal_info",
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "languages",
  "projects",
  "achievements",
  "social_links",
];

export async function getResumeDrafts(candidateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_drafts")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ResumeDraft[];
}

export async function getResumeDraftWithSections(draftId: string): Promise<ResumeDraftWithSections | null> {
  const supabase = await createClient();
  const [{ data: draft }, { data: sections }] = await Promise.all([
    supabase.from("resume_drafts").select("*").eq("id", draftId).single(),
    supabase.from("resume_draft_sections").select("*").eq("draft_id", draftId).order("order_index"),
  ]);
  if (!draft) return null;
  return { ...(draft as ResumeDraft), sections: (sections ?? []) as ResumeDraftSection[] };
}

/**
 * Seeds a new draft's sections from the candidate's platform profile
 * (priority-1 data source, per the approved builder design) via the same
 * getCandidateFullProfile() aggregator the rest of the app already uses --
 * not a parallel profile-reading path, so this stays reusable by future
 * AI features that need the same unified profile.
 *
 * Factual sections seed straight to 'accepted' (they're the candidate's
 * own recorded facts, not something to review as a suggestion). A section
 * with no source data seeds as 'empty' rather than being omitted, so the
 * UI always has a consistent set of 10 sections to render.
 */
export async function createDraftSeededFromProfile(candidateId: string, title = "My Resume") {
  const supabase = await createClient();
  const profile = await getCandidateFullProfile(candidateId);

  const { data: draft, error } = await supabase
    .from("resume_drafts")
    .insert({ candidate_id: candidateId, title })
    .select("*")
    .single();
  if (error || !draft) throw new Error(error?.message ?? "Failed to create resume draft.");

  const sectionSeeds: { section_type: ResumeSectionType; content: unknown; hasData: boolean }[] = [
    {
      section_type: "personal_info",
      content: {
        full_name: profile.profile?.full_name,
        email: profile.profile?.email,
        phone: profile.profile?.phone ?? undefined,
        address: profile.candidate?.address ?? undefined,
        current_position: profile.candidate?.current_position ?? undefined,
      } satisfies ResumeSectionContentMap["personal_info"],
      hasData: Boolean(profile.profile?.full_name),
    },
    {
      section_type: "summary",
      content: { text: profile.candidate?.summary ?? undefined } satisfies ResumeSectionContentMap["summary"],
      hasData: Boolean(profile.candidate?.summary),
    },
    {
      section_type: "experience",
      content: profile.experience.map((e) => ({
        company_name: e.company_name,
        job_title: e.job_title,
        location: e.location ?? undefined,
        start_date: e.start_date ?? undefined,
        end_date: e.end_date ?? undefined,
        is_current: e.is_current,
        description: e.description ?? undefined,
      })) satisfies ResumeSectionContentMap["experience"],
      hasData: profile.experience.length > 0,
    },
    {
      section_type: "education",
      content: profile.education.map((e) => ({
        institution: e.institution,
        degree: e.degree ?? undefined,
        field_of_study: e.field_of_study ?? undefined,
        start_date: e.start_date ?? undefined,
        end_date: e.end_date ?? undefined,
        grade: e.grade ?? undefined,
      })) satisfies ResumeSectionContentMap["education"],
      hasData: profile.education.length > 0,
    },
    {
      section_type: "skills",
      content: { items: profile.skills.map((s) => s.skill_name) } satisfies ResumeSectionContentMap["skills"],
      hasData: profile.skills.length > 0,
    },
    {
      section_type: "certifications",
      content: profile.certificates.map((c) => ({
        name: c.name,
        issuing_organization: c.issuing_organization ?? undefined,
        issue_date: c.issue_date ?? undefined,
      })) satisfies ResumeSectionContentMap["certifications"],
      hasData: profile.certificates.length > 0,
    },
    {
      section_type: "languages",
      content: profile.languages.map((l) => ({
        language: l.language,
        proficiency: l.proficiency,
      })) satisfies ResumeSectionContentMap["languages"],
      hasData: profile.languages.length > 0,
    },
    {
      section_type: "projects",
      content: profile.projects.map((p) => ({
        name: p.name,
        description: p.description ?? undefined,
        technologies: p.technologies ?? undefined,
      })) satisfies ResumeSectionContentMap["projects"],
      hasData: profile.projects.length > 0,
    },
    {
      section_type: "achievements",
      content: profile.achievements.map((a) => ({
        title: a.title,
        description: a.description ?? undefined,
      })) satisfies ResumeSectionContentMap["achievements"],
      hasData: profile.achievements.length > 0,
    },
    {
      section_type: "social_links",
      content: {
        linkedin_url: profile.candidate?.linkedin_url ?? undefined,
        github_url: profile.candidate?.github_url ?? undefined,
        portfolio_url: profile.candidate?.portfolio_url ?? undefined,
        website_url: profile.candidate?.website_url ?? undefined,
      } satisfies ResumeSectionContentMap["social_links"],
      hasData: Boolean(
        profile.candidate?.linkedin_url ||
          profile.candidate?.github_url ||
          profile.candidate?.portfolio_url ||
          profile.candidate?.website_url
      ),
    },
  ];

  const rows = sectionSeeds.map((seed, i) => ({
    draft_id: draft.id,
    section_type: seed.section_type,
    content: seed.content,
    status: seed.hasData ? "accepted" : "empty",
    order_index: SECTION_ORDER.indexOf(seed.section_type) ?? i,
  }));

  const { error: sectionsError } = await supabase.from("resume_draft_sections").insert(rows);
  if (sectionsError) throw new Error(sectionsError.message);

  return draft as ResumeDraft;
}

export async function deleteResumeDraft(draftId: string, candidateId: string) {
  const supabase = await createClient();
  await supabase.from("resume_drafts").delete().eq("id", draftId).eq("candidate_id", candidateId);
}
