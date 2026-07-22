"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, Loader2, Sparkles, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkResumeAsGuest, trackGuestCtaClick } from "@/actions/guest-tools";
import { GuestAtsResults } from "@/components/guest/guest-ats-results";
import { cn } from "@/lib/utils";
import type { AtsScoreResult } from "@/lib/ai/ats-scorer";

export function GuestAtsChecker() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [dragging, setDragging] = React.useState(false);
  const [result, setResult] = React.useState<AtsScoreResult | null>(null);
  const [blockedMessage, setBlockedMessage] = React.useState<string | null>(null);

  const handleFile = (file: File) => {
    setBlockedMessage(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const response = await checkResumeAsGuest(formData);
      if (response.success && response.result) {
        setResult(response.result);
      } else if (response.blocked) {
        setBlockedMessage(response.error ?? "You've used your free scan.");
      } else {
        toast.error(response.error ?? "Failed to analyze resume.");
      }
    });
  };

  if (result) {
    return (
      <div className="space-y-6">
        <GuestAtsResults result={result} />
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">Create a free account to save this analysis</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlock unlimited ATS scans, AI resume improvement, job matching, and more.
              </p>
            </div>
            <Button variant="gradient" size="lg" asChild onClick={() => trackGuestCtaClick()}>
              <Link href="/register">Create your free account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-warning" />
          <div>
            <p className="text-lg font-semibold">Free scan used</p>
            <p className="mt-1 text-sm text-muted-foreground">{blockedMessage}</p>
          </div>
          <Button variant="gradient" size="lg" asChild onClick={() => trackGuestCtaClick()}>
            <Link href="/register">Create your free account</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {isPending ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
      )}
      <p className="mt-4 font-medium">{isPending ? "Analyzing your resume…" : "Drag & drop your resume here"}</p>
      <p className="mt-1 text-sm text-muted-foreground">PDF or Word, up to 10MB · No account required</p>
      <Button
        variant="outline"
        className="mt-4"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
