import "server-only";

import { getOpenAI, AI_MODELS } from "@/lib/ai/openai";
import type { ApplicationAnalytics } from "@/types/database";

export interface AppInsightsResult {
  insights: string[];
  recommendations: string[];
  winProbabilityTip: string;
}

export async function generateApplicationInsights(
  analytics: ApplicationAnalytics,
  recentRoles: string[],
): Promise<AppInsightsResult> {
  const fallback: AppInsightsResult = {
    insights: [
      `You have submitted ${analytics.totals.applications} applications total.`,
      analytics.rates.interviewRate > 0
        ? `Your interview conversion rate is ${analytics.rates.interviewRate}%.`
        : "Focus on tailoring resumes to job descriptions to improve your interview rate.",
    ],
    recommendations: [
      "Customize your resume for each application using the ATS Checker.",
      "Add a cover letter to stand out from other applicants.",
    ],
    winProbabilityTip: "Higher ATS scores correlate strongly with interview invitations.",
  };

  const openai = getOpenAI();
  if (!openai) return fallback;

  try {
    const prompt = `Analyze this job application data and provide actionable career insights.

APPLICATION STATS:
- Total applications: ${analytics.totals.applications}
- Interview rate: ${analytics.rates.interviewRate}%
- Offer rate: ${analytics.rates.offerRate}%
- Success (hired) rate: ${analytics.rates.successRate}%
- Rejection rate: ${analytics.rates.rejectionRate}%
- Average ATS score: ${analytics.avgAtsScore ?? "N/A"}
- Cover letter usage: ${analytics.coverLetterUsage.used}/${analytics.coverLetterUsage.total}
- Recent roles applied to: ${recentRoles.slice(0, 5).join(", ") || "none"}
- Applications this week: ${analytics.weeklyApplications}

Return ONLY valid JSON in this exact shape:
{
  "insights": ["3-4 specific, data-driven observations about their application patterns"],
  "recommendations": ["3-4 concrete, actionable next steps based on their data"],
  "winProbabilityTip": "One sentence tip to improve interview conversion"
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    return {
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : fallback.insights,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : fallback.recommendations,
      winProbabilityTip: typeof parsed.winProbabilityTip === "string" ? parsed.winProbabilityTip : fallback.winProbabilityTip,
    };
  } catch {
    return fallback;
  }
}

export interface WinProbabilityResult {
  probability: number;
  stage: "screening" | "interview" | "offer";
  factors: string[];
}

export async function estimateWinProbability(
  atsScore: number | null,
  matchScore: number | null,
  role: string,
  currentStatus: string,
): Promise<WinProbabilityResult> {
  // Status-based baseline
  const statusBaselines: Record<string, number> = {
    submitted: 15,
    screening: 35,
    shortlisted: 55,
    interview: 65,
    offer: 85,
    hired: 100,
    rejected: 0,
    withdrawn: 0,
    archived: 5,
  };

  const base = statusBaselines[currentStatus] ?? 10;

  // Adjust for ATS + match scores
  const atsBoost = atsScore ? Math.round((atsScore - 60) * 0.3) : 0;
  const matchBoost = matchScore ? Math.round((matchScore - 60) * 0.2) : 0;
  const probability = Math.min(95, Math.max(5, base + atsBoost + matchBoost));

  const stage =
    probability >= 70 ? "offer" :
    probability >= 40 ? "interview" :
    "screening";

  const factors: string[] = [];
  if (atsScore !== null) {
    factors.push(atsScore >= 75 ? `Strong ATS score (${atsScore}/100)` : `ATS score needs improvement (${atsScore}/100)`);
  }
  if (matchScore !== null) {
    factors.push(matchScore >= 70 ? `Good job match (${matchScore}%)` : `Job match could be stronger (${matchScore}%)`);
  }
  if (["screening", "shortlisted", "interview"].includes(currentStatus)) {
    factors.push(`Currently in ${currentStatus} stage — positive signal`);
  }
  if (factors.length === 0) {
    factors.push("Submit resume with ATS Checker to get a score boost");
  }

  const openai = getOpenAI();
  if (!openai) return { probability, stage, factors };

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [{
        role: "user",
        content: `A candidate is applying for a ${role} role. ATS score: ${atsScore ?? "unknown"}/100. Job match: ${matchScore ?? "unknown"}%. Application status: ${currentStatus}. Estimated probability: ${probability}%.

Give exactly 2-3 specific factors that most affect their chances. Return JSON: {"factors": ["...", "..."]}`
      }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    if (Array.isArray(parsed.factors) && parsed.factors.length > 0) {
      return { probability, stage, factors: parsed.factors.slice(0, 3) };
    }
  } catch { /* use computed factors */ }

  return { probability, stage, factors };
}
