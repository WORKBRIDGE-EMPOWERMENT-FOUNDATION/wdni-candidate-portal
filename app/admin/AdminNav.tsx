"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Candidates", match: (p: string) => p === "/admin" || p.startsWith("/admin/candidates") },
  { href: "/admin/shortlist", label: "Add to shortlist", match: (p: string) => p.startsWith("/admin/shortlist") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6" aria-label="HR console">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-[3px] px-3 py-3 text-[15px] font-semibold ${
              active ? "border-accent text-white" : "border-transparent text-white/65 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <a
        href="/admin/export"
        className="ml-auto rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white hover:bg-brand-dark"
      >
        Download Excel
      </a>
    </nav>
  );
}
