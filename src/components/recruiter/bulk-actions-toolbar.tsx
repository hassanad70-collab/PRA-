"use client";

import * as React from "react";
import { toast } from "sonner";
import { Archive, Calendar, Loader2, Mail, Tag, XCircle } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  bulkAssignRecruiter,
  bulkDraftEmail,
  bulkScheduleInterviews,
  bulkTagCandidates,
  bulkUpdateApplicationStatus,
} from "@/actions/bulk-applications";
import { CsvExportButton } from "@/components/recruiter/csv-export-button";
import type { ApplicationStatus, InterviewType } from "@/types/database";
import type { CandidateMessageDraft } from "@/lib/ai/candidate-message-drafter";

const INTERVIEW_TYPES: InterviewType[] = ["phone", "video", "onsite", "technical", "panel", "final"];

export interface BulkToolbarRecruiter {
  id: string;
  name: string;
}

export interface BulkToolbarExportRow {
  name: string;
  position: string;
  status: string;
  atsScore: string | number;
  aiScore: string | number;
}

export interface BulkToolbarLabels {
  selectedCount: string;
  moveTo: string;
  reject: string;
  archive: string;
  tag: string;
  tagPlaceholder: string;
  apply: string;
  assignRecruiter: string;
  unassigned: string;
  scheduleInterviews: string;
  email: string;
  export: string;
  scheduleDialogTitle: string;
  scheduledAt: string;
  duration: string;
  interviewType: string;
  interviewTypeLabels: Record<InterviewType, string>;
  locationOrLink: string;
  scheduleSubmit: string;
  emailDialogTitle: string;
  messageType: string;
  rejectionOption: string;
  offerOption: string;
  generateDraft: string;
  copyMessage: string;
  copyEmails: string;
  copiedMessage: string;
  copiedEmails: string;
  subject: string;
  body: string;
  toastSuccess: string;
  toastFailed: string;
  statusOptions: Record<ApplicationStatus, string>;
}

export function BulkActionsToolbar({
  selectedApplicationIds,
  selectedCandidateIds,
  recruiters,
  exportRows,
  labels,
}: {
  selectedApplicationIds: string[];
  selectedCandidateIds: string[];
  recruiters: BulkToolbarRecruiter[];
  exportRows: BulkToolbarExportRow[];
  labels: BulkToolbarLabels;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [tagInput, setTagInput] = React.useState("");
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [emailDraft, setEmailDraft] = React.useState<CandidateMessageDraft | null>(null);
  const [recipientEmails, setRecipientEmails] = React.useState<string[]>([]);
  const [messageType, setMessageType] = React.useState<"rejection" | "offer">("rejection");
  const [interviewType, setInterviewType] = React.useState<InterviewType>("video");

  const count = selectedApplicationIds.length;

  const runAction = (action: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(labels.toastSuccess.replace("__COUNT__", String(count)));
        router.refresh();
      } else {
        toast.error(result.error ?? labels.toastFailed);
      }
    });
  };

  const handleGenerateDraft = () => {
    startTransition(async () => {
      const result = await bulkDraftEmail(selectedApplicationIds, messageType);
      if (result.success) {
        setEmailDraft(result.draft ?? null);
        setRecipientEmails(result.recipientEmails ?? []);
      } else {
        toast.error(result.error ?? labels.toastFailed);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2" data-testid="bulk-actions-toolbar">
      <span className="px-2 text-sm text-muted-foreground">{labels.selectedCount.replace("__COUNT__", String(count))}</span>

      <Select onValueChange={(v) => runAction(() => bulkUpdateApplicationStatus(selectedApplicationIds, v as ApplicationStatus))}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder={labels.moveTo} />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels.statusOptions) as ApplicationStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {labels.statusOptions[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => runAction(() => bulkUpdateApplicationStatus(selectedApplicationIds, "rejected"))}
      >
        <XCircle className="h-3.5 w-3.5" /> {labels.reject}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => runAction(() => bulkUpdateApplicationStatus(selectedApplicationIds, "archived"))}
      >
        <Archive className="h-3.5 w-3.5" /> {labels.archive}
      </Button>

      <div className="flex items-center gap-1">
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder={labels.tagPlaceholder}
          className="h-8 w-40 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || !tagInput.trim()}
          onClick={() =>
            runAction(async () => {
              const result = await bulkTagCandidates(selectedCandidateIds, tagInput.split(","));
              if (result.success) setTagInput("");
              return result;
            })
          }
        >
          <Tag className="h-3.5 w-3.5" /> {labels.tag}
        </Button>
      </div>

      <Select onValueChange={(v) => runAction(() => bulkAssignRecruiter(selectedApplicationIds, v === "__unassigned__" ? null : v))}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder={labels.assignRecruiter} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unassigned__">{labels.unassigned}</SelectItem>
          {recruiters.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Calendar className="h-3.5 w-3.5" /> {labels.scheduleInterviews}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.scheduleDialogTitle.replace("__COUNT__", String(count))}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            action={(formData: FormData) => {
              startTransition(async () => {
                const result = await bulkScheduleInterviews(selectedApplicationIds, {
                  scheduledAt: String(formData.get("scheduledAt")),
                  durationMinutes: Number(formData.get("durationMinutes")) || 45,
                  interviewType: String(formData.get("interviewType")),
                  locationOrLink: String(formData.get("locationOrLink") ?? ""),
                });
                if (result.success) {
                  toast.success(labels.toastSuccess.replace("__COUNT__", String(count)));
                  setScheduleOpen(false);
                  router.refresh();
                } else {
                  toast.error(result.error ?? labels.toastFailed);
                }
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">{labels.scheduledAt}</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">{labels.duration}</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={45} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewType">{labels.interviewType}</Label>
              <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
                <SelectTrigger id="interviewType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labels.interviewTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="interviewType" value={interviewType} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationOrLink">{labels.locationOrLink}</Label>
              <Input id="locationOrLink" name="locationOrLink" />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />} {labels.scheduleSubmit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Mail className="h-3.5 w-3.5" /> {labels.email}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.emailDialogTitle.replace("__COUNT__", String(count))}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.messageType}</Label>
              <Select value={messageType} onValueChange={(v) => setMessageType(v as "rejection" | "offer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rejection">{labels.rejectionOption}</SelectItem>
                  <SelectItem value="offer">{labels.offerOption}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={isPending} onClick={handleGenerateDraft}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {labels.generateDraft}
            </Button>
            {emailDraft && (
              <>
                <div className="space-y-2">
                  <Label>{labels.subject}</Label>
                  <Input value={emailDraft.subject} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>{labels.body}</Label>
                  <Textarea value={emailDraft.body} readOnly rows={6} />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                      toast.success(labels.copiedMessage);
                    }}
                  >
                    {labels.copyMessage}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(recipientEmails.join(", "));
                      toast.success(labels.copiedEmails);
                    }}
                  >
                    {labels.copyEmails.replace("__COUNT__", String(recipientEmails.length))}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CsvExportButton
        rows={exportRows.map((r) => ({
          name: r.name,
          position: r.position,
          status: r.status,
          "ats score": r.atsScore,
          "ai score": r.aiScore,
        }))}
        filename={`candidates-${Date.now()}.csv`}
        label={labels.export}
      />
    </div>
  );
}
