import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SuggestionEvent } from "@/lib/resume-intelligence/suggestion-events";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Suggestion events come from two sources with different after_value
 * shapes for the same suggestion_type (the Resume Builder logs the full
 * structured AI output; Rewrite & Optimize logs a plain string/array
 * entry) -- this renders a short, honest preview for either shape rather
 * than assuming one.
 */
function describeSuggestionValue(value: unknown, maxLength = 90): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
  }
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }
  if (value && typeof value === "object") {
    const withText = value as { text?: unknown };
    if (typeof withText.text === "string") return describeSuggestionValue(withText.text, maxLength);
  }
  return "";
}

/** The Resume Intelligence Hub's History module (Unit C) -- a durable record of every AI suggestion accepted or rejected, across both the Resume Builder and Rewrite & Optimize. */
export async function SuggestionHistoryList({ events }: { events: SuggestionEvent[] }) {
  const t = await getTranslations("Candidate.ResumeIntelligence");

  return (
    <Card data-testid="suggestion-history">
      <CardHeader>
        <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noHistoryYet")}</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t(`historyType.${ev.suggestion_type}` as Parameters<typeof t>[0])}</p>
                  <p className="truncate text-xs text-muted-foreground">{describeSuggestionValue(ev.after_value)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={ev.outcome === "accepted" ? "success" : "outline"}>
                    {t(`historyOutcome.${ev.outcome}` as Parameters<typeof t>[0])}
                  </Badge>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {ev.decided_at ? formatRelativeTime(ev.decided_at) : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
