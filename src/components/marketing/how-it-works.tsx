"use client";

import { motion } from "framer-motion";
import { FileUp, Search, Sparkles, Target } from "lucide-react";

const STEPS = [
  {
    icon: FileUp,
    title: "Upload your resume",
    description: "Candidates upload a CV once. Our AI parser extracts every detail automatically.",
  },
  {
    icon: Sparkles,
    title: "AI builds your profile",
    description: "Experience, education, skills, and achievements populate the profile instantly.",
  },
  {
    icon: Target,
    title: "Get matched to jobs",
    description: "Every active role is scored against the candidate with strengths and gaps explained.",
  },
  {
    icon: Search,
    title: "Recruiters screen with AI",
    description: "Recruiters see ranked, AI-scored candidates the moment they apply — no manual review needed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-secondary/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground">From upload to hire, powered by AI at every step.</p>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-border lg:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
