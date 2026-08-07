"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { unsaveCandidateAction, updateSavedCandidateNotesAction } from "@/actions/employer";
import { initials } from "@/lib/utils";
import type { SavedCandidateWithProfile } from "@/types/database";

interface SavedCandidatesClientProps {
  initialSaved: SavedCandidateWithProfile[];
  labels: {
    empty: string;
    notes: string;
    saveNotes: string;
    remove: string;
    viewProfile: string;
    noteSaved: string;
    removed: string;
  };
}

export function SavedCandidatesClient({ initialSaved, labels }: SavedCandidatesClientProps) {
  const [saved, setSaved] = React.useState(initialSaved);
  const [noteEditing, setNoteEditing] = React.useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  async function handleRemove(candidateId: string) {
    setRemoving(candidateId);
    try {
      await unsaveCandidateAction(candidateId);
      setSaved((prev) => prev.filter((s) => s.candidate_id !== candidateId));
      toast.success(labels.removed);
    } finally {
      setRemoving(null);
    }
  }

  async function handleSaveNote(candidateId: string) {
    setSavingNote(candidateId);
    try {
      await updateSavedCandidateNotesAction(candidateId, noteEditing[candidateId] ?? "");
      setSaved((prev) =>
        prev.map((s) =>
          s.candidate_id === candidateId ? { ...s, notes: noteEditing[candidateId] ?? s.notes } : s
        )
      );
      toast.success(labels.noteSaved);
      setNoteEditing((prev) => { const n = { ...prev }; delete n[candidateId]; return n; });
    } finally {
      setSavingNote(null);
    }
  }

  if (saved.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">{labels.empty}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((s) => {
        const name = s.candidate?.profile?.full_name ?? "—";
        const pos = s.candidate?.current_position ?? "—";
        const isEditingNote = noteEditing[s.candidate_id] !== undefined;

        return (
          <Card key={s.id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{pos}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={removing === s.candidate_id}
                  onClick={() => handleRemove(s.candidate_id)}
                >
                  {removing === s.candidate_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>

              {s.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {isEditingNote ? (
                  <>
                    <Textarea
                      value={noteEditing[s.candidate_id]}
                      onChange={(e) => setNoteEditing((prev) => ({ ...prev, [s.candidate_id]: e.target.value }))}
                      className="min-h-[72px] text-sm"
                      placeholder={labels.notes}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={savingNote === s.candidate_id}
                        onClick={() => handleSaveNote(s.candidate_id)}
                      >
                        {savingNote === s.candidate_id ? <Loader2 className="h-3 w-3 animate-spin" /> : labels.saveNotes}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNoteEditing((prev) => { const n = { ...prev }; delete n[s.candidate_id]; return n; })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p
                    className="min-h-[36px] cursor-text rounded border border-transparent p-1 text-sm text-muted-foreground hover:border-border"
                    onClick={() => setNoteEditing((prev) => ({ ...prev, [s.candidate_id]: s.notes ?? "" }))}
                  >
                    {s.notes || <span className="italic opacity-50">{labels.notes}</span>}
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/recruiter/candidates/${s.candidate_id}`}>{labels.viewProfile}</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
