import "server-only";

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";
import type {
  CareerRecommendationsResult,
  CareerPathStep,
  SkillRecommendation,
  CertificationRecommendation,
  IndustryRecommendation,
  JobSearchRecommendation,
} from "@/types/job-discovery";

const TTL_HOURS = 24;

const CareerSchema = z.object({
  jobTitles: z
    .array(
      z.object({
        title: z.string(),
        keywords: z.string(),
        reason: z.string(),
      })
    )
    .min(1)
    .max(5),
  careerPath: z
    .array(
      z.object({
        step: z.number(),
        title: z.string(),
        timeframe: z.string(),
        description: z.string(),
      })
    )
    .max(4),
  skillsToLearn: z
    .array(
      z.object({
        skill: z.string(),
        reason: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      })
    )
    .max(6),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    )
    .max(4),
  industries: z
    .array(
      z.object({
        industry: z.string(),
        reason: z.string(),
      })
    )
    .max(4),
  salaryRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
      note: z.string(),
    })
    .nullable(),
  nextPosition: z
    .object({
      title: z.string(),
      timeframe: z.string(),
      requirements: z.array(z.string()).max(4),
    })
    .nullable(),
  confidence: z.number().min(0).max(100),
});

const SYSTEM_PROMPT = `You are a senior career advisor helping professionals plan their next career move.
Given a candidate's background, provide a comprehensive career intelligence report with:
- 3-5 targeted job search recommendations
- A 3-4 step career progression path
- 4-6 skills to develop (prioritized high/medium/low)
- 2-4 relevant certifications
- 2-4 industries to target
- Realistic salary range for their market/experience
- The single most logical next position with timeline and requirements
- An overall confidence score (0-100) reflecting how complete the profile data is.
Return only JSON matching the schema.`;

async function loadFromCache(candidateId: string): Promise<CareerRecommendationsResult | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await admin
    .from("candidate_ai_recommendations")
    .select("recommendation_type, title, description, confidence_score, metadata, position_order, generated_at, expires_at")
    .eq("candidate_id", candidateId)
    .gt("expires_at", now)
    .order("position_order", { ascending: true });

  if (!data || data.length === 0) return null;

  const generatedAt = data[0].generated_at;
  const jobTitles: JobSearchRecommendation[] = [];
  const careerPath: CareerPathStep[] = [];
  const skillsToLearn: SkillRecommendation[] = [];
  const certifications: CertificationRecommendation[] = [];
  const industries: IndustryRecommendation[] = [];
  let salaryRange: CareerRecommendationsResult["salaryRange"] = null;
  let nextPosition: CareerRecommendationsResult["nextPosition"] = null;
  let confidence = 80;

  for (const row of data) {
    const m = row.metadata as Record<string, unknown>;
    switch (row.recommendation_type) {
      case "job_title":
        jobTitles.push({ title: row.title, keywords: m.keywords as string ?? "", reason: row.description });
        break;
      case "career_step":
        careerPath.push({ step: row.position_order, title: row.title, timeframe: m.timeframe as string ?? "", description: row.description });
        break;
      case "skill":
        skillsToLearn.push({ skill: row.title, reason: row.description, priority: m.priority as "high" | "medium" | "low" ?? "medium" });
        break;
      case "certification":
        certifications.push({ name: row.title, reason: row.description });
        break;
      case "industry":
        industries.push({ industry: row.title, reason: row.description });
        break;
      case "salary_range":
        salaryRange = m as CareerRecommendationsResult["salaryRange"];
        break;
      case "next_position":
        nextPosition = { title: row.title, timeframe: m.timeframe as string ?? "", requirements: m.requirements as string[] ?? [] };
        break;
      case "confidence":
        confidence = row.confidence_score;
        break;
    }
  }

  if (jobTitles.length === 0) return null;

  return { jobTitles, careerPath, skillsToLearn, certifications, industries, salaryRange, nextPosition, confidence, cached: true, generatedAt };
}

