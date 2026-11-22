import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark size="lg" />
        </Link>
        <div className="relative z-10 max-w-sm">
          <p className="text-[15px] font-bold text-accent">Pioneer 100 candidate portal</p>
          <h1 className="mt-2 text-4xl leading-[1.1]">Women Drive Nigeria Initiative</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/75">
            Sign in to complete or check your candidate file.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/55">Workbridge Empowerment Foundation, RC 9416201</p>
        {/* Lane markings */}
        <span aria-hidden className="dash-y absolute bottom-0 right-16 top-0 w-1.5 text-accent/70" />
        <span aria-hidden className="absolute bottom-0 right-10 top-0 w-1.5 bg-white/15" />
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="font-display text-[15px] font-bold">WDNI candidate portal</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <LoginForm />
            <p className="mt-10 border-t border-line pt-5 text-sm leading-relaxed text-muted">
              Trouble signing in? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>{" "}
              or call {CONTACT_PHONE}.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
