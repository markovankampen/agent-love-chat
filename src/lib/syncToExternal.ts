import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget sync of a record to the external database.
 * Non-critical: failures are silently logged.
 */
export async function syncToExternal(
  table: string,
  type: "INSERT" | "UPDATE" | "DELETE",
  record: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke("sync-to-external", {
      body: { type, table, record },
      headers: { "x-webhook-source": "database" },
    });
  } catch (_e) {
    // Non-critical, silently fail
  }
}
