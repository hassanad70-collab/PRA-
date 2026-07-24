"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
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

const ICONS = [FileSearch, Target, BarChart3, Bot, Layers, MessagesSquare, Users, Fingerprint, Sparkles];

export function Features() {
  const t = useTranslations("Home.Features");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <section id="features" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((feature, i) => {
            const Icon = ICONS[i];
            return (
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
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mb-2 text-base">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
