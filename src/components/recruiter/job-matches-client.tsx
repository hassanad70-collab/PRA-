"use client";

import * as React from "react";
import Link from "next/link";
import { Brain, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runCandidateMatchAction } from "@/actions/employer";
import { initials } from "@/lib/utils";
import type { JobMatchWithCandidate } from "@/types/database";

interface JobMatchesClientProps {
  jobId: string;
  jobTitle: string;
  initialMatches: JobMatchWithCandidate[];
  labels: {
    matchScore: string;
    interviewProb: string;
    strengths: string;
    weaknesses: string;
    missingSkills: string;
    refreshMatch: string;
    refreshing: string;
    refreshed: string;
    refreshFailed: string;
    viewProfile: string;
    empty: string;
  };
}

export function JobMatchesClient({ jobId, jobTitle, initialMatches, labels }: JobMatchesClientProps) {
  const [matches, setMatches] = React.useState(initialMatches);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [refreshingId, setRefreshingId] = React.useState<string | null>(null);

  async function handleRefresh(candidateId: string) {
    setRefreshingId(candidateId);
    try {
      const res = await runCandidateMatchAction(jobId, candidateId);
      if ("error" in res && res.error) {
        toast.error(res.error as string);
      } else if ("result" in res && res.result) {
        setMatches((prev) =>
          prev.map((m) =>
            m.candidate_id === candidateId
              ? {
                  ...m,
                  match_score: res.result!.match_score,
                  ai_summary: res.result!.ai_summary,
                  strengths: res.result!.strengths,
                  weaknesses: res.result!.weaknesses,
                  missing_skills: res.result!.missing_skills,
                  interview_probability: res.result!.interview_probability,
                }
              : m
          )
        );
        toast.success(labels.refreshed);
      }
    } catch {
      toast.error(labels.refreshFailed);
    } finally {
      setRefreshingId(null);
    }
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <Brain className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{labels.empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m, rank) => {
        const name = m.candidate?.profile?.full_name ?? "Candidate";
        const pos = m.candidate?.current_position ?? "—";
        const isExpanded = expandedId === m.id;
        const score = Math.round(m.match_score);
        const prob = m.interview_probability != null ? Math.round(m.interview_probability) : null;

        return (
          <Card key={m.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  #{rank + 1}
                </span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold">{name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{pos}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-end">
                    <p className="text-xl font-bold tabular-nums text-primary">{score}%</p>
                    <p className="text-[10px] text-muted-foreground">{labels.matchScore}</p>
                  </div>
                  {prob != null && (
                    <div className="text-end">
                      <p className="text-xl font-bold tabular-nums">{prob}%</p>
                      <p className="text-[10px] text-muted-foreground">{labels.interviewProb}</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={refreshingId === m.candidate_id}
                    onClick={() => handleRefresh(m.candidate_id)}
                    title={labels.refreshMatch}
                  >
                    {refreshingId === m.candidate_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4 pt-0">
                {m.ai_summary && (
                  <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{m.ai_summary}</p>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  {m.strengths?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-success">{labels.strengths}</p>
                      <ul className="space-y-1">
                        {m.strengths.map((s, i) => (
                          <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                            <span className="shrink-0 text-success">+</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {m.weaknesses?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-warning">{labels.weaknesses}</p>
                      <ul className="space-y-1">
                        {m.weaknesses.map((w, i) => (
                          <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                            <span className="shrink-0 text-warning">−</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {m.missing_skills?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-destructive">{labels.missingSkills}</p>
                      <div className="flex flex-wrap gap-1">
                        {m.missing_skills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] text-destructive">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/recruiter/candidates/${m.candidate_id}`}>{labels.viewProfile}</Link>
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
