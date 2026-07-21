import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * NEVER import this into a Client Component or anything that ships to the
 * browser — the `server-only` import above will throw a build error if you
 * accidentally do. Use only in trusted server contexts: server actions that
 * run AI pipelines (resume parsing, scoring, matching), webhooks, and admin
 * tooling.
 */
export function createAdminClient() {
  return createSupabaseClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
