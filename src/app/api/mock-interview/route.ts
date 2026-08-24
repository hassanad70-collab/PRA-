import { NextRequest } from "next/server";

import { getOpenAI, AI_MODELS } from "@/lib/ai/openai";
import { getMockInterviewSystemPrompt, buildConversationMessages } from "@/lib/ai/mock-interview";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { MockInterviewType, MockInterviewMessage } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limit: 20 requests per user per minute.
  // Note: uses the in-memory limiter in src/lib/rate-limit.ts which is per-process.
  // On serverless deployments (Vercel) this is best-effort — see rate-limit.ts for
  // details. Replace with Upstash Redis for distributed enforcement.
  const rateCheck = checkRateLimit(`mock-interview:${user.id}`, 20, 60_000);
  if (!rateCheck.allowed) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: rateCheck.retryAfterSeconds
        ? { "Retry-After": String(rateCheck.retryAfterSeconds) }
        : undefined,
    });
  }

  let body: {
    interviewType: MockInterviewType;
    targetRole: string;
    company?: string;
    jobDescription?: string;
    experienceLevel?: string;
    messages: MockInterviewMessage[];
    isFinalize?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Guard against oversized message history (prevents prompt-injection via
  // excessively long conversation arrays and runaway token costs).
  if (!Array.isArray(body.messages) || body.messages.length > 50) {
    return new Response("Bad request: message history too long", { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return new Response(
      "AI features are not available. Please configure your API key.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  const systemPrompt = getMockInterviewSystemPrompt(
    body.interviewType,
    body.targetRole,
    body.company,
    body.jobDescription,
    body.experienceLevel,
  );

  const messages = await buildConversationMessages(systemPrompt, body.messages, body.isFinalize ?? false);

  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages,
      stream: true,
      max_tokens: 800,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("mock-interview stream error:", err);
    return new Response("AI service error", { status: 502 });
  }
}
