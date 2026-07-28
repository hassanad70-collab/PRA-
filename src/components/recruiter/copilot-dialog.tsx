"use client";

import * as React from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { askCopilot } from "@/actions/recruiter-copilot";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export interface CopilotLabels {
  trigger: string;
  dialogTitle: string;
  placeholder: string;
  send: string;
  thinking: string;
  emptyState: string;
  exampleQueries: string[];
  errorFallback: string;
}

export function CopilotDialog({ labels }: { labels: CopilotLabels }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isPending, startTransition] = React.useTransition();

  const handleSend = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    startTransition(async () => {
      const result = await askCopilot(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", text: result.success ? result.answer ?? "" : result.error ?? labels.errorFallback }]);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.trigger} title={labels.trigger}>
          <Sparkles className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> {labels.dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto py-2">
          {messages.length === 0 && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{labels.emptyState}</p>
              <ul className="space-y-1">
                {labels.exampleQueries.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      className="text-start text-primary hover:underline"
                      onClick={() => handleSend(q)}
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ms-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] whitespace-pre-line rounded-2xl bg-muted px-3 py-2 text-sm"
              }
            >
              {m.text}
            </div>
          ))}
          {isPending && <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">{labels.thinking}</div>}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={labels.placeholder}
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !input.trim()} aria-label={labels.send}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
