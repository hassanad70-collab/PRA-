import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InterviewQuestionCategory } from "@/types/database";

const CATEGORY_ORDER: InterviewQuestionCategory[] = ["technical", "behavioral", "situational", "case_study"];

export async function getInterviewQuestionsForJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  const questions = data ?? [];
  return CATEGORY_ORDER.map((category) => ({
    category,
    questions: questions.filter((q) => q.category === category),
  }));
}

export async function getInterviewsForApplication(applicationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: false });
  return data ?? [];
}
