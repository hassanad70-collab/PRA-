import "server-only";

import { headers } from "next/headers";

/**
 * In-memory sliding-window rate limiter for auth Server Actions (login,
 * registration, password reset) — the actions most exposed to scripted
 * abuse (credential stuffing, spam signups, reset-email flooding) — and for
 * high-cost AI endpoints (mock-interview, etc.).
 *
 * Honest limitation (MED-06): this state lives in the Node process's memory.
 * On a single long-running server (`next start` on a VM/container) it is
 * fully correct. On serverless platforms (Vercel etc.) each instance has its
 * own memory, so a request load-balanced across many instances/cold-starts can
 * exceed the configured limit in aggregate. It still prevents naive
 * single-instance scripted abuse and is better than no rate limiting at all.
 *
 * Recommended long-term fix: replace with Upstash Redis + @upstash/ratelimit:
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis } from "@upstash/redis";
 *   const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), ... });
 * The call sites (checkRateLimit, rateLimitByIp, rateLimitByIpAndTarget) can
 * be replaced one-by-one once UPSTASH_REDIS_REST_URL + _TOKEN are provisioned.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth from buckets that are never checked again.
const MAX_BUCKETS = 50_000;

// The e2e suite legitimately logs the same fixed test accounts in and out
// dozens of times across specs, all within a single production-calibrated
// window — nothing a real user would ever do. E2E_TEST_MODE is set ONLY in
// playwright.config.ts's webServer `env` block, which controls the process
// env of the local server Playwright spawns for testing; it is never set in
// any deployed environment (Vercel envs are configured independently and
// have no reason to define it), so this can't be tripped by real traffic —
// it isolates the test environment rather than loosening the limit itself.
const isE2ETestMode = process.env.E2E_TEST_MODE === "true";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns { allowed: false } if the given key has exceeded `limit` attempts
 * within `windowMs`, otherwise records this attempt and returns { allowed: true }.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds?: number } {
  if (isE2ETestMode) return { allowed: true };

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true };
}

export async function rateLimitByIp(
  action: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const ip = await getClientIp();
  return checkRateLimit(`${action}:${ip}`, limit, windowMs);
}

/**
 * Keys by IP + a target identifier (e.g. the email being logged into)
 * rather than IP alone. This is the more correct model for login brute
 * force specifically: the real threat is many guesses against ONE account,
 * not many requests from one IP in general (which legitimately happens
 * behind shared/corporate NATs, and during normal multi-account testing).
 */
export async function rateLimitByIpAndTarget(
  action: string,
  target: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const ip = await getClientIp();
  return checkRateLimit(`${action}:${ip}:${target.toLowerCase()}`, limit, windowMs);
}
