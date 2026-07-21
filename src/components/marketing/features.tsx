"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  FileSearch,
  Fingerprint,
  Layers,
  MessagesSquare,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: FileSearch,
    title: "AI Resume Parser",
    description: "Extracts experience, education, skills, and achievements from any resume in seconds.",
  },
  {
    icon: Target,
    title: "AI Job Matching",
    description: "Every candidate is automatically matched against every open role with a live match score.",
  },
  {
    icon: BarChart3,
    title: "ATS Scoring",
    description: "Instant, transparent ATS scores with formatting, keyword, and readability breakdowns.",
  },
  {
    icon: Bot,
    title: "AI Screening Engine",
    description: "Automated candidate evaluation across experience, skills, culture fit, and communication.",
  },
  {
    icon: Layers,
    title: "Candidate Ranking",
    description: "Rank entire applicant pools instantly using a weighted, explainable AI scoring model.",
  },
  {
    icon: MessagesSquare,
    title: "AI Interview Assistant",
    description: "Generate technical, behavioral, and situational interview questions from any job description.",
  },
  {
    icon: Users,
    title: "Talent Pool & CRM",
    description: "Save, tag, and nurture candidates in a searchable talent community for future roles.",
  },
  {
    icon: Fingerprint,
    title: "Fraud & Duplicate Detection",
    description: "Flag inconsistent resumes and duplicate candidate profiles before they reach your pipeline.",
  },
  {
    icon: Sparkles,
    title: "Recruitment Copilot",
    description: "An AI assistant across the platform — from job descriptions to offer letters.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your talent team needs, in one platform
          </h2>
          <p className="mt-4 text-muted-foreground">
            Replace your ATS, resume screener, and analytics stack with a single
            AI-native recruitment intelligence system.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            >
              <Card className="group h-full transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-primary transition-colors group-hover:from-indigo-500 group-hover:to-fuchsia-500 group-hover:text-white">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mb-2 text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
