"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Suggestion {
  text: string;
  source: "history" | "jobs";
  count: number;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  field: "title" | "keywords" | "location";
  className?: string;
}

export function SearchAutocomplete({
  value,
  onChange,
  onKeyDown,
  placeholder,
  field,
  className,
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search-autocomplete?q=${encodeURIComponent(q)}&field=${field}`
        );
        if (res.ok) {
          const json = await res.json() as { suggestions: Suggestion[] };
          setSuggestions(json.suggestions ?? []);
          setIsOpen(json.suggestions?.length > 0);
          setActiveIdx(-1);
        }
      } catch {
        // silently ignore network errors — autocomplete is non-critical
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, field]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIdx].text);
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  function selectSuggestion(text: string) {
    onChange(text);
    setIsOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn("pe-7", className)}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          <ul className="py-1" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.text}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s.text);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                  i === activeIdx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                {s.source === "jobs" ? (
                  <TrendingUp className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                ) : (
                  <span className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{s.text}</span>
                {s.count > 1 && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {s.count > 99 ? "99+" : s.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
