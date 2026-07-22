"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AI_TOOLS, type AIToolListing } from "@/lib/marketing/ai-tools";
import { cn } from "@/lib/utils";

/**
 * Grid of every AI tool on the platform's roadmap, driven entirely by the
 * AI_TOOLS registry. Live tools are real, clickable cards; "coming-soon"
 * tools are visually disabled and open an informational modal instead of a
 * link — the registry's own type shape (href: null for coming-soon) makes
 * a dead link structurally impossible here, not just a convention to
 * remember.
 */
export function AICareerToolsSection() {
  const [comingSoonTool, setComingSoonTool] = React.useState<AIToolListing | null>(null);

  return (
    <section id="ai-tools" className="border-y border-border bg-secondary/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Your AI career toolkit
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            One platform for your whole career journey
          </h2>
          <p className="mt-4 text-muted-foreground">
            The ATS Checker is live today — more AI-powered career tools are on the way.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            const isLive = tool.status === "live";

            const cardInner = (
              <CardContent className="p-6">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                    isLive
                      ? "bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 text-primary group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-fuchsia-600 group-hover:text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="font-semibold">{tool.label}</h3>
                  {!isLive && (
                    <Badge variant="secondary" className="shrink-0">
                      Coming soon
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
            );

            if (isLive) {
              return (
                <motion.div
                  key={tool.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
                >
                  <Link href={tool.href} className="group block h-full">
                    <Card className="h-full transition-shadow hover:shadow-md">{cardInner}</Card>
                  </Link>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={tool.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              >
                <button
                  type="button"
                  onClick={() => setComingSoonTool(tool)}
                  className="group block h-full w-full text-left"
                  aria-haspopup="dialog"
                >
                  <Card className="h-full opacity-75 transition-opacity hover:opacity-100">{cardInner}</Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!comingSoonTool} onOpenChange={(open) => !open && setComingSoonTool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{comingSoonTool?.label} — Coming soon</DialogTitle>
            <DialogDescription>
              {comingSoonTool?.description} We&rsquo;re building this next as part of PRA&rsquo;s AI career
              toolkit. In the meantime, try the free ATS Resume Checker — it&rsquo;s live today.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
