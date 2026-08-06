"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Clock, Loader2, Sparkles, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAndSaveInterviewSessionAction,
  deleteInterviewSessionAction,
  toggleInterviewSessionFavoriteAction,
} from "@/actions/workspace";
import { WorkspaceResumeBadge } from "./resume-uploader";
import type { AiInterviewSession } from "@/types/database";
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

function QuestionCard({ question, suggestedAnswer, tip, index }: { question: string; suggestedAnswer: string; tip: string; index: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {index + 1}
          </span>
          <p className="text-sm font-medium leading-snug">{question}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Strong Answer Framework</p>
            <p className="text-sm text-foreground leading-relaxed">{suggestedAnswer}</p>
          </div>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">💡 Coaching tip: {tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InterviewResultView({ result, onReset }: { result: GuestInterviewResult; onReset: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">✓ Saved to workspace</Badge>
        <Button variant="outline" size="sm" onClick={onReset}>
          <ChevronUp className="mr-1.5 h-3.5 w-3.5" />New session
        </Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Opening Pitch — &ldquo;Tell me about yourself&rdquo;</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed italic text-foreground">&ldquo;{result.openingPitch}&rdquo;</p>
        </CardContent>
      </Card>

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
              {questions.map((q, i) => <QuestionCard key={i} index={i} {...q} />)}
            </div>
          </div>
        );
      })}

      {result.starExample && (
        <div>
          <h3 className="mb-3 font-semibold">Your STAR Story Outline</h3>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground italic">Best used for: {result.starExample.context}</p>
              {(["situation", "task", "action", "result"] as const).map((k) => (
                <div key={k}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{k}</p>
                  <p className="mt-0.5 text-sm">{result.starExample[k]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {result.questionsToAsk?.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Smart Questions to Ask the Interviewer</h3>
          <ul className="space-y-2">
            {result.questionsToAsk.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 text-primary">›</span>{q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SavedSessionCard({
  item, onDelete, onLoad, onToggleFavorite,
}: {
  item: AiInterviewSession;
  onDelete: (id: string) => void;
  onLoad: (r: GuestInterviewResult) => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
}) {
  const [deleting, startDelete] = React.useTransition();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.experience_level && <span className="capitalize">{item.experience_level} · </span>}
          <Clock className="inline h-3 w-3" />{" "}
          {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id, !item.is_favorite)}
          className={`p-1.5 rounded hover:bg-muted transition-colors ${item.is_favorite ? "text-amber-500" : "text-muted-foreground"}`}
        >
          <Star className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
        </button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"
          onClick={() => onLoad(item.result_json as unknown as GuestInterviewResult)}>View</Button>
        <button
          type="button"
          onClick={() => startDelete(async () => { await deleteInterviewSessionAction(item.id); onDelete(item.id); })}
          disabled={deleting}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface WorkspaceInterviewPrepProps {
  workspaceResumeText: string | null;
  initialSaved: AiInterviewSession[];
}

export function WorkspaceInterviewPrep({ workspaceResumeText, initialSaved }: WorkspaceInterviewPrepProps) {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<GuestInterviewResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<AiInterviewSession[]>(initialSaved);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const [position, setPosition] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [experienceLevel, setExperienceLevel] = React.useState("mid");
  const [jobDescription, setJobDescription] = React.useState("");
  const [resumeText, setResumeText] = React.useState(workspaceResumeText ?? "");

  const hasWorkspaceResume = !!workspaceResumeText;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAndSaveInterviewSessionAction({
        position, company, experienceLevel, jobDescription, resumeText,
      });
      if (res.success && res.data) {
        const sessionResult = res.data.result_json as unknown as GuestInterviewResult;
        setResult(sessionResult);
        setSaved((prev) => [res.data!, ...prev]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  if (result) {
    return <InterviewResultView result={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ip-position">Target position *</Label>
          <Input id="ip-position" placeholder="e.g. Frontend Engineer" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ip-company">Company</Label>
          <Input id="ip-company" placeholder="Optional" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Experience level</Label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPERIENCE_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ip-jd">Job description *</Label>
        <Textarea id="ip-jd" placeholder="Paste the full job description…" rows={5} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="resize-none" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="ip-resume">Your background / resume</Label>
          <WorkspaceResumeBadge hasResume={hasWorkspaceResume} />
        </div>
        <Textarea id="ip-resume" placeholder="Paste your resume or describe your background…" rows={4} value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="resize-none" />
      </div>

      <Button variant="gradient" size="lg" className="w-full" onClick={handleGenerate}
        disabled={isPending || !position.trim() || !jobDescription.trim()}>
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating prep guide…</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" />Generate & Save Prep Guide</>
        )}
      </Button>

      {saved.length > 0 && (
        <div>
          <Separator className="mb-4" />
          <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Saved prep sessions
              <Badge variant="secondary" className="text-[10px]">{saved.length}</Badge>
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-2">
              {saved.map((item) => (
                <SavedSessionCard key={item.id} item={item}
                  onDelete={(id) => setSaved((prev) => prev.filter((x) => x.id !== id))}
                  onLoad={(r) => setResult(r)}
                  onToggleFavorite={async (id, fav) => {
                    await toggleInterviewSessionFavoriteAction(id, fav);
                    setSaved((prev) => prev.map((x) => x.id === id ? { ...x, is_favorite: fav } : x));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
