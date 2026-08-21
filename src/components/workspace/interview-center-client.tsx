"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  Brain,
  Code2,
  Users,
  Star,
  BarChart2,
  Building2,
  Send,
  ChevronDown,
  ChevronUp,
  Trophy,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Play,
  AlertCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  generateFirstQuestionAction,
  startMockInterviewAction,
  appendInterviewTurnAction,
  completeMockInterviewAction,
  deleteMockInterviewAction,
} from "@/actions/workspace";
import { parseEvalLine, parseFinalReport } from "@/lib/ai/mock-interview-utils";
import type { MockInterviewSession, MockInterviewType, MockInterviewEvaluation } from "@/types/database";

const MAX_QUESTIONS = 8;

const INTERVIEW_TYPES: {
  type: MockInterviewType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "hr",         label: "HR / Culture Fit",     desc: "Motivation, values, fit",           icon: Users },
  { type: "technical",  label: "Technical",            desc: "Role-specific technical knowledge",  icon: Code2 },
  { type: "behavioral", label: "Behavioral",           desc: "STAR-format past behavior",          icon: Brain },
  { type: "star",       label: "STAR Method",          desc: "Situation/Task/Action/Result",       icon: Star },
  { type: "case_study", label: "Case Study",           desc: "Business scenario analysis",        icon: BarChart2 },
  { type: "company",    label: "Company-Specific",     desc: "Tailored to job description",       icon: Building2 },
];

const XP_LEVELS = ["Entry Level", "Junior", "Mid-Level", "Senior", "Lead / Principal", "Director / Executive"];

