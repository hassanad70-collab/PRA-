"use client";

import * as React from "react";
import {
  ChevronDown, ChevronUp, Clock, Loader2, Sparkles, Star, Trash2,
  TrendingUp, Target, AlertTriangle, Award, DollarSign, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAndSaveCareerReportAction,
  deleteCareerReportAction,
  toggleCareerReportFavoriteAction,
} from "@/actions/workspace";
import { WorkspaceResumeBadge } from "./resume-uploader";
import type { AiCareerReport } from "@/types/database";
import type { GuestCareerResult } from "@/lib/ai/guest-career-advisor";

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-green-600 dark:text-green-400",
};

const PRIORITY_BG: Record<string, string> = {
  high: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40",
  medium: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
  low: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40",
};

function CareerResultView({ result, onReset }: { result: GuestCareerResult; onReset: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">✓ Saved to workspace</Badge>
        <Button variant="outline" size="sm" onClick={onReset}>
          <ChevronUp className="mr-1.5 h-3.5 w-3.5" />New report
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Next role */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Your Next Role</h3>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium text-lg">{result.nextRole.title}</p>
              <Badge variant="outline" className="shrink-0 text-xs">{result.nextRole.timeframe}</Badge>
            </div>
            <ul className="space-y-1.5">
              {result.nextRole.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Career path */}
      {result.careerPath.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Career Roadmap</h3>
          </div>
          <div className="relative space-y-3 pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
            {result.careerPath.map((step) => (
              <div key={step.step} className="relative">
                <div className="absolute -left-3.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm">{step.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{step.timeframe}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill gaps */}
      {result.skillGaps.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Skill Gaps to Close</h3>
          </div>
          <div className="space-y-2">
            {result.skillGaps.map((gap, i) => (
              <div key={i} className={`rounded-lg border p-3 ${PRIORITY_BG[gap.priority]}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{gap.skill}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLOR[gap.priority]}`}>
                    {gap.priority} priority
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{gap.reason}</p>
                <p className="mt-1.5 text-xs font-medium text-foreground">
                  → {gap.howToLearn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {result.certifications.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Recommended Certifications</h3>
          </div>
          <div className="space-y-2">
            {result.certifications.map((cert, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cert.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cert.reason}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{cert.timeToComplete}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary */}
      {result.salaryRange && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <h3 className="font-semibold">Salary Insights</h3>
          </div>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold tabular-nums">
                {result.salaryRange.currency === "USD" ? "$" : result.salaryRange.currency + " "}
                {result.salaryRange.min.toLocaleString()}
                <span className="text-muted-foreground">–</span>
                {result.salaryRange.max.toLocaleString()}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{result.salaryRange.note}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly goals */}
      {result.weeklyGoals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Start This Week</h3>
          </div>
          <ul className="space-y-2">
            {result.weeklyGoals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Market insight */}
      {result.marketInsight && (
        <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-400">
              📊 Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">{result.marketInsight}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SavedReportCard({
  item, onDelete, onLoad, onToggleFavorite,
}: {
  item: AiCareerReport;
  onDelete: (id: string) => void;
  onLoad: (r: GuestCareerResult) => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
}) {
  const [deleting, startDelete] = React.useTransition();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.current_role && <span className="capitalize">{item.current_role}</span>}
          {item.target_role && <span> → {item.target_role}</span>}
          {" · "}
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
          onClick={() => onLoad(item.result_json as unknown as GuestCareerResult)}>View</Button>
        <button
          type="button"
          onClick={() => startDelete(async () => { await deleteCareerReportAction(item.id); onDelete(item.id); })}
          disabled={deleting}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface WorkspaceCareerAdvisorProps {
  workspaceResumeText: string | null;
  initialSaved: AiCareerReport[];
}

export function WorkspaceCareerAdvisor({ workspaceResumeText, initialSaved }: WorkspaceCareerAdvisorProps) {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<GuestCareerResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<AiCareerReport[]>(initialSaved);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const [currentRole, setCurrentRole] = React.useState("");
  const [yearsExperience, setYearsExperience] = React.useState("3");
  const [targetRole, setTargetRole] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [education, setEducation] = React.useState("");
  const [skills, setSkills] = React.useState(
    workspaceResumeText
      ? "Auto-extracted from workspace resume. Edit as needed."
      : ""
  );

  const hasWorkspaceResume = !!workspaceResumeText;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAndSaveCareerReportAction({
        currentRole,
        yearsExperience: Number(yearsExperience) || 3,
        targetRole: targetRole || undefined,
        location: location || undefined,
        education: education || undefined,
        skills,
      });
      if (res.success && res.data) {
        const reportResult = res.data.result_json as unknown as GuestCareerResult;
        setResult(reportResult);
        setSaved((prev) => [res.data!, ...prev]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  if (result) {
    return <CareerResultView result={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ca-role">Current role *</Label>
          <Input id="ca-role" placeholder="e.g. Senior Software Engineer" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-years">Years of experience *</Label>
          <Input id="ca-years" type="number" min="0" max="40" placeholder="e.g. 5" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-target">Target role / direction</Label>
          <Input id="ca-target" placeholder="e.g. Engineering Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-location">Location</Label>
          <Input id="ca-location" placeholder="e.g. New York, USA" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ca-education">Education</Label>
          <Input id="ca-education" placeholder="e.g. BSc Computer Science" value={education} onChange={(e) => setEducation(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="ca-skills">Key skills *</Label>
          <WorkspaceResumeBadge hasResume={hasWorkspaceResume} />
        </div>
        <Textarea
          id="ca-skills"
          placeholder="List your main technical and soft skills, tools, frameworks, languages…"
          rows={4}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="resize-none"
        />
        {hasWorkspaceResume && (
          <p className="text-xs text-muted-foreground">Edit to reflect your most relevant skills for this report.</p>
        )}
      </div>

      <Button variant="gradient" size="lg" className="w-full" onClick={handleGenerate}
        disabled={isPending || !currentRole.trim() || !skills.trim()}>
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating career report…</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" />Generate & Save Career Report</>
        )}
      </Button>

      {saved.length > 0 && (
        <div>
          <Separator className="mb-4" />
          <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Saved career reports
              <Badge variant="secondary" className="text-[10px]">{saved.length}</Badge>
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-2">
              {saved.map((item) => (
                <SavedReportCard key={item.id} item={item}
                  onDelete={(id) => setSaved((prev) => prev.filter((x) => x.id !== id))}
                  onLoad={(r) => setResult(r)}
                  onToggleFavorite={async (id, fav) => {
                    await toggleCareerReportFavoriteAction(id, fav);
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
