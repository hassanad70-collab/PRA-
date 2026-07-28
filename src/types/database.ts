// ============================================================================
// Hand-authored types mirroring supabase/migrations/*.sql
// In production, regenerate with: supabase gen types typescript --linked
// ============================================================================

export type UserRole = "candidate" | "recruiter" | "hr_manager" | "super_admin";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "temporary";
export type ExperienceLevel = "entry" | "junior" | "mid" | "senior" | "lead" | "manager" | "director" | "executive";
export type JobStatus = "draft" | "published" | "closed" | "archived";
export type ApplicationStatus =
  | "submitted"
  | "screening"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn"
  /** Bulk Recruiter Actions (Recruiter Intelligence v2.0, Phase 7) -- migration 0024. "No longer actively considering", distinct from an explicit rejection or a candidate-initiated withdrawal. */
  | "archived";
export type InterviewType = "phone" | "video" | "onsite" | "technical" | "panel" | "final";
export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show" | "rescheduled";
export type HiringRecommendation = "strong_yes" | "yes" | "neutral" | "no" | "strong_no";
export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type LanguageProficiency = "basic" | "conversational" | "fluent" | "native";
export type NotificationType =
  | "application_received"
  | "application_status_changed"
  | "interview_scheduled"
  | "interview_reminder"
  | "offer_extended"
  | "rejection"
  | "hiring_confirmed"
  | "job_match"
  | "system";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  description: string | null;
  headquarters: string | null;
  founded_year: number | null;
  is_verified: boolean;
  is_active: boolean;
  deleted_at: string | null;
  created_by: string | null;
  pending_owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RecruiterRole = "owner" | "admin" | "recruiter" | "viewer";

