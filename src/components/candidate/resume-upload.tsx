"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadResume } from "@/actions/resume";
import { cn } from "@/lib/utils";

export function ResumeUpload() {
  const t = useTranslations("Candidate.ResumeUpload");
  const tAtsChecker = useTranslations("AtsChecker");
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [dragging, setDragging] = React.useState(false);

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      toast.info(t("uploading"));
      const result = await uploadResume(formData);
      if (result.success) {
        toast.success(t("success"));
      } else {
        toast.error(result.error ?? t("failed"));
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
      <p className="mt-4 font-medium">{isPending ? t("processing") : t("dragDrop")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
      <Button
        variant="outline"
        className="mt-4"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {tAtsChecker("browseFiles")}
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
