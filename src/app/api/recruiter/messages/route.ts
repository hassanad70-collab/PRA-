import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getThread, getThreadMessages } from "@/lib/recruiter/messaging-queries";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

  const thread = await getThread(threadId);
  if (!thread || thread.recruiter_id !== recruiter.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await getThreadMessages(threadId);
  return NextResponse.json(messages);
}
