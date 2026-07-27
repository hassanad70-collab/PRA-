"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSkill, deleteSkill } from "@/actions/profile";
import type { CandidateSkill } from "@/types/database";

export function SkillsSection({ items }: { items: CandidateSkill[] }) {
  const t = useTranslations("Candidate.Skills");
  const tShared = useTranslations("Candidate.Shared");
  const [value, setValue] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const submit = () => {
    if (!value.trim()) return;
    const formData = new FormData();
    formData.set("skillName", value.trim());
    formData.set("proficiency", "intermediate");

    startTransition(async () => {
      const result = await addSkill(formData);
      if (result.success) setValue("");
      else toast.error(result.error ?? t("toastAddFailed"));
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{tShared("skills")}</h3>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("placeholder")}
        />
        <Button variant="outline" onClick={submit} disabled={isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {items.map((skill) => (
          <Badge key={skill.id} variant="secondary" className="gap-1.5 py-1.5 ps-3 pe-1.5">
            {skill.is_ai_extracted && <Sparkles className="h-3 w-3 text-primary" />}
            {skill.skill_name}
            <button
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteSkill(skill.id);
                  if (!result.success) toast.error(result.error ?? t("toastRemoveFailed"));
                })
              }
              className="rounded-full p-0.5 hover:bg-background/50"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
