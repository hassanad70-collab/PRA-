import { Link, redirect } from "@/i18n/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AtsScoreCard } from "@/components/candidate/ats-score-card";
import { ResumeHealthChecklist } from "@/components/candidate/resume-intelligence/health-checklist";
import { RewriteOptimizePanel } from "@/components/candidate/resume-intelligence/rewrite-optimize-panel";
import { SuggestionHistoryList } from "@/components/candidate/resume-intelligence/suggestion-history-list";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import { ResumeHeatmap } from "@/components/workspace/resume-heatmap";
import { getCandidateFullProfile, getCurrentUser, getLatestAtsScore } from "@/lib/queries/candidate";
import { getSuggestionHistory } from "@/lib/resume-intelligence/suggestion-events";
import { runStructuralChecks } from "@/lib/resume-intelligence/structural-checks";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceAtsCheckerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const supabase = await createClient();
  const [{ resumes }, atsScore, suggestionHistory] = await Promise.all([
    getCandidateFullProfile(user.id),
    getLatestAtsScore(user.id),
    getSuggestionHistory(supabase, user.id),
  ]);

  const scoredResume = atsScore ? resumes.find((r) => r.id === atsScore.resume_id) : undefined;
  const structuralChecks = scoredResume?.raw_text
    ? runStructuralChecks(scoredResume.raw_text, scoredResume.parsed_data ?? {})
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ATS Resume Checker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan your resume against ATS systems, get a score, and apply AI-powered improvements.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Build a new resume from scratch</p>
              <p className="text-sm text-muted-foreground">
                Use Resume Studio to create section-by-section with AI assistance.
              </p>
            </div>
          </div>
          <Button variant="gradient" asChild>
            <Link href="/candidate/workspace/studio">
              Open Studio <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ResumeUpload />

      {atsScore && <AtsScoreCard score={atsScore} />}

      {structuralChecks && atsScore && scoredResume && (
        <ResumeHealthChecklist
          checks={structuralChecks}
          resumeId={scoredResume.id}
          isPartial={scoredResume.parse_status === "completed_partial"}
          parseErrorCode={scoredResume.parse_error_code}
        />
      )}

      {atsScore && scoredResume?.raw_text && <RewriteOptimizePanel />}

      {atsScore && scoredResume?.parsed_data && (
        <ResumeHeatmap
          parsedData={scoredResume.parsed_data}
          atsScore={atsScore}
        />
      )}

      <SuggestionHistoryList events={suggestionHistory} />
    </div>
  );
}
