import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

import { getClientIp } from "@/lib/rate-limit";

const GUEST_SESSION_COOKIE = "guest_session_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // ~90 days

/**
 * Reads the guest session cookie, creating one if absent. Only callable from
 * a Server Action or Route Handler (writes a cookie) — use
 * `readGuestSessionId` from a Server Component render.
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  cookieStore.set(GUEST_SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return id;
}

/** Read-only lookup, safe to call from a Server Component render. */
export async function readGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_COOKIE)?.value ?? null;
}

/** SHA-256 hash of the request's client IP — raw IPs are never stored. */
export async function hashClientIp(): Promise<string> {
  const ip = await getClientIp();
  return crypto.createHash("sha256").update(ip).digest("hex");
}
