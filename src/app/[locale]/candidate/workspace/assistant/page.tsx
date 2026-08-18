import { Bot } from "lucide-react";

import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { getChatSessionsAction, getSessionMessagesAction } from "@/actions/ai-assistant";
import { AiAssistantChat } from "@/components/workspace/ai-assistant-chat";

export default async function AiAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  // Parallel: resume context + session list
  const [resume, sessionsResult] = await Promise.all([
    getWorkspaceResume(user.id),
    getChatSessionsAction(),
  ]);

  const sessions = sessionsResult.success ? (sessionsResult.data ?? []) : [];
  const latestSession = sessions[0] ?? null;

  // Load initial messages server-side to avoid a loading flash on first view
  const messagesResult = latestSession
    ? await getSessionMessagesAction(latestSession.id)
    : null;
  const initialMessages = messagesResult?.success ? (messagesResult.data ?? []) : [];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Career Chatbot</h1>
          <p className="text-sm text-muted-foreground">
            Ask PRA anything about your career.
          </p>
        </div>
      </div>

      <AiAssistantChat
        hasResume={!!resume}
        initialSessions={sessions}
        initialSessionId={latestSession?.id ?? null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
