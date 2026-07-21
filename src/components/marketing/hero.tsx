"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:40px_40px] opacity-[0.04]" />
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />

      <div className="container flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm font-medium"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered recruitment, reimagined
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl"
        >
          Hire smarter with an{" "}
          <span className="gradient-text">AI Talent Intelligence</span> platform
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          PRA screens, ranks, and matches every candidate automatically — cutting
          manual recruitment work by more than 80%. One platform for your ATS,
          resume intelligence, and hiring analytics.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Button size="lg" variant="gradient" asChild>
            <Link href="/register">
              Start hiring free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {[
            ["80%+", "less manual work"],
            ["<48h", "avg. time to shortlist"],
            ["1M+", "resumes parsed"],
            ["99.9%", "platform uptime"],
          ].map(([stat, label]) => (
            <div key={label} className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="text-2xl font-bold">{stat}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
