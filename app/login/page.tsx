import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    redirect(isAdmin ? "/admin" : "/portal");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <LoginForm />
      </main>
    </>
  );
}
