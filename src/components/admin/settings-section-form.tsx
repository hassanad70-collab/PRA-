"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSystemSetting } from "@/actions/admin-settings";
import type { SystemSettingKey } from "@/types/database";

export interface SettingField {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "boolean";
  step?: string;
}

export function SettingsSectionForm({
  settingKey,
  fields,
  value,
}: {
  settingKey: SystemSettingKey;
  fields: SettingField[];
  value: Record<string, unknown>;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, unknown>>(value);
  const [isPending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSystemSetting(settingKey, values);
      if (result.success) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save settings");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          {field.type === "boolean" ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Switch
                id={field.name}
                checked={Boolean(values[field.name])}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, [field.name]: checked }))}
              />
            </div>
          ) : (
            <>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type}
                step={field.step}
                value={values[field.name] === undefined || values[field.name] === null ? "" : String(values[field.name])}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                  }))
                }
              />
            </>
          )}
        </div>
      ))}
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
