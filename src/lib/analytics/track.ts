import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

interface TrackEventOptions {
  guestSessionId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight, generic event logging — reuses the existing Postgres
 * database rather than a third-party analytics vendor. Never throws: a
 * failed analytics write must never break the feature it's instrumenting.
 */
export async function trackEvent(eventName: string, options?: TrackEventOptions): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("analytics_events").insert({
      event_name: eventName,
      guest_session_id: options?.guestSessionId ?? null,
      user_id: options?.userId ?? null,
      metadata: options?.metadata ?? null,
    });
  } catch (err) {
    console.error("trackEvent failed", eventName, err);
  }
}
