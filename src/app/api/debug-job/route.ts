import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route for the /jobs/[id] and /companies/[slug] 404
// regression. Uses the exact same SSR-wrapped createClient() the app uses,
// but surfaces the raw (normally-discarded) error instead of swallowing
// it, to see exactly why the query fails inside Vercel's runtime when the
// identical query with a plain createClient succeeds locally.
export async function GET() {
  const supabase = await createClient();

  const jobResult = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .single();

  const companyResult = await supabase
    .from("companies")
    .select("*")
    .eq("slug", "prod-audit-company")
    .is("deleted_at", null)
    .single();

  return NextResponse.json({
    job: {
      data: jobResult.data ? { id: jobResult.data.id, title: jobResult.data.title, status: jobResult.data.status } : null,
      error: jobResult.error,
      status: jobResult.status,
      statusText: jobResult.statusText,
    },
    company: {
      data: companyResult.data ? { id: companyResult.data.id, name: companyResult.data.name } : null,
      error: companyResult.error,
      status: companyResult.status,
      statusText: companyResult.statusText,
    },
  });
}
