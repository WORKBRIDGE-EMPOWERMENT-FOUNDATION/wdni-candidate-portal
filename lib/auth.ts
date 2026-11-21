import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** For admin pages, actions and routes: returns a session client, or redirects if not an HR admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/portal");

  return { supabase, user };
}
