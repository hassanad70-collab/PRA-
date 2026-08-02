import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminContext {
  userId: string;
}

/**
 * Verify the current session belongs to an active super_admin.
 * Returns an AdminContext on success, null on any failure.
 *
 * Designed for use inside admin Server Actions so they can return a
 * structured { success: false, error } instead of throwing or redirecting.
 */
export async function requireSuperAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, deleted_at")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin" || !profile.is_active || profile.deleted_at) return null;
  return { userId: user.id };
}
