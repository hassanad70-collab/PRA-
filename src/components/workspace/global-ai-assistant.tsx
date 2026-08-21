"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bot,
  Briefcase,
  ChevronLeft,
  FileText,
  History,
  Mail,
  Mic,
  Send,
  Sparkles,
  Target,
  User,
  Wifi,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createChatSessionAction,
  deleteChatSessionAction,
  getChatSessionsAction,
  getSessionMessagesAction,
  renameChatSessionAction,
  sendAssistantMessage,
  type AssistantDomain,
  type ChatMessage,
  type ChatSession,
} from "@/actions/ai-assistant";
import { SessionList } from "@/components/workspace/chat-session-sidebar";
import { cn } from "@/lib/utils";
import { getPageContext, isOnChatbotPage } from "@/lib/workspace/page-context-map";

// ─── Domain config (compact — 2 starters each to keep the drawer lean) ────────

interface DomainConfig {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  starters: [string, string];
}

const DOMAINS: Record<AssistantDomain, DomainConfig> = {
  general: {
    label: "All Topics",
    icon: Bot,
    placeholder: "Ask me anything about your career…",
    starters: [
      "How can I accelerate my career growth?",
      "What should I prioritize in my job search?",
    ],
  },
  resume: {
    label: "Resume",
    icon: FileText,
    placeholder: "Ask about your resume…",
    starters: [
      "What are the biggest weaknesses in my resume?",
      "Rewrite my summary to be more compelling.",
    ],
  },
  ats: {
    label: "ATS",
    icon: Target,
    placeholder: "Ask about ATS scores and keywords…",
    starters: [
      "Why is my ATS score low and how do I fix it?",
      "What keywords should I add for my target role?",
    ],
  },
  "cover-letter": {
    label: "Cover Letter",
    icon: Mail,
    placeholder: "Ask about writing a cover letter…",
    starters: [
      "Write a cover letter for a Senior Engineer role.",
      "How do I open a cover letter without being generic?",
    ],
  },
  interview: {
    label: "Interview",
    icon: Mic,
    placeholder: "Practice interview questions…",
    starters: [
      "Give me 5 behavioral questions to prepare for.",
      "Help me answer 'Tell me about yourself'.",
    ],
  },
  career: {
    label: "Career",
    icon: Sparkles,
    placeholder: "Ask about career growth and transitions…",
    starters: [
      "How do I move from engineer to engineering manager?",
      "What skills should I build in the next 6 months?",
    ],
  },
  "job-search": {
    label: "Job Search",
    icon: Briefcase,
    placeholder: "Ask about finding jobs and networking…",
    starters: [
      "How do I find hidden job opportunities not posted online?",
      "How do I reach out to a recruiter on LinkedIn?",
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

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalAiAssistant() {
  const pathname  = usePathname();
  const params    = useParams<{ locale: string }>();
  const locale    = params.locale ?? "en";
  const t         = useTranslations("Candidate.Workspace.GlobalAssistant");

  const isRTL = locale === "ar";

  // ── Derive page context (memoised so effect deps are stable) ─────────────
  const pageCtx       = React.useMemo(() => getPageContext(pathname), [pathname]);
  const onChatbotPage = React.useMemo(() => isOnChatbotPage(pathname), [pathname]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [open,          setOpen]          = React.useState(false);
  const [view,          setView]          = React.useState<"chat" | "history">("chat");
  const [hasBeenOpened, setHasBeenOpened] = React.useState(false);
  const [isMobile,      setIsMobile]      = React.useState(false);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [initialized,    setInitialized]    = React.useState(false);
  const [sessions,       setSessions]       = React.useState<ChatSession[]>([]);
  const [activeSessionId,setActiveSessionId]= React.useState<string | null>(null);
  const [history,        setHistory]        = React.useState<ChatMessage[]>([]);
  const [domain,         setDomain]         = React.useState<AssistantDomain>(pageCtx.domain);
  const [input,          setInput]          = React.useState("");
  const [loading,        setLoading]        = React.useState(false);
  const [error,          setError]          = React.useState<string | null>(null);
  const [sourceLabels,   setSourceLabels]   = React.useState<string[]>([]);

  const bottomRef   = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ── Mobile detection ──────────────────────────────────────────────────────
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Sync domain to page context when navigating with no active session ────
  const suggestedDomain = pageCtx.domain;
  React.useEffect(() => {
    if (!activeSessionId) setDomain(suggestedDomain);
  }, [pathname, suggestedDomain, activeSessionId]);

  // ── Auto-scroll to latest message ────────────────────────────────────────
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // ── Escape key closes drawer ──────────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // ── Early return (after all hooks) ───────────────────────────────────────
  if (onChatbotPage) return null;

  // ── Session loading ───────────────────────────────────────────────────────
  async function loadSessions() {
    if (initialized) return;
    const result = await getChatSessionsAction();
    if (result.success) setSessions(result.data ?? []);
    setInitialized(true);
  }

  // ── Open drawer ───────────────────────────────────────────────────────────
  function handleOpen() {
    if (!hasBeenOpened) {
      setHasBeenOpened(true);
      void loadSessions();
    }
    setOpen(true);
    setView("chat");
  }

  // ── Domain switch — clears session pointer (Phase 1 invariant) ───────────
  function handleDomainChange(d: AssistantDomain) {
    if (d === domain) return;
    setDomain(d);
    setActiveSessionId(null);
    setHistory([]);
    setError(null);
    setInput("");
    setSourceLabels([]);
    textareaRef.current?.focus();
  }

  // ── Session selection ─────────────────────────────────────────────────────
  async function handleSelectSession(id: string) {
    if (id === activeSessionId) { setView("chat"); return; }
    const result  = await getSessionMessagesAction(id);
    const session = sessions.find((s) => s.id === id);
    if (session) setDomain(session.domain as AssistantDomain);
    setActiveSessionId(id);
    setHistory(result.success ? (result.data ?? []) : []);
    setError(null);
    setInput("");
    setSourceLabels([]);
    setView("chat");
  }

  // ── New chat ──────────────────────────────────────────────────────────────
  function handleNewChat() {
    setActiveSessionId(null);
    setHistory([]);
    setError(null);
    setInput("");
    setSourceLabels([]);
    setDomain(pageCtx.domain);
    setView("chat");
    textareaRef.current?.focus();
  }

  // ── Rename / delete ───────────────────────────────────────────────────────
  async function handleRenameSession(id: string, title: string) {
    const result = await renameChatSessionAction(id, title);
    if (result.success) {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    }
  }

  async function handleDeleteSession(id: string) {
    const result = await deleteChatSessionAction(id);
    if (result.success) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setHistory([]);
        setError(null);
        setSourceLabels([]);
      }
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const created = await createChatSessionAction(domain);
      if (!created.success || !created.data) {
        setError("Could not start a new chat session. Please try again.");
        return;
      }
      currentSessionId = created.data.id;
      setSessions((prev) => [created.data!, ...prev]);
      setActiveSessionId(currentSessionId);
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const result = await sendAssistantMessage(
      [...history, userMsg],
      text,
      domain,
      currentSessionId
    );

    if (result.success && result.data) {
      const { reply, sourceLabels: labels } = result.data;
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
      setSourceLabels(labels);
      setSessions((prev) => {
        const autoTitle =
          text.length > 0
            ? text.slice(0, 60) + (text.length > 60 ? "…" : "")
            : "New Chat";
        return prev
          .map((s) => {
            if (s.id !== currentSessionId) return s;
            return {
              ...s,
              title:               s.title === "New Chat" ? autoTitle : s.title,
              last_message_preview: reply.slice(0, 120),
              updated_at:          new Date().toISOString(),
            };
          })
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      });
    } else {
      setError(result.error ?? "Something went wrong.");
      setHistory((h) => h.slice(0, -1));
    }

    setLoading(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  const sessionListProps = {
    sessions,
    activeSessionId,
    onNewChat:       handleNewChat,
    onSelectSession: handleSelectSession,
    onRenameSession: handleRenameSession,
    onDeleteSession: handleDeleteSession,
  };

  const config = DOMAINS[domain];

  // ── Chat content (single render tree shared by desktop/mobile) ────────────
  const chatContent = (
    <div className="flex h-full flex-col min-h-0">

      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border px-3 py-2.5 shrink-0",
          isRTL && "flex-row-reverse"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div
          className={cn(
            "flex flex-1 items-center gap-2 min-w-0",
            isRTL && "flex-row-reverse"
          )}
        >
          <span className="text-sm font-semibold">{t("drawerTitle")}</span>
          <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground max-w-[120px]">
            {pageCtx.label}
          </span>
        </div>
        <div className={cn("flex items-center gap-1 shrink-0", isRTL && "flex-row-reverse")}>
          <Link
            href={`/${locale}/candidate/workspace/assistant`}
            className="hidden sm:block text-[11px] text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            {t("openFullExperience")} ↗
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setView(view === "history" ? "chat" : "history")}
            title={t("historyTitle")}
            aria-label={t("historyTitle")}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
            aria-label="Close AI Assistant"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── View: history OR chat ── */}
      {view === "history" ? (

        /* ── History view ── */
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-b border-border text-sm shrink-0",
              isRTL && "flex-row-reverse"
            )}
          >
            <button
              onClick={() => setView("chat")}
              className={cn(
                "flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
                isRTL && "flex-row-reverse"
              )}
            >
              <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
              {t("backToChat")}
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <SessionList
              {...sessionListProps}
              onAfterSelect={() => setView("chat")}
            />
          </div>
        </div>

      ) : (

        /* ── Chat view ── */
        <>
          {/* Domain tab bar */}
          <div
            className={cn(
              "flex flex-wrap gap-1 px-3 py-2 border-b border-border shrink-0",
              isRTL && "flex-row-reverse"
            )}
          >
            {DOMAIN_ORDER.map((d) => {
              const cfg  = DOMAINS[d];
              const Icon = cfg.icon;
              return (
                <button
                  key={d}
                  onClick={() => handleDomainChange(d)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    domain === d
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

          {/* Context / source indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border shrink-0",
              isRTL && "flex-row-reverse"
            )}
          >
            <Wifi className="h-3 w-3 text-pra-success shrink-0" />
            {sourceLabels.length > 0 ? (
              <span>
                {t("contextLabel")}: {sourceLabels.join(" · ")}
              </span>
            ) : (
              <span>
                {t("contextLabel")}: {pageCtx.label}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  {React.createElement(config.icon, {
                    className: "h-6 w-6 text-primary",
                  })}
                </div>
                <div>
                  <p className="text-sm font-semibold">{config.label} Assistant</p>
                  <p className="mt-0.5 text-xs text-muted-foreground max-w-[260px]">
                    {config.placeholder}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {config.starters.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="rounded-lg border border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {history.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user"
                        ? isRTL ? "justify-start" : "justify-end"
                        : isRTL ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && !isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && !isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                    {msg.role === "assistant" && isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    {msg.role === "user" && isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div
                    className={cn(
                      "flex gap-2",
                      isRTL ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <span className="flex gap-1">
                        <span
                          className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    </div>
                    {isRTL && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-destructive text-center">{error}</p>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className={cn(
              "border-t border-border p-3 shrink-0",
              isRTL && "text-right"
            )}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className={cn("flex gap-2", isRTL && "flex-row-reverse")}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={config.placeholder}
                rows={2}
                className="resize-none text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                className="shrink-0 self-end"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop pill FAB (md+) */}
      <button
        onClick={handleOpen}
        aria-label={t("openButton")}
        data-testid="global-ai-tab"
        className={cn(
          "hidden md:flex fixed bottom-6 z-[55]",
          "items-center gap-3 px-6 h-[52px] min-w-[188px]",
          "rounded-[14px] border-0 cursor-pointer",
          "text-white font-semibold text-sm",
          "shadow-[0_6px_20px_0_rgba(37,99,235,0.30)]",
          "transition-all duration-200",
          "hover:shadow-[0_8px_28px_0_rgba(37,99,235,0.40)] hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pra-primary focus-visible:ring-offset-2",
          isRTL ? "left-6" : "right-6"
        )}
        style={{ background: "var(--pra-ai-gradient)" }}
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t("openButton")}</span>
      </button>

      {/* Mobile FAB (< md) */}
      <button
        onClick={handleOpen}
        aria-label={t("openButton")}
        data-testid="global-ai-fab"
        className={cn(
          "md:hidden fixed bottom-6 z-[55]",
          "flex h-14 w-14 items-center justify-center rounded-full border-0 cursor-pointer",
          "text-white",
          "shadow-[0_4px_14px_0_rgba(37,99,235,0.25)]",
          "transition-all duration-200",
          "hover:shadow-[0_6px_20px_0_rgba(37,99,235,0.35)] hover:-translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pra-primary focus-visible:ring-offset-2",
          isRTL ? "left-4" : "right-4"
        )}
        style={{ background: "var(--pra-ai-gradient)" }}
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Chat panel — only mounts after first open (lazy) */}
      {hasBeenOpened && (
        <>
          {/* Desktop: persistent backdrop (closes on click) */}
          {open && !isMobile && (
            <div
              className="hidden md:block fixed inset-0 z-[54] bg-black/20"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Desktop slide-in drawer */}
          {!isMobile && (
            <div
              role="dialog"
              aria-label="AI Assistant"
              aria-modal={open}
              aria-hidden={!open}
              className={cn(
                "hidden md:flex fixed top-0 bottom-0 z-[56] w-[420px] flex-col bg-card shadow-2xl",
                "transition-transform duration-300 ease-in-out border-border",
                isRTL
                  ? cn(
                      "left-0 border-r",
                      open ? "translate-x-0" : "-translate-x-full"
                    )
                  : cn(
                      "right-0 border-l",
                      open ? "translate-x-0" : "translate-x-full"
                    )
              )}
            >
              {chatContent}
            </div>
          )}

          {/* Mobile full-screen overlay */}
          {isMobile && open && (
            <div
              role="dialog"
              aria-label="AI Assistant"
              aria-modal="true"
              className="md:hidden fixed inset-0 z-[56] flex flex-col bg-card"
            >
              {chatContent}
            </div>
          )}
        </>
      )}
    </>
  );
}
