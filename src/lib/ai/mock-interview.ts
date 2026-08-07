import "server-only";

import { getOpenAI, AI_MODELS } from "@/lib/ai/openai";
import type { MockInterviewType, MockInterviewMessage } from "@/types/database";

const TYPE_LABELS: Record<MockInterviewType, string> = {
  hr: "HR / Culture Fit",
  technical: "Technical",
  behavioral: "Behavioral (STAR)",
  star: "STAR Method Practice",
  case_study: "Case Study",
  company: "Company-Specific",
};

const TYPE_INSTRUCTIONS: Record<MockInterviewType, string> = {
  hr: `Focus on: motivations, values, career goals, strengths/weaknesses, salary expectations, team dynamics, culture fit, work style. Ask open-ended questions that reveal personality and cultural alignment.`,
  technical: `Focus on: role-specific technical knowledge, system design concepts, problem-solving, tools and technologies, code reasoning (no live coding required). Ask progressively harder questions.`,
  behavioral: `Use STAR-format questions exclusively. Focus on: past behavior as predictor of future performance, conflict resolution, leadership, collaboration, failure & learning, achievements. Prompt for Situation, Task, Action, Result.`,
  star: `Every question must be answered using the STAR format (Situation, Task, Action, Result). After each answer, explicitly evaluate how well the candidate used STAR structure, and prompt for missing elements if the answer was incomplete.`,
  case_study: `Present business scenarios or analytical problems. Focus on: structured problem decomposition, quantitative reasoning, creative solutions, stakeholder management, communication clarity. Build complexity progressively.`,
  company: `Tailor every question directly to the provided job description and company context. Mix role-specific technical questions with cultural fit and motivation questions that are highly relevant to this specific position.`,
};

function buildSystemPrompt(
  type: MockInterviewType,
  role: string,
  company: string | null | undefined,
  jobDescription: string | null | undefined,
  xpLevel: string | null | undefined,
): string {
  const companyStr = company ? ` at ${company}` : "";
  const xpStr = xpLevel ? ` (${xpLevel} level)` : "";
  const jdStr = jobDescription
    ? `\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 1500)}`
    : "";

  return `You are an expert professional interviewer conducting a ${TYPE_LABELS[type]} interview for a ${role}${companyStr}${xpStr} candidate.

INTERVIEW TYPE INSTRUCTIONS:
${TYPE_INSTRUCTIONS[type]}${jdStr}

RESPONSE FORMAT:
For ALL responses AFTER the first question, you MUST begin with an evaluation line (on its own line, before anything else):
EVAL:{"score":75,"communication":70,"technical":80,"confidence":65,"grammar":85,"feedback":"Brief 1-2 sentence evaluation of the previous answer."}

Replace the numbers with your actual assessment (0-100 each). "technical" score = 50 if the question was non-technical.

Then write a brief natural transition (1 sentence), then ask the next question in **bold**.

For the VERY FIRST message only:
- Greet the candidate warmly and professionally
- Briefly explain you'll be conducting a ${TYPE_LABELS[type]} interview
- Ask the first question in **bold**
- Do NOT include an EVAL line for the first message

QUESTION RULES:
- Ask ONE question at a time
- Keep questions realistic, specific, and professional
- Build on previous answers where relevant
- After 8 candidate responses, write "FINAL_REPORT" on its own line then output this exact JSON (no extra text):
{"overall":80,"communication":75,"technical":70,"confidence":68,"grammar":82,"leadership":65,"strengths":["Clear communication","Strong examples"],"weaknesses":["Could quantify outcomes more","Technical depth needs improvement"],"coaching_tips":["Practice the STAR format for behavioral questions","Quantify achievements with metrics"],"readiness_score":72,"summary":"2-3 sentence overall assessment of the candidate's interview performance."}

IMPORTANT: Be encouraging but honest. Provide genuinely useful feedback.`;
}

export function getMockInterviewSystemPrompt(
  type: MockInterviewType,
  role: string,
  company?: string | null,
  jobDescription?: string | null,
  xpLevel?: string | null,
): string {
  return buildSystemPrompt(type, role, company, jobDescription, xpLevel);
}

export async function generateFirstQuestion(
  type: MockInterviewType,
  role: string,
  company?: string | null,
  jobDescription?: string | null,
  xpLevel?: string | null,
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) return `Welcome! I'll be conducting your ${TYPE_LABELS[type]} interview for the ${role} position today. Let's get started.\n\n**Tell me about yourself and what draws you to this ${role} role.**`;

  const systemPrompt = buildSystemPrompt(type, role, company, jobDescription, xpLevel);
  const completion = await openai.chat.completions.create({
    model: AI_MODELS.reasoning,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "[START INTERVIEW]" },
    ],
    max_tokens: 400,
  });
  return completion.choices[0]?.message?.content ?? `**Tell me about yourself and your interest in the ${role} role.**`;
}

export async function buildConversationMessages(
  systemPrompt: string,
  history: MockInterviewMessage[],
  isFinalize: boolean,
): Promise<{ role: "system" | "user" | "assistant"; content: string }[]> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (isFinalize) {
    messages.push({ role: "user", content: "[GENERATE FINAL REPORT NOW — output FINAL_REPORT then the JSON as instructed]" });
  }

  return messages;
}
