import Link from "next/link";
import { SignOutButton, SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <>
      <SiteHeader
        right={
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        }
      />
      <div className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 text-sm font-medium">
          <Link href="/admin" className="border-b-2 border-transparent px-3 py-3 text-slate-700 hover:border-brand">
            Candidates
          </Link>
          <Link href="/admin/shortlist" className="border-b-2 border-transparent px-3 py-3 text-slate-700 hover:border-brand">
            Add to shortlist
          </Link>
          <a href="/admin/export" className="border-b-2 border-transparent px-3 py-3 text-slate-700 hover:border-brand">
            Export to Excel
          </a>
        </nav>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