const SCORE_DIMENSION_LABELS: Record<string, string> = {
  overall: "Overall", communication: "Communication", confidence: "Confidence",
  technical: "Technical", grammar: "Grammar", leadership: "Leadership",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "bg-pra-success" : value >= 50 ? "bg-pra-warning" : "bg-pra-danger";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EvalCard({ evaluation }: { evaluation: MockInterviewEvaluation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            evaluation.score >= 75 ? "bg-pra-success/10 text-pra-success" :
            evaluation.score >= 50 ? "bg-pra-warning/10 text-pra-warning" :
            "bg-pra-danger/10 text-pra-danger"
          }`}
        >
          {evaluation.score}/100
        </div>
        <span className="text-muted-foreground text-xs flex-1 text-left line-clamp-1">{evaluation.feedback}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs">{evaluation.feedback}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["communication", "technical", "confidence", "grammar"] as const).map(dim => (
              <ScoreBar key={dim} label={dim.charAt(0).toUpperCase() + dim.slice(1)} value={evaluation[dim]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: { role: string; content: string; evaluation?: MockInterviewEvaluation; streaming?: boolean } }) {
  const isUser = msg.role === "user";
  const content = msg.content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
        ${isUser ? "bg-primary text-primary-foreground" : "bg-muted border"}`}
      >
        {isUser ? "You" : <Mic className="h-3.5 w-3.5" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "items-end flex flex-col" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          }`}
          dangerouslySetInnerHTML={{ __html: content + (msg.streaming ? '<span class="animate-pulse">▋</span>' : "") }}
        />
        {!isUser && msg.evaluation && <EvalCard evaluation={msg.evaluation} />}
      </div>
    </div>
  );
}

function SessionReport({ session, onNewInterview }: { session: MockInterviewSession; onNewInterview: () => void }) {
  const scores = session.scores;
  if (!scores) return null;
  const readiness = session.readiness_score ?? 0;
  const readinessColor = readiness >= 75 ? "text-pra-success" : readiness >= 50 ? "text-pra-warning" : "text-pra-danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-pra-warning" />
          Interview Complete — Final Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold tabular-nums">{scores.overall}</p>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-bold tabular-nums ${readinessColor}`}>{readiness}%</p>
            <p className="text-sm text-muted-foreground">Readiness Score</p>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(scores)
            .filter(([k]) => k !== "overall")
            .map(([key, val]) => (
              <ScoreBar key={key} label={SCORE_DIMENSION_LABELS[key] ?? key} value={val} />
            ))}
        </div>

        {session.ai_summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
            <p className="text-sm">{session.ai_summary}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {session.strengths && session.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {session.strengths.map((s, i) => (
                  <Badge key={i} variant="secondary" className="bg-pra-success/10 text-pra-success text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {session.weaknesses && session.weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Areas to Improve</p>
              <div className="flex flex-wrap gap-1.5">
                {session.weaknesses.map((w, i) => (
                  <Badge key={i} variant="secondary" className="bg-pra-danger/10 text-pra-danger text-xs">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {session.coaching_tips && session.coaching_tips.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Coaching Tips</p>
            <ul className="space-y-1">
              {session.coaching_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={onNewInterview} className="w-full gap-2">
          <Play className="h-4 w-4" />
          Start New Interview
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionHistory({
  sessions,
  onDelete,
  onResume,
}: {
  sessions: MockInterviewSession[];
  onDelete: (id: string) => void;
  onResume: (s: MockInterviewSession) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Session History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {sessions.map(s => {
            const isExpanded = expandedId === s.id;
            const label = INTERVIEW_TYPES.find(t => t.type === s.interview_type)?.label ?? s.interview_type;
            return (
              <div key={s.id} className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{s.target_role}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{label}</Badge>
                      {s.status === "completed" && (
                        <Badge variant="secondary" className="text-xs bg-pra-success/10 text-pra-success shrink-0">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()} · {s.question_count} questions
                      {s.scores && ` · Score: ${s.scores.overall}/100`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.status === "active" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onResume(s)}>
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    {s.status === "completed" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {isExpanded && s.status === "completed" && s.scores && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(s.scores).map(([k, v]) => (
                        <div key={k} className="text-center">
                          <p className="text-xs text-muted-foreground">{SCORE_DIMENSION_LABELS[k] ?? k}</p>
                          <p className="text-sm font-semibold tabular-nums">{v}</p>
                        </div>
                      ))}
                    </div>
                    {s.ai_summary && <p className="text-xs text-muted-foreground">{s.ai_summary}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type UiMessage = {
  role: "assistant" | "user";
  content: string;
  evaluation?: MockInterviewEvaluation;
  streaming?: boolean;
};

interface Props {
  initialSessions: MockInterviewSession[];
}

export function InterviewCenterClient({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<MockInterviewSession[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [phase, setPhase] = useState<"setup" | "interview" | "complete">("setup");
  const [error, setError] = useState<string | null>(null);

  // Setup form
  const [selectedType, setSelectedType] = useState<MockInterviewType>("hr");
  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [xpLevel, setXpLevel] = useState("");
  const [startingUp, setStartingUp] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resumeSession = useCallback((session: MockInterviewSession) => {
    setActiveSession(session);
    const uiMsgs: UiMessage[] = session.messages.map(m => ({
      role: m.role,
      content: m.content,
      evaluation: m.evaluation,
    }));
    setMessages(uiMsgs);
    setQuestionCount(session.question_count);
    setPhase(session.status === "completed" ? "complete" : "interview");
  }, []);

  const startInterview = useCallback(async () => {
    if (!targetRole.trim()) { setError("Please enter a target role."); return; }
    setError(null);
    setStartingUp(true);

    try {
      const qRes = await generateFirstQuestionAction(
        selectedType, targetRole.trim(), companyName.trim() || undefined,
        jobDesc.trim() || undefined, xpLevel || undefined,
      );
      const firstQuestion = qRes.data ?? `**Tell me about yourself and your interest in the ${targetRole.trim()} role.**`;

      const res = await startMockInterviewAction({
        interview_type: selectedType,
        target_role: targetRole.trim(),
        company_name: companyName.trim() || undefined,
        job_description: jobDesc.trim() || undefined,
        experience_level: xpLevel || undefined,
        firstMessage: firstQuestion,
      });

      if (!res.success || !res.data) {
        setError(res.error ?? "Failed to start interview.");
        return;
      }

      setActiveSession(res.data);
      setMessages([{ role: "assistant", content: firstQuestion }]);
      setQuestionCount(0);
      setPhase("interview");
      setSessions(prev => [res.data!, ...prev]);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setStartingUp(false);
    }
  }, [selectedType, targetRole, companyName, jobDesc, xpLevel]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !activeSession) return;
    const userText = input.trim();
    setInput("");
    setError(null);

    const isLastQuestion = questionCount >= MAX_QUESTIONS - 1;

    const updatedMessages: UiMessage[] = [
      ...messages,
      { role: "user" as const, content: userText },
    ];
    setMessages(updatedMessages);
    setStreaming(true);

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const response = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType: activeSession.interview_type,
          targetRole: activeSession.target_role,
          company: activeSession.company_name,
          jobDescription: activeSession.job_description,
          experienceLevel: activeSession.experience_level,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          isFinalize: isLastQuestion,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === "assistant") {
            next[next.length - 1] = { ...last, content: fullText, streaming: true };
          }
          return next;
        });
      }

      // Check for final report
      const finalReport = parseFinalReport(fullText);
      if (finalReport) {
        const displayText = fullText.includes("FINAL_REPORT")
          ? "Interview complete! Your detailed report is ready below."
          : fullText;

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: displayText, streaming: false };
          return next;
        });

        await completeMockInterviewAction(activeSession.id, finalReport);
        const updatedSession = { ...activeSession, ...finalReport, status: "completed" as const };
        setActiveSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
        setPhase("complete");
        return;
      }

      // Parse evaluation from response
      const { evaluation, cleanText } = parseEvalLine(fullText);
      const evalTyped = evaluation as MockInterviewEvaluation | null;

      setMessages(prev => {
        const next = [...prev];
        // Mark streaming done on assistant message
        next[next.length - 1] = { role: "assistant", content: cleanText, streaming: false };
        // Attach evaluation to the user message (second-to-last)
        if (evalTyped) {
          const userIdx = next.length - 2;
          if (userIdx >= 0 && next[userIdx].role === "user") {
            next[userIdx] = { ...next[userIdx], evaluation: evalTyped };
          }
        }
        return next;
      });

      // Persist turn
      const newCount = questionCount + 1;
      setQuestionCount(newCount);
      await appendInterviewTurnAction(activeSession.id, userText, cleanText, evalTyped);
    } catch (e) {
      console.error("Interview stream error:", e);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "I encountered an error. Please try again.",
          streaming: false,
        };
        return next;
      });
      setError("Stream error. Please try again.");
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, activeSession, messages, questionCount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMockInterviewAction(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) {
      setActiveSession(null);
      setMessages([]);
      setPhase("setup");
    }
  }, [activeSession]);

  const startNew = useCallback(() => {
    setActiveSession(null);
    setMessages([]);
    setQuestionCount(0);
    setPhase("setup");
    setTargetRole("");
    setCompanyName("");
    setJobDesc("");
    setXpLevel("");
    setError(null);
  }, []);

  // Completed session view
  if (phase === "complete" && activeSession) {
    return (
      <div className="space-y-4">
        <SessionReport session={activeSession} onNewInterview={startNew} />
        <SessionHistory sessions={sessions} onDelete={handleDelete} onResume={resumeSession} />
      </div>
    );
  }

  // Active interview view
  if (phase === "interview" && activeSession) {
    const progress = Math.min(100, Math.round((questionCount / MAX_QUESTIONS) * 100));
    const typeLabel = INTERVIEW_TYPES.find(t => t.type === activeSession.interview_type)?.label ?? activeSession.interview_type;

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary">{typeLabel}</Badge>
            <span className="text-sm font-medium truncate">{activeSession.target_role}</span>
            {activeSession.company_name && (
              <span className="text-sm text-muted-foreground">@ {activeSession.company_name}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-muted-foreground">
              Q {questionCount}/{MAX_QUESTIONS}
            </div>
            <div className="w-24">
              <Progress value={progress} className="h-1.5" />
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={startNew}>
              End Session
            </Button>
          </div>
        </div>

        {/* Chat */}
        <Card className="flex flex-col" style={{ minHeight: "60vh" }}>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "65vh" }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </CardContent>

          {error && (
            <div className="px-4 py-2 flex items-center gap-2 text-sm text-pra-danger bg-pra-danger/5 border-t">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                className="min-h-[80px] resize-none text-sm"
                disabled={streaming}
              />
              <Button
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="shrink-0 self-end"
              >
                {streaming
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Setup view
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">AI Mock Interview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Practice with an AI interviewer, get real-time feedback on every answer, and receive a full performance report after {MAX_QUESTIONS} questions.
        </p>
      </div>

      {/* Interview type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Interview Type</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INTERVIEW_TYPES.map(({ type, label, desc, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all
                ${selectedType === type
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
            >
              <Icon className={`h-4 w-4 ${selectedType === type ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-xs font-medium leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Setup fields */}
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="target-role">Target Role <span className="text-pra-danger">*</span></Label>
          <Input
            id="target-role"
            placeholder="e.g. Senior Software Engineer"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="company">Company Name (optional)</Label>
            <Input
              id="company"
              placeholder="e.g. Google, Startup X"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xp-level">Experience Level</Label>
            <select
              id="xp-level"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={xpLevel}
              onChange={e => setXpLevel(e.target.value)}
            >
              <option value="">Select level</option>
              {XP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {(selectedType === "company" || selectedType === "technical") && (
          <div className="space-y-1.5">
            <Label htmlFor="job-desc">Job Description (optional but recommended)</Label>
            <Textarea
              id="job-desc"
              placeholder="Paste the job description for more tailored questions…"
              className="min-h-[100px] text-sm resize-none"
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-pra-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={startInterview}
        disabled={startingUp || !targetRole.trim()}
        className="w-full gap-2"
        size="lg"
      >
        {startingUp
          ? <><RefreshCw className="h-4 w-4 animate-spin" /> Preparing Interview…</>
          : <><Play className="h-4 w-4" /> Start Interview</>
        }
      </Button>

      <SessionHistory sessions={sessions} onDelete={handleDelete} onResume={resumeSession} />
    </div>
  );
}
