"use client";

import * as React from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { runRecruiterSimulationAction } from "@/actions/workspace";

interface SimResult {
  overall_score: number;
  experience_score: number;
  skill_match_score: number;
  education_match_score: number;
  culture_fit_score: number;
  leadership_score: number;
  communication_score: number;
  technical_score: number;
  ai_summary: string;
  interview_recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no";
}

const DIMENSIONS: { key: keyof SimResult; label: string }[] = [
  { key: "overall_score",         label: "Overall Profile Score" },
  { key: "experience_score",      label: "Experience Match" },
  { key: "skill_match_score",     label: "Skills Alignment" },
  { key: "technical_score",       label: "Technical Depth" },
  { key: "education_match_score", label: "Education Match" },
  { key: "communication_score",   label: "Communication Quality" },
  { key: "leadership_score",      label: "Leadership Evidence" },
  { key: "culture_fit_score",     label: "Culture Fit Signal" },
];

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Yes — Likely to advance", color: "text-emerald-600 dark:text-emerald-400" },
  yes:        { label: "Yes — Worth interviewing",       color: "text-green-600 dark:text-green-400" },
  neutral:    { label: "Neutral — Borderline",           color: "text-amber-600 dark:text-amber-400" },
  no:         { label: "No — Below requirements",        color: "text-orange-600 dark:text-orange-400" },
  strong_no:  { label: "Strong No — Not a fit",          color: "text-destructive" },
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75 ? "bg-emerald-500"
    : score >= 55 ? "bg-amber-400"
    : score >= 35 ? "bg-orange-400"
    : "bg-destructive";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  hasResume: boolean;
}

export function RecruiterSimClient({ hasResume }: Props) {
  const [jobDesc, setJobDesc] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SimResult | null>(null);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await runRecruiterSimulationAction(jobDesc);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error ?? "Simulation failed");
      return;
    }
    setResult(res.data as SimResult);
  }

  const rec = result ? RECOMMENDATION_LABELS[result.interview_recommendation] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary" />
          Recruiter View Simulation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how a recruiter&apos;s AI would score your resume against a job description.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasResume ? (
          <p className="text-sm text-muted-foreground">
            Upload and score your resume on this page first, then run the simulation.
          </p>
        ) : (
          <form onSubmit={handleRun} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sim-jd">Job Description</Label>
              <Textarea
                id="sim-jd"
                placeholder="Paste the job description you want to be evaluated against..."
                rows={5}
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || jobDesc.trim().length < 50}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Simulating…</>
              ) : (
                "Run Simulation"
              )}
            </Button>
          </form>
        )}

        {result && (
          <div className="space-y-5 pt-2">
            <div className="grid gap-2.5">
              {DIMENSIONS.map(({ key, label }) => (
                <ScoreBar key={key} score={(result[key] as number) ?? 0} label={label} />
              ))}
            </div>

            {rec && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Likely Recruiter Decision
                </p>
                <p className={`font-semibold text-sm ${rec.color}`}>{rec.label}</p>
              </div>
            )}

            {result.ai_summary && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recruiter AI Summary
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.ai_summary}</p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground border-t pt-3 italic">
              This simulation uses the same AI engine that recruiters use for applicant screening. Scores are estimated based on your resume and do not guarantee any outcome.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
