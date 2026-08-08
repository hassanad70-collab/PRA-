"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LS_KEY_LAST_WORKSPACE } from "@/components/shared/dashboard-shell";
import { formatRelativeTime } from "@/lib/utils";

interface LastWorkspace {
  href: string;
  label: string;
  updatedAt: string;
}

export function ContinueWidget() {
  const [last, setLast] = React.useState<LastWorkspace | null>(null);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY_LAST_WORKSPACE);
      if (v) setLast(JSON.parse(v) as LastWorkspace);
    } catch { /* ignore */ }
  }, []);

  if (!last) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Continue where you left off
            </p>
            <p className="mt-0.5 text-sm font-medium">{last.label}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(last.updatedAt)}</p>
          </div>
        </div>
        <Link
          href={last.href}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue
        </Link>
      </CardContent>
    </Card>
  );
}
