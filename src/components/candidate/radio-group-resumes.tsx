"use client";

import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Resume } from "@/types/database";

export function RadioGroupResumes({
  resumes,
  value,
  onChange,
}: {
  resumes: Resume[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {resumes.map((resume) => (
        <button
          type="button"
          key={resume.id}
          onClick={() => onChange(resume.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
            value === resume.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
          )}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{resume.file_name}</span>
          {resume.is_primary && <span className="ml-auto shrink-0 text-xs text-primary">Primary</span>}
        </button>
      ))}
    </div>
  );
}
