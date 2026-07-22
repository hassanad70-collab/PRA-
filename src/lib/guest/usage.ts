import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Generous enough to not punish shared/office NATs; tight enough to blunt
// cookie-clearing abuse. This is the secondary gate — the guest session
// check below is primary, per the "don't rely only on IP" requirement.
const IP_DAILY_CAP = 3;

export type GuestAllowanceResult =
  | { allowed: true }
  | { allowed: false; reason: "session_used" | "ip_capped" };

/**
 * Postgres-backed guest-scan gate (not the in-memory rate limiter — that's
 * per-process and not distributed-safe across Vercel's serverless
 * instances, which matters here since each guest scan costs real OpenAI
 * spend). Primary gate: has this guest session already used this tool?
 * Secondary gate: has this IP exceeded a daily cap?
 */
export async function checkGuestAllowance(
  toolKey: string,
  guestSessionId: string,
  ipHash: string
): Promise<GuestAllowanceResult> {
  const admin = createAdminClient();

  const { count: sessionCount } = await admin
    .from("guest_tool_usage")
    .select("id", { count: "exact", head: true })
    .eq("tool_key", toolKey)
    .eq("guest_session_id", guestSessionId);

  if ((sessionCount ?? 0) > 0) {
    return { allowed: false, reason: "session_used" };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: ipCount } = await admin
    .from("guest_tool_usage")
    .select("id", { count: "exact", head: true })
    .eq("tool_key", toolKey)
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((ipCount ?? 0) >= IP_DAILY_CAP) {
    return { allowed: false, reason: "ip_capped" };
  }

  return { allowed: true };
}

/** Records one guest scan. Call only after a successful analysis. */
export async function recordGuestUsage(toolKey: string, guestSessionId: string, ipHash: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("guest_tool_usage").insert({
    tool_key: toolKey,
    guest_session_id: guestSessionId,
    ip_hash: ipHash,
  });
  if (error) {
    console.error("recordGuestUsage failed", error);
  }
}
