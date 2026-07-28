"use server";

import { redirect } from "next/navigation";

import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import { revalidateRecruiterPath } from "@/lib/revalidate-recruiter-path";
import { rateLimitByIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteSchema, inviteMemberSchema } from "@/lib/validations/team";
import type { Capability, RecruiterRole } from "@/types/database";
import type { ActionResult } from "./auth";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Resolves the caller's company + role, and authorizes the action via
 * has_capability() (called as an RPC so the SQL function -- the single
 * source of truth also used by RLS -- is what actually decides, not a
 * parallel TS copy of the same rule).
 */
async function requireCapability(capability: Capability) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: recruiter } = await supabase.from("recruiters").select("company_id, role").eq("id", user.id).maybeSingle();
  if (!recruiter) return null;

  const { data: allowed } = await supabase.rpc("has_capability", { p_capability: capability });
  if (!allowed) return null;

  return { supabase, userId: user.id, companyId: recruiter.company_id, role: recruiter.role as RecruiterRole };
}

export interface CreateInviteResult extends ActionResult {
  inviteUrl?: string;
}

export async function createInvite(formData: FormData): Promise<CreateInviteResult> {
  const ctx = await requireCapability("invite_members");
  if (!ctx) return { success: false, error: "You don't have permission to invite teammates." };

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  // recruiters.id is a primary key referencing profiles.id -- one person
  // can only ever belong to one company today, so any existing account
  // (candidate or recruiter, at this or another company) can't be invited.
  const admin = createAdminClient();
  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existingProfile) {
    return { success: false, error: "An account with this email already exists." };
  }

  const { data: invite, error } = await ctx.supabase
    .from("recruiter_invites")
    .insert({ company_id: ctx.companyId, email: parsed.data.email, role: parsed.data.role, invited_by: ctx.userId })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "There's already a pending invite for this email." };
    return { success: false, error: error.message };
  }

  revalidateRecruiterPath("/settings/team");
  return { success: true, inviteUrl: `${getSiteUrl()}/invite/${invite.token}` };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await requireCapability("invite_members");
  if (!ctx) return { success: false, error: "You don't have permission to manage invites." };

  const { error } = await ctx.supabase
    .from("recruiter_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("company_id", ctx.companyId);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath("/settings/team");
  return { success: true };
}

/**
 * Public accept flow -- the visitor has no session yet, so this reads/writes
 * through the admin client (mirrors registerRecruiter's account-creation
 * pattern) rather than relying on RLS, which has nothing to authorize an
 * anonymous visitor against.
 */
export async function acceptInvite(token: string, formData: FormData): Promise<ActionResult> {
  const rateLimit = await rateLimitByIp("accept-invite", 10, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const admin = createAdminClient();
  const { data: invite } = await admin.from("recruiter_invites").select("*").eq("token", token).maybeSingle();
  if (!invite) return { success: false, error: "This invite link is invalid." };
  if (invite.status !== "pending") return { success: false, error: "This invite is no longer valid." };
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from("recruiter_invites").update({ status: "expired" }).eq("id", invite.id);
    return { success: false, error: "This invite has expired." };
  }

  const parsed = acceptInviteSchema.safeParse({
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", invite.email).maybeSingle();
  if (existingProfile) {
    return { success: false, error: "An account with this email already exists. Please sign in instead." };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: invite.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "recruiter" },
  });
  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Failed to create account." };

  const { error: recruiterError } = await admin
    .from("recruiters")
    .insert({ id: data.user.id, company_id: invite.company_id, role: invite.role });
  if (recruiterError) return { success: false, error: recruiterError.message };

  await admin.from("recruiter_invites").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password: parsed.data.password });
  if (signInError) {
    return { success: false, error: "Account created, but automatic sign-in failed. Please sign in manually." };
  }

  redirect(`/${await getRedirectLocale()}/recruiter/dashboard`);
}

