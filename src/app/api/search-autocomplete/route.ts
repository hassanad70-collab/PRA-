import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const VALID_FIELDS = new Set(["title", "keywords", "location"]);
const MIN_TERM_LEN = 2;
const MAX_SUGGESTIONS = 8;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const field = searchParams.get("field") ?? "title";

  if (q.length < MIN_TERM_LEN) {
    return NextResponse.json({ suggestions: [] });
  }
  if (!VALID_FIELDS.has(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_autocomplete_suggestions", {
    p_term: q,
    p_field: field,
    p_limit: MAX_SUGGESTIONS,
  });

  if (error) {
    console.error("autocomplete rpc error", error);
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = (data ?? []).map((row: { text: string; source: string; count: number }) => ({
    text: row.text,
    source: row.source,
    count: Number(row.count),
  }));

  return NextResponse.json({ suggestions }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
