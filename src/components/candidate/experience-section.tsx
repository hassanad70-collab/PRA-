"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addExperience, deleteExperience } from "@/actions/profile";
import { formatDate } from "@/lib/utils";
import type { CandidateExperience } from "@/types/database";

export function ExperienceSection({ items }: { items: CandidateExperience[] }) {
  const [open, setOpen] = React.useState(false);
  const [isCurrent, setIsCurrent] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("isCurrent", isCurrent ? "true" : "false");
    startTransition(async () => {
      const result = await addExperience(formData);
      if (result.success) {
        toast.success("Experience added");
        setOpen(false);
        setIsCurrent(false);
      } else {
        toast.error(result.error ?? "Failed to add experience");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Work experience</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add work experience</DialogTitle>
            </DialogHeader>
            <form action={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input id="jobTitle" name="jobTitle" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" disabled={isCurrent} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isCurrent} onCheckedChange={setIsCurrent} id="isCurrent" />
                <Label htmlFor="isCurrent">I currently work here</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="gradient" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No experience added yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between rounded-xl border border-border p-4">
            <div>
              <p className="font-medium">{item.job_title}</p>
              <p className="text-sm text-muted-foreground">
                {item.company_name} {item.location ? `· ${item.location}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.start_date ? formatDate(item.start_date) : "?"} —{" "}
                {item.is_current ? "Present" : item.end_date ? formatDate(item.end_date) : "?"}
              </p>
              {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
            </div>
            <DeleteButton onDelete={() => deleteExperience(item.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<{ success: boolean; error?: string }> }) {
  const [isPending, startTransition] = React.useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      aria-label="Delete experience entry"
      onClick={() =>
        startTransition(async () => {
          const result = await onDelete();
          if (!result.success) toast.error(result.error ?? "Failed to delete");
        })
      }
    >
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