async function saveToCache(candidateId: string, result: z.infer<typeof CareerSchema>): Promise<void> {
  const admin = createAdminClient();
  const expires_at = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();
  const generated_at = new Date().toISOString();

  // Delete old cache entries first
  await admin.from("candidate_ai_recommendations").delete().eq("candidate_id", candidateId);

  const rows: {
    candidate_id: string;
    recommendation_type: string;
    title: string;
    description: string;
    confidence_score: number;
    metadata: Record<string, unknown>;
    position_order: number;
    expires_at: string;
    generated_at: string;
  }[] = [];

  result.jobTitles.forEach((jt, i) =>
    rows.push({ candidate_id: candidateId, recommendation_type: "job_title", title: jt.title, description: jt.reason, confidence_score: result.confidence, metadata: { keywords: jt.keywords }, position_order: i, expires_at, generated_at })
  );
  result.careerPath.forEach((cp) =>
    rows.push({ candidate_id: candidateId, recommendation_type: "career_step", title: cp.title, description: cp.description, confidence_score: result.confidence, metadata: { timeframe: cp.timeframe }, position_order: cp.step, expires_at, generated_at })
  );
  result.skillsToLearn.forEach((s, i) =>
    rows.push({ candidate_id: candidateId, recommendation_type: "skill", title: s.skill, description: s.reason, confidence_score: result.confidence, metadata: { priority: s.priority }, position_order: i, expires_at, generated_at })
  );
  result.certifications.forEach((c, i) =>
    rows.push({ candidate_id: candidateId, recommendation_type: "certification", title: c.name, description: c.reason, confidence_score: result.confidence, metadata: {}, position_order: i, expires_at, generated_at })
  );
  result.industries.forEach((ind, i) =>
    rows.push({ candidate_id: candidateId, recommendation_type: "industry", title: ind.industry, description: ind.reason, confidence_score: result.confidence, metadata: {}, position_order: i, expires_at, generated_at })
  );
  if (result.salaryRange) {
    rows.push({ candidate_id: candidateId, recommendation_type: "salary_range", title: `${result.salaryRange.currency} ${result.salaryRange.min}–${result.salaryRange.max}`, description: result.salaryRange.note, confidence_score: result.confidence, metadata: result.salaryRange as unknown as Record<string, unknown>, position_order: 0, expires_at, generated_at });
  }
  if (result.nextPosition) {
    rows.push({ candidate_id: candidateId, recommendation_type: "next_position", title: result.nextPosition.title, description: result.nextPosition.timeframe, confidence_score: result.confidence, metadata: { timeframe: result.nextPosition.timeframe, requirements: result.nextPosition.requirements }, position_order: 0, expires_at, generated_at });
  }
  rows.push({ candidate_id: candidateId, recommendation_type: "confidence", title: "confidence", description: "", confidence_score: result.confidence, metadata: {}, position_order: 0, expires_at, generated_at });

  if (rows.length > 0) await admin.from("candidate_ai_recommendations").insert(rows);
}

const EMPTY_RESULT: CareerRecommendationsResult = {
  jobTitles: [],
  careerPath: [],
  skillsToLearn: [],
  certifications: [],
  industries: [],
  salaryRange: null,
  nextPosition: null,
  confidence: 0,
  cached: false,
  generatedAt: new Date().toISOString(),
};

export async function generateCareerRecommendations(
  candidateId: string
): Promise<CareerRecommendationsResult> {
  // Try cache first
  const cached = await loadFromCache(candidateId);
  if (cached) return cached;

  try {
    const supabase = await createClient();

    const [{ data: candidate }, { data: experience }, { data: resume }] = await Promise.all([
      supabase
        .from("candidates")
        .select("current_position, headline, years_of_experience, city, country, skills")
        .eq("id", candidateId)
        .maybeSingle(),
      supabase
        .from("candidate_experience")
        .select("job_title, company_name, is_current, start_date, end_date")
        .eq("candidate_id", candidateId)
        .order("start_date", { ascending: false })
        .limit(5),
      supabase
        .from("resumes")
        .select("parsed_data")
        .eq("candidate_id", candidateId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (!candidate) return EMPTY_RESULT;

    const parsed = resume?.parsed_data as {
      skills?: string[];
      education?: Array<{ degree?: string; institution?: string }>;
      summary?: string;
    } | null;

    const topSkills = parsed?.skills?.slice(0, 12).join(", ") ?? "";
    const recentRoles = (experience ?? [])
      .map((e) => `${e.job_title} at ${e.company_name}`)
      .filter(Boolean)
      .join(", ");
    const education = parsed?.education?.slice(0, 2).map((e) => `${e.degree ?? ""} ${e.institution ?? ""}`.trim()).filter(Boolean).join("; ") ?? "";

    const context = [
      candidate.current_position && `Current Position: ${candidate.current_position}`,
      candidate.headline && `Professional Headline: ${candidate.headline}`,
      candidate.years_of_experience != null && `Years of Experience: ${candidate.years_of_experience}`,
      recentRoles && `Recent Roles: ${recentRoles}`,
      topSkills && `Key Skills: ${topSkills}`,
      education && `Education: ${education}`,
      parsed?.summary && `Summary: ${parsed.summary.slice(0, 300)}`,
      candidate.city && `Location: ${[candidate.city, candidate.country].filter(Boolean).join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!context.trim()) return EMPTY_RESULT;

    const openai = getOpenAI();
    if (!openai) {
      logMissingApiKey("career-recommendations.generate");
      return EMPTY_RESULT;
    }

    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Candidate Profile:\n${context}\n\nGenerate a comprehensive career intelligence report.` },
      ],
      response_format: zodResponseFormat(CareerSchema, "career_recommendations"),
      temperature: 0.3,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty parsed output from career-recommendations");

    await saveToCache(candidateId, result);

    return {
      ...result,
      cached: false,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logAIError("career-recommendations.generate", err);
    return EMPTY_RESULT;
  }
}
