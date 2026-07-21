import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/admin/pagination";
import { getAdminAuditLogs, getDistinctAuditActions } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

const ENTITY_TYPES = ["profile", "company", "recruiter", "job", "application", "system_setting"];

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [result, actions] = await Promise.all([
    getAdminAuditLogs({ action: params.action, entityType: params.entityType, page }),
    getDistinctAuditActions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every tracked action across authentication, users, jobs, and admin operations.</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="action"
          defaultValue={params.action ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-56"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          name="entityType"
          defaultValue={params.entityType ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-44"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No audit log entries match these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((log) => {
                const actor = log.actor as { full_name?: string; email?: string; role?: string } | null;
                return (
                  <TableRow key={log.id as string}>
                    <TableCell className="font-medium capitalize">{(log.action as string).replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {(log.entity_type as string).replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{actor?.full_name ?? "System"}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(log.created_at as string)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            basePath="/admin/audit-logs"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
