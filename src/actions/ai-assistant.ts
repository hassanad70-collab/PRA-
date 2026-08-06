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

export async function sendAssistantMessage(
  history: ChatMessage[],
  userMessage: string
): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!userMessage.trim()) return { success: false, error: "Message cannot be empty" };

  const resume = await getWorkspaceResume(user.id);

  const systemPrompt = [
    "You are an expert AI Career Advisor integrated into PRA Talent Intelligence platform.",
    "Help candidates with career guidance, resume optimization, job search strategy, interview preparation, and professional development.",
    "Be specific, actionable, and encouraging. Keep responses concise and well-structured.",
    resume?.raw_text
      ? `\n\nThe candidate's resume context:\n${resume.raw_text.slice(0, 3000)}`
      : "\n\nThe candidate has not uploaded a resume yet. Encourage them to upload one for personalized advice.",
  ].join("");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
    return { success: true, data: reply };
  } catch (err) {
    console.error("AI Assistant error:", err);
    return { success: false, error: "AI service temporarily unavailable. Please try again." };
  }
}
