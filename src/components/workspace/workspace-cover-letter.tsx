"use client";

import * as React from "react";
import {
  Copy, Loader2, RefreshCw, Sparkles, Star, Trash2, Clock,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAndSaveCoverLetterAction,
  deleteCoverLetterAction,
  toggleCoverLetterFavoriteAction,
} from "@/actions/workspace";
import { WorkspaceResumeBadge } from "./resume-uploader";
import type { AiCoverLetter } from "@/types/database";
import type { CoverLetterResult, CoverLetterTone, CoverLetterLength } from "@/lib/ai/cover-letter";

const TONE_OPTIONS: { value: CoverLetterTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "executive", label: "Executive" },
  { value: "conversational", label: "Conversational" },
];

const LENGTH_OPTIONS: { value: CoverLetterLength; label: string }[] = [
  { value: "short", label: "Short (200–250 words)" },
  { value: "medium", label: "Medium (300–350 words)" },
  { value: "long", label: "Long (400–450 words)" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CoverLetterResultView({
  result,
  onReset,
  isSaved,
}: {
  result: CoverLetterResult;
  onReset: () => void;
  isSaved: boolean;
}) {
  const fullText = [
    result.greeting, "",
    result.openingParagraph, "",
    result.bodyParagraph1, "",
    result.bodyParagraph2, "",
    result.closingParagraph, "",
    result.signOff,
  ].join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Subject line</p>
          <p className="mt-0.5 font-medium">{result.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> New letter
          </Button>
          {isSaved && (
            <Badge variant="secondary" className="text-[10px] self-center">
              ✓ Saved
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="py-8 px-6 sm:px-10 space-y-5 font-serif text-[15px] leading-relaxed">
          <p className="not-italic font-sans text-sm text-muted-foreground">{result.greeting}</p>
          <p>{result.openingParagraph}</p>
          <p>{result.bodyParagraph1}</p>
          <p>{result.bodyParagraph2}</p>
          <p>{result.closingParagraph}</p>
          <p className="font-sans">{result.signOff}</p>
        </CardContent>
      </Card>

      {result.tips.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-400">
              ✏️ Personalize before sending
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-1.5">
              {result.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-400">
                  <span className="mt-0.5 shrink-0 text-xs font-bold">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SavedCoverLetterCard({
  item,
  onDelete,
  onLoad,
  onToggleFavorite,
}: {
  item: AiCoverLetter;
  onDelete: (id: string) => void;
  onLoad: (result: CoverLetterResult) => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
}) {
  const [deleting, startDelete] = React.useTransition();
  const result = item.result_json as unknown as CoverLetterResult;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.company_name && <span>{item.company_name} · </span>}
          <span className="capitalize">{item.tone}</span>
          {" · "}
          <span className="flex-inline items-center gap-1">
            <Clock className="inline h-3 w-3" /> {formatDate(item.created_at)}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id, !item.is_favorite)}
          className={`p-1.5 rounded hover:bg-muted transition-colors ${item.is_favorite ? "text-amber-500" : "text-muted-foreground"}`}
          title={item.is_favorite ? "Unfavorite" : "Favorite"}
        >
          <Star className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
        </button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onLoad(result)}>
          View
        </Button>
        <button
          type="button"
          onClick={() => startDelete(async () => {
            await deleteCoverLetterAction(item.id);
            onDelete(item.id);
          })}
          disabled={deleting}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface WorkspaceCoverLetterProps {
  workspaceResumeText: string | null;
  initialSaved: AiCoverLetter[];
}

export function WorkspaceCoverLetter({ workspaceResumeText, initialSaved }: WorkspaceCoverLetterProps) {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<CoverLetterResult | null>(null);
  const [savedId, setSavedId] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<AiCoverLetter[]>(initialSaved);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  // Form state
  const [resumeText, setResumeText] = React.useState(workspaceResumeText ?? "");
  const [jobDescription, setJobDescription] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [hiringManager, setHiringManager] = React.useState("");
  const [tone, setTone] = React.useState<CoverLetterTone>("professional");
  const [length, setLength] = React.useState<CoverLetterLength>("medium");

  const hasWorkspaceResume = !!workspaceResumeText;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAndSaveCoverLetterAction({
        resumeText,
        jobDescription,
        companyName,
        position,
        hiringManager: hiringManager || undefined,
        tone,
        length,
      });
      if (res.success && res.data) {
        const clResult = res.data.result_json as unknown as CoverLetterResult;
        setResult(clResult);
        setSavedId(res.data.id);
        setSaved((prev) => [res.data!, ...prev]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  if (result) {
    return (
      <div className="space-y-8">
        <CoverLetterResultView
          result={result}
          onReset={() => { setResult(null); setSavedId(undefined); }}
          isSaved={!!savedId}
        />
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

      {/* Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cl-company">Company name *</Label>
          <Input id="cl-company" placeholder="e.g. Google" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cl-position">Position *</Label>
          <Input id="cl-position" placeholder="e.g. Senior Product Designer" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cl-manager">Hiring manager</Label>
          <Input id="cl-manager" placeholder="Optional" value={hiringManager} onChange={(e) => setHiringManager(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Length</Label>
            <Select value={length} onValueChange={(v) => setLength(v as CoverLetterLength)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LENGTH_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="cl-resume">Your resume *</Label>
          <WorkspaceResumeBadge hasResume={hasWorkspaceResume} />
        </div>
        <Textarea
          id="cl-resume"
          placeholder="Paste your resume text or background…"
          rows={hasWorkspaceResume ? 4 : 6}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="resize-none"
        />
        {hasWorkspaceResume && (
          <p className="text-xs text-muted-foreground">Pre-filled from your workspace resume. You can edit it for this letter.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cl-jd">Job description *</Label>
        <Textarea id="cl-jd" placeholder="Paste the full job description…" rows={5} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="resize-none" />
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={isPending || !resumeText.trim() || !jobDescription.trim() || !companyName.trim() || !position.trim()}
      >
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing your cover letter…</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" />Generate & Save Cover Letter</>
        )}
      </Button>

      {/* Saved history */}
      {saved.length > 0 && (
        <div>
          <Separator className="mb-4" />
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Saved cover letters
              <Badge variant="secondary" className="text-[10px]">{saved.length}</Badge>
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-2">
              {saved.map((item) => (
                <SavedCoverLetterCard
                  key={item.id}
                  item={item}
                  onDelete={(id) => setSaved((prev) => prev.filter((x) => x.id !== id))}
                  onLoad={(r) => setResult(r)}
                  onToggleFavorite={async (id, fav) => {
                    await toggleCoverLetterFavoriteAction(id, fav);
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
