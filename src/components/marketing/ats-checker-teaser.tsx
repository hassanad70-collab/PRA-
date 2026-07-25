"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { Link } from "@/i18n/navigation";

/**
 * The homepage's clearest, most prominent call-to-action into the live
 * Guest ATS Checker (/ai-tools/ats-checker). Mirrors AIRecruitment's visual
 * mockup pattern (Card + ScoreRing + gradient breakdown bars) for visual
 * consistency, but candidate-facing with a real, working CTA rather than a
 * marketing illustration.
 */
export function AtsCheckerTeaser() {
  const t = useTranslations("Home.AtsTeaser");
  const tAts = useTranslations("AtsChecker.subScores");
  const breakdown = t.raw("breakdown") as { key: "experience" | "skills" | "formatting" | "education"; value: number }[];
  const points = t.raw("points") as string[];

  return (
    <section className="py-24">
      <div className="container grid items-center gap-16 lg:grid-cols-2">
        <m.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <Card className="glass overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("yourResume")}</p>
                  <p className="text-lg font-semibold">{t("instantScore")}</p>
                  <p className="text-sm text-muted-foreground">{t("freeNoAccount")}</p>
                </div>
                <ScoreRing score={87} size={80} label={t("atsLabel")} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {breakdown.map(({ key, value }) => (
                  <div key={key} className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tAts(key)}</span>
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
            </CardContent>
          </Card>
        </m.div>

        <m.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-1 lg:order-2"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.rich("title", { highlight: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
          <Button size="lg" variant="gradient" asChild className="mt-8">
            <Link href="/ai-tools/ats-checker">
              {t("checkMyResume")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
        </m.div>
      </div>
    </section>
  );
}
