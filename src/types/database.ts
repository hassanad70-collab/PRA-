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
  | "withdrawn";
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
  created_at: string;
  updated_at: string;
}

export interface Recruiter {
  id: string;
  company_id: string;
  job_title: string | null;
  department: string | null;
  is_company_admin: boolean;
  created_at: string;
  updated_at: string;
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
