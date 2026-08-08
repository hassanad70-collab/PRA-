"use client";

import { useRef, useState, useTransition } from "react";

import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { candidateSendMessageAction, markThreadReadAction } from "@/actions/messaging";
import { initials } from "@/lib/utils";
import type { Message } from "@/types/database";
import type { CandidateThreadListItem } from "@/lib/candidate/messaging-queries";

export interface CandidateMessagesLabels {
  inbox: string;
  noThreads: string;
  selectThread: string;
  placeholder: string;
  send: string;
  you: string;
  sendFailed: string;
}

interface Props {
  threads: CandidateThreadListItem[];
  candidateId: string;
  labels: CandidateMessagesLabels;
}

export function CandidateMessagesClient({ threads, candidateId, labels }: Props) {
  const [activeThread, setActiveThread] = useState<CandidateThreadListItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function openThread(thread: CandidateThreadListItem) {
    setActiveThread(thread);
    setLoadingThread(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidate/messages?threadId=${thread.id}`);
      const data: Message[] = await res.json();
      setMessages(data);
      await markThreadReadAction(thread.id, "candidate");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setError("Failed to load messages");
    } finally {
      setLoadingThread(false);
    }
  }

  function handleSend() {
    if (!activeThread || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      thread_id: activeThread.id,
      sender_role: "candidate",
      sender_id: candidateId,
      body: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);

    startTransition(async () => {
      try {
        await candidateSendMessageAction(activeThread.id, text);
      } catch {
        setError(labels.sendFailed);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-background">
      {/* Thread list */}
      <div className="flex w-72 shrink-0 flex-col border-e">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{labels.inbox}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{labels.noThreads}</p>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => openThread(t)}
              className={`w-full border-b px-4 py-3 text-start transition-colors hover:bg-muted/50 ${
                activeThread?.id === t.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials(t.recruiter_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs font-semibold">{t.recruiter_name}</p>
                    {t.candidate_unread_count > 0 && (
                      <Badge variant="default" className="h-4 shrink-0 px-1 text-[10px]">
                        {t.candidate_unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{t.company_name}</p>
                  {t.last_body && (
                    <p className="truncate text-[11px] text-muted-foreground">{t.last_body}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message pane */}
      <div className="flex flex-1 flex-col">
        {!activeThread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">{labels.selectThread}</p>
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">{activeThread.recruiter_name}</p>
              <p className="text-xs text-muted-foreground">{activeThread.company_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingThread && (
                <p className="text-center text-sm text-muted-foreground">Loading…</p>
              )}
              <div className="space-y-3">
                {messages.map((m) => {
                  const isMe = m.sender_role === "candidate";
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>
            {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={labels.placeholder}
                  className="min-h-[60px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-[60px] w-10 shrink-0"
                  onClick={handleSend}
                  disabled={!body.trim() || isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
