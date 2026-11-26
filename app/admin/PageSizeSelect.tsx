"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageSizeSelect({ value, options }: { value: number; options: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2">
      Rows per page
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "25") next.delete("size");
          else next.set("size", e.target.value);
          next.delete("page");
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="rounded-md border border-line bg-white px-2 py-1 text-ink"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
