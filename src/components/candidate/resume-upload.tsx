"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadResume } from "@/actions/resume";
import { cn } from "@/lib/utils";

export function ResumeUpload() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [dragging, setDragging] = React.useState(false);

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      toast.info("Uploading resume and running AI analysis — this can take up to a minute…");
      const result = await uploadResume(formData);
      if (result.success) {
        toast.success("Resume processed! Your profile and ATS score are ready.");
      } else {
        toast.error(result.error ?? "Failed to upload resume.");
      }
      router.refresh();
    });
  };

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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {isPending ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
      )}
      <p className="mt-4 font-medium">{isPending ? "Processing your resume…" : "Drag & drop your resume here"}</p>
      <p className="mt-1 text-sm text-muted-foreground">PDF or Word, up to 10MB</p>
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
