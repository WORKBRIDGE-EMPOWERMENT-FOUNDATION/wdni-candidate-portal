import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { STATUSES, STATUS_LABELS, formatDateTime, one, type CandidateStatus } from "@/lib/constants";
import { DOCUMENTS } from "@/lib/form-config";

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
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
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

  // Documents every candidate must upload (licence is only needed by those who have one).
  const coreDocs = DOCUMENTS.filter((d) => d.type !== "education_certificate" && d.type !== "drivers_licence").map((d) => d.type);
  const requiredDocs = coreDocs.length;

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
        <PipelineCell label="Everyone" value={rows.length} href={q ? `/admin?q=${encodeURIComponent(q)}` : "/admin"} active={!activeStatus} />
        {PIPELINE.map((s) => (
          <PipelineCell
            key={s}
            label={STATUS_LABELS[s]}
            value={counts[s]}
            href={`/admin?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={activeStatus === s}
            highlight={s === "submitted" && counts.submitted > 0}
          />
        ))}
      </nav>

      <form className="flex max-w-lg gap-2" action="/admin" role="search">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <label htmlFor="q" className="sr-only">Search candidates</label>
        <input id="q" name="q" defaultValue={q ?? ""} placeholder="Search by name, email, phone or state" className="input" />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-[15px]">
          <thead>
            <tr className="border-b border-line text-left text-[13px] font-semibold text-muted">
              <th scope="col" className="px-5 py-3">Candidate</th>
              <th scope="col" className="px-5 py-3">Contact</th>
              <th scope="col" className="px-5 py-3">State</th>
              <th scope="col" className="px-5 py-3">Status</th>
              <th scope="col" className="px-5 py-3">Documents</th>
              <th scope="col" className="px-5 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => {
              const sub = r.submissions;
              const name = sub?.first_name && sub?.surname ? `${sub.first_name} ${sub.surname}` : r.full_name;
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
                    <DocMeter count={r.documents.filter((d) => coreDocs.includes(d.doc_type)).length} required={requiredDocs} />
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
      </div>
    </div>
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
