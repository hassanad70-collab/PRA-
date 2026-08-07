import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getCandidateResumesForRecruiter } from "@/lib/recruiter/employer-queries";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const candidateId = req.nextUrl.searchParams.get("candidateId");
  if (!candidateId) return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });

  const resumes = await getCandidateResumesForRecruiter(candidateId);
  return NextResponse.json(resumes);
}
