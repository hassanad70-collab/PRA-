"use client";

import * as React from "react";
import { Flame, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ParsedResumeData, AtsScore } from "@/types/database";

interface SectionScore {
  label: string;
  score: number;
  note: string;
}

function computeHeatmap(parsed: ParsedResumeData, ats: AtsScore): SectionScore[] {
  const sections: SectionScore[] = [];

  // Personal info / contact — always present check
  const hasContact = !!(
    (parsed as Record<string, unknown>).email ||
    (parsed as Record<string, unknown>).phone
  );
  sections.push({
    label: "Contact & Header",
    score: hasContact ? 90 : 40,
    note: hasContact ? "Complete contact info detected" : "Missing email or phone — recruiters may skip",
  });

  // Summary — presence + length
  const summary = (parsed as Record<string, unknown>).summary as string | undefined;
  const summaryScore = !summary ? 20 : summary.length < 80 ? 50 : summary.length < 200 ? 75 : 90;
  sections.push({
    label: "Professional Summary",
    score: summaryScore,
    note: !summary ? "No summary — a strong 2–3 sentence summary significantly improves recruiter attention"
      : summary.length < 80 ? "Summary is too brief — expand to 2–3 sentences"
      : "Good summary length",
  });

  // Experience — bullet quantification
  const exp = parsed.experience ?? [];
  const totalBullets = exp.reduce((acc, e) => {
    const desc = e.description ?? "";
    return acc + desc.split("\n").filter((l: string) => l.trim().length > 5).length;
  }, 0);
  const quantified = exp.reduce((acc, e) => {
    const desc = e.description ?? "";
    const bullets = desc.split("\n").filter((l: string) => l.trim().length > 5);
    return acc + bullets.filter((l: string) => /\d+%?|\$[\d,]+|[0-9]+[kKmM]/.test(l)).length;
  }, 0);
  const quantRatio = totalBullets > 0 ? quantified / totalBullets : 0;
  const expScore = exp.length === 0 ? 10
    : quantRatio >= 0.5 ? 92
    : quantRatio >= 0.25 ? 72
    : totalBullets > 0 ? 50
    : 35;
  sections.push({
    label: "Work Experience",
    score: expScore,
    note: exp.length === 0 ? "No experience entries detected"
      : totalBullets === 0 ? "Experience entries have no bullet descriptions"
      : `${quantified} of ${totalBullets} bullets are quantified (${Math.round(quantRatio * 100)}%)`,
  });

  // Skills — coverage via ATS score
  const skillsScore = (ats.skills_score ?? 0) > 70 ? 85
    : (ats.skills_score ?? 0) > 40 ? 65
    : (ats.skills_score ?? 0) > 0 ? 45
    : 30;
  sections.push({
    label: "Skills",
    score: skillsScore,
    note: `ATS skills score: ${ats.skills_score ?? "N/A"}`,
  });

  // Education
  const edu = parsed.education ?? [];
  sections.push({
    label: "Education",
    score: edu.length === 0 ? 25 : edu.some((e) => e.degree) ? 85 : 60,
    note: edu.length === 0 ? "No education entries" : "Education section present",
  });

  // Certifications (bonus attention signal)
  const certs = parsed.certificates ?? [];
  if (certs.length > 0) {
    sections.push({
      label: "Certifications",
      score: 80,
      note: `${certs.length} certification${certs.length !== 1 ? "s" : ""} listed`,
    });
  }

  // Projects
  const projects = parsed.projects ?? [];
  if (projects.length > 0) {
    sections.push({
      label: "Projects",
      score: projects.some((p) => p.description) ? 78 : 55,
      note: projects.some((p) => p.description)
        ? "Projects with descriptions — good for technical roles"
        : "Add descriptions to projects for maximum impact",
    });
  }

  return sections;
}

function heatColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-500";
}

function heatLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Weak";
  return "Missing";
}

interface Props {
  parsedData: ParsedResumeData;
  atsScore: AtsScore;
}

export function ResumeHeatmap({ parsedData, atsScore }: Props) {
  const sections = React.useMemo(() => computeHeatmap(parsedData, atsScore), [parsedData, atsScore]);
  const overall = Math.round(sections.reduce((s, sec) => s + sec.score, 0) / sections.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-orange-500" />
            Attention Heatmap
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                AI-estimated recruiter attention proxy based on resume structure, quantification density, and ATS scores.
                Not real eye-tracking data.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            AI estimate — not real eye-tracking data
          </Badge>
          <span className="ml-auto text-sm font-semibold">
            Overall: {overall}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sections.map((sec) => (
            <div key={sec.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{sec.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{sec.score}%</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      sec.score >= 80 ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                      : sec.score >= 60 ? "border-amber-300 text-amber-700 dark:text-amber-400"
                      : sec.score >= 40 ? "border-orange-300 text-orange-700 dark:text-orange-400"
                      : "border-red-300 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {heatLabel(sec.score)}
                  </Badge>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${heatColor(sec.score)}`}
                  style={{ width: `${sec.score}%` }}
                  aria-label={`${sec.label}: ${sec.score}%`}
                />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{sec.note}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
