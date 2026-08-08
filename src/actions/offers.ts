"use server";

import { revalidatePath } from "next/cache";

import { generateOfferLetter } from "@/lib/ai/offer-letter";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import type { OfferStatus } from "@/types/database";

async function requireRecruiter() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");
  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) throw new Error("Forbidden");
  return { user, recruiter };
}

// ----------------------------------------------------------------
// Create or update an offer
// ----------------------------------------------------------------

export async function createOfferAction(input: {
  jobId: string;
  candidateId: string;
  offerTitle: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  startDate?: string | null;
  expiryDate?: string | null;
  offerLetter?: string | null;
}): Promise<{ id: string }> {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("offers")
    .upsert(
      {
        company_id: recruiter.company_id,
        job_id: input.jobId,
        candidate_id: input.candidateId,
        recruiter_id: recruiter.id,
        offer_title: input.offerTitle,
        salary_min: input.salaryMin ?? null,
        salary_max: input.salaryMax ?? null,
        currency: input.currency ?? "USD",
        start_date: input.startDate ?? null,
        expiry_date: input.expiryDate ?? null,
        offer_letter: input.offerLetter ?? null,
        status: "pending" as OfferStatus,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "job_id,candidate_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create offer");

  // Fire-and-forget: notify candidate of new offer
  dispatchNotification({
    userId: input.candidateId,
    type: "offer_extended",
    title: "You have a new job offer",
    message: `${recruiter.company?.name ?? "A company"} has extended an offer for ${input.offerTitle}.`,
    link: "/candidate/offers",
    email: {
      subject: `Job offer: ${input.offerTitle}`,
      htmlBody: `<p><strong>${recruiter.company?.name ?? "A company"}</strong> has extended a job offer for <strong>${input.offerTitle}</strong> on PRA Talent Intelligence.</p><p><a href="https://pra-eta-umber.vercel.app/en/candidate/offers">View offer</a></p>`,
      textBody: `${recruiter.company?.name ?? "A company"} has extended a job offer for ${input.offerTitle}. Visit https://pra-eta-umber.vercel.app/en/candidate/offers to view and respond.`,
    },
  });

  revalidatePath("/recruiter/offers");
  revalidatePath(`/recruiter/jobs/${input.jobId}`);
  return { id: data.id };
}

// ----------------------------------------------------------------
// Generate AI offer letter (returns text, does NOT save to DB)
// ----------------------------------------------------------------

export async function generateOfferLetterAction(input: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  startDate?: string | null;
  expiryDate?: string | null;
  recruiterName?: string;
  additionalNotes?: string;
}): Promise<string> {
  await requireRecruiter();
  return generateOfferLetter(input);
}

// ----------------------------------------------------------------
// Withdraw an offer (recruiter)
// ----------------------------------------------------------------

export async function withdrawOfferAction(offerId: string): Promise<void> {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();

  const { error } = await supabase
    .from("offers")
    .update({ status: "withdrawn" as OfferStatus })
    .eq("id", offerId)
    .eq("company_id", recruiter.company_id)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  revalidatePath("/recruiter/offers");
}

// ----------------------------------------------------------------
// Respond to an offer (candidate)
// ----------------------------------------------------------------

export async function respondToOfferAction(
  offerId: string,
  status: "accepted" | "declined",
  note?: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");

  const supabase = await createClient();

  // Fetch offer to get recruiter context for notification
  const { data: offer } = await supabase
    .from("offers")
    .select("recruiter_id, offer_title, jobs(title)")
    .eq("id", offerId)
    .eq("candidate_id", user.id)
    .eq("status", "pending")
    .single();

  const { error } = await supabase
    .from("offers")
    .update({
      status: status as OfferStatus,
      candidate_note: note ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId)
    .eq("candidate_id", user.id)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  // Fire-and-forget: notify recruiter of offer response
  if (offer?.recruiter_id) {
    const jobTitle =
      (Array.isArray(offer.jobs) ? offer.jobs[0] : offer.jobs) as { title: string } | null;
    const verb = status === "accepted" ? "accepted" : "declined";
    dispatchNotification({
      userId: offer.recruiter_id,
      type: "system",
      title: `Offer ${verb}`,
      message: `${user.full_name} has ${verb} the offer for ${jobTitle?.title ?? offer.offer_title}.`,
      link: "/recruiter/offers",
      email: {
        subject: `Offer ${verb}: ${jobTitle?.title ?? offer.offer_title}`,
        htmlBody: `<p><strong>${user.full_name}</strong> has ${verb} your offer for <strong>${jobTitle?.title ?? offer.offer_title}</strong> on PRA Talent Intelligence.</p><p><a href="https://pra-eta-umber.vercel.app/en/recruiter/offers">View offers</a></p>`,
        textBody: `${user.full_name} has ${verb} your offer for ${jobTitle?.title ?? offer.offer_title}. Visit https://pra-eta-umber.vercel.app/en/recruiter/offers to see details.`,
      },
    });
  }

  revalidatePath("/candidate/offers");
}

// ----------------------------------------------------------------
// Offer templates
// ----------------------------------------------------------------

export async function saveOfferTemplateAction(name: string, body: string): Promise<void> {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase.from("offer_templates").insert({ company_id: recruiter.company_id, name, body });
  revalidatePath("/recruiter/offers");
}

export async function deleteOfferTemplateAction(templateId: string): Promise<void> {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("offer_templates")
    .delete()
    .eq("id", templateId)
    .eq("company_id", recruiter.company_id);
  revalidatePath("/recruiter/offers");
}
