import { BadgeDollarSign, Building2, CreditCard, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBillingOverview, getRecentInvoices, getSubscriptions } from "@/actions/admin-billing";
import { formatDate } from "@/lib/utils";

function centsToDisplay(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    cancelled: "outline",
    suspended: "destructive",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}

export default async function AdminBillingPage() {
  const [overview, subscriptions, invoices] = await Promise.all([
    getBillingOverview(),
    getSubscriptions(20),
    getRecentInvoices(10),
  ]);

  const mrr = overview?.mrr_cents ?? 0;
  const arr = mrr * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription & Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue metrics and subscription management. Stripe integration enabled when{" "}
          <code className="text-xs">STRIPE_SECRET_KEY</code> is set.
        </p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-2xl font-semibold">{centsToDisplay(mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR (projected)</p>
              <p className="text-2xl font-semibold">{centsToDisplay(arr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-semibold">
                {centsToDisplay(overview?.total_invoiced_cents ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-semibold text-destructive">
                {centsToDisplay(overview?.outstanding_cents ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active", value: overview?.active_subscriptions ?? 0 },
          { label: "Trialing", value: overview?.trialing ?? 0 },
          { label: "Past Due", value: overview?.past_due ?? 0 },
          { label: "Cancelled", value: overview?.cancelled ?? 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan breakdown */}
      {overview?.plan_breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(overview.plan_breakdown).map(([plan, count]) => (
                <div
                  key={plan}
                  className="flex flex-col items-center rounded-lg border p-3 text-center"
                >
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs capitalize text-muted-foreground">{plan}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Billing Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No subscriptions yet.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {(sub.companies as { name: string } | null)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">{sub.plan}</TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end ? formatDate(sub.current_period_end) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sub.billing_email ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices as Record<string, unknown>[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                (invoices as Record<string, unknown>[]).map((inv) => (
                  <TableRow key={inv.id as string}>
                    <TableCell className="font-medium">
                      {(inv.companies as { name: string } | null)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{centsToDisplay((inv.amount_due as number) ?? 0)}</TableCell>
                    <TableCell>{centsToDisplay((inv.amount_paid as number) ?? 0)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status as string} />
                    </TableCell>
                    <TableCell>{formatDate(inv.created_at as string)}</TableCell>
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
