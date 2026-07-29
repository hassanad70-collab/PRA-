"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { diagnoseOpenAIIntegration, type OpenAIDiagnosticsResult } from "@/actions/admin-diagnostics";

export function OpenAIDiagnosticsPanel() {
  const [result, setResult] = useState<OpenAIDiagnosticsResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRun = () => {
    startTransition(async () => {
      const r = await diagnoseOpenAIIntegration();
      setResult(r);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">OpenAI integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Makes one real, minimal OpenAI call from this exact running server right now and reports the actual
          result -- not a cached or historical value.
        </p>
        <Button type="button" variant="outline" disabled={isPending} onClick={handleRun}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Run diagnostic
        </Button>

        {result && !result.success && <p className="text-sm text-destructive">{result.error}</p>}

        {result && result.success && (
          <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <Row label="OPENAI_API_KEY present" value={result.keyPresent ? "Yes" : "No"} ok={result.keyPresent} />
            <Row label="OPENAI_API_KEY length" value={String(result.keyLength ?? 0)} ok={(result.keyLength ?? 0) > 0} />
            <Row label="Live call succeeded" value={result.callSucceeded ? "Yes" : "No"} ok={result.callSucceeded} />
            {result.callSucceeded ? (
              <>
                <Row label="Model" value={result.modelUsed ?? "—"} />
                <Row label="Response text" value={result.responseText ?? "—"} />
              </>
            ) : (
              <>
                <Row label="Classified reason" value={result.errorReason ?? "—"} ok={false} />
                {result.errorDiagnostic && <Row label="Diagnostic detail" value={result.errorDiagnostic} ok={false} />}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-end font-medium">
        {ok !== undefined && (ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />)}
        {value}
      </span>
    </div>
  );
}
