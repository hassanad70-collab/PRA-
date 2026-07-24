import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// TEMPORARY diagnostic route for the /jobs/[id] and /companies/[slug] 404
// regression. Isolates whether filtering by id specifically (vs. status)
// is the differentiator, and bypasses supabase-js entirely with a direct
// fetch to PostgREST to rule out anything client-library-specific.
export async function GET() {
  const raw = createRawClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const byStatus = await raw.from("jobs").select("id, title").eq("status", "published").limit(1);
  const byId = await raw.from("jobs").select("id, title").eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4").limit(1);
  const byIdNoEmbed = await raw.from("jobs").select("id").eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4");
  const bySlug = await raw.from("jobs").select("id, title").eq("slug", "production-audit-test-job").limit(1);

  // Hit PostgREST directly, bypassing the supabase-js client entirely, to
  // rule out anything client-library-specific.
  const directFetchRes = await fetch(
    `${url}/rest/v1/jobs?id=eq.174ed530-f4d3-45d0-a328-c4865d2349b4&select=id,title`,
    { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` } }
  );
  const directFetchBody = await directFetchRes.text();

  return NextResponse.json({
    url,
    byStatus: { dataLength: byStatus.data?.length ?? null, error: byStatus.error?.message?.slice(0, 80) ?? null },
    byId: { dataLength: byId.data?.length ?? null, error: byId.error?.message?.slice(0, 80) ?? null },
    byIdNoEmbed: { dataLength: byIdNoEmbed.data?.length ?? null, error: byIdNoEmbed.error?.message?.slice(0, 80) ?? null },
    bySlug: { dataLength: bySlug.data?.length ?? null, error: bySlug.error?.message?.slice(0, 80) ?? null },
    directFetch: { status: directFetchRes.status, bodyPreview: directFetchBody.slice(0, 150) },
  });
}
