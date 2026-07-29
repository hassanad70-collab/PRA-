import { OpenAIDiagnosticsPanel } from "@/components/admin/openai-diagnostics-panel";

export default function AdminDiagnosticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live checks against this deployment&apos;s real integrations.</p>
      </div>

      <OpenAIDiagnosticsPanel />
    </div>
  );
}
