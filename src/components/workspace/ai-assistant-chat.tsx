"use client";

import * as React from "react";
import { Bot, Send, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sendAssistantMessage, type ChatMessage } from "@/actions/ai-assistant";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "How can I improve my resume for a software engineering role?",
  "What are the top skills I should add to stand out?",
  "Help me prepare for a behavioral interview.",
  "What salary should I be asking for?",
];

interface Props {
  hasResume: boolean;
}

export function AiAssistantChat({ hasResume }: Props) {
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(scrollToBottom, [history]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const result = await sendAssistantMessage([...history, userMsg], text);

    if (result.success && result.data) {
      setHistory((h) => [...h, { role: "assistant", content: result.data! }]);
    } else {
      setError(result.error ?? "Something went wrong.");
      setHistory((h) => h.slice(0, -1));
    }
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {!hasResume && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Upload your resume in{" "}
            <a href="../workspace/resumes" className="underline">
              My Resumes
            </a>{" "}
            to get personalized career advice.
          </CardContent>
        </Card>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold">Your AI Career Advisor</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  Ask me anything about your career — resume tips, interview prep, salary guidance, and more.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2.5">
                <span className="flex gap-1">
                  <span className="animate-bounce delay-0 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="animate-bounce delay-150 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="animate-bounce delay-300 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask your AI career advisor..."
              rows={1}
              className="resize-none"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </Card>
    </div>
  );
}
