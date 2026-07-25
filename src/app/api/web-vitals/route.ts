import { NextResponse, type NextRequest } from "next/server";

import { trackEvent } from "@/lib/analytics/track";

/**
 * Readiness for continuous performance monitoring (v1.1.5): captures each
 * Core Web Vital into the same analytics_events table every other event in
 * this app already uses (see src/lib/analytics/track.ts), rather than
 * standing up a separate metrics pipeline. A later phase can layer a real
 * dashboard/alerting on top of this table without changing how metrics get
 * here. Deliberately minimal -- no sampling, dashboard, or alerting logic
 * is added in this phase.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.value !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await trackEvent("web_vitals", {
    metadata: {
      metric: body.name,
      value: body.value,
      rating: body.rating ?? null,
      path: typeof body.path === "string" ? body.path : null,
    },
  });

  return NextResponse.json({ ok: true });
}
