"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TopSkillsChart({ data, noDataLabel }: { data: { name: string; count: number }[]; noDataLabel: string }) {
  if (!data.length) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{noDataLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={100} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Bar dataKey="count" fill="#2563EB" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
