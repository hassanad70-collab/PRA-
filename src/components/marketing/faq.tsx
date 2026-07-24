"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function FAQ() {
  const t = useTranslations("Home.Faq");
  const items = t.raw("items") as { q: string; a: string }[];
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section id="faq" className="py-24">
      <div className="container max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
        </div>
        <div className="mt-12 divide-y divide-border rounded-2xl border border-border">
          {items.map((faq, i) => (
            <div key={faq.q} className="p-6">
              <button
                className="flex w-full items-center justify-between text-start font-medium"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {faq.q}
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open === i && "rotate-180")} />
              </button>
              {open === i && <p className="mt-3 text-sm text-muted-foreground">{faq.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
