import type { ResumeSectionType } from "@/types/database";

export const SECTION_LABELS: Record<ResumeSectionType, string> = {
  personal_info: "Personal Info",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  projects: "Projects",
  achievements: "Achievements",
  social_links: "Social Links",
};

export type ArraySectionType = "experience" | "education" | "certifications" | "languages" | "projects" | "achievements";

export interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "boolean";
  placeholder?: string;
  /** Stored as string[] but edited as a single comma-separated text input (currently only "technologies"). */
  isCommaList?: boolean;
}

/** Drives the generic repeatable-entry editor for every array-shaped factual section. */
export const ARRAY_SECTION_FIELDS: Record<ArraySectionType, FieldSchema[]> = {
  experience: [
    { key: "job_title", label: "Job title", type: "text" },
    { key: "company_name", label: "Company", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "end_date", label: "End date", type: "date" },
    { key: "is_current", label: "I currently work here", type: "boolean" },
    { key: "description", label: "Description", type: "textarea", placeholder: "One achievement per line" },
  ],
  education: [
    { key: "institution", label: "Institution", type: "text" },
    { key: "degree", label: "Degree", type: "text" },
    { key: "field_of_study", label: "Field of study", type: "text" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "end_date", label: "End date", type: "date" },
    { key: "grade", label: "Grade", type: "text" },
  ],
  certifications: [
    { key: "name", label: "Name", type: "text" },
    { key: "issuing_organization", label: "Issuing organization", type: "text" },
    { key: "issue_date", label: "Issue date", type: "date" },
  ],
  languages: [
    { key: "language", label: "Language", type: "text" },
    { key: "proficiency", label: "Proficiency", type: "text", placeholder: "basic / conversational / fluent / native" },
  ],
  projects: [
    { key: "name", label: "Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "technologies", label: "Technologies (comma-separated)", type: "text", isCommaList: true },
  ],
  achievements: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
  ],
};

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
