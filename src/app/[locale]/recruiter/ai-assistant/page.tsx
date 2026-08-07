import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { Bot, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { CopilotDialog } from "@/components/recruiter/copilot-dialog";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function AiAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [t, tCopilot] = await Promise.all([
    getTranslations("Recruiter.AiAssistant"),
    getTranslations("Recruiter.Copilot"),
  ]);

  const examplePrompts = [
    tCopilot("exampleQuery1"),
    tCopilot("exampleQuery2"),
    tCopilot("exampleQuery3"),
    tCopilot("exampleQuery4"),
    tCopilot("exampleQuery5"),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examplePrompts.map((prompt, i) => (
          <Card key={i} className="cursor-default select-none border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-colors">
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">{prompt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold">{t("openCopilot")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("openCopilotHint")}</p>
          </div>
          <CopilotDialog
            labels={{
              trigger: tCopilot("trigger"),
              dialogTitle: tCopilot("dialogTitle"),
              placeholder: tCopilot("placeholder"),
              send: tCopilot("send"),
              thinking: tCopilot("thinking"),
              emptyState: tCopilot("emptyState"),
              exampleQueries: examplePrompts,
              errorFallback: tCopilot("errorFallback"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
