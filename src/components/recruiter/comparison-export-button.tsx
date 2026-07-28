"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ComparisonExportButton({
  applicationIds,
  labels,
}: {
  applicationIds: string[];
  labels: { export: string; exporting: string; failed: string };
}) {
  const [isPending, startTransition] = React.useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/recruiter/comparison-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationIds }),
        });
        if (!res.ok) throw new Error("export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `comparison-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(labels.failed);
      }
    });
  };

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={handleExport}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isPending ? labels.exporting : labels.export}
    </Button>
  );
}
