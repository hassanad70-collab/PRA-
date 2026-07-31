import { NextResponse, type NextRequest } from "next/server";

import { trackEvent } from "@/lib/analytics/track";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limit = await rateLimitByIp("web-vitals", 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
