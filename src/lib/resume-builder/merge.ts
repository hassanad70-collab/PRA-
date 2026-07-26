import "server-only";

import type { ImportFieldDiff, ParsedResumeData, ResumeDraftSection } from "@/types/database";

/**
 * Compares a freshly-parsed uploaded resume (priority-2 data source)
 * against a draft's current section content and returns one diff entry per
 * field/section for the candidate to review. Nothing here is applied
 * automatically -- see applyImportedFields in src/actions/resume-builder.ts,
 * which only writes fields the candidate explicitly accepted.
 *
 * Scalar fields (personal_info.*, summary.text) are diffed field-by-field.
 * List-shaped sections (experience, education, skills, certifications,
 * languages, projects, achievements) are diffed at the whole-section level
 * -- the candidate chooses to keep their current list or replace it with
 * the imported one, rather than reconciling individual entries, which
 * keeps the review step legible instead of a huge per-item conflict list.
 */
export function diffImportedResumeAgainstDraft(
  sections: ResumeDraftSection[],
  imported: ParsedResumeData
): ImportFieldDiff[] {
  const byType = new Map(sections.map((s) => [s.section_type, s]));
  const diffs: ImportFieldDiff[] = [];

  const personalInfo = byType.get("personal_info")?.content as
    | { full_name?: string; email?: string; phone?: string; address?: string; current_position?: string }
    | undefined;

  const scalarChecks: { field: string; current: unknown; next: unknown }[] = [
    { field: "full_name", current: personalInfo?.full_name, next: imported.full_name },
    { field: "email", current: personalInfo?.email, next: imported.email },
    { field: "phone", current: personalInfo?.phone, next: imported.phone },
    { field: "address", current: personalInfo?.address, next: imported.address },
    { field: "current_position", current: personalInfo?.current_position, next: imported.current_position },
  ];
  for (const check of scalarChecks) {
    if (!check.next) continue; // Nothing to import for this field.
    diffs.push({
      section_type: "personal_info",
      field: check.field,
      currentValue: check.current ?? null,
      importedValue: check.next,
      hasConflict: Boolean(check.current) && check.current !== check.next,
    });
  }

  const currentSummary = (byType.get("summary")?.content as { text?: string } | undefined)?.text;
  if (imported.summary) {
    diffs.push({
      section_type: "summary",
      field: "text",
      currentValue: currentSummary ?? null,
      importedValue: imported.summary,
      hasConflict: Boolean(currentSummary) && currentSummary !== imported.summary,
    });
  }

  const listSections: { section_type: ResumeDraftSection["section_type"]; imported: unknown }[] = [
    { section_type: "experience", imported: imported.experience },
    { section_type: "education", imported: imported.education },
    { section_type: "skills", imported: imported.skills ? { items: imported.skills } : undefined },
    { section_type: "certifications", imported: imported.certificates },
    { section_type: "languages", imported: imported.languages },
    { section_type: "projects", imported: imported.projects },
    { section_type: "achievements", imported: imported.achievements },
  ];

  for (const { section_type, imported: importedValue } of listSections) {
    const hasImportedData = Array.isArray(importedValue) ? importedValue.length > 0 : Boolean(importedValue);
    if (!hasImportedData) continue;

    const current = byType.get(section_type);
    const currentHasData =
      current?.status !== "empty" &&
      (Array.isArray(current?.content) ? current.content.length > 0 : Boolean((current?.content as { items?: unknown[] })?.items?.length));

    diffs.push({
      section_type,
      field: "__whole_section__",
      currentValue: current?.content ?? null,
      importedValue,
      hasConflict: currentHasData,
    });
  }

  return diffs;
}
