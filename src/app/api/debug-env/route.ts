import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route for a live production root-cause investigation
// (published jobs / company pages returning empty in production while
// working locally against the same database). Returns only already-public
// NEXT_PUBLIC_* values (masked) plus the raw result of the exact queries
// getPublishedJobs()/getCompanyBySlug() run, so the real Supabase error (if
// any) is visible instead of silently discarded. Never returns
// SUPABASE_SERVICE_ROLE_KEY or OPENAI_API_KEY. Remove after diagnosis.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  const maskedAnonKey = anonKey ? `${anonKey.slice(0, 10)}...${anonKey.slice(-6)}` : null;

  const supabase = await createClient();

  const jobsResult = await supabase
    .from("jobs")
    .select("id, status", { count: "exact" })
    .eq("status", "published");

  const companyResult = await supabase
    .from("companies")
    .select("id, slug, name")
    .eq("slug", "prod-audit-company")
    .maybeSingle();

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_masked: maskedAnonKey,
      NODE_ENV: process.env.NODE_ENV ?? null,
    },
    jobsQuery: {
      count: jobsResult.count,
      dataLength: jobsResult.data?.length ?? null,
      error: jobsResult.error,
      status: jobsResult.status,
      statusText: jobsResult.statusText,
    },
    companyQuery: {
      data: companyResult.data,
      error: companyResult.error,
      status: companyResult.status,
      statusText: companyResult.statusText,
    },
  });
}
