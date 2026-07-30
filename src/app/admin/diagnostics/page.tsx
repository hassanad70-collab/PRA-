import { forbidden } from "next/navigation";

import { OpenAIDiagnosticsPanel } from "@/components/admin/openai-diagnostics-panel";
import { getCurrentUser } from "@/lib/queries/candidate";

export default async function AdminDiagnosticsPage() {
  // Defense-in-depth: layout already redirects non-super_admin, but this
  // page enforces HTTP 403 directly in case that outer guard is ever bypassed.
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") forbidden();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live checks against this deployment&apos;s real integrations. Read-only — no configuration changes are made
          from this page.
        </p>
      </div>

      <OpenAIDiagnosticsPanel />
    </div>
  );
}
