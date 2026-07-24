import { NextResponse } from "next/server";

// TEMPORARY, minimal, read-only diagnostic. Returns exactly what this
// specific deployed build has for NEXT_PUBLIC_SUPABASE_URL -- nothing
// else (no Supabase client, no fetch, no derived values) -- so there is
// no ambiguity about where the value came from. Removed immediately
// after this specific investigation.
export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    buildTimestamp: process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ?? null,
    serverTimeNow: new Date().toISOString(),
  });
}
