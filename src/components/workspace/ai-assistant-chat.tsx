"use client";

import * as React from "react";
import {
  Bot,
  Briefcase,
  FileText,
  Mail,
  Mic,
  Send,
  Sparkles,
  Target,
  User,
} from "lucide-react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  sendAssistantMessage,
  type AssistantDomain,
  type ChatMessage,
} from "@/actions/ai-assistant";
import { cn } from "@/lib/utils";

interface DomainConfig {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  starters: string[];
}

const DOMAINS: Record<AssistantDomain, DomainConfig> = {
  general: {
    label: "All Topics",
    icon: Bot,
    placeholder: "Ask me anything about your career…",
    starters: [
      "How can I accelerate my career growth?",
      "What should I prioritize in my job search?",
      "Give me an honest assessment of my profile.",
      "What salary should I be targeting?",
    ],
  },
  resume: {
    label: "Resume",
    icon: FileText,
    placeholder: "Ask about your resume — structure, keywords, impact…",
    starters: [
      "What are the biggest weaknesses in my resume?",
      "Rewrite my summary section to be more compelling.",
      "Which skills should I add for a Product Manager role?",
      "How do I quantify my achievements?",
    ],
  },
  ats: {
    label: "ATS",
    icon: Target,
    placeholder: "Ask about ATS scores, keywords, formatting…",
    starters: [
      "Why is my ATS score low and how do I fix it?",
      "What keywords should I add for a Data Analyst role?",
      "Are there any formatting issues hurting my ATS score?",
      "How do I tailor my resume for a specific job description?",
    ],
  },
  "cover-letter": {
    label: "Cover Letter",
    icon: Mail,
    placeholder: "Ask about writing or improving a cover letter…",
    starters: [
      "Write a cover letter for a Senior Engineer role.",
      "How do I open a cover letter without being generic?",
      "Make my cover letter more engaging and concise.",
      "How do I explain a career gap in my cover letter?",
    ],
  },
  interview: {
    label: "Interview",
    icon: Mic,
    placeholder: "Practice interview questions or get prep tips…",
    starters: [
      "Give me 5 behavioral questions I should prepare for.",
      'Help me answer "Tell me about yourself" confidently.',
      "How should I negotiate salary at the end of an interview?",
      "What questions should I ask the interviewer?",
    ],
  },
  career: {
    label: "Career",
    icon: Sparkles,
    placeholder: "Ask about career growth, transitions, strategy…",
    starters: [
      "How do I move from engineer to engineering manager?",
      "What skills should I build in the next 6 months?",
      "How do I get promoted faster at my current job?",
      "Should I switch industries, and if so, how?",
    ],
  },
  "job-search": {
    label: "Job Search",
    icon: Briefcase,
    placeholder: "Ask about finding jobs, networking, applications…",
    starters: [
      "How do I find hidden job opportunities not posted online?",
      "How do I reach out to a recruiter on LinkedIn?",
      "How many jobs should I apply to per week?",
      "How do I track my applications effectively?",
    ],
  },
};

const DOMAIN_ORDER: AssistantDomain[] = [
  "general",
  "resume",
  "ats",
  "cover-letter",
  "interview",
  "career",
  "job-search",
];

interface Props {
  hasResume: boolean;
  initialDomain?: AssistantDomain;
}

export function AiAssistantChat({ hasResume, initialDomain = "general" }: Props) {
  const [domain, setDomain] = React.useState<AssistantDomain>(initialDomain);
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const config = DOMAINS[domain];

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function handleDomainChange(d: AssistantDomain) {
    setDomain(d);
    setHistory([]);
    setError(null);
    setInput("");
    textareaRef.current?.focus();
  }

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const result = await sendAssistantMessage([...history, userMsg], text, domain);

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
      {/* Domain selector */}
      <div className="flex flex-wrap gap-1.5">
        {DOMAIN_ORDER.map((d) => {
          const cfg = DOMAINS[d];
          const Icon = cfg.icon;
          const active = domain === d;
          return (
            <button
              key={d}
              onClick={() => handleDomainChange(d)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {!hasResume && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Upload your resume in{" "}
            <Link href="/candidate/workspace/resumes" className="underline">
              My Resumes
            </Link>{" "}
            to unlock personalized advice.
          </CardContent>
        </Card>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                {React.createElement(config.icon, { className: "h-8 w-8 text-primary" })}
              </div>
              <div>
                <p className="text-base font-semibold">{config.label} Assistant</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  {config.placeholder}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {config.starters.map((p) => (
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
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
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
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
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
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={config.placeholder}
              rows={1}
              className="resize-none"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Enter to send · Shift+Enter for new line · Switch topics above to reset the conversation
          </p>
        </div>
      </Card>
    </div>
  );
}
