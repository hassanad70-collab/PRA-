import "server-only";

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

import { createClient } from "@/lib/supabase/server";
import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";

export interface JobSearchRecommendation {
  title: string;
  keywords: string;
  reason: string;
}

const RecommendationsSchema = z.object({
  searches: z
    .array(
      z.object({
        title: z.string().describe("Specific job title to search for on job boards"),
        keywords: z.string().describe("Additional comma-separated keywords — skills, industry, tools"),
        reason: z.string().describe("One-sentence reason this search is relevant for the candidate"),
      })
    )
    .min(1)
    .max(5),
});

const SYSTEM_PROMPT = `You are a career advisor helping professionals find their next opportunity.
Given a candidate's background, generate 3–5 targeted job search queries for external job boards.
Each query must have a concrete job title and supporting keywords.
Consider natural career progressions: lateral moves, step-up roles, and adjacent specializations.
Return only JSON matching the schema.`;

export async function generateJobSearchRecommendations(
  candidateId: string
): Promise<JobSearchRecommendation[]> {
  const fallback: JobSearchRecommendation[] = [];

  try {
    const supabase = await createClient();

    const [{ data: candidate }, { data: experience }, { data: resume }] = await Promise.all([
      supabase
        .from("candidates")
        .select("current_position, headline, years_of_experience, city, country")
        .eq("id", candidateId)
        .maybeSingle(),
      supabase
        .from("candidate_experience")
        .select("job_title, company_name, is_current")
        .eq("candidate_id", candidateId)
        .order("start_date", { ascending: false })
        .limit(3),
      supabase
        .from("resumes")
        .select("parsed_data")
        .eq("candidate_id", candidateId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (!candidate) return fallback;

    const parsed = resume?.parsed_data as {
      current_position?: string;
      skills?: string[];
      experience?: Array<{ job_title?: string }>;
    } | null;

    const topSkills = parsed?.skills?.slice(0, 10).join(", ") ?? "";
    const recentTitles = (experience ?? [])
      .map((e) => e.job_title)
      .filter(Boolean)
      .join(", ");

    const context = [
      candidate.current_position && `Current Position: ${candidate.current_position}`,
      candidate.headline && `Headline: ${candidate.headline}`,
      candidate.years_of_experience != null &&
        `Years of Experience: ${candidate.years_of_experience}`,
      recentTitles && `Recent Roles: ${recentTitles}`,
      topSkills && `Key Skills: ${topSkills}`,
      candidate.city &&
        `Location: ${[candidate.city, candidate.country].filter(Boolean).join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!context.trim()) return fallback;

    const openai = getOpenAI();
    if (!openai) {
      logMissingApiKey("job-recommendations.generate");
      return fallback;
    }

    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Candidate Profile:\n${context}\n\nGenerate 3–5 targeted job search recommendations.`,
        },
      ],
      response_format: zodResponseFormat(RecommendationsSchema, "job_search_recommendations"),
      temperature: 0.4,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty parsed output from job-recommendations");
    return result.searches;
  } catch (err) {
    logAIError("job-recommendations.generate", err);
    return fallback;
  }
}
