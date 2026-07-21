import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Writes a row to audit_logs. Shared by every admin server action. */
export async function logAuditEvent(
  supabase: SupabaseClient,
  params: { actorId: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }
) {
  await supabase.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? null,
  });
}
