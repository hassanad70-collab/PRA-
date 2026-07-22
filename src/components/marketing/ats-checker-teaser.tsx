"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";

const POINTS = [
  "Complete ATS compatibility score — no hidden or gated sections",
  "Experience, skills, formatting, and education breakdowns",
  "Concrete weaknesses and suggestions you can act on immediately",
  "Free, instant, and no account required for your first check",
];

/**
 * The homepage's clearest, most prominent call-to-action into the live
 * Guest ATS Checker (/ai-tools/ats-checker). Mirrors AIRecruitment's visual
 * mockup pattern (Card + ScoreRing + gradient breakdown bars) for visual
 * consistency, but candidate-facing with a real, working CTA rather than a
 * marketing illustration.
 */
export function AtsCheckerTeaser() {
  return (
    <section className="py-24">
      <div className="container grid items-center gap-16 lg:grid-cols-2">
        <motion.div
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
                  <p className="text-sm font-medium text-muted-foreground">Your resume</p>
                  <p className="text-lg font-semibold">Instant ATS Score</p>
                  <p className="text-sm text-muted-foreground">Free — no account required</p>
                </div>
                <ScoreRing score={87} size={80} label="ATS" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Experience", 90],
                  ["Skills", 85],
                  ["Formatting", 92],
                  ["Education", 80],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-1 lg:order-2"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free AI Resume Checker — see your <span className="gradient-text">ATS score</span> in seconds
          </h2>
          <p className="mt-4 text-muted-foreground">
            Upload your resume and get a complete, AI-powered ATS compatibility analysis instantly —
            no account, no credit card, no waiting.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
          <Button size="lg" variant="gradient" asChild className="mt-8">
            <Link href="/ai-tools/ats-checker">
              Check my resume free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
