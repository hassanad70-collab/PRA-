"use client";

import { useState, useTransition } from "react";

import { CheckCircle, Clock, FileText, Loader2, Plus, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createOfferAction,
  generateOfferLetterAction,
  withdrawOfferAction,
} from "@/actions/offers";
import { initials } from "@/lib/utils";
import type { OfferWithContext, OfferStatus } from "@/types/database";

export interface OfferManagerLabels {
  title: string;
  createOffer: string;
  noOffers: string;
  salaryRange: string;
  startDate: string;
  expiryDate: string;
  offerLetter: string;
  generateLetter: string;
  generating: string;
  additionalNotes: string;
  withdraw: string;
  withdrawConfirm: string;
  send: string;
  sending: string;
  cancel: string;
  offerTitle: string;
  currency: string;
  statusLabels: Record<OfferStatus, string>;
  sentOn: string;
  respondedOn: string;
}

interface Props {
  jobId: string;
  jobTitle: string;
  companyName: string;
  recruiterName: string;
  initialOffers: OfferWithContext[];
  labels: OfferManagerLabels;
}

const STATUS_ICON: Record<OfferStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  accepted: <CheckCircle className="h-3.5 w-3.5 text-pra-success" />,
  declined: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  expired: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  withdrawn: <XCircle className="h-3.5 w-3.5 text-muted-foreground" />,
};

const STATUS_VARIANT: Record<OfferStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  declined: "destructive",
  expired: "outline",
  withdrawn: "outline",
};

export function OfferManager({ jobId, jobTitle, companyName, recruiterName, initialOffers, labels }: Props) {
  const [offers, setOffers] = useState(initialOffers);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    candidateId: "",
    candidateName: "",
    offerTitle: jobTitle,
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    startDate: "",
    expiryDate: "",
    offerLetter: "",
    additionalNotes: "",
  });

  function openCreate(candidateId: string, candidateName: string) {
    setForm((f) => ({ ...f, candidateId, candidateName, offerTitle: jobTitle }));
    setOpen(true);
  }

  function handleGenerateLetter() {
    startTransition(async () => {
      const letter = await generateOfferLetterAction({
        candidateName: form.candidateName,
        jobTitle: form.offerTitle,
        companyName,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
        currency: form.currency,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate || null,
        recruiterName,
        additionalNotes: form.additionalNotes,
      });
      setForm((f) => ({ ...f, offerLetter: letter }));
    });
  }

  function handleSend() {
    if (!form.candidateId || !form.offerTitle) return;
    startTransition(async () => {
      const { id } = await createOfferAction({
        jobId,
        candidateId: form.candidateId,
        offerTitle: form.offerTitle,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
        currency: form.currency,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate || null,
        offerLetter: form.offerLetter || null,
      });
      setOpen(false);
      // Refresh — show optimistic entry
      setOffers((prev) => [
        {
          id,
          company_id: "",
          job_id: jobId,
          candidate_id: form.candidateId,
          recruiter_id: "",
          offer_title: form.offerTitle,
          salary_min: form.salaryMin ? parseInt(form.salaryMin) : null,
          salary_max: form.salaryMax ? parseInt(form.salaryMax) : null,
          currency: form.currency,
          start_date: form.startDate || null,
          expiry_date: form.expiryDate || null,
          offer_letter: form.offerLetter || null,
          status: "pending",
          candidate_note: null,
          sent_at: new Date().toISOString(),
          responded_at: null,
          created_at: new Date().toISOString(),
          job: { id: jobId, title: jobTitle, location: null },
          candidate: { id: form.candidateId, profile: { full_name: form.candidateName, email: "" } },
          recruiter: { full_name: recruiterName, email: "" },
        } as OfferWithContext,
        ...prev,
      ]);
    });
  }

  function handleWithdraw(offerId: string) {
    setWithdrawingId(offerId);
    startTransition(async () => {
      await withdrawOfferAction(offerId);
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: "withdrawn" as OfferStatus } : o))
      );
      setWithdrawingId(null);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => openCreate("", "")}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {labels.createOffer}
        </Button>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noOffers}</p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const cn = (offer.candidate as unknown as { profile: { full_name: string } }).profile?.full_name ?? "Candidate";
              return (
                <div key={offer.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(cn)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cn}</p>
                      {offer.salary_min && offer.salary_max && (
                        <p className="text-xs text-muted-foreground">
                          {offer.currency} {offer.salary_min.toLocaleString()} – {offer.salary_max.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[offer.status]} className="flex items-center gap-1 text-xs">
                      {STATUS_ICON[offer.status]}
                      {labels.statusLabels[offer.status]}
                    </Badge>
                    {offer.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={withdrawingId === offer.id || isPending}
                        onClick={() => handleWithdraw(offer.id)}
                      >
                        {withdrawingId === offer.id ? <Loader2 className="h-3 w-3 animate-spin" /> : labels.withdraw}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create offer dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {labels.createOffer}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>{labels.offerTitle}</Label>
                <Input
                  value={form.offerTitle}
                  onChange={(e) => setForm((f) => ({ ...f, offerTitle: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>{labels.salaryRange} (min)</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={form.salaryMin}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{labels.salaryRange} (max)</Label>
                  <Input
                    type="number"
                    placeholder="70000"
                    value={form.salaryMax}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{labels.currency}</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>{labels.startDate}</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{labels.expiryDate}</Label>
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{labels.additionalNotes}</Label>
                <Textarea
                  rows={2}
                  value={form.additionalNotes}
                  onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                  placeholder="Equity, remote policy, signing bonus…"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{labels.offerLetter}</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleGenerateLetter}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    {isPending ? labels.generating : labels.generateLetter}
                  </Button>
                </div>
                <Textarea
                  rows={8}
                  value={form.offerLetter}
                  onChange={(e) => setForm((f) => ({ ...f, offerLetter: e.target.value }))}
                  placeholder="Write or generate an offer letter…"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={handleSend} disabled={!form.offerTitle || isPending}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isPending ? labels.sending : labels.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
