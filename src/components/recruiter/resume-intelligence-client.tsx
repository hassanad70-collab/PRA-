"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

interface ResumeEntry {
  id: string;
  file_name: string | null;
  created_at: string;
  parse_status: string | null;
  parsed_data: Record<string, unknown> | null;
  candidate_id: string;
  ats_scores: Array<{ score: number; feedback: string | null; keyword_matches: string[] | null; keyword_gaps: string[] | null }>;
}

interface CandidateSummary {
  id: string;
  name: string;
  position: string | null;
}

interface ResumeIntelligenceClientProps {
  candidates: CandidateSummary[];
  labels: {
    searchPlaceholder: string;
    selectCandidate: string;
    noResumes: string;
    atsScore: string;
    keywords: string;
    gaps: string;
    skills: string;
    summary: string;
    experience: string;
    education: string;
    loadFailed: string;
  };
}

export function ResumeIntelligenceClient({ candidates, labels }: ResumeIntelligenceClientProps) {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [resumes, setResumes] = React.useState<ResumeEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const filtered = candidates.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.position ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function selectCandidate(id: string) {
    setSelectedId(id);
    setResumes([]);
    setExpandedId(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/recruiter/resume-intelligence?candidateId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      } else {
        toast.error(labels.loadFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedCandidate = candidates.find((c) => c.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Candidate list */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="ps-9"
          />
        </div>
        <div className="h-[calc(100vh-260px)] overflow-y-auto space-y-1 rounded-lg border border-border p-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCandidate(c.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-accent ${selectedId === c.id ? "bg-primary/10 text-primary" : ""}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(c.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                {c.position && <p className="truncate text-[11px] text-muted-foreground">{c.position}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resume panel */}
      <div className="space-y-4">
        {!selectedId && (
          <Card>
            <CardContent className="py-20 text-center text-sm text-muted-foreground">{labels.selectCandidate}</CardContent>
          </Card>
        )}

        {selectedId && loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {selectedId && !loading && resumes.length === 0 && (
          <Card>
            <CardContent className="py-20 text-center text-sm text-muted-foreground">{labels.noResumes}</CardContent>
          </Card>
        )}

        {resumes.map((resume) => {
          const ats = resume.ats_scores?.[0];
          const parsed = resume.parsed_data as Record<string, unknown> | null;
          const isExpanded = expandedId === resume.id;

          return (
            <Card key={resume.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm">{resume.file_name ?? "Resume"}</CardTitle>
                      <p className="text-xs text-muted-foreground">{new Date(resume.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ats && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{ats.score}</p>
                        <p className="text-[10px] text-muted-foreground">{labels.atsScore}</p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(isExpanded ? null : resume.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {ats && (
                    <div className="space-y-3">
                      {ats.feedback && (
                        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{ats.feedback}</p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ats.keyword_matches?.length ? (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-success">{labels.keywords}</p>
                            <div className="flex flex-wrap gap-1">
                              {ats.keyword_matches.map((k) => (
                                <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {ats.keyword_gaps?.length ? (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-destructive">{labels.gaps}</p>
                            <div className="flex flex-wrap gap-1">
                              {ats.keyword_gaps.map((k) => (
                                <Badge key={k} variant="outline" className="text-[10px] text-destructive">{k}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {parsed && (
                    <div className="space-y-3">
                      {(parsed.summary as string | null) && (
                        <div>
                          <p className="mb-1 text-xs font-semibold">{labels.summary}</p>
                          <p className="text-sm text-muted-foreground">{parsed.summary as string}</p>
                        </div>
                      )}
                      {Array.isArray(parsed.skills) && parsed.skills.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold">{labels.skills}</p>
                          <div className="flex flex-wrap gap-1">
                            {(parsed.skills as string[]).map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
