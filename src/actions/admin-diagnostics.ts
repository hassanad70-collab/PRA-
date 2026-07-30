"use server";

import { AI_MODELS, getOpenAI } from "@/lib/ai/openai";
import { classifyAIError } from "@/lib/ai/errors";
import { createAdminClient } from "@/lib/supabase/admin";
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

export interface SystemHealthResult {
  database: {
    reachable: boolean;
    latencyMs: number;
    companiesCount?: number;
  };
  queue: {
    reachable: boolean;
    pending: number;
    running: number;
    failed: number;
    latencyMs: number;
  };
  email: {
    providerConfigured: boolean;
    provider: string;
    pending: number;
    sent: number;
    failed: number;
  };
  billing: {
    stripeConfigured: boolean;
    webhookConfigured: boolean;
    activeSubscriptions: number;
    pendingBillingEvents: number;
  };
}

export async function getSystemHealth(): Promise<SystemHealthResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) {
    return {
      database: { reachable: false, latencyMs: 0 },
      queue: { reachable: false, pending: 0, running: 0, failed: 0, latencyMs: 0 },
      email: { providerConfigured: false, provider: "none", pending: 0, sent: 0, failed: 0 },
      billing: { stripeConfigured: false, webhookConfigured: false, activeSubscriptions: 0, pendingBillingEvents: 0 },
    };
  }

  const admin = createAdminClient();

  // Run all checks in parallel
  const [dbResult, queueResult, emailResult, billingResult] = await Promise.allSettled([
    (async () => {
      const t0 = Date.now();
      const { count } = await admin.from("companies").select("id", { count: "exact", head: true }).is("deleted_at", null);
      return { reachable: true, latencyMs: Date.now() - t0, companiesCount: count ?? 0 };
    })(),
    (async () => {
      const t0 = Date.now();
      const { data } = await admin.from("job_queue").select("status");
      const latencyMs = Date.now() - t0;
      const rows = data ?? [];
      return {
        reachable: true,
        pending: rows.filter((r) => r.status === "pending").length,
        running: rows.filter((r) => r.status === "running").length,
        failed: rows.filter((r) => r.status === "failed").length,
        latencyMs,
      };
    })(),
    (async () => {
      const { data } = await admin.from("email_queue").select("status");
      const rows = data ?? [];
      return {
        providerConfigured: !!process.env.RESEND_API_KEY,
        provider: process.env.RESEND_API_KEY ? "Resend" : "none",
        pending: rows.filter((r) => r.status === "pending").length,
        sent: rows.filter((r) => r.status === "sent").length,
        failed: rows.filter((r) => r.status === "failed").length,
      };
    })(),
    (async () => {
      const [{ count: activeSubs }, { count: pendingEvents }] = await Promise.all([
        admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        admin.from("billing_events").select("id", { count: "exact", head: true }).eq("processed", false),
      ]);
      return {
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        activeSubscriptions: activeSubs ?? 0,
        pendingBillingEvents: pendingEvents ?? 0,
      };
    })(),
  ]);

  return {
    database: dbResult.status === "fulfilled" ? dbResult.value : { reachable: false, latencyMs: 0 },
    queue: queueResult.status === "fulfilled" ? queueResult.value : { reachable: false, pending: 0, running: 0, failed: 0, latencyMs: 0 },
    email: emailResult.status === "fulfilled" ? emailResult.value : { providerConfigured: false, provider: "none", pending: 0, sent: 0, failed: 0 },
    billing: billingResult.status === "fulfilled" ? billingResult.value : { stripeConfigured: false, webhookConfigured: false, activeSubscriptions: 0, pendingBillingEvents: 0 },
  };
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
