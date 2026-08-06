"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { analyzeJobDescriptionAction } from "@/actions/studio";

interface JdAnalysis {
  skills: string[];
  keywords: string[];
  responsibilities: string[];
  technologies: string[];
  summary: string;
}

interface Props {
  draftId: string;
  value: string;
  onChange: (jd: string) => void;
}

export function JobDescriptionSection({ draftId, value, onChange }: Props) {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<JdAnalysis | null>(null);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => { setLocalValue(value); }, [value]);

  const handleBlur = () => {
    if (localValue !== value) onChange(localValue);
  };

  const handleAnalyze = async () => {
    if (!localValue.trim()) { toast.error("Paste a job description first"); return; }
    if (localValue !== value) onChange(localValue);

    setAnalyzing(true);
    const res = await analyzeJobDescriptionAction(draftId, localValue);
    setAnalyzing(false);

    if (!res.success) { toast.error(res.error ?? "Analysis failed"); return; }
    setAnalysis({
      skills: res.skills ?? [],
      keywords: res.keywords ?? [],
      responsibilities: res.responsibilities ?? [],
      technologies: res.technologies ?? [],
      summary: res.summary ?? "",
    });
  };

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Description</span>
        {analysis && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAnalysis(null)}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Textarea
        rows={6}
        placeholder="Paste the job description here to get targeted AI suggestions for your resume…"
        className="text-xs resize-none"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
      />

      <Button
        size="sm"
        variant="outline"
        className="w-full h-7 text-xs gap-1.5"
        onClick={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-violet-500" />}
        {analyzing ? "Analyzing…" : "AI Analyze"}
      </Button>

      {analysis && (
        <div className="space-y-2 text-xs">
          {analysis.summary && (
            <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
          )}
          {analysis.skills.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Required Skills</div>
              <div className="flex flex-wrap gap-1">
                {analysis.skills.map((s) => <Badge key={s} variant="outline" className="text-[10px] h-4 px-1.5">{s}</Badge>)}
              </div>
            </div>
          )}
          {analysis.technologies.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Technologies</div>
              <div className="flex flex-wrap gap-1">
                {analysis.technologies.map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">{t}</Badge>)}
              </div>
            </div>
          )}
          {analysis.keywords.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">ATS Keywords</div>
              <div className="flex flex-wrap gap-1">
                {analysis.keywords.map((k) => <Badge key={k} className="text-[10px] h-4 px-1.5 bg-violet-100 text-violet-700 border-0 dark:bg-violet-900 dark:text-violet-300">{k}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
