import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AI_MODELS, getOpenAI } from "./openai";
import { InvalidAIResponseError, logAIError, logMissingApiKey } from "./errors";
import type {
  CoachAssessmentInput,
  CoachRoadmapInput,
  CoachActionsInput,
  CoachCheckinInput,
} from "@/types/career-coach";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const GapPriorityEnum = z.enum(["high", "medium", "low"]);

const AssessmentSchema = z.object({
  summary: z.string().describe("2–3 sentence honest, specific career assessment"),
  strengths: z.array(z.string()).max(6).describe("Concrete professional strengths based on the profile"),
  weaknesses: z.array(z.string()).max(6).describe("Honest gaps or areas holding back career progression"),
  opportunities: z.array(z.string()).max(5).describe("Career opportunities this profile is well-positioned to pursue"),
  skill_gaps: z.array(z.object({
    skill: z.string(),
    gap_level: GapPriorityEnum,
    priority: GapPriorityEnum,
    how_to_learn: z.string().describe("Concrete first step to acquire this skill"),
  })).max(8),
  experience_gaps: z.array(z.object({
    area: z.string(),
    description: z.string(),
    severity: GapPriorityEnum,
  })).max(5),
  leadership_gaps: z.array(z.object({
    area: z.string(),
    description: z.string(),
  })).max(4),
  suggested_roles: z.array(z.string()).max(5).describe("Specific job titles this candidate could realistically target"),
});

export type AssessmentAIOutput = z.infer<typeof AssessmentSchema>;

const RoadmapSchema = z.object({
  phases: z.array(z.object({
    label: z.string().describe("Phase label, e.g. '0–3 Months: Skill Foundation'"),
    duration_months: z.number().int().min(1).max(24),
    focus: z.string().describe("One sentence describing the primary focus of this phase"),
    milestones: z.array(z.object({
      title: z.string(),
      description: z.string().describe("One sentence on what achieving this milestone looks like"),
    })).max(4),
    action_themes: z.array(z.string()).max(5).describe("Types of actions the candidate should take in this phase"),
  })).min(2).max(5),
});

export type RoadmapAIOutput = z.infer<typeof RoadmapSchema>;

const ActionsSchema = z.object({
  actions: z.array(z.object({
    title: z.string().describe("Short, specific action title (under 80 chars)"),
    description: z.string().describe("What to do and why it matters for the career goal"),
    action_type: z.enum([
      "course","cv_update","linkedin","apply",
      "interview_practice","skill","networking",
      "experience","certification","other",
    ]),
    rationale: z.string().describe("Why this action at this point in the roadmap"),
    suggested_due_date_days: z.number().int().min(1).max(30).describe("Days from today to complete this action"),
  })).min(3).max(7),
});

export type ActionsAIOutput = z.infer<typeof ActionsSchema>;

const CheckinResponseSchema = z.object({
  summary: z.string().describe("2–3 sentence summary of the check-in and overall progress"),
  updated_priorities: z.array(z.string()).max(4).describe("Top priorities to focus on next week"),
  encouragement: z.string().describe("Genuine, specific encouragement based on what was accomplished"),
  flag_for_reassessment: z.boolean().describe("True if the check-in suggests the goal or roadmap should be reconsidered"),
  suggested_actions: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).max(3).describe("Specific actions suggested based on the check-in responses"),
});

export type CheckinResponseAIOutput = z.infer<typeof CheckinResponseSchema>;

// ─── Assessment ───────────────────────────────────────────────────────────────

const ASSESSMENT_SYSTEM = `You are a senior career strategist with deep expertise in talent development and labor market analysis. Conduct a thorough, honest career assessment based on the candidate's actual profile data. Be specific — reference their actual skills, experience, and background. Avoid generic career advice. Every strength, weakness, and gap should be directly grounded in the evidence provided.`;

export async function generateCareerAssessment(
  input: CoachAssessmentInput
): Promise<AssessmentAIOutput | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("career-coach.generateCareerAssessment");
    return null;
  }

  const skillList = input.skills.slice(0, 25).map((s) => `${s.skill_name} (${s.proficiency})`).join(", ");
  const expList = input.experience.slice(0, 5).map((e) =>
    `${e.job_title} at ${e.company_name}${e.is_current ? " (current)" : e.end_date ? ` until ${e.end_date.slice(0, 7)}` : ""}: ${(e.description ?? "").slice(0, 200)}`
  ).join("\n");
  const eduList = input.education.map((e) =>
    `${e.degree ?? "Degree"} in ${e.field_of_study ?? "N/A"} from ${e.institution}`
  ).join("; ");
  const missingSkillsStr = input.missing_skills.slice(0, 15).join(", ");

  const profileText = [
    `Name: ${input.profile.full_name}`,
    `Current Role: ${input.profile.current_position ?? "Not specified"}`,
    `Headline: ${input.profile.headline ?? "Not specified"}`,
    `Years of Experience: ${input.profile.years_of_experience}`,
    input.profile.location && `Location: ${input.profile.location}`,
    input.target_role && `Target Role: ${input.target_role}`,
    skillList && `Skills: ${skillList}`,
    expList && `Experience:\n${expList}`,
    eduList && `Education: ${eduList}`,
    input.ats_score !== null && `Latest ATS Score: ${input.ats_score}/100`,
    missingSkillsStr && `Skills Frequently Missing for Target Roles: ${missingSkillsStr}`,
    input.resume_text && `Resume Extract:\n---\n${input.resume_text.slice(0, 3000)}\n---`,
    input.previous_report_summary && `Previous Career Assessment Summary: ${input.previous_report_summary}`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: ASSESSMENT_SYSTEM },
        { role: "user", content: `Conduct a comprehensive career assessment for this candidate:\n\n${profileText}` },
      ],
      response_format: zodResponseFormat(AssessmentSchema, "career_assessment"),
      temperature: 0.3,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty assessment output");
    return result;
  } catch (err) {
    logAIError("career-coach.generateCareerAssessment", err);
    return null;
  }
}

