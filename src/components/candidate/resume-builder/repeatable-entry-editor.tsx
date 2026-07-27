"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FieldSchema } from "@/lib/resume-builder/section-schemas";

type Entry = Record<string, unknown>;

/**
 * Generic add/edit/remove editor for every array-shaped factual section
 * (experience, education, certifications, languages, projects,
 * achievements) -- one schema-driven component instead of six near-
 * identical bespoke ones, since these sections only differ in which
 * fields they have.
 */
export function RepeatableEntryEditor({
  fields,
  entries,
  onChange,
}: {
  fields: FieldSchema[];
  entries: Entry[];
  onChange: (next: Entry[]) => void;
}) {
  const t = useTranslations("Candidate.SectionCard");
  const updateEntry = (index: number, key: string, value: unknown) => {
    const next = entries.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, {}]);
  };

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-end">
            <Button type="button" variant="ghost" size="icon" aria-label={t("removeEntryAriaLabel")} onClick={() => removeEntry(index)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const rawValue = entry[field.key];
              const inputId = `${field.key}-${index}`;

              if (field.type === "boolean") {
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <Switch
                      id={inputId}
                      checked={Boolean(rawValue)}
                      onCheckedChange={(checked) => updateEntry(index, field.key, checked)}
                    />
                    <Label htmlFor={inputId}>{field.label}</Label>
                  </div>
                );
              }

              const value = field.isCommaList
                ? (Array.isArray(rawValue) ? rawValue.join(", ") : (rawValue as string) ?? "")
                : ((rawValue as string) ?? "");

              const handleChange = (v: string) => {
                updateEntry(index, field.key, field.isCommaList ? v.split(",").map((s) => s.trim()).filter(Boolean) : v);
              };

              return (
                <div key={field.key} className={field.type === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                  <Label htmlFor={inputId}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea id={inputId} rows={3} placeholder={field.placeholder} value={value} onChange={(e) => handleChange(e.target.value)} />
                  ) : (
                    <Input
                      id={inputId}
                      type={field.type === "date" ? "date" : "text"}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => handleChange(e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
        <Plus className="h-4 w-4" /> {t("addEntry")}
      </Button>
    </div>
  );
}
