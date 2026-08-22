"use client";

import { useState } from "react";
import { Check, Crown, Star, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type BillingCycle = "monthly" | "annual";

interface Plan {
  id: "free" | "professional" | "career_pro";
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  features: string[];
  badge?: string;
  icon: React.ReactNode;
  highlight: boolean;
  premium: boolean;
}

interface SubscriptionPlansProps {
  currentPlan?: "free" | "professional" | "career_pro";
  t: {
    monthlyLabel: string;
    annualLabel: string;
    annualSaving: string;
    freeName: string;
    freeDesc: string;
    professionalName: string;
    professionalDesc: string;
    careerProName: string;
    careerProDesc: string;
    perMonth: string;
    perYear: string;
    freePrice: string;
    currentPlanLabel: string;
    upgradeLabel: string;
    manageLabel: string;
    comingSoon: string;
    mostPopular: string;
    freeFeatures: string[];
    professionalFeatures: string[];
    careerProFeatures: string[];
    everythingInFree: string;
    everythingInProfessional: string;
  };
}

export function SubscriptionPlans({ currentPlan = "free", t }: SubscriptionPlansProps) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  const plans: Plan[] = [
    {
      id: "free",
      name: t.freeName,
      description: t.freeDesc,
      monthlyPrice: null,
      annualPrice: null,
      features: t.freeFeatures,
      icon: <Zap className="h-5 w-5" />,
      highlight: false,
      premium: false,
    },
    {
      id: "professional",
      name: t.professionalName,
      description: t.professionalDesc,
      monthlyPrice: 199,
      annualPrice: 1999,
      features: [t.everythingInFree, ...t.professionalFeatures],
      badge: t.mostPopular,
      icon: <Star className="h-5 w-5" />,
      highlight: true,
      premium: false,
    },
    {
      id: "career_pro",
      name: t.careerProName,
      description: t.careerProDesc,
      monthlyPrice: 399,
      annualPrice: 3999,
      features: [t.everythingInProfessional, ...t.careerProFeatures],
      icon: <Crown className="h-5 w-5" />,
      highlight: false,
      premium: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.monthlyLabel}
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            billing === "annual"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.annualLabel}
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {t.annualSaving}
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
          const priceSuffix = billing === "monthly" ? t.perMonth : t.perYear;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-shadow ${
                plan.highlight
                  ? "border-2 border-primary shadow-lg shadow-primary/10"
                  : plan.premium
                    ? "border border-amber-300/60 dark:border-amber-600/40"
                    : "border border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      plan.highlight
                        ? "bg-primary/10 text-primary"
                        : plan.premium
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.icon}
                  </span>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      {t.currentPlanLabel}
                    </Badge>
                  )}
                </div>

                <h3
                  className={`text-xl font-bold ${
                    plan.premium ? "text-amber-600 dark:text-amber-400" : ""
                  }`}
                >
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-4">
                  {price === null ? (
                    <span className="text-3xl font-bold">{t.freePrice}</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{price.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">EGP {priceSuffix}</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.highlight
                            ? "text-primary"
                            : plan.premium
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={
                          i === 0 && feature.startsWith("Everything")
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t.currentPlanLabel}
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t.manageLabel}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.highlight
                          ? ""
                          : plan.premium
                            ? "border-amber-300 bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                            : ""
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                      disabled
                    >
                      {t.upgradeLabel} — {t.comingSoon}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
