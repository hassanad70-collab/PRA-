import { CheckCircle2, Clock, Mail, Send, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmailQueue, getEmailStats, getEmailTemplates } from "@/actions/admin-email";
import { formatRelativeTime } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    sent: "default",
    failed: "destructive",
    cancelled: "outline",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  const [templates, queue, stats] = await Promise.all([
    getEmailTemplates(),
    getEmailQueue(params.status, 50),
    getEmailStats(),
  ]);

  const statCards = [
    { label: "Pending", value: stats.pending ?? 0, icon: Clock },
    { label: "Sent", value: stats.sent ?? 0, icon: CheckCircle2 },
    { label: "Failed", value: stats.failed ?? 0, icon: XCircle },
    { label: "Cancelled", value: stats.cancelled ?? 0, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email Automation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Template-driven email queue. Delivery via Resend when{" "}
          <code className="text-xs">RESEND_API_KEY</code> is set; stubs otherwise.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-5">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Email Templates ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Variables</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.key}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tpl.key}</code>
                  </TableCell>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {tpl.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tpl.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {tpl.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tpl.variables.map((v) => (
                        <code key={v} className="rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Email Queue
          </CardTitle>
          <form className="flex gap-2">
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm shadow-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Filter
            </button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No emails in queue.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="text-sm">
                      {email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {email.subject}
                    </TableCell>
                    <TableCell>
                      {email.template_key ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {email.template_key}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={email.status} />
                    </TableCell>
                    <TableCell>
                      {email.attempts}/{email.max_attempts}
                    </TableCell>
                    <TableCell>
                      {email.last_error ? (
                        <span
                          className="max-w-[150px] truncate text-xs text-destructive"
                          title={email.last_error}
                        >
                          {email.last_error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(email.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {email.sent_at ? formatRelativeTime(email.sent_at) : "—"}
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
