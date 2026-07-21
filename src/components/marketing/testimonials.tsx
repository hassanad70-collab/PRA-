"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/lib/utils";

const TESTIMONIALS = [
  {
    name: "Amelia Ross",
    role: "VP of People, Northwind",
    quote:
      "We went from a two-week screening backlog to same-day shortlists. The AI match scores are shockingly accurate.",
  },
  {
    name: "David Okafor",
    role: "Head of Talent, Cascade Digital",
    quote:
      "The ATS scoring alone paid for the platform — candidates fix their resumes and apply-quality went way up.",
  },
  {
    name: "Priya Nair",
    role: "Recruiting Lead, Vertex Labs",
    quote:
      "PRA's screening engine gives our recruiters a ranked, explained shortlist in minutes instead of days.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="border-y border-border bg-secondary/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Loved by talent teams</h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex gap-1 text-warning">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(t.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
