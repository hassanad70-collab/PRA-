"use client";

import { useState, useTransition } from "react";

import { formatDistanceToNow } from "date-fns";
import { Building2, Calendar, CheckCircle, Clock, DollarSign, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { respondToOfferAction } from "@/actions/offers";
import type { OfferStatus } from "@/types/database";
import type { CandidateOfferWithContext } from "@/lib/candidate/messaging-queries";

export interface CandidateOffersLabels {
  title: string;
  noOffers: string;
  salary: string;
  startDate: string;
  expiryDate: string;
  accept: string;
  decline: string;
  accepted: string;
  declined: string;
  expired: string;
  withdrawn: string;
  pending: string;
  acceptConfirmTitle: string;
  declineConfirmTitle: string;
  declineNote: string;
  confirmAccept: string;
  confirmDecline: string;
  cancel: string;
  note: string;
  sentAgo: string;
}

interface Props {
  offers: CandidateOfferWithContext[];
  labels: CandidateOffersLabels;
}

const STATUS_CONFIG: Record<
  OfferStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pending: { label: "", variant: "default", icon: <Clock className="h-3 w-3" /> },
  accepted: { label: "", variant: "secondary", icon: <CheckCircle className="h-3 w-3 text-pra-success" /> },
  declined: { label: "", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  withdrawn: { label: "", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

export function CandidateOffersClient({ offers: initial, labels }: Props) {
  const [offers, setOffers] = useState(initial);
  const [respondingTo, setRespondingTo] = useState<{ id: string; action: "accepted" | "declined" } | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRespond() {
    if (!respondingTo) return;
    const { id, action } = respondingTo;
    startTransition(async () => {
      await respondToOfferAction(id, action, action === "declined" ? declineNote : undefined);
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: action as OfferStatus, responded_at: new Date().toISOString() } : o))
      );
      setRespondingTo(null);
      setDeclineNote("");
    });
  }

  return (
    <>
      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {labels.noOffers}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => {
            const status = offer.status;
            const cfg = STATUS_CONFIG[status];
            return (
              <Card key={offer.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{offer.offer_title}</CardTitle>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{offer.company.name}</span>
                      </div>
                    </div>
                    <Badge variant={cfg.variant} className="flex shrink-0 items-center gap-1 text-xs">
                      {cfg.icon}
                      {labels[status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {offer.salary_min && offer.salary_max && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        {offer.currency} {offer.salary_min.toLocaleString()} – {offer.salary_max.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {offer.start_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{labels.startDate}: {offer.start_date}</span>
                    </div>
                  )}
                  {offer.expiry_date && status === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-pra-warning">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{labels.expiryDate}: {offer.expiry_date}</span>
                    </div>
                  )}
                  {offer.offer_letter && (
                    <div className="mt-2 h-28 overflow-y-auto rounded border p-2">
                      <p className="whitespace-pre-wrap text-xs text-muted-foreground">{offer.offer_letter}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {labels.sentAgo} {formatDistanceToNow(new Date(offer.sent_at), { addSuffix: true })}
                  </p>
                </CardContent>
                {status === "pending" && (
                  <CardFooter className="gap-2 pt-0">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => setRespondingTo({ id: offer.id, action: "accepted" })}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      {labels.accept}
                    </Button>
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="outline"
                      onClick={() => setRespondingTo({ id: offer.id, action: "declined" })}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      {labels.decline}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(o) => !o && setRespondingTo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {respondingTo?.action === "accepted" ? labels.acceptConfirmTitle : labels.declineConfirmTitle}
            </DialogTitle>
            {respondingTo?.action === "declined" && (
              <DialogDescription>{labels.declineNote}</DialogDescription>
            )}
          </DialogHeader>
          {respondingTo?.action === "declined" && (
            <Textarea
              placeholder={labels.note}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              rows={3}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingTo(null)}>
              {labels.cancel}
            </Button>
            <Button
              onClick={handleRespond}
              disabled={isPending}
              variant={respondingTo?.action === "declined" ? "destructive" : "default"}
            >
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {respondingTo?.action === "accepted" ? labels.confirmAccept : labels.confirmDecline}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
