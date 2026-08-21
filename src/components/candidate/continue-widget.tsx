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
    <Card className="relative overflow-hidden border-pra-primary/25 bg-gradient-to-r from-pra-primary/6 to-transparent">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-pra-primary to-pra-cyan" aria-hidden />
      <CardContent className="flex items-center justify-between gap-4 py-4 pl-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pra-primary/10">
            <Clock className="h-4 w-4 text-pra-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pra-primary">
              Continue where you left off
            </p>
            <p className="mt-0.5 text-sm font-medium">{last.label}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(last.updatedAt)}</p>
          </div>
        </div>
        <Link
          href={last.href}
          className="shrink-0 rounded-lg bg-pra-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pra-primary-hover"
        >
          Continue
        </Link>
      </CardContent>
    </Card>
  );
}
