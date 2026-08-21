"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#1D4ED8", "#0891B2"];

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
