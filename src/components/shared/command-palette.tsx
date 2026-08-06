"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaletteItem {
  href: string;
  label: string;
  group?: string;
}

interface Props {
  items: PaletteItem[];
}

export function CommandPalette({ items }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.group ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filtered]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      navigate(filtered[activeIndex].href);
    }
  }

  // Group items for display
  const grouped = React.useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const g = item.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return map;
  }, [filtered]);

  // Flat index for keyboard navigation
  const flatFiltered = filtered;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Open command palette (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Search…</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-popover shadow-2xl"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages and tools…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Dialog.Close asChild>
              <button aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {flatFiltered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            {Array.from(grouped.entries()).map(([group, groupItems]) => {
              return (
                <div key={group}>
                  {group && (
                    <p className="mb-0.5 mt-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group}
                    </p>
                  )}
                  {groupItems.map((item) => {
                    const flatIdx = flatFiltered.indexOf(item);
                    return (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          flatIdx === activeIndex
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        {item.label}
                        {item.group && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {item.group}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground flex gap-4">
            <span>↑↓ navigate</span>
            <span>⏎ open</span>
            <span>Esc close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
