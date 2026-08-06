import { redirect } from "@/i18n/navigation";
import { Bot } from "lucide-react";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { AiAssistantChat } from "@/components/workspace/ai-assistant-chat";

export default async function AiAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const resume = await getWorkspaceResume(user.id);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Career Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Your personal AI advisor for career strategy, resume tips, and interview prep.
          </p>
        </div>
      </div>

      <AiAssistantChat hasResume={!!resume} />
    </div>
  );
}
