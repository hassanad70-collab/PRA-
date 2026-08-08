"use server";

import { revalidatePath } from "next/cache";

import { generateOfferLetter } from "@/lib/ai/offer-letter";
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