// ─── Roadmap ─────────────────────────────────────────────────────────────────

const ROADMAP_SYSTEM = `You are a career development strategist creating a structured, phase-based career roadmap. The roadmap must be realistic for the candidate's current level, specific to their target role, and divided into concrete phases with clear focus areas and milestones. Each phase builds on the previous.`;

export async function generateCareerRoadmap(
  input: CoachRoadmapInput
): Promise<RoadmapAIOutput | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("career-coach.generateCareerRoadmap");
    return null;
  }

  const timeFrame = input.goal.target_date
    ? `Target date: ${input.goal.target_date}`
    : "No specific target date set";

  const prompt = [
    `Goal: ${input.goal.title}`,
    `Target Role: ${input.goal.target_role}`,
    `Current Role: ${input.goal.current_role ?? "Not specified"}`,
    timeFrame,
    `Years of Experience: ${input.years_of_experience}`,
    `Top Skill Gaps to Address: ${input.assessment_summary.top_skill_gaps.slice(0, 5).join(", ")}`,
    `Top Experience Gaps: ${input.assessment_summary.top_experience_gaps.slice(0, 3).join(", ")}`,
    `Key Strengths to Leverage: ${input.assessment_summary.strengths.slice(0, 3).join(", ")}`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: ROADMAP_SYSTEM },
        { role: "user", content: `Create a phased career roadmap for this candidate:\n\n${prompt}` },
      ],
      response_format: zodResponseFormat(RoadmapSchema, "career_roadmap"),
      temperature: 0.3,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty roadmap output");
    return result;
  } catch (err) {
    logAIError("career-coach.generateCareerRoadmap", err);
    return null;
  }
}

// ─── Weekly Actions ───────────────────────────────────────────────────────────

const ACTIONS_SYSTEM = `You are a career coach generating a focused set of actionable tasks for this week. Each action must be specific, realistic, and directly connected to the candidate's career goal. Avoid repeating recent actions. Prioritize the highest-impact activities for this stage of the roadmap.`;

export async function generateWeeklyActions(
  input: CoachActionsInput
): Promise<ActionsAIOutput | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("career-coach.generateWeeklyActions");
    return null;
  }

  const recentStr = input.recent_actions.length > 0
    ? input.recent_actions.slice(0, 8).map((a) => `- ${a.title} (${a.status})`).join("\n")
    : "No recent actions";

  const prompt = [
    `Target Role: ${input.goal.target_role}`,
    `Current Role: ${input.goal.current_role ?? "Not specified"}`,
    input.goal.target_date && `Target Date: ${input.goal.target_date}`,
    `Week Number: ${input.week_number}`,
    input.current_phase && `Current Roadmap Phase: ${input.current_phase.label} — ${input.current_phase.focus}`,
    input.current_phase && `Phase Action Themes: ${input.current_phase.action_themes.join(", ")}`,
    `Top Gaps to Address: ${input.top_gaps.slice(0, 5).map((g) => `${g.skill} (${g.priority} priority)`).join(", ")}`,
    `Recent Actions (avoid repetition):\n${recentStr}`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: ACTIONS_SYSTEM },
        { role: "user", content: `Generate this week's career actions:\n\n${prompt}` },
      ],
      response_format: zodResponseFormat(ActionsSchema, "weekly_actions"),
      temperature: 0.4,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty actions output");
    return result;
  } catch (err) {
    logAIError("career-coach.generateWeeklyActions", err);
    return null;
  }
}

// ─── Check-in Response ────────────────────────────────────────────────────────

const CHECKIN_SYSTEM = `You are a supportive career coach reviewing a candidate's weekly check-in. Provide honest, specific feedback based on what they reported. Acknowledge progress genuinely, address blockers constructively, and give clear priorities for next week. Do not be generic.`;

export async function generateCheckinResponse(
  input: CoachCheckinInput
): Promise<CheckinResponseAIOutput | null> {
  const openai = getOpenAI();
  if (!openai) {
    logMissingApiKey("career-coach.generateCheckinResponse");
    return null;
  }

  const recentMoods = input.recent_checkins.length > 0
    ? input.recent_checkins.map((c) => `${c.mood}: ${c.summary_note}`).join("; ")
    : "No previous check-ins";

  const prompt = [
    `Goal: ${input.goal.title} → ${input.goal.target_role}`,
    input.goal.target_date && `Target Date: ${input.goal.target_date}`,
    `Actions Progress: ${input.actions_progress.completed}/${input.actions_progress.total} completed`,
    input.assessment_summary && `Key Gaps: ${input.assessment_summary.top_skill_gaps.slice(0, 4).join(", ")}`,
    input.assessment_summary && `Strengths: ${input.assessment_summary.strengths.slice(0, 3).join(", ")}`,
    `\nThis Week's Check-in:`,
    `Mood: ${input.checkin.mood}`,
    input.checkin.accomplished && `Accomplished: ${input.checkin.accomplished}`,
    input.checkin.blockers && `Blockers: ${input.checkin.blockers}`,
    input.checkin.changes && `What Changed: ${input.checkin.changes}`,
    input.checkin.support_needed && `Support Needed: ${input.checkin.support_needed}`,
    `\nRecent Mood History: ${recentMoods}`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: CHECKIN_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(CheckinResponseSchema, "checkin_response"),
      temperature: 0.5,
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new InvalidAIResponseError("Empty checkin response output");
    return result;
  } catch (err) {
    logAIError("career-coach.generateCheckinResponse", err);
    return null;
  }
}
