import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current authenticated user has a specific permission slug.
 * Backed by the user_roles → role_permissions → permissions join in Postgres
 * via the has_permission() security-definer function.
 *
 * Cached per request (React cache) so multiple components checking the same
 * slug don't each make a round-trip.
 */
export const hasPermission = cache(async (slug: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_permission", { p_slug: slug });
  return !!data;
});

/**
 * Return the full set of permission slugs the current user holds.
 * Use for bulk UI gating (e.g. decide which nav items to show) rather than
 * individual checks — individual checks should still use hasPermission() so
 * they remain explicit at the point of use.
 */
export const getMyPermissions = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_permissions");
  return new Set((data as string[] | null) ?? []);
});
