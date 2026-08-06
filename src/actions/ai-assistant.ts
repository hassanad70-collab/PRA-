"use server";

import OpenAI from "openai";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import type { ActionResult } from "@/actions/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type AssistantDomain =
  | "general"
  | "resume"
  | "ats"
  | "cover-letter"
  | "interview"
  | "career"
  | "job-search";

const DOMAIN_FOCUS: Record<AssistantDomain, string> = {
  general:
    "Provide comprehensive career advice across all areas — resume, ATS, cover letters, interviews, and job search strategy.",
  resume:
    "Focus exclusively on resume writing, formatting, keyword optimization, section structure, and tailoring resumes for specific roles. Give actionable, specific edits based on the resume context.",
  ats:
    "Focus on ATS (Applicant Tracking System) optimization. Analyze keyword density, formatting compatibility, section headers, and give a concrete improvement plan to boost ATS scores.",
  "cover-letter":
    "Focus on writing compelling, personalized cover letters. Help structure openings, highlight relevant achievements, match job requirements, and close with confidence.",
  interview:
    "Focus on interview preparation — behavioral questions (STAR method), technical questions, company research, salary negotiation, and managing interview anxiety. Role-play scenarios when asked.",
  career:
    "Focus on career strategy — growth planning, job transitions, skill gaps, professional branding, LinkedIn optimization, and long-term trajectory advice.",
  "job-search":
    "Focus on job search tactics — identifying opportunities, networking strategies, recruiter outreach, application prioritization, and tracking systems.",
};

export async function sendAssistantMessage(
  history: ChatMessage[],
  userMessage: string,
  domain: AssistantDomain = "general"
): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!userMessage.trim()) return { success: false, error: "Message cannot be empty" };

  const resume = await getWorkspaceResume(user.id);

  const resumeContext = resume?.raw_text
    ? `\n\nCandidate's resume (use this for specific, personalized advice):\n---\n${resume.raw_text.slice(0, 4000)}\n---`
    : "\n\nThe candidate has not uploaded a resume yet. Encourage them to upload one at /candidate/workspace/resumes for personalized advice.";

  const systemPrompt = [
    "You are an expert AI Career Advisor embedded in the PRA Talent Intelligence platform.",
    `Current focus area: ${DOMAIN_FOCUS[domain]}`,
    "Be specific, actionable, and encouraging. Format responses with clear structure (use bullet points and headers when helpful). Keep answers concise but complete.",
    "When the candidate shares resume content, reference specific details from it rather than giving generic advice.",
    resumeContext,
  ].join("\n\n");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1200,
      temperature: 0.7,
    });

    const reply =
      response.choices[0]?.message?.content ??
      "I couldn't generate a response. Please try again.";
    return { success: true, data: reply };
  } catch (err) {
    console.error("AI Assistant error:", err);
    return {
      success: false,
      error: "AI service temporarily unavailable. Please try again.",
    };
  }
}
