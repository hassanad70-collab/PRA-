"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#22c55e", "#f59e0b", "#0ea5e9"];

export function DepartmentChart({
  breakdown,
  unspecifiedLabel,
  noDataLabel,
}: {
  breakdown: Record<string, number>;
  unspecifiedLabel: string;
  noDataLabel: string;
}) {
  const data = Object.entries(breakdown ?? {})
    .map(([department, count]) => ({ department: department === "unspecified" ? unspecifiedLabel : department, count }))
    .sort((a, b) => b.count - a.count);

  if (!data.length) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{noDataLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="department" fontSize={12} tickLine={false} axisLine={false} width={110} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
