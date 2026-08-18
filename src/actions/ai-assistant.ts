"use server";

import { getOpenAI, AI_MODELS } from "@/lib/ai/openai";
import { getCurrentUser } from "@/lib/queries/candidate";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { assembleContextForDomain } from "@/lib/workspace/chat-context";
import type { ActionResult } from "@/actions/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface ChatSession {
  id: string;
  domain: AssistantDomain;
  title: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Domain focus ─────────────────────────────────────────────────────────────

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

// ─── Session actions ──────────────────────────────────────────────────────────

export async function createChatSessionAction(
  domain: AssistantDomain
): Promise<ActionResult<ChatSession>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .insert({ user_id: user.id, domain, title: "New Chat" })
    .select()
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed to create session" };
  return { success: true, data: data as ChatSession };
}

export async function getChatSessionsAction(): Promise<ActionResult<ChatSession[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_chat_sessions")
    .select("id, domain, title, last_message_preview, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ChatSession[] };
}

export async function getSessionMessagesAction(
  sessionId: string
): Promise<ActionResult<ChatMessage[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();

  // Ownership check — explicit at application layer before any read
  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return { success: false, error: "Not found" };
  }

  const { data, error } = await supabase
    .from("ai_chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ChatMessage[] };
}

export async function renameChatSessionAction(
  sessionId: string,
  title: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const trimmedTitle = title.trim().slice(0, 120);
  if (!trimmedTitle) return { success: false, error: "Title cannot be empty" };

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return { success: false, error: "Not found" };
  }

  const { error } = await supabase
    .from("ai_chat_sessions")
    .update({ title: trimmedTitle })
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteChatSessionAction(
  sessionId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return { success: false, error: "Not found" };
  }

  // CASCADE deletes all messages in this session
  const { error } = await supabase
    .from("ai_chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Send message ─────────────────────────────────────────────────────────────

export interface SendMessageResult {
  reply: string;
  sourceLabels: string[];
}

export async function sendAssistantMessage(
  history: ChatMessage[],
  userMessage: string,
  domain: AssistantDomain = "general",
  sessionId?: string
): Promise<ActionResult<SendMessageResult>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!userMessage.trim()) return { success: false, error: "Message cannot be empty" };

  // Rate limit: 20 messages per 60 seconds per IP
  const rl = await rateLimitByIp("ai-chatbot-send", 20, 60_000);
  if (!rl.allowed) {
    return {
      success: false,
      error: `Rate limit reached. Please wait ${rl.retryAfterSeconds ?? 60}s before sending another message.`,
    };
  }

  // If sessionId provided, verify ownership before proceeding
  if (sessionId) {
    const supabase = await createClient();
    const { data: session } = await supabase
      .from("ai_chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();
    if (!session || session.user_id !== user.id) {
      return { success: false, error: "Not found" };
    }
  }

  // Assemble domain-specific context
  const { systemContext, sourceLabels } = await assembleContextForDomain(user.id, domain);

  const systemPrompt = [
    "You are an expert AI Career Advisor embedded in the PRA Talent Intelligence platform.",
    `Current focus area: ${DOMAIN_FOCUS[domain]}`,
    "Be specific, actionable, and encouraging. Format responses with clear structure (use bullet points and headers when helpful). Keep answers concise but complete.",
    "When the candidate shares resume content, reference specific details from it rather than giving generic advice.",
    systemContext || "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Trim history to last 30 messages to control token cost
  const trimmedHistory = history.slice(-30);

  const openai = getOpenAI();
  if (!openai) {
    return { success: false, error: "AI service is not configured." };
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    });

    const reply =
      response.choices[0]?.message?.content ??
      "I couldn't generate a response. Please try again.";

    // Persist messages and update session metadata
    if (sessionId) {
      await persistMessages(sessionId, user.id, userMessage, reply);
    }

    return { success: true, data: { reply, sourceLabels } };
  } catch (err) {
    console.error("AI Assistant error:", err);
    return { success: false, error: "AI service temporarily unavailable. Please try again." };
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function persistMessages(
  sessionId: string,
  userId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  const supabase = await createClient();

  // Insert both messages
  await supabase.from("ai_chat_messages").insert([
    { session_id: sessionId, user_id: userId, role: "user",      content: userMessage },
    { session_id: sessionId, user_id: userId, role: "assistant", content: assistantReply },
  ]);

  // Update session metadata: last preview + auto-title from first message
  const preview = assistantReply.slice(0, 120);

  // Check if title is still the default — if so, set it from the user's first message
  const { data: session } = await supabase
    .from("ai_chat_sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  const updates: Record<string, string> = { last_message_preview: preview };
  if (session?.title === "New Chat") {
    updates.title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "…" : "");
  }

  await supabase
    .from("ai_chat_sessions")
    .update(updates)
    .eq("id", sessionId);
}
