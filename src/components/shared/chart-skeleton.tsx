/** Matches every recharts chart's fixed 260px ResponsiveContainer height, so a lazy-loaded chart never shifts layout when it mounts. */
export function ChartSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted" />;
}
