import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { searchCandidates } from "@/lib/recruiter/employer-queries";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const openToWork = searchParams.get("openToWork") === "1";

  const results = await searchCandidates(recruiter.company_id, recruiter.id, {
    query,
    location,
    openToWork,
    limit: 100,
  });

  return NextResponse.json(results);
}
