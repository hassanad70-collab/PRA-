"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateInterviewQuestionsForJob } from "@/actions/interviews";
import type { InterviewQuestion, InterviewQuestionCategory } from "@/types/database";

const CATEGORY_LABELS: Record<InterviewQuestionCategory, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational",
  case_study: "Case study",
};

export function InterviewQuestionsPanel({
  jobId,
  groups,
}: {
  jobId: string;
  groups: { category: InterviewQuestionCategory; questions: InterviewQuestion[] }[];
}) {
  const [isPending, startTransition] = React.useTransition();
  const hasQuestions = groups.some((g) => g.questions.length > 0);

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateInterviewQuestionsForJob(jobId);
      if (!res.success) toast.error(res.error ?? "Failed to generate interview questions.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          AI-generated question bank interviewers can pull from for this role.
        </p>
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleGenerate}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {hasQuestions ? "Regenerate with AI" : "Generate with AI"}
        </Button>
      </div>

      {!hasQuestions && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No interview questions yet. Generate a question bank to get started.
          </CardContent>
        </Card>
      )}

      {groups.map(
        (group) =>
          group.questions.length > 0 && (
            <div key={group.category} className="space-y-2">
              <h3 className="text-sm font-semibold">{CATEGORY_LABELS[group.category]}</h3>
              {group.questions.map((q) => (
                <Card key={q.id}>
                  <CardContent className="space-y-2 pt-6">
                    <p className="font-medium">{q.question}</p>
                    {q.expected_answer && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Expected answer: </span>
                        {q.expected_answer}
                      </p>
                    )}
                    {q.evaluation_criteria && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {q.evaluation_criteria}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
      )}
    </div>
  );
}
