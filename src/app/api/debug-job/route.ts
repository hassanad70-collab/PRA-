import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route for the /jobs/[id] and /companies/[slug] 404
// regression. Uses the exact same SSR-wrapped createClient() the app uses,
// but surfaces the raw (normally-discarded) error instead of swallowing
// it, to see exactly why the query fails inside Vercel's runtime when the
// identical query with a plain createClient succeeds locally.
export async function GET() {
  const supabase = await createClient();
  const raw = createRawClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const viaSsrClient = await supabase
    .from("jobs")
    .select("id, title")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .limit(1);

  const viaRawClient = await raw
    .from("jobs")
    .select("id, title")
    .eq("id", "174ed530-f4d3-45d0-a328-c4865d2349b4")
    .limit(1);

  return NextResponse.json({
    viaSsrClient: {
      dataLength: viaSsrClient.data?.length ?? null,
      errorMessage: viaSsrClient.error?.message?.slice(0, 150) ?? null,
      status: viaSsrClient.status,
    },
    viaRawClient: {
      dataLength: viaRawClient.data?.length ?? null,
      data: viaRawClient.data,
      errorMessage: viaRawClient.error?.message?.slice(0, 150) ?? null,
      status: viaRawClient.status,
    },
  });
}
