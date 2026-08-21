"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STAGE_ORDER = ["submitted", "screening", "shortlisted", "interview", "offer", "hired"];
const COLORS = ["#94A3B8", "#2563EB", "#06B6D4", "#F59E0B", "#10B981", "#10B981"];

export function FunnelChart({
  funnel,
  stageLabels,
  noDataLabel,
}: {
  funnel: Record<string, number>;
  stageLabels: Record<string, string>;
  noDataLabel: string;
}) {
  const data = STAGE_ORDER.map((stage) => ({ stage: stageLabels[stage] ?? stage, value: funnel?.[stage] ?? 0 }));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{noDataLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" fontSize={12} tickLine={false} axisLine={false} width={90} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
