"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthlyGrowth, AtsDistribution, DailyActivity } from "@/actions/admin-analytics";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

export function MonthlyGrowthChart({ data }: { data: MonthlyGrowth[] }) {
  if (!data.length) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="grad-apps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-candidates" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="applications"
          stroke="#2563EB"
          fill="url(#grad-apps)"
          strokeWidth={2}
          name="Applications"
        />
        <Area
          type="monotone"
          dataKey="new_candidates"
          stroke="#06B6D4"
          fill="url(#grad-candidates)"
          strokeWidth={2}
          name="New Candidates"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AtsDistributionChart({ data }: { data: AtsDistribution[] }) {
  const BUCKET_ORDER = ["0-19", "20-39", "40-59", "60-79", "80-100"];
  const sorted = BUCKET_ORDER.map((b) => ({
    bucket: b,
    count: data.find((d) => d.bucket === b)?.count ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={sorted} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="bucket" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Candidates">
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyActivityChart({ data }: { data: DailyActivity[] }) {
  if (!data.length) {
    return (
      <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="grad-daily" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" hide />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          labelFormatter={(l) => `Day: ${l}`}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#10B981"
          fill="url(#grad-daily)"
          strokeWidth={2}
          name="Applications"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
