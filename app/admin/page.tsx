import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { STATUSES, STATUS_LABELS, formatDateTime, one, type CandidateStatus } from "@/lib/constants";
import { ACTIVE_DOCUMENTS } from "@/lib/form-config";
import { PageSizeSelect } from "./PageSizeSelect";

const PAGE_SIZES = [10, 25, 50, 100] as const;
const SORTS = ["name", "state", "status", "documents", "submitted", "updated"] as const;
type SortKey = (typeof SORTS)[number];
type Params = { status?: string; q?: string; page?: string; size?: string; sort?: string; dir?: string };

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cohort: string;
  status: CandidateStatus;
  updated_at: string;
  submissions: { surname: string | null; first_name: string | null; state_of_residence: string | null; submitted_at: string | null } | null;
  documents: { doc_type: string }[];
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const { status, q } = params;
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("shortlist")
    .select(
      "id, full_name, email, phone, cohort, status, updated_at, submissions(surname, first_name, state_of_residence, submitted_at), documents(doc_type)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return <p className="rounded-md border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-900">Could not load candidates: {error.message}</p>;
  }

  const rows: Row[] = (data ?? []).map((r) => ({ ...r, submissions: one(r.submissions), documents: r.documents ?? [] }));

  const counts = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<
    CandidateStatus,
    number
  >;

  const activeStatus = STATUSES.includes(status as CandidateStatus) ? (status as CandidateStatus) : null;
  const term = (q ?? "").trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (activeStatus && r.status !== activeStatus) return false;
    if (!term) return true;
    const sub = r.submissions;
    return [r.full_name, r.email, r.phone, sub?.surname, sub?.first_name, sub?.state_of_residence]
      .filter(Boolean)
      .some((x) => String(x).toLowerCase().includes(term));
  });

  // Documents every candidate must upload at this stage (licence is only needed by those who have one).
  const coreDocs = ACTIVE_DOCUMENTS.filter((d) => d.type !== "education_certificate" && d.type !== "drivers_licence").map((d) => d.type);
  const requiredDocs = coreDocs.length;
  const docCount = (r: Row) => r.documents.filter((d) => coreDocs.includes(d.doc_type)).length;
  const displayName = (r: Row) =>
    r.submissions?.first_name && r.submissions?.surname ? `${r.submissions.first_name} ${r.submissions.surname}` : r.full_name;

  // ---------- Sorting ----------
  const sort: SortKey = SORTS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "updated";
  const dir = params.dir === "asc" || params.dir === "desc" ? params.dir : sort === "name" || sort === "state" ? "asc" : "desc";
  const sortValue = (r: Row): string | number => {
    switch (sort) {
      case "name": return displayName(r).toLowerCase();
      case "state": return (r.submissions?.state_of_residence ?? "").toLowerCase() || "\uffff"; // blanks last
      case "status": return STATUSES.indexOf(r.status);
      case "documents": return docCount(r);
      case "submitted": return r.submissions?.submitted_at ?? "";
      case "updated": return r.updated_at;
    }
  };
  const sorted = [...filtered].sort((a, b) => {
    const x = sortValue(a), y = sortValue(b);
    const c = x < y ? -1 : x > y ? 1 : displayName(a).localeCompare(displayName(b));
    return dir === "asc" ? c : -c;
  });

  // ---------- Pagination ----------
  const size = PAGE_SIZES.includes(Number(params.size) as (typeof PAGE_SIZES)[number]) ? Number(params.size) : 25;
  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const page = Math.min(Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1), pageCount);
  const pageRows = sorted.slice((page - 1) * size, page * size);
  const from = sorted.length ? (page - 1) * size + 1 : 0;
  const to = Math.min(page * size, sorted.length);

  /** Link to this page with some parameters changed. Defaults are left out to keep URLs short. */
  const hrefWith = (change: Partial<Params>) => {
    const next = { ...params, ...change };
    const u = new URLSearchParams();
    if (next.status) u.set("status", next.status);
    if (next.q) u.set("q", next.q);
    if (next.sort && next.sort !== "updated") u.set("sort", next.sort);
    if (next.dir) u.set("dir", next.dir);
    if (next.size && next.size !== "25") u.set("size", next.size);
    if (next.page && next.page !== "1") u.set("page", next.page);
    const qs = u.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };
  const sortHref = (key: SortKey) =>
    hrefWith({ sort: key, dir: sort === key ? (dir === "asc" ? "desc" : "asc") : undefined, page: undefined });

  // The pipeline reads left to right in the order a candidate moves through it.
  const PIPELINE: CandidateStatus[] = ["shortlisted", "in_progress", "submitted", "needs_changes", "approved", "rejected"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Candidates</h1>
          <p className="mt-1 text-[15px] text-muted">
            {rows.length} on the shortlist, {counts.submitted} waiting for review
          </p>
        </div>
        <Link href="/admin/shortlist" className="btn-primary">Add candidates</Link>
      </div>

      <nav aria-label="Filter by status" className="panel grid grid-cols-2 overflow-hidden sm:grid-cols-4 lg:grid-cols-7">
        <PipelineCell label="Everyone" value={rows.length} href={hrefWith({ status: undefined, page: undefined })} active={!activeStatus} />
        {PIPELINE.map((s) => (
          <PipelineCell
            key={s}
            label={STATUS_LABELS[s]}
            value={counts[s]}
            href={hrefWith({ status: s, page: undefined })}
            active={activeStatus === s}
            highlight={s === "submitted" && counts.submitted > 0}
          />
        ))}
      </nav>

      <form className="flex max-w-lg gap-2" action="/admin" role="search">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        {params.dir && <input type="hidden" name="dir" value={params.dir} />}
        {params.size && <input type="hidden" name="size" value={params.size} />}
        <label htmlFor="q" className="sr-only">Search candidates</label>
        <input id="q" name="q" defaultValue={q ?? ""} placeholder="Search by name, email, phone or state" className="input" />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-[15px]">
          <thead>
            <tr className="border-b border-line text-left text-[13px] font-semibold text-muted">
              <SortHeader label="Candidate" href={sortHref("name")} active={sort === "name"} dir={dir} />
              <th scope="col" className="px-5 py-3">Contact</th>
              <SortHeader label="State" href={sortHref("state")} active={sort === "state"} dir={dir} />
              <SortHeader label="Status" href={sortHref("status")} active={sort === "status"} dir={dir} />
              <SortHeader label="Documents" href={sortHref("documents")} active={sort === "documents"} dir={dir} />
              <SortHeader label="Submitted" href={sortHref("submitted")} active={sort === "submitted"} dir={dir} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.map((r) => {
              const sub = r.submissions;
              const name = displayName(r);
              const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              return (
                <tr key={r.id} className="group hover:bg-mist">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/candidates/${r.id}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-bold text-brand">
                        {initials}
                      </span>
                      <span>
                        <span className="block font-bold group-hover:text-brand group-hover:underline">{name}</span>
                        <span className="block text-[13px] text-muted">{r.cohort}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[14px] text-muted">
                    <div>{r.email}</div>
                    <div>{r.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{sub?.state_of_residence ?? "Not given"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3.5">
                    <DocMeter count={docCount(r)} required={requiredDocs} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-[14px] text-muted">{formatDateTime(sub?.submitted_at) || "Not yet"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-muted">
                  {rows.length === 0 ? (
                    <>
                      No one is on the shortlist yet.{" "}
                      <Link href="/admin/shortlist" className="font-semibold text-brand underline underline-offset-2">
                        Add your first candidates
                      </Link>
                    </>
                  ) : (
                    "No candidates match this filter."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[14px] text-muted">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{sorted.length}</strong>
              </span>
              <PageSizeSelect value={size} options={[...PAGE_SIZES]} />
            </div>
            {pageCount > 1 && (
              <nav aria-label="Pagination" className="flex items-center gap-1">
                <PageLink href={hrefWith({ page: String(page - 1) })} disabled={page === 1} label="Previous page">‹ Prev</PageLink>
                {pageList(page, pageCount).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap${i}`} className="px-1.5">…</span>
                  ) : (
                    <PageLink key={p} href={hrefWith({ page: String(p) })} current={p === page} label={`Page ${p}`}>{p}</PageLink>
                  ),
                )}
                <PageLink href={hrefWith({ page: String(page + 1) })} disabled={page === pageCount} label="Next page">Next ›</PageLink>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 1 … 4 5 6 … 12 */
function pageList(page: number, count: number): (number | "…")[] {
  const keep = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function PageLink({
  href, children, current, disabled, label,
}: { href: string; children: React.ReactNode; current?: boolean; disabled?: boolean; label: string }) {
  const base = "grid h-8 min-w-8 place-items-center rounded-md px-2 font-semibold";
  if (disabled) return <span aria-disabled className={`${base} text-line`}>{children}</span>;
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`${base} ${current ? "bg-brand text-white" : "text-ink hover:bg-mist"}`}
    >
      {children}
    </Link>
  );
}

function SortHeader({ label, href, active, dir }: { label: string; href: string; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th scope="col" className="px-5 py-3" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}>
        {label}
        <span aria-hidden className={`text-[10px] ${active ? "" : "opacity-30"}`}>{active ? (dir === "asc" ? "▲" : "▼") : "▲▼"}</span>
      </Link>
    </th>
  );
}

function PipelineCell({
  label, value, href, active, highlight,
}: { label: string; value: number; href: string; active: boolean; highlight?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`relative border-b border-r border-line px-4 py-4 last:border-r-0 lg:border-b-0 ${
        active ? "bg-brand-50" : "hover:bg-mist"
      }`}
    >
      {active && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-brand" />}
      <span className={`block text-[1.75rem] font-extrabold leading-none ${highlight ? "text-amber-700" : ""}`}>{value}</span>
      <span className="mt-1.5 block text-[13px] font-semibold text-muted">{label}</span>
    </Link>
  );
}

function DocMeter({ count, required }: { count: number; required: number }) {
  return (
    <span className="flex items-center gap-2 text-[14px] text-muted">
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: required }).map((_, i) => (
          <span key={i} className={`h-2 w-3 rounded-sm ${i < count ? "bg-brand" : "bg-line"}`} />
        ))}
      </span>
      {count} of {required}
    </span>
  );
}
