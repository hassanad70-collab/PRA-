"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STAGE_LABELS: Record<string, string> = {
  submitted: "Submitted",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STAGE_ORDER = ["submitted", "screening", "shortlisted", "interview", "offer", "hired"];
const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#22c55e"];

export function FunnelChart({ funnel }: { funnel: Record<string, number> }) {
  const data = STAGE_ORDER.map((stage) => ({ stage: STAGE_LABELS[stage], value: funnel?.[stage] ?? 0 }));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No applications yet.</p>;
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
