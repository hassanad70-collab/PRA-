"use client";

import * as React from "react";
import { DollarSign, Loader2, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { generateSalaryInsightsAction, deleteSalaryEstimateAction } from "@/actions/workspace";
import type { AiSalaryEstimate } from "@/types/database";

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EstimateResult({ estimate }: { estimate: AiSalaryEstimate }) {
  const r = estimate.result;
  const range = r.max - r.min;
  const medPct = range > 0 ? ((r.median - r.min) / range) * 100 : 50;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Estimated Range — {estimate.target_role}
            {estimate.location ? `, ${estimate.location}` : ""}
          </p>
          <div className="flex items-end justify-between gap-2 mb-1">
            <span className="text-sm text-muted-foreground">{fmt(r.min, r.currency)}</span>
            <span className="text-xl font-bold text-primary">{fmt(r.median, r.currency)}</span>
            <span className="text-sm text-muted-foreground">{fmt(r.max, r.currency)}</span>
          </div>
          {/* Salary bar */}
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-primary to-blue-200 opacity-30 rounded-full" />
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-primary shadow"
              style={{ left: `calc(${medPct}% - 2px)` }}
              aria-label={`Median: ${fmt(r.median, r.currency)}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Min</span>
            <span>Median</span>
            <span>Max</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed">{r.context}</p>

        {r.market_notes.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Key factors</p>
            <ul className="space-y-1">
              {r.market_notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground border-t pt-3 italic">{r.disclaimer}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  initialEstimates: AiSalaryEstimate[];
  latestTargetRole?: string | null;
}

export function SalaryInsightsClient({ initialEstimates, latestTargetRole }: Props) {
  const [estimates, setEstimates] = React.useState(initialEstimates);
  const [targetRole, setTargetRole] = React.useState(latestTargetRole ?? "");
  const [location, setLocation] = React.useState("");
  const [yearsExp, setYearsExp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [latest, setLatest] = React.useState<AiSalaryEstimate | null>(estimates[0] ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetRole.trim()) return;
    setLoading(true);
    const result = await generateSalaryInsightsAction({
      targetRole: targetRole.trim(),
      location: location.trim() || undefined,
      yearsExperience: yearsExp ? parseInt(yearsExp, 10) : undefined,
    });
    setLoading(false);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Generation failed");
      return;
    }
    setLatest(result.data);
    setEstimates((prev) => [result.data!, ...prev]);
    toast.success("Salary estimate ready");
  }

  async function handleDelete(id: string) {
    await deleteSalaryEstimateAction(id);
    setEstimates((prev) => prev.filter((e) => e.id !== id));
    if (latest?.id === id) setLatest(estimates.find((e) => e.id !== id) ?? null);
  }

  return (
    <div className="space-y-8">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Get Salary Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="target-role">Target Role *</Label>
              <Input
                id="target-role"
                placeholder="e.g. Senior Software Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="years-exp">Years of Experience</Label>
              <Input
                id="years-exp"
                type="number"
                min={0}
                max={50}
                placeholder="e.g. 5"
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !targetRole.trim()} className="w-full">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Estimating…</> : "Get Estimate"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Latest result */}
      {latest && <EstimateResult estimate={latest} />}

      {/* History */}
      {estimates.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Previous Estimates
          </h3>
          <div className="space-y-2">
            {estimates.slice(1).map((est) => (
              <div
                key={est.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{est.target_role}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(est.result.min, est.result.currency)} – {fmt(est.result.max, est.result.currency)}
                    {est.location ? ` · ${est.location}` : ""}
                    {" · "}{timeAgo(est.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setLatest(est)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(est.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {estimates.length === 0 && !latest && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Enter a target role above to get an AI-estimated salary range.
          </p>
        </div>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Estimates are AI-generated based on general knowledge and do not reflect real-time market data or specific employer compensation data.
      </p>
    </div>
  );
}
