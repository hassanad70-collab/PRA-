"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateJobDescriptionAction } from "@/actions/employer";
import type { JobDraft } from "@/lib/ai/job-description-writer";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"] as const;
const EXPERIENCE_LEVELS = ["entry", "junior", "mid", "senior", "lead", "manager", "director", "executive"] as const;

interface AiJdGeneratorClientProps {
  labels: {
    titleLabel: string;
    departmentLabel: string;
    employmentTypeLabel: string;
    experienceLevelLabel: string;
    keyPointsLabel: string;
    keyPointsPlaceholder: string;
    generateBtn: string;
    generating: string;
    generatedTitle: string;
    description: string;
    responsibilities: string;
    requirements: string;
    benefits: string;
    skills: string;
    copyBtn: string;
    copied: string;
    errorMsg: string;
    selectType: string;
    selectLevel: string;
  };
  employmentTypeLabels: Record<string, string>;
  experienceLevelLabels: Record<string, string>;
}

export function AiJdGeneratorClient({ labels, employmentTypeLabels, experienceLevelLabels }: AiJdGeneratorClientProps) {
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("full_time");
  const [experienceLevel, setExperienceLevel] = React.useState("mid");
  const [keyPoints, setKeyPoints] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<JobDraft | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const draft = await generateJobDescriptionAction({ title, department, employmentType, experienceLevel, keyPoints });
      setResult(draft);
    } catch {
      toast.error(labels.errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function copySection(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(labels.copied));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Input form */}
      <form onSubmit={handleGenerate} className="space-y-5">
        <div className="space-y-1.5">
          <Label>{labels.titleLabel} *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Senior Product Manager" />
        </div>
        <div className="space-y-1.5">
          <Label>{labels.departmentLabel}</Label>
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{labels.employmentTypeLabel}</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder={labels.selectType} />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{employmentTypeLabels[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{labels.experienceLevelLabel}</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger>
                <SelectValue placeholder={labels.selectLevel} />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{experienceLevelLabels[l] ?? l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{labels.keyPointsLabel}</Label>
          <Textarea
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
            placeholder={labels.keyPointsPlaceholder}
            className="min-h-[120px]"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {labels.generating}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> {labels.generateBtn}
            </>
          )}
        </Button>
      </form>

      {/* Generated output */}
      <div className="space-y-4">
        {!result && !loading && (
          <Card>
            <CardContent className="py-20 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Fill in the form and generate a job description.</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{labels.description}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copySection(result.description)}>{labels.copyBtn}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{result.description}</p>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{labels.responsibilities}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => copySection(result.responsibilities.map((r, i) => `${i + 1}. ${r}`).join("\n"))}>{labels.copyBtn}</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {result.responsibilities.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-muted-foreground/50">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{labels.requirements}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => copySection(result.requirements.join("\n"))}>{labels.copyBtn}</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {result.requirements.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-success">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{labels.benefits}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.benefits.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{labels.skills}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {result.required_skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setResult(null)}>
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
