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
import { addEducation, deleteEducation } from "@/actions/profile";
import { formatDate } from "@/lib/utils";
import type { CandidateEducation } from "@/types/database";

export function EducationSection({ items }: { items: CandidateEducation[] }) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await addEducation(formData);
      if (result.success) {
        toast.success("Education added");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to add education");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Education</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add education</DialogTitle>
            </DialogHeader>
            <form action={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" name="institution" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="degree">Degree</Label>
                  <Input id="degree" name="degree" placeholder="Bachelor's" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy">Field of study</Label>
                  <Input id="fieldOfStudy" name="fieldOfStudy" placeholder="Computer Science" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" name="grade" placeholder="3.8 GPA" />
                </div>
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
        {items.length === 0 && <p className="text-sm text-muted-foreground">No education added yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between rounded-xl border border-border p-4">
            <div>
              <p className="font-medium">{item.institution}</p>
              <p className="text-sm text-muted-foreground">
                {[item.degree, item.field_of_study].filter(Boolean).join(", ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.start_date ? formatDate(item.start_date) : "?"} — {item.end_date ? formatDate(item.end_date) : "?"}
              </p>
            </div>
            <DeleteEducationButton id={item.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DeleteEducationButton({ id }: { id: string }) {
  const [isPending, startTransition] = React.useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      aria-label="Delete education entry"
      onClick={() =>
        startTransition(async () => {
          const result = await deleteEducation(id);
          if (!result.success) toast.error(result.error ?? "Failed to delete");
        })
      }
    >
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