export async function changeMemberRole(recruiterId: string, newRole: RecruiterRole): Promise<ActionResult> {
  const ctx = await requireCapability("change_member_roles");
  if (!ctx) return { success: false, error: "You don't have permission to change roles." };

  if (newRole === "owner") {
    return { success: false, error: "Use ownership transfer to make someone an owner." };
  }

  const { data: target } = await ctx.supabase.from("recruiters").select("role, company_id").eq("id", recruiterId).maybeSingle();
  if (!target || target.company_id !== ctx.companyId) return { success: false, error: "Member not found." };
  if (target.role === "owner") return { success: false, error: "Transfer ownership first before changing the owner's role." };

  const admin = createAdminClient();
  const { error } = await admin.from("recruiters").update({ role: newRole }).eq("id", recruiterId);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath("/settings/team");
  return { success: true };
}

export async function removeMember(recruiterId: string): Promise<ActionResult> {
  const ctx = await requireCapability("remove_members");
  if (!ctx) return { success: false, error: "You don't have permission to remove teammates." };

  if (recruiterId === ctx.userId) {
    return { success: false, error: "You can't remove yourself this way. Transfer ownership or contact support." };
  }

  const { data: target } = await ctx.supabase.from("recruiters").select("role, company_id").eq("id", recruiterId).maybeSingle();
  if (!target || target.company_id !== ctx.companyId) return { success: false, error: "Member not found." };
  if (target.role === "owner") return { success: false, error: "Transfer ownership before removing the current owner." };

  const admin = createAdminClient();
  const { error } = await admin.from("recruiters").delete().eq("id", recruiterId);
  if (error) return { success: false, error: error.message };

  // Every /recruiter/* page already redirects a recruiter-role profile with
  // no `recruiters` row to /candidate/dashboard as its universal fallback;
  // that page assumes a `candidates` row exists. Create an empty one so a
  // removed member's account lands somewhere that renders, instead of a
  // page that assumes data which no longer exists for them.
  await admin.from("candidates").upsert({ id: recruiterId }, { onConflict: "id" });

  revalidateRecruiterPath("/settings/team");
  return { success: true };
}

/** Owner-only: propose a transfer. Pass null to cancel a pending one. */
export async function initiateOwnershipTransfer(newOwnerRecruiterId: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: recruiter } = await supabase.from("recruiters").select("company_id, role").eq("id", user.id).single();
  if (!recruiter || recruiter.role !== "owner") return { success: false, error: "Only the current owner can transfer ownership." };

  if (newOwnerRecruiterId) {
    const { data: target } = await supabase.from("recruiters").select("company_id").eq("id", newOwnerRecruiterId).maybeSingle();
    if (!target || target.company_id !== recruiter.company_id) {
      return { success: false, error: "That person isn't a member of your organization." };
    }
  }

  const { error } = await supabase.from("companies").update({ pending_owner_id: newOwnerRecruiterId }).eq("id", recruiter.company_id);
  if (error) return { success: false, error: error.message };

  revalidateRecruiterPath("/settings/team");
  return { success: true };
}

/** Called by the proposed successor. Atomically demotes the current owner to admin, then promotes the accepter. */
export async function acceptOwnershipTransfer(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: recruiter } = await supabase.from("recruiters").select("company_id").eq("id", user.id).single();
  if (!recruiter) return { success: false, error: "You're not part of an organization." };

  const { data: company } = await supabase.from("companies").select("pending_owner_id").eq("id", recruiter.company_id).single();
  if (!company || company.pending_owner_id !== user.id) {
    return { success: false, error: "There's no pending ownership transfer for you to accept." };
  }

  const admin = createAdminClient();
  const { data: currentOwner } = await admin
    .from("recruiters")
    .select("id")
    .eq("company_id", recruiter.company_id)
    .eq("role", "owner")
    .maybeSingle();

  // Demote the current owner before promoting the successor -- the partial
  // unique index (one owner per company) rejects two owners existing at
  // once, even momentarily within the same transaction-less sequence here.
  if (currentOwner) {
    await admin.from("recruiters").update({ role: "admin" }).eq("id", currentOwner.id);
  }
  await admin.from("recruiters").update({ role: "owner" }).eq("id", user.id);
  await admin.from("companies").update({ pending_owner_id: null }).eq("id", recruiter.company_id);

  revalidateRecruiterPath("/settings/team");
  return { success: true };
}
