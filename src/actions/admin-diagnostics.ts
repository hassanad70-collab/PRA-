"use server";

import { AI_MODELS, getOpenAI } from "@/lib/ai/openai";
import { classifyAIError } from "@/lib/ai/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return null;

  return { supabase, userId: user.id };
}

export interface OpenAIDiagnosticsResult extends ActionResult {
  /** Whether OPENAI_API_KEY is set at all in this runtime -- never the value itself. */
  keyPresent?: boolean;
  /** Character length only -- proves "empty string" (length 0) vs "looks like a real key" without revealing it. */
  keyLength?: number;
  /** True only if a real OpenAI chat completion call actually succeeded just now. */
  callSucceeded?: boolean;
  modelUsed?: string;
  responseText?: string;
  errorReason?: string;
  errorDiagnostic?: string;
}

/**
 * Live production diagnostic for the OpenAI integration -- makes one real,
 * minimal chat completion call right now and reports exactly what happened,
 * classified through the same src/lib/ai/errors.ts logic every AI wrapper
 * uses. Distinguishes "key not set in this runtime" from "key set but
 * rejected by OpenAI" from "network/timeout" from "actually works" --
 * whichever it is, this is the real, current state of this deployment, not
 * a guess based on symptoms observed elsewhere.
 */
export async function diagnoseOpenAIIntegration(): Promise<OpenAIDiagnosticsResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const rawKey = process.env.OPENAI_API_KEY;
  const keyPresent = !!rawKey;
  const keyLength = rawKey?.length ?? 0;

  const openai = getOpenAI();
  if (!openai) {
    return { success: true, keyPresent, keyLength, callSucceeded: false, errorReason: "missing_api_key" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.reasoning,
      messages: [{ role: "user", content: "Reply with exactly the single word: OK" }],
      max_tokens: 5,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return {
      success: true,
      keyPresent,
      keyLength,
      callSucceeded: true,
      modelUsed: AI_MODELS.reasoning,
      responseText: text,
    };
  } catch (err) {
    const classified = classifyAIError(err);
    return {
      success: true,
      keyPresent,
      keyLength,
      callSucceeded: false,
      errorReason: classified.reason,
      errorDiagnostic: classified.diagnostic,
    };
  }
}
