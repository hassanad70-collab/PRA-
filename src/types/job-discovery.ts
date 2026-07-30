// Shared types for the Job Discovery feature.
// No "server-only" imports — safe to import in both Server and Client components.

export interface JobSearchRecommendation {
  title: string;
  keywords: string;
  reason: string;
}

export interface CareerPathStep {
  step: number;
  title: string;
  timeframe: string;
  description: string;
}

export interface SkillRecommendation {
  skill: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface CertificationRecommendation {
  name: string;
  reason: string;
}

export interface IndustryRecommendation {
  industry: string;
  reason: string;
}

export interface CareerRecommendationsResult {
  jobTitles: JobSearchRecommendation[];
  careerPath: CareerPathStep[];
  skillsToLearn: SkillRecommendation[];
  certifications: CertificationRecommendation[];
  industries: IndustryRecommendation[];
  salaryRange: { min: number; max: number; currency: string; note: string } | null;
  nextPosition: { title: string; timeframe: string; requirements: string[] } | null;
  confidence: number;
  cached: boolean;
  generatedAt: string;
}

export interface SearchHistoryEntry {
  id: string;
  query_key: string;
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
  search_source: string;
  search_count: number;
  last_used_at: string;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
  platforms: string[];
  is_active: boolean;
  alert_enabled: boolean;
  alert_frequency: "instant" | "daily" | "weekly";
  created_at: string;
  updated_at: string;
}

export interface JobAlert {
  id: string;
  saved_search_id: string | null;
  name: string;
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
  platforms: string[];
  frequency: "instant" | "daily" | "weekly";
  min_ats_score: number;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
}
