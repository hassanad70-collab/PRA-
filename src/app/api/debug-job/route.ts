import { NextResponse } from "next/server";

import { getJobById, getCompanyBySlug } from "@/lib/queries/jobs";

// TEMPORARY diagnostic route for the /jobs/[id] and /companies/[slug] 404
// regression. Calls the exact same query functions those pages use, from
// inside Vercel's actual runtime. Remove after diagnosis.
export async function GET() {
  const job = await getJobById("174ed530-f4d3-45d0-a328-c4865d2349b4");
  const company = await getCompanyBySlug("prod-audit-company");

  return NextResponse.json({
    job: job ? { id: job.id, title: job.title, status: job.status } : null,
    jobIsNull: job === null,
    jobIsUndefined: job === undefined,
    company: company ? { id: company.id, name: company.name, deleted_at: company.deleted_at } : null,
    companyIsNull: company === null,
  });
}
