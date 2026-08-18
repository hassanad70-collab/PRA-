"use client";

import * as React from "react";
import { Check, History, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AssistantDomain, ChatSession } from "@/actions/ai-assistant";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

// ─── Date grouping ────────────────────────────────────────────────────────────

type DateGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

function getDateGroup(updatedAt: string): DateGroup {
  const now = new Date();
  const date = new Date(updatedAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const sevenDaysStart = new Date(todayStart.getTime() - 6 * 86_400_000);

  if (date >= todayStart) return "Today";
  if (date >= yesterdayStart) return "Yesterday";
  if (date >= sevenDaysStart) return "Previous 7 Days";
  return "Older";
}

const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "Previous 7 Days", "Older"];

const DOMAIN_LABELS: Record<AssistantDomain, string> = {
  general:        "All Topics",
  resume:         "Resume",
  ats:            "ATS",
  "cover-letter": "Cover Letter",
  interview:      "Interview",
  career:         "Career",
  "job-search":   "Job Search",
};

// ─── Session item ─────────────────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editMode, setEditMode] = React.useState(false);
  const [editValue, setEditValue] = React.useState(session.title);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editMode) inputRef.current?.select();
  }, [editMode]);

  // Reset editValue if session title changes externally (e.g., auto-title)
  React.useEffect(() => {
    setEditValue(session.title);
  }, [session.title]);

  async function commitRename() {
    const val = editValue.trim();
    if (!val || val === session.title) { setEditMode(false); return; }
    setBusy(true);
    await onRename(val);
    setBusy(false);
    setEditMode(false);
  }

  async function commitDelete() {
    setBusy(true);
    await onDelete();
    setBusy(false);
    setConfirming(false);
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {editMode ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
              if (e.key === "Escape") { setEditMode(false); setEditValue(session.title); }
            }}
            onBlur={commitRename}
            disabled={busy}
            className="flex-1 min-w-0 bg-transparent outline-none border-b border-primary text-sm"
          />
          <button onClick={commitRename} disabled={busy} className="shrink-0 text-primary hover:opacity-70">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEditMode(false); setEditValue(session.title); }} className="shrink-0 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : confirming ? (
        <div className="flex items-center gap-1.5">
          <span className="flex-1 text-xs text-destructive">Delete?</span>
          <button onClick={commitDelete} disabled={busy} className="text-[10px] font-semibold text-destructive hover:opacity-70">Yes</button>
          <button onClick={() => setConfirming(false)} className="text-[10px] text-muted-foreground hover:opacity-70">No</button>
        </div>
      ) : (
        <button className="flex w-full flex-col gap-0.5 text-left pr-6" onClick={onSelect}>
          <span className="truncate font-medium text-xs leading-snug">
            {session.title}
          </span>
          {session.last_message_preview && (
            <span className="truncate text-[11px] opacity-60 leading-snug">
              {session.last_message_preview}
            </span>
          )}
          <span className="text-[10px] opacity-40">
            {DOMAIN_LABELS[session.domain] ?? session.domain}
          </span>
        </button>
      )}

      {/* Action buttons — shown on hover when not in edit/confirm state */}
      {!editMode && !confirming && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden gap-0.5 group-hover:flex">
          <button
            onClick={(e) => { e.stopPropagation(); setEditMode(true); }}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Session list (shared by desktop sidebar + mobile drawer) ─────────────────

export function SessionList({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onAfterSelect,
}: Props & { onAfterSelect?: () => void }) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.last_message_preview ?? "").toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const grouped = React.useMemo(() => {
    const map = new Map<DateGroup, ChatSession[]>();
    for (const s of filtered) {
      const g = getDateGroup(s.updated_at);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col">
      {/* New Chat button */}
      <div className="p-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-md border border-border bg-muted/30 py-1.5 pl-8 pr-7 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {search ? "No conversations match your search." : "No previous chats."}
            </p>
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const items = grouped.get(group);
            if (!items?.length) return null;
            return (
              <div key={group} className="mt-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={s.id === activeSessionId}
                      onSelect={() => { onSelectSession(s.id); onAfterSelect?.(); }}
                      onRename={(title) => onRenameSession(s.id, title)}
                      onDelete={() => onDeleteSession(s.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function ChatSessionSidebar(props: Props) {
  return (
    <div className="hidden md:flex md:w-60 md:shrink-0 md:flex-col border-r border-border bg-card/50 h-full overflow-hidden">
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Chat History
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <SessionList {...props} />
      </div>
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

export function MobileChatHistoryDrawer(props: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        title="Chat History"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex flex-col p-0 gap-0 max-h-[85vh] sm:max-w-xs w-full"
        >
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm">Chat History</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            <SessionList {...props} onAfterSelect={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
