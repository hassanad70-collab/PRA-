import { Flag, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminCompanies } from "@/lib/queries/admin";
import { getFeatureFlags, getPlanFeatures, getCompanyFeatureOverrides } from "@/actions/admin-feature-flags";

const PLAN_ORDER = ["free", "starter", "professional", "enterprise"] as const;

export default async function AdminFeatureFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>;
}) {
  const params = await searchParams;

  const [flags, planFeatures, companiesResult] = await Promise.all([
    getFeatureFlags(),
    getPlanFeatures(),
    getAdminCompanies({ page: 1 }),
  ]);

  const companyOverrides = params.company_id
    ? await getCompanyFeatureOverrides(params.company_id)
    : [];

  const companiesList = (companiesResult.rows as { id: string; name: string; subscription_plan?: string }[]);
  const selectedCompany = companiesList.find((c) => c.id === params.company_id);

  // Build a lookup: { [feature_key]: { [plan]: PlanFeature } }
  const planLookup: Record<string, Record<string, { enabled: boolean; numeric_limit: number | null }>> = {};
  for (const pf of planFeatures) {
    planLookup[pf.feature_key] ??= {};
    planLookup[pf.feature_key][pf.plan] = { enabled: pf.enabled, numeric_limit: pf.numeric_limit };
  }

  const overrideLookup: Record<string, { enabled: boolean; numeric_limit: number | null }> = {};
  for (const cf of companyOverrides) {
    overrideLookup[cf.feature_key] = { enabled: cf.enabled, numeric_limit: cf.numeric_limit };
  }

  const categories = [...new Set(flags.map((f) => f.category))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan entitlements and per-company overrides.
          </p>
        </div>

        <form className="flex gap-2">
          <select
            name="company_id"
            defaultValue={params.company_id ?? ""}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
          >
            <option value="">— Plan defaults only —</option>
            {companiesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            View
          </button>
        </form>
      </div>

      {selectedCompany && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Showing effective features for{" "}
          <span className="font-semibold">{selectedCompany.name}</span> (plan:{" "}
          <span className="capitalize font-medium">{selectedCompany.subscription_plan ?? "free"}</span>
          ). Overrides are highlighted.
        </div>
      )}

      {categories.map((category) => {
        const categoryFlags = flags.filter((f) => f.category === category);
        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm capitalize">
                <Flag className="h-4 w-4" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Feature</TableHead>
                    {PLAN_ORDER.map((plan) => (
                      <TableHead key={plan} className="text-center capitalize">
                        {plan}
                      </TableHead>
                    ))}
                    {params.company_id && <TableHead className="text-center">Override</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryFlags.map((flag) => {
                    const hasOverride = !!overrideLookup[flag.key];
                    return (
                      <TableRow key={flag.key} className={hasOverride ? "bg-primary/5" : undefined}>
                        <TableCell>
                          <p className="font-medium text-sm">{flag.name}</p>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground">{flag.description}</p>
                          )}
                        </TableCell>
                        {PLAN_ORDER.map((plan) => {
                          const pf = planLookup[flag.key]?.[plan];
                          const enabled = pf?.enabled ?? flag.default_enabled;
                          const limit = pf?.numeric_limit;
                          return (
                            <TableCell key={plan} className="text-center">
                              {enabled ? (
                                <span className="text-green-600 dark:text-green-400">
                                  ✓{limit != null ? ` (${limit})` : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                        {params.company_id && (
                          <TableCell className="text-center">
                            {hasOverride ? (
                              <Badge variant={overrideLookup[flag.key].enabled ? "default" : "outline"}>
                                {overrideLookup[flag.key].enabled
                                  ? `On${overrideLookup[flag.key].numeric_limit != null ? ` (${overrideLookup[flag.key].numeric_limit})` : ""}`
                                  : "Off"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">plan default</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
