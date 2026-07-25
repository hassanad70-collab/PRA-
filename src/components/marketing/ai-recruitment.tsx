"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { ScoreRing } from "@/components/shared/score-ring";
import { Card, CardContent } from "@/components/ui/card";

const SCORE_BREAKDOWN = [
  { key: "experience", value: 95 },
  { key: "skills", value: 88 },
  { key: "education", value: 90 },
  { key: "formatting", value: 97 },
] as const;

export function AIRecruitment() {
  const t = useTranslations("Home.AiRecruitment");
  const tAts = useTranslations("AtsChecker.subScores");
  const points = t.raw("points") as string[];

  return (
    <section id="ai" className="py-24">
      <div className="container grid items-center gap-16 lg:grid-cols-2">
        <m.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </m.div>

        <m.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("candidateLabel")}</p>
                  <p className="text-lg font-semibold">{t("sampleName")}</p>
                  <p className="text-sm text-muted-foreground">{t("sampleRole")}</p>
                </div>
                <ScoreRing score={92} size={80} label={t("candidateLabel")} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {SCORE_BREAKDOWN.map(({ key, value }) => (
                  <div key={key} className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tAts(key as "experience" | "skills" | "education" | "formatting")}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rtl:bg-gradient-to-l"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
                <span className="font-medium text-success">{t("matchPercent", { percent: 92 })}</span>{" "}
                <span className="text-muted-foreground">— {t("matchNote")}</span>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </section>
  );
}
