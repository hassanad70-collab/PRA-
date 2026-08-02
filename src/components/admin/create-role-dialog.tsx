"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createRole } from "@/actions/admin-rbac";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  { hex: "#ef4444", label: "Red"    },
  { hex: "#f97316", label: "Orange" },
  { hex: "#f59e0b", label: "Amber"  },
  { hex: "#10b981", label: "Green"  },
  { hex: "#06b6d4", label: "Cyan"   },
  { hex: "#3b82f6", label: "Blue"   },
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Pink"   },
  { hex: "#64748b", label: "Slate"  },
];

const PRESET_ICONS = [
  "Shield", "ShieldCheck", "ShieldAlert",
  "Building2", "UserCog", "Users", "Briefcase",
  "MessageSquare", "Network", "GraduationCap",
  "Award", "Star", "Settings", "Globe", "Lock", "Key",
  "Zap", "Target", "Eye", "ClipboardList",
];

export function CreateRoleDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [color, setColor] = React.useState("#6366f1");
  const [icon, setIcon] = React.useState("Shield");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    fd.set("icon", icon);

    startTransition(async () => {
      const result = await createRole(fd);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create role.");
        return;
      }
      toast.success("Role created.");
      setOpen(false);
      if (result.roleId) router.push(`/admin/roles/${result.roleId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <Plus className="h-4 w-4" />
          New Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Define a new platform role. Assign permissions after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-name">Role name (slug)</Label>
            <Input
              id="cr-name"
              name="name"
              placeholder="e.g. finance_manager"
              required
              pattern="[a-z][a-z0-9_]*"
              title="Lowercase letters, numbers, underscores"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, no spaces. Used as the internal identifier.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-display">Display name</Label>
            <Input
              id="cr-display"
              name="displayName"
              placeholder="e.g. Finance Manager"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-desc">Description</Label>
            <Input
              id="cr-desc"
              name="description"
              placeholder="What does this role do?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: color === c.hex ? "white" : "transparent",
                    outline: color === c.hex ? `2px solid ${c.hex}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={[
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    icon === ic
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground",
                  ].join(" ")}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
