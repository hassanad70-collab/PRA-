import { NextResponse, type NextRequest } from "next/server";

import { getApplicationsForComparison } from "@/lib/queries/applications";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { generateComparisonPdf } from "@/lib/documents/comparison-pdf";
import { createClient } from "@/lib/supabase/server";

const MAX_COMPARE = 4;

/**
 * Streams a Candidate Comparison PDF directly to the recruiter -- unlike
 * resume-pdf.tsx's finalized resumes, this isn't a candidate-owned document
 * to persist in storage, so it's generated fresh on each request and never
 * written anywhere.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) return NextResponse.json({ error: "Only recruiters can export comparisons." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const applicationIds = Array.isArray(body?.applicationIds) ? body.applicationIds.slice(0, MAX_COMPARE) : [];
  if (applicationIds.length < 2) {
    return NextResponse.json({ error: "Select at least 2 candidates to compare." }, { status: 400 });
  }

  const candidates = await getApplicationsForComparison(applicationIds);
  if (candidates.length < 2) {
    return NextResponse.json({ error: "Could not load the selected candidates." }, { status: 404 });
  }

  const jobTitle = candidates[0]?.jobTitle || "Candidate Comparison";
  const buffer = await generateComparisonPdf(candidates, jobTitle);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comparison-${Date.now()}.pdf"`,
    },
  });
}
