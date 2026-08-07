"use client";

import * as React from "react";
import { Check, Copy, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateLinkedInOptimizationAction, deleteLinkedInSuggestionAction } from "@/actions/workspace";
import type { AiLinkedInSuggestion } from "@/types/database";

const TARGET_TYPE_LABELS = {
  about: "About Section",
  headline: "Professional Headline",
  experience: "Experience Bullet",
  skills_summary: "Skills Summary",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function ResultCard({ suggestion }: { suggestion: AiLinkedInSuggestion }) {
  const r = suggestion.result_json;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Optimized Version
          </p>
          <CopyButton text={r.improved} />
        </div>
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.improved}</p>
        </div>
      </div>

      {r.changes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            What Changed
          </p>
          <ul className="space-y-1">
            {r.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                  {i + 1}
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.keywords.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Keywords Added / Reinforced
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-[11px]">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  initialSuggestions: AiLinkedInSuggestion[];
}

export function LinkedInOptimizerClient({ initialSuggestions }: Props) {
  const [suggestions, setSuggestions] = React.useState(initialSuggestions);
  const [targetType, setTargetType] = React.useState<AiLinkedInSuggestion["target_type"]>("about");
  const [originalText, setOriginalText] = React.useState("");
  const [targetRole, setTargetRole] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [latest, setLatest] = React.useState<AiLinkedInSuggestion | null>(suggestions[0] ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!originalText.trim()) return;
    setLoading(true);
    const result = await generateLinkedInOptimizationAction({
      targetType,
      originalText: originalText.trim(),
      targetRole: targetRole.trim() || undefined,
    });
    setLoading(false);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Optimization failed");
      return;
    }
    setLatest(result.data);
    setSuggestions((prev) => [result.data!, ...prev]);
    toast.success("Optimization ready");
  }

  async function handleDelete(id: string) {
    await deleteLinkedInSuggestionAction(id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    if (latest?.id === id) setLatest(suggestions.find((s) => s.id !== id) ?? null);
  }

  return (
    <div className="space-y-8">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Optimize LinkedIn Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="li-type">Section to Optimize</Label>
                <Select
                  value={targetType}
                  onValueChange={(v) => setTargetType(v as AiLinkedInSuggestion["target_type"])}
                >
                  <SelectTrigger id="li-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TARGET_TYPE_LABELS) as [AiLinkedInSuggestion["target_type"], string][]).map(
                      ([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-role">Target Role (optional)</Label>
                <Input
                  id="li-role"
                  placeholder="e.g. Product Manager"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="li-text">Paste Your LinkedIn Text *</Label>
              <Textarea
                id="li-text"
                placeholder="Paste the text you want to optimize..."
                rows={5}
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !originalText.trim()}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing…</>
              ) : (
                "Optimize"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Latest result */}
      {latest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {TARGET_TYPE_LABELS[latest.target_type]}
              {latest.target_role && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  targeting {latest.target_role}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultCard suggestion={latest} />
          </CardContent>
        </Card>
      )}

      {/* History */}
      {suggestions.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Previous Optimizations
          </h3>
          <div className="space-y-2">
            {suggestions.slice(1).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {TARGET_TYPE_LABELS[s.target_type]}
                    {s.target_role && (
                      <span className="ml-2 text-xs text-muted-foreground">— {s.target_role}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(s.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setLatest(s)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !latest && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Share2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Paste any LinkedIn section above to get an AI-optimized version with keyword suggestions.
          </p>
        </div>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        LinkedIn text is processed by AI and never shared with LinkedIn or third parties. No scraping occurs — paste-in only.
      </p>
    </div>
  );
}
