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
        <CardTitle className="text-base">AI provider diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Makes one real, minimal call from this exact running server right now and reports the result — not a cached
          or historical value. Read-only; no configuration changes are made.
        </p>
        <Button type="button" variant="outline" disabled={isPending} onClick={handleRun}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Run Live Diagnostic
        </Button>

        {result && !result.success && <p className="text-sm text-destructive">{result.error}</p>}

        {result && result.success && (
          <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <Row label="Provider" value={result.provider ?? "—"} />
            <Row label="Endpoint" value={result.baseUrl ?? "—"} />
            <Row label="Model" value={result.model ?? "—"} />
            <Row
              label="Authentication status"
              value={
                result.authStatus === "authenticated"
                  ? "Authenticated"
                  : result.authStatus === "failed"
                    ? `Failed (${result.errorReason ?? "unknown"})`
                    : "Unknown"
              }
              ok={
                result.authStatus === "authenticated" ? true : result.authStatus === "failed" ? false : undefined
              }
            />
            <Row label="API key present" value={result.keyPresent ? "Yes" : "No"} ok={result.keyPresent} />
            <Row
              label="Key length"
              value={result.keyLength !== undefined ? String(result.keyLength) : "—"}
              ok={(result.keyLength ?? 0) > 0}
            />
            {result.keyPrefix && <Row label="Key prefix (safe)" value={result.keyPrefix} />}
            <Row label="Live call" value={result.callSucceeded ? "Succeeded" : "Failed"} ok={result.callSucceeded} />
            {result.responseLatencyMs !== undefined && (
              <Row
                label="Response latency"
                value={`${result.responseLatencyMs} ms`}
                ok={result.responseLatencyMs < 10_000}
              />
            )}
            {result.lastSuccessfulAt && (
              <Row
                label="Last successful request"
                value={new Date(result.lastSuccessfulAt).toLocaleString()}
                ok={true}
              />
            )}
            {result.callSucceeded && result.responseText && (
              <Row label="Response" value={result.responseText} />
            )}
            {!result.callSucceeded && result.errorDiagnostic && (
              <Row label="Error detail" value={result.errorDiagnostic} ok={false} />
            )}
            <Row label="Environment" value={result.environment ?? "—"} />
            <Row
              label="SDK version"
              value={result.sdkVersion && result.sdkVersion !== "unknown" ? `openai@${result.sdkVersion}` : "—"}
            />
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
        {ok === true && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />}
        {ok === false && <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
        {value}
      </span>
    </div>
  );
}
