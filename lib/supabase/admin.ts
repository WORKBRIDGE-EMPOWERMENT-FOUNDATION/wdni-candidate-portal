import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses row-level security, so it is used for exactly one thing:
 * checking whether an email/phone is on the shortlist before a sign-in code is sent.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
