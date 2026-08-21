import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getQueueDashboardData } from "@/actions/admin-queue";
import { formatRelativeTime } from "@/lib/utils";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-pra-primary" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-pra-success" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    running: "default",
    completed: "outline",
    failed: "destructive",
    cancelled: "outline",
  };
  return (
    <Badge variant={variants[status] ?? "secondary"} className="flex w-fit items-center gap-1">
      <StatusIcon status={status} />
      {status}
    </Badge>
  );
}

export default async function AdminQueuePage() {
  const { stats, recent } = await getQueueDashboardData();

  const statCards = [
    { label: "Pending", value: stats.pending, color: "text-muted-foreground" },
    { label: "Running", value: stats.running, color: "text-pra-primary" },
    { label: "Completed", value: stats.completed, color: "text-pra-success" },
    { label: "Failed", value: stats.failed, color: "text-destructive" },
    { label: "Cancelled", value: stats.cancelled, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Background Job Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Database-backed async job queue. Workers run via{" "}
          <code className="text-xs">/api/cron/process-queue</code> (Vercel cron).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Queue is empty.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{job.type}</code>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>{job.priority}</TableCell>
                    <TableCell>
                      {job.attempts}/{job.max_attempts}
                    </TableCell>
                    <TableCell>
                      {job.last_error ? (
                        <span className="max-w-[200px] truncate text-xs text-destructive" title={job.last_error}>
                          {job.last_error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(job.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.completed_at ? formatRelativeTime(job.completed_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
