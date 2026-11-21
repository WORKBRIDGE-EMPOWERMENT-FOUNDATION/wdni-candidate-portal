import Link from "next/link";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-accent">WD</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-slate-900">Women Drive Nigeria Initiative</span>
            <span className="block text-xs text-slate-500">Workbridge Empowerment Foundation</span>
          </span>
        </Link>
        {right}
      </div>
    </header>
  );
}

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign out</button>
    </form>
  );
}
