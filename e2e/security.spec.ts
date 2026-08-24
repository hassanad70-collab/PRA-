/**
 * Security regression tests for the 0053 hardening pass.
 *
 * Tests are split into two tiers:
 *
 *  TIER 1 — code-level or pre-existing RLS behaviour (run now, always pass)
 *  TIER 2 — new DB triggers / policies added in migration 0053. Migration
 *            deployed 2026-08-24; fixme() markers removed. All 8 tests active.
 *
 * Tests use direct Supabase REST calls rather than UI flows so they probe
 * the exact enforcement boundary (RLS + triggers), not just the app layer.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TEST_USERS } from "./global-setup";

// ---------------------------------------------------------------------------
// Supabase client helpers
// ---------------------------------------------------------------------------

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Signs in and returns an authenticated Supabase client. */
async function signedInClient(email: string, password: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${email}: ${error?.message}`);
  }
  return client;
}

// ---------------------------------------------------------------------------
// CRIT-01: Role escalation prevention
//
// test 1 — own role change via trigger (TIER 2, requires migration 0053)
// test 2 — other user's role, blocked by existing profiles_update_own policy
// ---------------------------------------------------------------------------

test.describe("CRIT-01 — role escalation via REST", () => {

  // TIER 2 — migration 0053 adds the prevent_role_escalation trigger.
  // Migration deployed: this test now asserts live enforcement.
  test("candidate cannot change their own role to super_admin", async () => {

    const client = await signedInClient(
      TEST_USERS.candidate.email,
      TEST_USERS.candidate.password
    );
    const { data: { user } } = await client.auth.getUser();
    expect(user).not.toBeNull();

    try {
      const { error } = await client
        .from("profiles")
        .update({ role: "super_admin" })
        .eq("id", user!.id);

      expect(error).not.toBeNull();
      expect(error!.message).toContain("role_escalation_blocked");
    } finally {
      // Always restore the candidate role, regardless of whether the trigger
      // blocked the change. Use the service client to bypass RLS/triggers.
      await serviceClient()
        .from("profiles")
        .update({ role: "candidate" })
        .eq("id", user!.id);
    }
  });

  // TIER 1 — pre-existing profiles_update_own RLS policy (USING clause).
  // PostgREST returns 0 rows (not an error) when a USING clause filters the
  // row out — so we check for 0 rows affected, not a non-null error.
  test("candidate cannot update another user's profile (0 rows affected)", async () => {
    const admin = serviceClient();
    const { data: recruiterProfile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", TEST_USERS.recruiter.email)
      .single();

    expect(recruiterProfile).not.toBeNull();

    const client = await signedInClient(
      TEST_USERS.candidate.email,
      TEST_USERS.candidate.password
    );

    // The existing profiles_update_own policy (USING: id = auth.uid()) makes
    // the recruiter's row invisible for the candidate's update. PostgREST
    // returns 0 rows with no error — verify the row was not modified.
    const { data: updated, error } = await client
      .from("profiles")
      .update({ role: "candidate" })
      .eq("id", recruiterProfile!.id)
      .select("id");

    expect(error).toBeNull();
    expect(updated?.length ?? 0).toBe(0);

    // Confirm the recruiter's role is unchanged.
    const { data: unchanged } = await admin
      .from("profiles")
      .select("role")
      .eq("id", recruiterProfile!.id)
      .single();
    expect(unchanged?.role).toBe(recruiterProfile!.role);
  });
});

// ---------------------------------------------------------------------------
// HIGH-03: company_profiles cross-company write
// TIER 2 — migration 0053 fixes the policy to use my_company_id().
// ---------------------------------------------------------------------------

test.describe("HIGH-03 — company_profiles tenant isolation", () => {
  test("recruiter from Company B cannot update Company A profile", async () => {
    const adminClient = serviceClient();

    const { data: companyA } = await adminClient
      .from("companies")
      .select("id")
      .eq("slug", "e2e-test-company")
      .single();

    expect(companyA).not.toBeNull();

    await adminClient.from("company_profiles").upsert(
      { company_id: companyA!.id, about: "Company A profile" },
      { onConflict: "company_id" }
    );

    const client = await signedInClient(
      TEST_USERS.recruiterOther.email,
      TEST_USERS.recruiterOther.password
    );

    const { data } = await client
      .from("company_profiles")
      .update({ about: "Injected by Company B" })
      .eq("company_id", companyA!.id)
      .select("id");

    // After migration: 0 rows (RLS blocks). Pre-migration: also 0 rows because
    // the old policy was so convoluted it effectively never matched either.
    const rowsAffected = data?.length ?? 0;
    expect(rowsAffected).toBe(0);

    // Clean up
    await adminClient
      .from("company_profiles")
      .delete()
      .eq("company_id", companyA!.id);
  });
});

// ---------------------------------------------------------------------------
// MED-01: saved_candidates cross-recruiter read
// TIER 1 — the old policy is so convoluted it already returns 0 rows in
// practice; the new policy makes it explicit.
// ---------------------------------------------------------------------------

test.describe("MED-01 — saved_candidates tenant isolation", () => {
  test("recruiter from Company B cannot read Company A recruiter saved candidates", async () => {
    const adminClient = serviceClient();

    const { data: recruiterAProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.recruiter.email)
      .single();
    const { data: candidateProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.candidate.email)
      .single();

    await adminClient.from("saved_candidates").upsert(
      {
        recruiter_id: recruiterAProfile!.id,
        candidate_id: candidateProfile!.id,
        notes: "secret",
      },
      { onConflict: "recruiter_id,candidate_id" }
    );

    const clientB = await signedInClient(
      TEST_USERS.recruiterOther.email,
      TEST_USERS.recruiterOther.password
    );

    const { data: visible } = await clientB
      .from("saved_candidates")
      .select("*")
      .eq("recruiter_id", recruiterAProfile!.id);

    expect(visible?.length ?? 0).toBe(0);

    // Clean up
    await adminClient
      .from("saved_candidates")
      .delete()
      .eq("recruiter_id", recruiterAProfile!.id)
      .eq("candidate_id", candidateProfile!.id);
  });
});

// ---------------------------------------------------------------------------
// MED-02: messages INSERT with forged sender_role
// TIER 2 — migration 0053 replaces FOR ALL with per-operation policies that
// include sender_role + thread-side checks on INSERT.
// ---------------------------------------------------------------------------

test.describe("MED-02 — messages sender_role forgery", () => {
  test("candidate cannot send a message claiming sender_role = recruiter", async () => {

    const adminClient = serviceClient();

    const { data: candidateProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.candidate.email)
      .single();
    const { data: recruiterProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.recruiter.email)
      .single();
    const { data: companyA } = await adminClient
      .from("companies")
      .select("id")
      .eq("slug", "e2e-test-company")
      .single();

    const { data: thread, error: threadError } = await adminClient
      .from("message_threads")
      .upsert(
        {
          company_id: companyA!.id,
          recruiter_id: recruiterProfile!.id,
          candidate_id: candidateProfile!.id,
        },
        { onConflict: "recruiter_id,candidate_id" }
      )
      .select("id")
      .single();

    expect(threadError).toBeNull();

    const candidateClient = await signedInClient(
      TEST_USERS.candidate.email,
      TEST_USERS.candidate.password
    );

    // Attempt to INSERT a message claiming to be a recruiter.
    const { error } = await candidateClient.from("messages").insert({
      thread_id: thread!.id,
      sender_id: candidateProfile!.id,
      sender_role: "recruiter",
      body: "Forged sender_role",
    });

    // After migration: blocked by WITH CHECK on messages_insert_as_recruiter.
    expect(error).not.toBeNull();

    // Clean up
    await adminClient.from("message_threads")
      .delete()
      .eq("recruiter_id", recruiterProfile!.id)
      .eq("candidate_id", candidateProfile!.id);
  });
});

// ---------------------------------------------------------------------------
// MED-03: offers — candidate cannot tamper with salary
// TIER 2 — migration 0053 adds the prevent_offer_tampering trigger.
// ---------------------------------------------------------------------------

test.describe("MED-03 — offer tampering prevention", () => {
  test("candidate cannot change salary_min on their pending offer", async () => {

    const adminClient = serviceClient();

    const { data: candidateProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.candidate.email)
      .single();
    const { data: recruiterProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.recruiter.email)
      .single();
    const { data: companyA } = await adminClient
      .from("companies")
      .select("id")
      .eq("slug", "e2e-test-company")
      .single();
    const { data: job } = await adminClient
      .from("jobs")
      .select("id")
      .eq("slug", "e2e-test-published-job")
      .single();

    if (!job) return;

    const { data: offer, error: offerError } = await adminClient
      .from("offers")
      .upsert(
        {
          company_id: companyA!.id,
          job_id: job.id,
          candidate_id: candidateProfile!.id,
          recruiter_id: recruiterProfile!.id,
          offer_title: "Security Test Offer",
          salary_min: 50000,
          salary_max: 70000,
          currency: "USD",
          status: "pending",
        },
        { onConflict: "job_id,candidate_id" }
      )
      .select("id")
      .single();

    expect(offerError).toBeNull();

    const candidateClient = await signedInClient(
      TEST_USERS.candidate.email,
      TEST_USERS.candidate.password
    );

    const { error: updateError } = await candidateClient
      .from("offers")
      .update({ salary_min: 999999 })
      .eq("id", offer!.id);

    // After migration: trigger raises offer_tampering_blocked exception.
    expect(updateError).not.toBeNull();
    expect(updateError!.message).toContain("offer_tampering_blocked");

    // Clean up
    await adminClient.from("offers").delete().eq("id", offer!.id);
  });
});

// ---------------------------------------------------------------------------
// MED-04: audit_logs — user cannot INSERT fabricated entries
// TIER 1 (pre-migration): schema constraints already prevent most fields.
// TIER 2 (post-migration): the open INSERT policy is dropped so any insert
//         attempt fails RLS regardless of schema validity.
// This test is written to pass in both states — the insert must fail.
// ---------------------------------------------------------------------------

test.describe("MED-04 — audit_logs INSERT blocked", () => {
  test("authenticated user cannot INSERT into audit_logs", async () => {
    const client = await signedInClient(
      TEST_USERS.candidate.email,
      TEST_USERS.candidate.password
    );
    const { data: { user } } = await client.auth.getUser();

    const { error } = await client.from("audit_logs").insert({
      user_id: user!.id,
      action: "fake_action",
      table_name: "profiles",
      record_id: user!.id,
    });

    // Must fail — either RLS (post-migration) or schema constraints (pre-migration).
    expect(error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stripe webhook — fail-closed (TIER 1, code-level change already shipped)
// ---------------------------------------------------------------------------

test.describe("Stripe webhook — fail-closed", () => {
  test("POST without stripe-signature returns non-200", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: JSON.stringify({ type: "customer.subscription.updated", id: "evt_test" }),
      headers: { "Content-Type": "application/json" },
    });

    // 503 when STRIPE_WEBHOOK_SECRET unset in production-like env (new code),
    // 400 when secret is set but signature header is missing (existing code).
    // Either way, must not be 200.
    expect(response.status()).not.toBe(200);
    expect([400, 503]).toContain(response.status());
  });
});
