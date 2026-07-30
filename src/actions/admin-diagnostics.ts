"use server";

import { AI_MODELS, getOpenAI } from "@/lib/ai/openai";
import { classifyAIError } from "@/lib/ai/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

// Read openai SDK version at module load time (server-side only)
const SDK_VERSION = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("openai/package.json") as { version: string }).version;
  } catch {
    return "unknown";
  }
})();

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

function deriveProviderName(baseUrl: string): string {
  if (baseUrl.includes("openrouter.ai")) return "OpenRouter";
  if (baseUrl.includes("openai.com")) return "OpenAI";
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "Unknown";
  }
}

export interface OpenAIDiagnosticsResult extends ActionResult {
  /** Whether OPENAI_API_KEY is set at all in this runtime -- never the actual value. */
  keyPresent?: boolean;
  /** Character length only -- distinguishes empty string from a real key without revealing it. */
  keyLength?: number;
  /** First 8 characters + "..." only -- safe prefix hint, no secret portion exposed. */
  keyPrefix?: string;
  /** Human-readable provider name derived from the configured endpoint. */
  provider?: string;
  /** The endpoint this runtime is actually configured to call (AI_BASE_URL or its default). */
  baseUrl?: string;
  /** The model name this runtime is configured to use for reasoning tasks. */
  model?: string;
  /** Simplified authentication outcome for the current diagnostic run. */
  authStatus?: "authenticated" | "failed" | "unknown";
  /** True only if a real chat completion call actually succeeded just now. */
  callSucceeded?: boolean;
  /** Wall-clock milliseconds for the API call (includes auth + network + inference). */
  responseLatencyMs?: number;
  /** ISO timestamp of the most recent successful call -- set to now() when callSucceeded. */
  lastSuccessfulAt?: string;
  responseText?: string;
  errorReason?: string;
  errorDiagnostic?: string;
  /** VERCEL_ENV or NODE_ENV of this runtime. */
  environment?: string;
  /** Version string of the openai npm package installed in this deployment. */
  sdkVersion?: string;
}

/**
 * Live production diagnostic for the AI integration -- makes one real, minimal
 * chat completion call right now and reports exactly what happened, classified
 * through the same src/lib/ai/errors.ts logic every AI wrapper uses.
 *
 * Never returns the API key value -- only its presence, length, and a safe
 * non-secret prefix. Read-only; no configuration changes are made.
 */
export async function diagnoseOpenAIIntegration(): Promise<OpenAIDiagnosticsResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const rawKey = process.env.OPENAI_API_KEY;
  const keyPresent = !!rawKey;
  const keyLength = rawKey?.length ?? 0;
  // Expose only the non-secret prefix (e.g. "sk-or-v1") so the caller can
  // verify they configured the right provider key without seeing the secret.
  const keyPrefix = rawKey ? rawKey.slice(0, 8) + "..." : undefined;

  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";

  const openai = getOpenAI();
  if (!openai) {
    return {
      success: true,
      keyPresent,
      keyLength,
      keyPrefix,
      authStatus: "unknown",
      callSucceeded: false,
      errorReason: "missing_api_key",
      environment,
      sdkVersion: SDK_VERSION,
    };
  }

  const baseUrl = openai.baseURL;
  const provider = deriveProviderName(baseUrl);
  const model = AI_MODELS.reasoning;

  const startMs = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Reply with exactly the single word: OK" }],
      max_tokens: 5,
    });
    const responseLatencyMs = Date.now() - startMs;
    const text = completion.choices[0]?.message?.content ?? "";
    return {
      success: true,
      keyPresent,
      keyLength,
      keyPrefix,
      provider,
      baseUrl,
      model,
      authStatus: "authenticated",
      callSucceeded: true,
      responseLatencyMs,
      lastSuccessfulAt: new Date().toISOString(),
      responseText: text,
      environment,
      sdkVersion: SDK_VERSION,
    };
  } catch (err) {
    const responseLatencyMs = Date.now() - startMs;
    const classified = classifyAIError(err);
    return {
      success: true,
      keyPresent,
      keyLength,
      keyPrefix,
      provider,
      baseUrl,
      model,
      authStatus: "failed",
      callSucceeded: false,
      responseLatencyMs,
      errorReason: classified.reason,
      errorDiagnostic: classified.diagnostic,
      environment,
      sdkVersion: SDK_VERSION,
    };
  }
}
