"use client";

import * as React from "react";
import { ExternalLink, Globe, Loader2, PenLine, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  savePortfolioItemAction,
  deletePortfolioItemAction,
  generatePortfolioDescriptionAction,
  updatePortfolioVisibilityAction,
} from "@/actions/workspace";
import type { PortfolioItem } from "@/types/database";

const TYPE_LABELS: Record<PortfolioItem["type"], string> = {
  project: "Project",
  publication: "Publication",
  design: "Design",
  other: "Other",
};

const TYPE_COLORS: Record<PortfolioItem["type"], string> = {
  project: "bg-pra-surface-subtle text-pra-primary",
  publication: "bg-pra-cyan/10 text-pra-cyan",
  design: "bg-pra-success/10 text-pra-success",
  other: "bg-muted text-muted-foreground",
};

function emptyItem(): Partial<PortfolioItem> {
  return { title: "", description: "", link_url: "", type: "project", technologies: [], display_order: 0 };
}

interface PortfolioFormProps {
  initial?: Partial<PortfolioItem>;
  onSave: (item: PortfolioItem) => void;
  onCancel: () => void;
}

function PortfolioForm({ initial, onSave, onCancel }: PortfolioFormProps) {
  const [form, setForm] = React.useState<Partial<PortfolioItem>>(initial ?? emptyItem());
  const [techInput, setTechInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  function addTech() {
    const t = techInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, technologies: [...(f.technologies ?? []), t] }));
    setTechInput("");
  }

  function removeTech(idx: number) {
    setForm((f) => ({ ...f, technologies: (f.technologies ?? []).filter((_, i) => i !== idx) }));
  }

  async function handleGenerateDescription() {
    if (!form.title?.trim()) { toast.error("Add a title first"); return; }
    setGenerating(true);
    const result = await generatePortfolioDescriptionAction(
      form.title,
      form.technologies ?? [],
      form.type ?? "project"
    );
    setGenerating(false);
    if (result.success && result.data) {
      setForm((f) => ({ ...f, description: result.data }));
    } else {
      toast.error("AI generation failed");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setSaving(true);
    const result = await savePortfolioItemAction({
      id: form.id,
      title: form.title!,
      description: form.description ?? null,
      link_url: form.link_url ?? null,
      file_url: form.file_url ?? null,
      thumbnail_url: form.thumbnail_url ?? null,
      type: form.type ?? "project",
      technologies: form.technologies ?? [],
      display_order: form.display_order ?? 0,
    });
    setSaving(false);
    if (result.success && result.data) {
      onSave(result.data);
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pi-title">Title *</Label>
          <Input
            id="pi-title"
            placeholder="My Project"
            value={form.title ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pi-type">Type</Label>
          <Select
            value={form.type ?? "project"}
            onValueChange={(v) => setForm((f) => ({ ...f, type: v as PortfolioItem["type"] }))}
          >
            <SelectTrigger id="pi-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as PortfolioItem["type"][]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="pi-desc">Description</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs text-primary"
            onClick={handleGenerateDescription}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Write
          </Button>
        </div>
        <Textarea
          id="pi-desc"
          placeholder="Describe what you built, your role, and the impact..."
          rows={3}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pi-link">URL / Link</Label>
        <Input
          id="pi-link"
          type="url"
          placeholder="https://..."
          value={form.link_url ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Technologies</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add technology..."
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addTech}>Add</Button>
        </div>
        {(form.technologies ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(form.technologies ?? []).map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {t}
                <button type="button" onClick={() => removeTech(i)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || !form.title?.trim()}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Item"}
        </Button>
      </div>
    </form>
  );
}

interface Props {
  initialItems: PortfolioItem[];
  initialIsPublic: boolean;
  initialSlug: string | null;
}

export function PortfolioManager({ initialItems, initialIsPublic, initialSlug }: Props) {
  const [items, setItems] = React.useState(initialItems);
  const [isPublic, setIsPublic] = React.useState(initialIsPublic);
  const [slug, setSlug] = React.useState(initialSlug);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [togglingPublic, setTogglingPublic] = React.useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function handleTogglePublic(value: boolean) {
    setTogglingPublic(true);
    const result = await updatePortfolioVisibilityAction(value);
    setTogglingPublic(false);
    if (result.success) {
      setIsPublic(value);
      if (result.data?.slug) setSlug(result.data.slug);
      toast.success(value ? "Portfolio is now public" : "Portfolio hidden");
    } else {
      toast.error(result.error ?? "Update failed");
    }
  }

  async function handleDelete(id: string) {
    const result = await deletePortfolioItemAction(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(result.error ?? "Delete failed");
    }
  }

  function handleSaved(item: PortfolioItem) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    setEditing(null);
    toast.success("Portfolio item saved");
  }

  return (
    <div className="space-y-6">
      {/* Public toggle */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-sm">Public Portfolio</p>
            <p className="text-xs text-muted-foreground">
              Enable to get a shareable link recruiters can view.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPublic && slug && (
              <a
                href={`${origin}/en/portfolio/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Globe className="h-3 w-3" />
                View public page
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={togglingPublic}
            />
          </div>
        </CardContent>
        {isPublic && slug && (
          <div className="border-t px-6 py-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                {origin}/en/portfolio/{slug}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(`${origin}/en/portfolio/${slug}`);
                  toast.success("Link copied");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add item */}
      {editing === "new" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Portfolio Item</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioForm onSave={handleSaved} onCancel={() => setEditing(null)} />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setEditing("new")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      )}

      {/* Items list */}
      {items.length === 0 && editing !== "new" && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No portfolio items yet. Add your first project, publication, or design.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className={editing === item.id ? "ring-1 ring-primary/40" : ""}>
            {editing === item.id ? (
              <>
                <CardHeader>
                  <CardTitle className="text-base">Edit Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <PortfolioForm
                    initial={item}
                    onSave={handleSaved}
                    onCancel={() => setEditing(null)}
                  />
                </CardContent>
              </>
            ) : (
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[item.type]}`}>
                        {TYPE_LABELS[item.type]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                    )}
                    {item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.technologies.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {item.link_url && (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {item.link_url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditing(item.id)}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
