import { forbidden } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, Database, Mail, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenAIDiagnosticsPanel } from "@/components/admin/openai-diagnostics-panel";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getSystemHealth } from "@/actions/admin-diagnostics";

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <StatusDot ok={ok} />
        <span>{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

export default async function AdminDiagnosticsPage() {
  // Defense-in-depth: layout already redirects non-super_admin, but this
  // page enforces HTTP 403 directly in case that outer guard is ever bypassed.
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") forbidden();

  const health = await getSystemHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live checks against this deployment&apos;s real integrations. Read-only — no configuration changes are made
          from this page.
        </p>
      </div>

      {/* System Health Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Database */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" /> Database
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <HealthRow
              label="Supabase reachable"
              ok={health.database.reachable}
              detail={health.database.reachable ? `${health.database.latencyMs}ms` : "unreachable"}
            />
            <HealthRow
              label="Companies table"
              ok={health.database.reachable}
              detail={health.database.companiesCount != null ? `${health.database.companiesCount} rows` : undefined}
            />
          </CardContent>
        </Card>

        {/* Job Queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> Job Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <HealthRow
              label="Queue reachable"
              ok={health.queue.reachable}
              detail={health.queue.reachable ? `${health.queue.latencyMs}ms` : "unreachable"}
            />
            <HealthRow
              label="Pending jobs"
              ok={health.queue.pending < 50}
              detail={`${health.queue.pending} pending`}
            />
            <HealthRow
              label="Failed jobs"
              ok={health.queue.failed === 0}
              detail={health.queue.failed > 0 ? `${health.queue.failed} failed` : "none"}
            />
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" /> Email
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <HealthRow
              label="Provider configured"
              ok={health.email.providerConfigured}
              detail={health.email.provider}
            />
            <HealthRow
              label="Pending emails"
              ok={health.email.pending < 100}
              detail={`${health.email.pending} pending`}
            />
            <HealthRow
              label="Failed emails"
              ok={health.email.failed === 0}
              detail={health.email.failed > 0 ? `${health.email.failed} failed` : "none"}
            />
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" /> Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <HealthRow
              label="Stripe key"
              ok={health.billing.stripeConfigured}
              detail={health.billing.stripeConfigured ? "configured" : "not set"}
            />
            <HealthRow
              label="Webhook secret"
              ok={health.billing.webhookConfigured}
              detail={health.billing.webhookConfigured ? "configured" : "not set"}
            />
            <HealthRow
              label="Unprocessed events"
              ok={health.billing.pendingBillingEvents === 0}
              detail={`${health.billing.pendingBillingEvents} pending`}
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Integration Detail */}
      <OpenAIDiagnosticsPanel />
    </div>
  );
}
