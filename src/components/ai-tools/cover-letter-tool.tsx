"use client";

import * as React from "react";
import { Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { generateCoverLetterAction } from "@/actions/ai-tools-guest";
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

export function CoverLetterTool() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<CoverLetterResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [resumeText, setResumeText] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [tone, setTone] = React.useState<CoverLetterTone>("professional");
  const [length, setLength] = React.useState<CoverLetterLength>("medium");

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateCoverLetterAction({
        resumeText,
        jobDescription,
        companyName,
        position,
        tone,
        length,
      });
      if (res.success && res.data) {
        setResult(res.data);
        window.scrollTo({ top: document.getElementById("result")?.offsetTop ?? 0, behavior: "smooth" });
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  };

  const fullText = result
    ? [
        result.greeting,
        "",
        result.openingParagraph,
        "",
        result.bodyParagraph1,
        "",
        result.bodyParagraph2,
        "",
        result.closingParagraph,
        "",
        result.signOff,
      ].join("\n")
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    toast.success("Copied to clipboard");
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <div id="result" className="space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Subject line</p>
            <p className="mt-0.5 font-medium">{result.subject}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Letter */}
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

        {/* Personalization tips */}
        {result.tips.length > 0 && (
          <Card className="border-pra-warning/30 bg-pra-warning/5">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm text-pra-warning">
                ✏️ Personalize before sending
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-1.5">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-pra-warning">
                    <span className="mt-0.5 shrink-0 text-xs font-bold">{i + 1}.</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Sign-up CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">Save & download your cover letter</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to save your letters, download as PDF or DOCX, and access all AI career tools with history.
              </p>
            </div>
            <Button variant="gradient" size="lg" asChild>
              <Link href="/register">Create free account</Link>
            </Button>
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
          <Label htmlFor="company">Company name *</Label>
          <Input
            id="company"
            placeholder="e.g. Google"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="position">Position applying for *</Label>
          <Input
            id="position"
            placeholder="e.g. Senior Product Designer"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Length</Label>
          <Select value={length} onValueChange={(v) => setLength(v as CoverLetterLength)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LENGTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resume">Your background / resume text *</Label>
        <p className="text-xs text-muted-foreground">
          Paste your resume content or a summary of your experience, skills, and achievements.
        </p>
        <Textarea
          id="resume"
          placeholder="Paste your resume or describe your background..."
          rows={6}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jd">Job description *</Label>
        <Textarea
          id="jd"
          placeholder="Paste the full job description here..."
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="resize-none"
        />
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={isPending || !resumeText.trim() || !jobDescription.trim() || !companyName.trim() || !position.trim()}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Writing your cover letter…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Cover Letter
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Free to use · No account required · Takes 10–20 seconds
      </p>
    </div>
  );
}
