"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionAiOperation } from "@/actions/studio";
import type { SectionAiOperation } from "@/types/database";

interface AiOp { key: SectionAiOperation; label: string; description: string }

const AI_OPS: AiOp[] = [
  { key: "generate", label: "Generate", description: "Create content from scratch" },
  { key: "rewrite", label: "Rewrite", description: "Completely rewrite for impact" },
  { key: "improve", label: "Improve", description: "Strengthen existing content" },
  { key: "expand", label: "Expand", description: "Add more detail and context" },
  { key: "shorten", label: "Shorten", description: "Make it more concise" },
  { key: "grammar", label: "Grammar", description: "Fix grammar and spelling" },
  { key: "ats_optimize", label: "ATS Optimize", description: "Optimize for applicant tracking" },
  { key: "keyword_match", label: "Keywords", description: "Match job description keywords" },
  { key: "professional_tone", label: "Pro Tone", description: "Executive-level language" },
  { key: "achievement_suggestions", label: "Achievements", description: "Suggest quantified wins" },
  { key: "action_verbs", label: "Action Verbs", description: "Start bullets with strong verbs" },
  { key: "industry_keywords", label: "Industry Keys", description: "Industry-specific keywords" },
];

interface Props {
  draftId: string;
  sectionId: string;
  sectionType: string;
  currentContentText: string;
  onResult: (op: SectionAiOperation, text: string) => void;
}

export function AiOperationsPanel({ draftId, sectionId, sectionType, currentContentText, onResult }: Props) {
  const [loading, setLoading] = React.useState<SectionAiOperation | null>(null);
  const [resultOp, setResultOp] = React.useState<SectionAiOperation | null>(null);
  const [resultText, setResultText] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  const handleOp = async (op: SectionAiOperation) => {
    setLoading(op);
    setResultOp(null);
    setResultText("");
    setSuggestions([]);

    const res = await sectionAiOperation(draftId, sectionId, sectionType, op, currentContentText);
    setLoading(null);

    if (!res.success) {
      toast.error(res.error ?? "AI operation failed");
      return;
    }

    setResultOp(op);
    setResultText(res.text ?? "");
    setSuggestions(res.suggestions ?? []);
  };

  const handleApply = () => {
    if (resultOp && resultText) {
      onResult(resultOp, resultText);
      setResultOp(null);
      setResultText("");
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30 p-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {AI_OPS.map((op) => (
          <button
            key={op.key}
            title={op.description}
            disabled={loading !== null}
            onClick={() => handleOp(op.key)}
            className="rounded-full border border-violet-300 bg-white px-2.5 py-0.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-800"
          >
            {loading === op.key ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{op.label}</span>
            ) : op.label}
          </button>
        ))}
      </div>

      {resultText && (
        <div className="space-y-2">
          <div className="rounded-md border bg-background p-2.5 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-auto">
            {resultText}
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</div>
              {suggestions.slice(0, 8).map((s, i) => (
                <div key={i} className="text-xs text-muted-foreground leading-relaxed">• {s}</div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleApply}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResultOp(null); setResultText(""); }}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
