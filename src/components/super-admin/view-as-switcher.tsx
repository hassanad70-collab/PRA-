"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ViewAs = "admin" | "candidate" | "recruiter" | "employer";

const COOKIE_NAME = "pra-view-as";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const OPTIONS: {
  value: ViewAs;
  label: string;
  home: (locale: string) => string;
  disabled?: boolean;
}[] = [
  { value: "admin",     label: "Admin",     home: () => "/admin" },
  { value: "candidate", label: "Candidate", home: (l) => `/${l}/candidate/dashboard` },
  { value: "recruiter", label: "Recruiter", home: (l) => `/${l}/recruiter/dashboard` },
  { value: "employer",  label: "Employer",  home: (l) => `/${l}/employer/dashboard`, disabled: true },
];

function readCookie(): ViewAs {
  if (typeof document === "undefined") return "admin";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const val = match?.[1];
  return val === "candidate" || val === "recruiter" || val === "employer" ? val : "admin";
}

function writeCookie(val: ViewAs) {
  if (val === "admin") {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=${val}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function ViewAsSwitcher({ locale }: { locale: string }) {
  const [viewAs, setViewAs] = useState<ViewAs>("admin");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setViewAs(readCookie());
    setMounted(true);
  }, []);

  const current = OPTIONS.find((o) => o.value === viewAs) ?? OPTIONS[0];
  const isImpersonating = viewAs !== "admin";

  const handleSwitch = (opt: (typeof OPTIONS)[number]) => {
    if (opt.disabled) return;
    writeCookie(opt.value);
    // Hard navigation required: admin and candidate/recruiter live in different
    // Next.js layout trees, so router.push() doesn't complete the transition.
    window.location.href = opt.home(locale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-medium",
            isImpersonating
              ? "border-pra-warning/60 bg-pra-warning/10 text-pra-warning hover:bg-pra-warning/15"
              : "border-dashed"
          )}
          suppressHydrationWarning
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          {mounted ? (
            <span>
              {isImpersonating ? `Viewing as ${current.label}` : "View as…"}
            </span>
          ) : (
            <span>View as…</span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          View as
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.disabled}
            onClick={() => handleSwitch(opt)}
            className={cn(
              "gap-2 text-sm",
              opt.value === viewAs && "font-medium"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                opt.value === viewAs ? "bg-primary" : "bg-transparent"
              )}
            />
            {opt.label}
            {opt.disabled && (
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                soon
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
