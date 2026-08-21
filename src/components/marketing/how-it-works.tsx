"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { FileUp, Search, Sparkles, Target } from "lucide-react";

const ICONS = [FileUp, Sparkles, Target, Search];

export function HowItWorks() {
  const t = useTranslations("Home.HowItWorks");
  const steps = t.raw("steps") as { title: string; description: string }[];

  return (
    <section id="how-it-works" className="border-y border-border bg-secondary/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute inset-x-0 top-6 hidden h-px bg-border lg:block" />
          {steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <m.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pra-primary-hover to-pra-primary text-white shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </m.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
