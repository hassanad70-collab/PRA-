"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCareerGoalAction, updateCareerGoalAction } from "@/actions/career-coach";
import type { CareerGoal } from "@/types/career-coach";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog is in edit mode; otherwise create mode. */
  existing?: CareerGoal;
  onSuccess: () => void;
}

interface FormState {
  title: string;
  target_role: string;
  current_role: string;
  target_date: string;
  notes: string;
}

function emptyForm(goal?: CareerGoal): FormState {
  return {
    title: goal?.title ?? "",
    target_role: goal?.target_role ?? "",
    current_role: goal?.current_role ?? "",
    target_date: goal?.target_date?.split("T")[0] ?? "",
    notes: goal?.notes ?? "",
  };
}

export function GoalDialog({ open, onOpenChange, existing, onSuccess }: GoalDialogProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(existing));
  const [isPending, startTransition] = useTransition();

  const isEdit = !!existing;
  const heading = isEdit ? "Edit Career Goal" : "Define Your Career Goal";

  // Reset form when the dialog opens. We can't rely on onOpenChange(true) being
  // called when the parent controls `open` externally (Radix only fires it for
  // internal dismiss events), so a useEffect is required.
  useEffect(() => {
    if (open) setForm(emptyForm(existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.target_role.trim()) {
      toast.error("Goal title and target role are required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      target_role: form.target_role.trim(),
      current_role: form.current_role.trim() || null,
      target_date: form.target_date || null,
      notes: form.notes.trim() || null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateCareerGoalAction(existing!.id, payload)
        : await createCareerGoalAction(payload);

      if (result.success) {
        toast.success(isEdit ? "Goal updated." : "Career goal created!");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="goal-dialog">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="coach-title">Goal title <span className="text-destructive">*</span></Label>
            <Input
              id="coach-title"
              data-testid="goal-title-input"
              placeholder="e.g. Transition to Senior Product Manager"
              value={form.title}
              onChange={set("title")}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coach-target">Target role <span className="text-destructive">*</span></Label>
            <Input
              id="coach-target"
              data-testid="goal-target-input"
              placeholder="e.g. Senior Product Manager"
              value={form.target_role}
              onChange={set("target_role")}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coach-current">Current role <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="coach-current"
              data-testid="goal-current-input"
              placeholder="e.g. Product Manager"
              value={form.current_role}
              onChange={set("current_role")}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coach-date">Target date <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="coach-date"
              data-testid="goal-date-input"
              type="date"
              value={form.target_date}
              onChange={set("target_date")}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coach-notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="coach-notes"
              data-testid="goal-notes-input"
              placeholder="Any context about your goal..."
              value={form.notes}
              onChange={set("notes")}
              disabled={isPending}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="goal-save-button">
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Save Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
