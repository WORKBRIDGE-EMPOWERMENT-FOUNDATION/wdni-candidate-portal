import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <>
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <BrandMark size="sm" onDark />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-bold">WDNI HR console</span>
              <span className="block text-xs text-white/60">Candidate verification</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/65 sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-full px-4 py-1.5 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/10">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
