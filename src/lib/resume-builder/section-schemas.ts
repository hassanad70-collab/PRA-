import type { useTranslations } from "next-intl";

import type { ResumeSectionType } from "@/types/database";

// Matches whatever useTranslations("Candidate.SectionSchemas") returns, so
// callers don't need to widen next-intl's strictly-typed translator to a
// plain string-keyed function (which TS rejects as unsound).
type Translate = ReturnType<typeof useTranslations<"Candidate.SectionSchemas">>;

export type ArraySectionType = "experience" | "education" | "certifications" | "languages" | "projects" | "achievements";

export interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "boolean";
  placeholder?: string;
  /** Stored as string[] but edited as a single comma-separated text input (currently only "technologies"). */
  isCommaList?: boolean;
}

/** Labels and field schemas are translation-driven (t from Candidate.SectionSchemas) rather than static
 * constants, since the resume builder is entirely inside the localized candidate portal. */
export function getSectionLabels(t: Translate): Record<ResumeSectionType, string> {
  return {
    personal_info: t("labels.personalInfo"),
    summary: t("labels.summary"),
    experience: t("labels.experience"),
    education: t("labels.education"),
    skills: t("labels.skills"),
    certifications: t("labels.certifications"),
    languages: t("labels.languages"),
    projects: t("labels.projects"),
    achievements: t("labels.achievements"),
    social_links: t("labels.socialLinks"),
  };
}

export function getArraySectionFields(t: Translate): Record<ArraySectionType, FieldSchema[]> {
  return {
    experience: [
      { key: "job_title", label: t("fields.jobTitle"), type: "text" },
      { key: "company_name", label: t("fields.company"), type: "text" },
      { key: "location", label: t("fields.location"), type: "text" },
      { key: "start_date", label: t("fields.startDate"), type: "date" },
      { key: "end_date", label: t("fields.endDate"), type: "date" },
      { key: "is_current", label: t("fields.currentlyWorkHere"), type: "boolean" },
      { key: "description", label: t("fields.description"), type: "textarea", placeholder: t("fields.descriptionPlaceholder") },
    ],
    education: [
      { key: "institution", label: t("fields.institution"), type: "text" },
      { key: "degree", label: t("fields.degree"), type: "text" },
      { key: "field_of_study", label: t("fields.fieldOfStudy"), type: "text" },
      { key: "start_date", label: t("fields.startDate"), type: "date" },
      { key: "end_date", label: t("fields.endDate"), type: "date" },
      { key: "grade", label: t("fields.grade"), type: "text" },
    ],
    certifications: [
      { key: "name", label: t("fields.name"), type: "text" },
      { key: "issuing_organization", label: t("fields.issuingOrganization"), type: "text" },
      { key: "issue_date", label: t("fields.issueDate"), type: "date" },
    ],
    languages: [
      { key: "language", label: t("fields.language"), type: "text" },
      { key: "proficiency", label: t("fields.proficiency"), type: "text", placeholder: t("fields.proficiencyPlaceholder") },
    ],
    projects: [
      { key: "name", label: t("fields.name"), type: "text" },
      { key: "description", label: t("fields.description"), type: "textarea" },
      { key: "technologies", label: t("fields.technologies"), type: "text", isCommaList: true },
    ],
    achievements: [
      { key: "title", label: t("fields.title"), type: "text" },
      { key: "description", label: t("fields.description"), type: "textarea" },
    ],
  };
}

export const ARRAY_SECTION_TYPES: ArraySectionType[] = [
  "experience",
  "education",
  "certifications",
  "languages",
  "projects",
  "achievements",
];

export function isArraySectionType(type: ResumeSectionType): type is ArraySectionType {
  return (ARRAY_SECTION_TYPES as string[]).includes(type);
}