export const CAPABILITIES = [
  "manage_billing",
  "manage_org_settings",
  "invite_members",
  "remove_members",
  "change_member_roles",
  "manage_jobs",
  "view_jobs",
  "manage_candidates",
  "view_candidates",
  "schedule_interviews",
  "submit_interview_feedback",
  "use_ai_features",
  "view_analytics",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface Recruiter {
  id: string;
  company_id: string;
  job_title: string | null;
  department: string | null;
  role: RecruiterRole;
  created_at: string;
  updated_at: string;
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface RecruiterInvite {
  id: string;
  company_id: string;
  email: string;
  role: RecruiterRole;
  token: string;
  invited_by: string | null;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface Candidate {
  id: string;
  headline: string | null;
  summary: string | null;
  current_position: string | null;
  current_company: string | null;
  years_of_experience: number;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  salary_currency: string;
  location: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  willing_to_relocate: boolean;
  notice_period_days: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
  primary_resume_id: string | null;
  profile_completion_percent: number;
  is_open_to_work: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateExperience {
  id: string;
  candidate_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  employment_type: EmploymentType | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
}

export interface CandidateEducation {
  id: string;
  candidate_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
  description: string | null;
  created_at: string;
}

export interface CandidateSkill {
  id: string;
  candidate_id: string;
  skill_name: string;
  proficiency: ProficiencyLevel;
  years_experience: number | null;
  is_ai_extracted: boolean;
  created_at: string;
}

export interface CandidateCertificate {
  id: string;
  candidate_id: string;
  name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  created_at: string;
}

export interface CandidateLanguage {
  id: string;
  candidate_id: string;
  language: string;
  proficiency: LanguageProficiency;
  created_at: string;
}

export interface CandidateProject {
  id: string;
  candidate_id: string;
  name: string;
  description: string | null;
  project_url: string | null;
  technologies: string[] | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface CandidateAchievement {
  id: string;
  candidate_id: string;
  title: string;
  description: string | null;
  achieved_on: string | null;
  created_at: string;
}

export interface Resume {
  id: string;
  candidate_id: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  raw_text: string | null;
  parsed_data: ParsedResumeData | null;
  parse_status: "pending" | "processing" | "completed" | "failed";
  parse_error: string | null;
  embedding: number[] | null;
  is_primary: boolean;
  uploaded_at: string;
  parsed_at: string | null;
}

export interface ParsedResumeData {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  current_position?: string;
  years_of_experience?: number;
  expected_salary?: string;
  summary?: string;
  experience?: Array<{
    company_name: string;
    job_title: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
  }>;
  education?: Array<{
    institution: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    grade?: string;
  }>;
  skills?: string[];
  certificates?: Array<{
    name: string;
    issuing_organization?: string;
    issue_date?: string;
  }>;
  languages?: Array<{ language: string; proficiency?: string }>;
  projects?: Array<{ name: string; description?: string; technologies?: string[] }>;
  achievements?: Array<{ title: string; description?: string }>;
}

export interface Job {
  id: string;
  company_id: string;
  recruiter_id: string;
  title: string;
  slug: string;
  department: string | null;
  description: string;
  responsibilities: string[] | null;
  requirements: string[] | null;
  benefits: string[] | null;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  min_experience_years: number;
  education_requirement: string | null;
  required_skills: string[];
  nice_to_have_skills: string[] | null;
  location: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  headcount: number;
  status: JobStatus;
  is_archived: boolean;
  duplicated_from: string | null;
  views_count: number;
  applications_count: number;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  cover_letter_id: string | null;
  status: ApplicationStatus;
  status_reason: string | null;
  /** Source of Hire (Recruiter Intelligence v2.0, Phase 6) -- migration 0023. Plain text, not an enum; see src/lib/recruiter/analytics.ts for documented values. */
  source: string;
  applied_at: string;
  updated_at: string;
}

export interface AtsScore {
  id: string;
  resume_id: string;
  candidate_id: string;
  overall_score: number;
  experience_score: number | null;
  skills_score: number | null;
  formatting_score: number | null;
  education_score: number | null;
  achievements_score: number | null;
  keyword_density: Record<string, number> | null;
  recruiter_readability_score: number | null;
  weaknesses: string[] | null;
  suggestions: string[] | null;
  ai_model: string | null;
  created_at: string;
}

export interface JobMatch {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  match_score: number;
  semantic_similarity: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  missing_skills: string[] | null;
  recommended_skills: string[] | null;
  match_reasons: string[] | null;
  interview_probability: number | null;
  ai_summary: string | null;
  ai_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreeningResult {
  id: string;
  application_id: string;
  overall_score: number | null;
  experience_score: number | null;
  skill_match_score: number | null;
  education_match_score: number | null;
  culture_fit_score: number | null;
  leadership_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  ai_summary: string | null;
  interview_recommendation: HiringRecommendation | null;
  rank_position: number | null;
  ai_model: string | null;
  created_at: string;
  /** AI Candidate Insight (Recruiter Intelligence v2.0, Phase 2) -- migration 0022. Null until generated on demand. */
  risks: string[] | null;
  red_flags: string[] | null;
  hiring_confidence_score: number | null;
  suggested_interview_focus: string | null;
  suggested_questions: string[] | null;
  insight_generated_at: string | null;
}

export interface StarEvaluation {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export const INTERVIEW_COMPETENCIES = [
  "Technical Skills",
  "Communication",
  "Problem Solving",
  "Culture Fit",
  "Leadership",
] as const;
export type InterviewCompetency = (typeof INTERVIEW_COMPETENCIES)[number];
export type CompetencyRatings = Partial<Record<InterviewCompetency, number>>;

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: InterviewType;
  location_or_link: string | null;
  interviewer_ids: string[];
  status: InterviewStatus;
  feedback: string | null;
  star_evaluation: StarEvaluation | null;
  competency_ratings: CompetencyRatings | null;
  hiring_recommendation: HiringRecommendation | null;
  /** Interview Intelligence (Recruiter Intelligence v2.0, Phase 8) -- migration 0026. Null until generated on demand from feedback/star_evaluation/competency_ratings. */
  ai_summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InterviewQuestionCategory = "technical" | "behavioral" | "situational" | "case_study";

export interface InterviewQuestion {
  id: string;
  job_id: string;
  category: InterviewQuestionCategory;
  question: string;
  expected_answer: string | null;
  evaluation_criteria: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export type SystemSettingKey = "general" | "email" | "ai" | "storage" | "security";

export interface SystemSetting {
  key: SystemSettingKey;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Composite / joined view types used across the UI
// ---------------------------------------------------------------------------

export interface AuditLogWithActor extends AuditLog {
  actor: Pick<Profile, "id" | "full_name" | "email" | "role"> | null;
}

export interface RecruiterWithProfile extends Recruiter {
  profile: Profile;
  company: Company;
}

export interface CandidateFullProfile extends Candidate {
  profile: Profile;
  experience: CandidateExperience[];
  education: CandidateEducation[];
  skills: CandidateSkill[];
  certificates: CandidateCertificate[];
  languages: CandidateLanguage[];
  projects: CandidateProject[];
  achievements: CandidateAchievement[];
  resumes: Resume[];
}

export interface JobWithCompany extends Job {
  company: Company;
}

export interface ApplicationWithDetails extends Application {
  job: JobWithCompany;
  candidate: Candidate & { profile: Profile };
  resume: Resume;
  job_match: JobMatch | null;
  ats_score: AtsScore | null;
  screening_result: ScreeningResult | null;
}

// ============================================================================
// AI Resume Builder (v1.1.6)
// ============================================================================

export type ResumeDraftStatus = "draft" | "finalized";

export type ResumeSectionType =
  | "personal_info"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "languages"
  | "projects"
  | "achievements"
  | "social_links";

// Only these three go through the 'ai_suggested' state -- everything else
// is profile-sourced or manually edited, never AI-rewritten (the AI must
// never invent employment history, education, certifications, dates, etc.)
export const AI_ELIGIBLE_SECTION_TYPES = ["summary", "experience", "skills"] as const;
export type AiEligibleSectionType = (typeof AI_ELIGIBLE_SECTION_TYPES)[number];

export type ResumeSectionStatus = "empty" | "ai_suggested" | "accepted" | "edited";

export interface ResumeDraft {
  id: string;
  candidate_id: string;
  title: string;
  status: ResumeDraftStatus;
  source_resume_id: string | null;
  finalized_pdf_url: string | null;
  finalized_docx_url: string | null;
  /** Lightweight version counter (Unit C) -- incremented each successful finalize, not a full content snapshot. */
  version: number;
  created_at: string;
  updated_at: string;
}

/** Per-section-type content shapes -- deliberately mirror ParsedResumeData's
 * existing field shapes so import/merge logic and AI prompts can share
 * types with the resume-parsing pipeline instead of duplicating them. */
export interface ResumeSectionContentMap {
  personal_info: {
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    current_position?: string;
  };
  summary: { text?: string };
  experience: NonNullable<ParsedResumeData["experience"]>;
  education: NonNullable<ParsedResumeData["education"]>;
  skills: { items: string[] };
  certifications: NonNullable<ParsedResumeData["certificates"]>;
  languages: NonNullable<ParsedResumeData["languages"]>;
  projects: NonNullable<ParsedResumeData["projects"]>;
  achievements: NonNullable<ParsedResumeData["achievements"]>;
  social_links: {
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    website_url?: string;
  };
}

export interface ResumeDraftSection<T extends ResumeSectionType = ResumeSectionType> {
  id: string;
  draft_id: string;
  section_type: T;
  content: ResumeSectionContentMap[T];
  ai_suggestion: ResumeSectionContentMap[T] | null;
  status: ResumeSectionStatus;
  order_index: number;
  updated_at: string;
}

export interface ResumeDraftWithSections extends ResumeDraft {
  sections: ResumeDraftSection[];
}

/** One field-level diff produced when importing an uploaded resume into an
 * existing draft (priority 2 data source) -- surfaced for the candidate to
 * accept/reject per field, never auto-merged. */
export interface ImportFieldDiff {
  section_type: ResumeSectionType;
  field: string;
  currentValue: unknown;
  importedValue: unknown;
  hasConflict: boolean;
}
