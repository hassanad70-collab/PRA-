"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { generateInterviewPrepAction } from "@/actions/ai-tools-guest";
import type { GuestInterviewResult } from "@/lib/ai/guest-interview-prep";

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0–2 years)" },
  { value: "junior", label: "Junior (2–4 years)" },
  { value: "mid", label: "Mid Level (4–7 years)" },
  { value: "senior", label: "Senior (7–12 years)" },
  { value: "lead", label: "Lead / Staff (12+ years)" },
];

type QuestionCategory = {
  key: keyof Pick<GuestInterviewResult, "technical" | "behavioral" | "situational" | "hrAndCultural">;
  label: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
};

const CATEGORIES: QuestionCategory[] = [
  { key: "technical", label: "Technical", badge: "Technical", badgeVariant: "default" },
  { key: "behavioral", label: "Behavioral (STAR)", badge: "STAR", badgeVariant: "secondary" },
  { key: "situational", label: "Situational", badge: "Scenario", badgeVariant: "outline" },
  { key: "hrAndCultural", label: "HR & Culture Fit", badge: "HR", badgeVariant: "outline" },
];

function QuestionCard({
  question,
  suggestedAnswer,
  tip,
  index,
}: {
  question: string;
  suggestedAnswer: string;
  tip: string;
  index: number;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {index + 1}
          </span>
          <p className="text-sm font-medium leading-snug">{question}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Strong Answer Framework
            </p>
            <p className="text-sm text-foreground leading-relaxed">{suggestedAnswer}</p>
          </div>
          <div className="rounded-md bg-pra-warning/5 border border-pra-warning/20 px-3 py-2">
            <p className="text-xs font-medium text-pra-warning">
              💡 Coaching tip: {tip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function InterviewPrepTool() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<GuestInterviewResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [position, setPosition] = React.useState("");
  const [experienceLevel, setExperienceLevel] = React.useState("mid");
  const [jobDescription, setJobDescription] = React.useState("");
  const [resumeText, setResumeText] = React.useState("");

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateInterviewPrepAction({ position, jobDescription, resumeText, experienceLevel });
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
      <div id="results" className="space-y-8">
        {/* Opening Pitch */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Opening Pitch — &ldquo;Tell me about yourself&rdquo;</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed italic text-foreground">&ldquo;{result.openingPitch}&rdquo;</p>
          </CardContent>
        </Card>

        {/* Question categories */}
        {CATEGORIES.map(({ key, label, badge, badgeVariant }) => {
          const questions = result[key];
          if (!questions?.length) return null;
          return (
            <div key={key}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-semibold">{label} Questions</h3>
                <Badge variant={badgeVariant} className="text-[10px]">{badge}</Badge>
                <span className="text-xs text-muted-foreground">{questions.length} questions</span>
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <QuestionCard key={i} index={i} {...q} />
                ))}
              </div>
            </div>
          );
        })}

        {/* STAR Example */}
        {result.starExample && (
          <div>
            <h3 className="mb-3 font-semibold">Your STAR Story Outline</h3>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-muted-foreground italic">Best used for: {result.starExample.context}</p>
                {(["situation", "task", "action", "result"] as const).map((key) => (
                  <div key={key}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{key}</p>
                    <p className="mt-0.5 text-sm">{result.starExample[key]}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Questions to ask */}
        {result.questionsToAsk?.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold">Smart Questions to Ask the Interviewer</h3>
            <ul className="space-y-2">
              {result.questionsToAsk.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 text-primary">›</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Sign-up CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">Save your prep & run a mock interview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to save your prep guide, practice with AI mock interviews, and track your progress.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setResult(null); setError(null); }}>
                Generate New Prep
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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="position">Target position *</Label>
          <Input
            id="position"
            placeholder="e.g. Frontend Engineer"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Experience level</Label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jd">Job description *</Label>
        <Textarea
          id="jd"
          placeholder="Paste the full job description here..."
          rows={5}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="resume">Your background / resume</Label>
          <Badge variant="outline" className="text-[10px]">Optional but recommended</Badge>
        </div>
        <Textarea
          id="resume"
          placeholder="Paste your resume or describe your background to get personalized answers..."
          rows={5}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="resize-none"
        />
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={isPending || !position.trim() || !jobDescription.trim()}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating your prep guide…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Interview Prep
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Free to use · No account required · 15–25 seconds
      </p>
    </div>
  );
}
