import type { ResumeSectionType } from "@/types/database";

// FieldSchema mirrors the one in resume-builder/section-schemas.ts so
// RepeatableEntryEditor (which already consumes FieldSchema from that module)
// can also be driven by Studio schemas without a type-mismatch.
export interface StudioFieldSchema {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "boolean" | "url";
  placeholder?: string;
  isCommaList?: boolean;
  fullWidth?: boolean;
}

// Canonical section order for all 16 section types in Studio
export const STUDIO_SECTION_ORDER: ResumeSectionType[] = [
  "personal_info",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "courses",
  "volunteer",
  "publications",
  "references",
  "interests",
  "languages",
  "achievements",
  "social_links",
];

export const STUDIO_SECTION_LABELS: Record<ResumeSectionType, string> = {
  personal_info: "Personal Information",
  summary: "Professional Summary",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  projects: "Projects",
  achievements: "Achievements",
  social_links: "Social Links",
  volunteer: "Volunteer Experience",
  publications: "Publications",
  references: "References",
  interests: "Interests",
  awards: "Awards & Honors",
  courses: "Courses & Training",
};

export const STUDIO_SECTION_DESCRIPTIONS: Record<ResumeSectionType, string> = {
  personal_info: "Your contact details and headline",
  summary: "A compelling overview of your career",
  experience: "Your work history and accomplishments",
  education: "Degrees, institutions, and dates",
  skills: "Technical and professional competencies",
  certifications: "Professional licenses and certificates",
  languages: "Languages and proficiency levels",
  projects: "Personal and professional projects",
  achievements: "Notable accomplishments and recognitions",
  social_links: "LinkedIn, GitHub, portfolio, and website",
  volunteer: "Community service and volunteer work",
  publications: "Papers, articles, and books",
  references: "Professional references",
  interests: "Hobbies and interests",
  awards: "Awards, honors, and recognitions",
  courses: "Online courses and training programs",
};

// Field schemas for array-based sections (used by RepeatableEntryEditor)
export const STUDIO_ARRAY_SECTION_FIELDS: Partial<Record<ResumeSectionType, StudioFieldSchema[]>> = {
  experience: [
    { key: "job_title", label: "Job Title", type: "text" },
    { key: "company_name", label: "Company", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "is_current", label: "I currently work here", type: "boolean" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Describe your responsibilities and achievements…", fullWidth: true },
  ],
  education: [
    { key: "institution", label: "Institution", type: "text" },
    { key: "degree", label: "Degree", type: "text" },
    { key: "field_of_study", label: "Field of Study", type: "text" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "grade", label: "Grade / GPA", type: "text" },
  ],
  certifications: [
    { key: "name", label: "Certification Name", type: "text" },
    { key: "issuing_organization", label: "Issuing Organization", type: "text" },
    { key: "issue_date", label: "Date Issued", type: "date" },
  ],
  languages: [
    { key: "language", label: "Language", type: "text" },
    { key: "proficiency", label: "Proficiency", type: "text", placeholder: "e.g. Native, Fluent, Intermediate" },
  ],
  projects: [
    { key: "name", label: "Project Name", type: "text" },
    { key: "description", label: "Description", type: "textarea", fullWidth: true },
    { key: "technologies", label: "Technologies", type: "text", isCommaList: true, placeholder: "React, Node.js, PostgreSQL…" },
  ],
  achievements: [
    { key: "title", label: "Achievement", type: "text" },
    { key: "description", label: "Description", type: "textarea", fullWidth: true },
  ],
  volunteer: [
    { key: "organization", label: "Organization", type: "text" },
    { key: "role", label: "Role / Title", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "is_current", label: "Currently volunteering here", type: "boolean" },
    { key: "description", label: "Description", type: "textarea", fullWidth: true },
  ],
  publications: [
    { key: "title", label: "Title", type: "text" },
    { key: "publisher", label: "Publisher / Journal", type: "text" },
    { key: "date", label: "Publication Date", type: "date" },
    { key: "url", label: "URL", type: "url" },
    { key: "description", label: "Abstract / Description", type: "textarea", fullWidth: true },
  ],
  references: [
    { key: "name", label: "Full Name", type: "text" },
    { key: "title", label: "Job Title", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "relationship", label: "Relationship", type: "text", placeholder: "e.g. Direct Manager, Colleague" },
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
  ],
  awards: [
    { key: "title", label: "Award Name", type: "text" },
    { key: "issuer", label: "Issued By", type: "text" },
    { key: "date", label: "Date", type: "date" },
    { key: "description", label: "Description", type: "textarea", fullWidth: true },
  ],
  courses: [
    { key: "name", label: "Course Name", type: "text" },
    { key: "provider", label: "Provider / Platform", type: "text" },
    { key: "date", label: "Completion Date", type: "date" },
    { key: "certificate_url", label: "Certificate URL", type: "url" },
    { key: "description", label: "Description", type: "textarea", fullWidth: true },
  ],
};

export const ARRAY_SECTION_TYPES_EXTENDED: ResumeSectionType[] = [
  "experience",
  "education",
  "certifications",
  "languages",
  "projects",
  "achievements",
  "volunteer",
  "publications",
  "references",
  "awards",
  "courses",
];

export function isArraySection(type: ResumeSectionType): boolean {
  return ARRAY_SECTION_TYPES_EXTENDED.includes(type);
}

export function getStudioSectionFields(type: ResumeSectionType): StudioFieldSchema[] {
  return STUDIO_ARRAY_SECTION_FIELDS[type] ?? [];
}
