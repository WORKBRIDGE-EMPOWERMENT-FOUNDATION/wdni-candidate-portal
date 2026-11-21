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
    return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">Could not load candidates: {error.message}</p>;
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

  const totalDocs = DOCUMENTS.filter((d) => d.type !== "education_certificate" && d.type !== "drivers_licence").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-sm text-slate-600">{rows.length} on the shortlist</p>
        </div>
        <Link href="/admin/shortlist" className="btn-primary">Add candidates</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="All" value={rows.length} href="/admin" active={!activeStatus} />
        {STATUSES.map((s) => (
          <StatCard key={s} label={STATUS_LABELS[s]} value={counts[s]} href={`/admin?status=${s}`} active={activeStatus === s} />
        ))}
      </div>

      <form className="flex gap-2" action="/admin">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <input name="q" defaultValue={q ?? ""} placeholder="Search name, email, phone or state" className="input max-w-sm" />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const sub = r.submissions;
              const name = sub?.first_name && sub?.surname ? `${sub.first_name} ${sub.surname}` : r.full_name;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/candidates/${r.id}`} className="font-medium text-brand hover:underline">
                      {name}
                    </Link>
                    <div className="text-xs text-slate-500">{r.cohort}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{r.email}</div>
                    <div>{r.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{sub?.state_of_residence ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.documents.length} uploaded
                    {r.documents.length < totalDocs && r.status !== "shortlisted" && (
                      <span className="text-xs text-slate-400"> (min. {totalDocs})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(sub?.submitted_at) || "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0 ? "No one on the shortlist yet. Add candidates to get started." : "No candidates match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, active }: { label: string; value: number; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-3 ${active ? "border-brand bg-brand/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </Link>
  );
}
