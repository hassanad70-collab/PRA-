import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route for the /jobs/[id] and /companies/[slug] 404
// regression. Uses the exact same SSR-wrapped createClient() the app uses,
// but surfaces the raw (normally-discarded) error instead of swallowing
// it, to see exactly why the query fails inside Vercel's runtime when the
// identical query with a plain createClient succeeds locally.
export async function GET() {
  const supabase = await createClient();

  const jobSingle = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .single();

  const jobArray = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .limit(1);

  const jobMaybeSingle = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .maybeSingle();

  return NextResponse.json({
    jobSingle: {
      data: jobSingle.data ? { id: jobSingle.data.id, title: jobSingle.data.title } : null,
      errorMessage: jobSingle.error?.message?.slice(0, 100) ?? null,
      status: jobSingle.status,
    },
    jobArray: {
      dataLength: jobArray.data?.length ?? null,
      errorMessage: jobArray.error?.message?.slice(0, 100) ?? null,
      status: jobArray.status,
    },
    jobMaybeSingle: {
      data: jobMaybeSingle.data ? { id: jobMaybeSingle.data.id, title: jobMaybeSingle.data.title } : null,
      errorMessage: jobMaybeSingle.error?.message?.slice(0, 100) ?? null,
      status: jobMaybeSingle.status,
    },
  });
}
