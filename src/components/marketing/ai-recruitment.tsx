"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { ScoreRing } from "@/components/shared/score-ring";
import { Card, CardContent } from "@/components/ui/card";

const POINTS = [
  "Overall ATS score with experience, skills, formatting, and education breakdowns",
  "AI-generated match score and interview probability for every job",
  "Strengths, weaknesses, and missing skills surfaced automatically",
  "One-click resume rewriting: summary, bullet points, and keyword optimization",
];

export function AIRecruitment() {
  return (
    <section id="ai" className="py-24">
      <div className="container grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI that reads resumes like your best recruiter
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every resume is scored, explained, and matched — so your team spends
            time interviewing, not screening.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Candidate</p>
                  <p className="text-lg font-semibold">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">Senior Product Designer</p>
                </div>
                <ScoreRing score={92} size={80} label="ATS" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Experience", 95],
                  ["Skills", 88],
                  ["Education", 90],
                  ["Formatting", 97],
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
              <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
                <span className="font-medium text-success">92% match</span>{" "}
                <span className="text-muted-foreground">
                  — strong fit for Senior Product Designer, exceeds required experience.
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
