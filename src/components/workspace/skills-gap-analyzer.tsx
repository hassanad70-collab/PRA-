"use client";

import * as React from "react";
import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SkillGapEntry } from "@/types/database";

interface Props {
  gaps: SkillGapEntry[];
  totalMatches: number;
}

export function SkillsGapAnalyzer({ gaps, totalMatches }: Props) {
  if (totalMatches === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Skills Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No job match data yet. Apply to jobs or run AI matching to see which skills appear most in your matched listings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Skills Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No skill gaps found across your {totalMatches} job match{totalMatches !== 1 ? "es" : ""}. Your profile covers all required skills.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Skills Gap Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Skills most frequently required by your {totalMatches} matched job{totalMatches !== 1 ? "s" : ""} that aren&apos;t yet on your resume.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {gaps.map((g) => (
            <div key={g.skill} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium">{g.skill}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {g.count} job{g.count !== 1 ? "s" : ""} ({g.pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
              <Badge
                variant={g.pct >= 60 ? "destructive" : g.pct >= 30 ? "secondary" : "outline"}
                className="shrink-0 text-[10px]"
              >
                {g.pct >= 60 ? "High" : g.pct >= 30 ? "Medium" : "Low"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
