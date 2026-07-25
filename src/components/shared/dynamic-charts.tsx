"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/chart-skeleton";

/**
 * recharts is a heavy dependency used only by these 4 dashboard chart
 * components (admin/dashboard and recruiter/dashboard), which are also the
 * two heaviest routes in the app's First Load JS. Code-splitting them with
 * `ssr: false` keeps recharts out of the initial dashboard bundle entirely
 * -- it's fetched only once these client components actually mount, and
 * the KPI cards/funnel numbers above them are still available immediately.
 * `ssr: false` requires a Client Component boundary (this file), which is
 * why these live in a wrapper rather than being called directly from the
 * Server Component dashboard pages that render them.
 */
export const MonthlyCountChart = dynamic(
  () => import("@/components/admin/charts/monthly-count-chart").then((m) => m.MonthlyCountChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const FunnelChart = dynamic(
  () => import("@/components/recruiter/charts/funnel-chart").then((m) => m.FunnelChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const TopSkillsChart = dynamic(
  () => import("@/components/recruiter/charts/top-skills-chart").then((m) => m.TopSkillsChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const TrendChart = dynamic(
  () => import("@/components/recruiter/charts/trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
