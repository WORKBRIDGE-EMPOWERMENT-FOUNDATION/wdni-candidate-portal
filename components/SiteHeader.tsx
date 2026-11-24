import Link from "next/link";
import { BrandMark } from "./BrandMark";

/** `href`: where the logo goes. Signed-in pages point it at their own home so people don't drop out to the landing page. */
export function SiteHeader({
  right,
  subtitle = "Candidate portal",
  href = "/",
}: {
  right?: React.ReactNode;
  subtitle?: string;
  href?: string;
}) {
  return (
    <header className="no-print border-b border-line bg-white">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={href} className="flex items-center gap-3">
          <BrandMark />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-extrabold text-ink">
              <span className="sm:hidden">WDNI</span>
              <span className="hidden sm:inline">Women Drive Nigeria Initiative</span>
            </span>
            <span className="block text-xs font-semibold text-muted">{subtitle}</span>
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
      <button className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:bg-mist hover:text-ink">Sign out</button>
    </form>
  );
}
