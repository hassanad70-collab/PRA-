"use client";

import * as React from "react";
import {
  ArrowRight, Award, BookOpen, Compass, DollarSign, Loader2, Sparkles, Target, TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { generateCareerAdviceAction } from "@/actions/ai-tools-guest";
import type { GuestCareerResult } from "@/lib/ai/guest-career-advisor";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning-foreground border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High priority",
  medium: "Medium",
  low: "Nice to have",
};

export function CareerAdvisorTool() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<GuestCareerResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [currentRole, setCurrentRole] = React.useState("");
  const [yearsExperience, setYearsExperience] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [targetRole, setTargetRole] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [education, setEducation] = React.useState("");

  const handleGenerate = () => {
    setError(null);
    const years = parseInt(yearsExperience, 10);
    if (isNaN(years) || years < 0) {
      setError("Please enter valid years of experience.");
      return;
    }
    startTransition(async () => {
      const res = await generateCareerAdviceAction({
        currentRole,
        yearsExperience: years,
        skills,
        targetRole: targetRole || undefined,
        location: location || undefined,
        education: education || undefined,
      });
      if (res.success && res.data) {
        setResult(res.data);
        window.scrollTo({ top: document.getElementById("results")?.offsetTop ?? 0, behavior: "smooth" });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  if (result) {
    return (
      <div id="results" className="space-y-6">
        {/* Summary */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <Compass className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Next Role */}
        {result.nextRole && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Your Next Career Move
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold">{result.nextRole.title}</span>
                <Badge variant="outline">{result.nextRole.timeframe}</Badge>
              </div>
              <ul className="space-y-1.5">
                {result.nextRole.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Career Path */}
          {result.careerPath?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Career Progression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {result.careerPath.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white mt-0.5">
                        {step.step}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.timeframe}</p>
                        {step.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Salary Range */}
          {result.salaryRange && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-success" />
                  Salary Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {result.salaryRange.currency} {result.salaryRange.min.toLocaleString()}–{result.salaryRange.max.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Per year</p>
                <p className="mt-3 text-xs text-muted-foreground">{result.salaryRange.note}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Skill Gaps */}
        {result.skillGaps?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                Skills to Develop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.skillGaps.map((gap, i) => (
                  <div key={i} className={cn("rounded-lg border p-3", PRIORITY_COLORS[gap.priority])}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{gap.skill}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {PRIORITY_LABELS[gap.priority]}
                      </Badge>
                    </div>
                    <p className="text-xs opacity-80">{gap.reason}</p>
                    {gap.howToLearn && (
                      <p className="mt-1 text-xs font-medium opacity-90">→ {gap.howToLearn}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {result.certifications?.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Award className="h-4 w-4 text-primary" />
              Recommended Certifications
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.certifications.map((cert, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 pb-4">
                    <p className="font-medium text-sm">{cert.name}</p>
                    {cert.timeToComplete && (
                      <Badge variant="outline" className="mt-1 text-[10px]">{cert.timeToComplete}</Badge>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{cert.reason}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Goals */}
        {result.weeklyGoals?.length > 0 && (
          <Card className="border-success/30 bg-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-success">
                ✅ Start this week — your action plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.weeklyGoals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-success text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Market Insight */}
        {result.marketInsight && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Market Intelligence
              </p>
              <p className="text-sm leading-relaxed">{result.marketInsight}</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Sign-up CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">Track your career progress over time</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to save your career roadmap, set weekly goals, and get updated advice as you grow.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setResult(null); setError(null); }}>
                New Analysis
              </Button>
              <Button variant="gradient" asChild>
                <Link href="/register">Create free account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role">Current role / title *</Label>
          <Input
            id="role"
            placeholder="e.g. Software Engineer"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="years">Years of experience *</Label>
          <Input
            id="years"
            type="number"
            min="0"
            max="50"
            placeholder="e.g. 5"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="skills">Key skills *</Label>
          <Input
            id="skills"
            placeholder="e.g. React, TypeScript, Node.js, SQL, Team Leadership"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Separate with commas</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="target">Target role / direction</Label>
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          </div>
          <Input
            id="target"
            placeholder="e.g. Engineering Manager, Staff Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="location">Location</Label>
            <Badge variant="outline" className="text-[10px]">For salary data</Badge>
          </div>
          <Input
            id="location"
            placeholder="e.g. San Francisco, CA or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="education">Education</Label>
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          </div>
          <Input
            id="education"
            placeholder="e.g. BS Computer Science, Stanford"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          />
        </div>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={isPending || !currentRole.trim() || !skills.trim() || !yearsExperience}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing your career profile…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Career Report
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Free to use · No account required · 15–30 seconds
      </p>
    </div>
  );
}
