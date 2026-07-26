"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { draftCandidateMessage } from "@/actions/candidate-messages";
import type { CandidateMessageType } from "@/lib/ai/candidate-message-drafter";

const MESSAGE_TYPES: { value: CandidateMessageType; label: string }[] = [
  { value: "interview_invite", label: "Interview invite" },
  { value: "rejection", label: "Rejection" },
  { value: "offer", label: "Offer" },
];

export function DraftMessageDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = React.useState(false);
  const [messageType, setMessageType] = React.useState<CandidateMessageType>("interview_invite");
  const [isPending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState<{ subject: string; body: string } | null>(null);

  const handleGenerate = () => {
    setDraft(null);
    startTransition(async () => {
      const result = await draftCandidateMessage(applicationId, messageType);
      if (result.success && result.draft) {
        setDraft(result.draft);
      } else {
        toast.error(result.error ?? "Failed to generate a draft.");
      }
    });
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4" /> Draft message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Draft a candidate message</DialogTitle>
          <DialogDescription>
            AI drafts the text below for you to review and send through your own email client — nothing is sent
            automatically.
          </DialogDescription>
        </DialogHeader>

        <Select value={messageType} onValueChange={(v) => setMessageType(v as CandidateMessageType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESSAGE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {draft && (
          <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
            <p>
              <span className="font-medium">Subject: </span>
              {draft.subject}
            </p>
            <p className="whitespace-pre-line text-muted-foreground">{draft.body}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="gradient" disabled={isPending} onClick={handleGenerate}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {draft ? "Regenerate" : "Generate draft"}
          </Button>
          {draft && (
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
