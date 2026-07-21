"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MonthlyCountChart({
  data,
  color = "#6366f1",
  emptyLabel = "No data yet.",
}: {
  data: { month: string; count: number }[];
  color?: string;
  emptyLabel?: string;
}) {
  if (!data.length) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const gradientId = `color-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Area type="monotone" dataKey="count" stroke={color} fill={`url(#${gradientId})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
