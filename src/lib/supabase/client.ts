"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getRequiredEnv } from "@/lib/env";

/**
 * Supabase client for use in Client Components.
 * Reads the public URL + anon key from environment variables.
 */
export function createClient() {
  return createBrowserClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
