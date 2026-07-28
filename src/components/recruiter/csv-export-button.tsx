"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))];
  return lines.join("\n");
}

/** No chart-image-export library exists in this project (recharts has no
 * native PNG/SVG export) -- exporting the underlying dataset as CSV is a
 * zero-dependency way to get the same data out of the app, reused across
 * every "Export" affordance in Hiring Analytics (Phase 6) and Bulk Actions
 * (Phase 7). */
export function CsvExportButton({
  rows,
  filename,
  label,
}: {
  rows: Record<string, string | number>[];
  filename: string;
  label: string;
}) {
  const handleExport = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={!rows.length}>
      <Download className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
