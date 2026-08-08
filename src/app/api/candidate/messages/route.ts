import { type NextRequest, NextResponse } from "next/server";

import { getCandidateMessages } from "@/lib/candidate/messaging-queries";
import { getCurrentUser } from "@/lib/queries/candidate";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

  // Verify thread belongs to this candidate
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("id", threadId)
    .eq("candidate_id", user.id)
    .single();

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await getCandidateMessages(threadId);
  return NextResponse.json(messages);
}
