import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionSummary } from "@/components/SubmissionSummary";
import { requireAdmin } from "@/lib/auth";
import { BUCKET, STATUS_LABELS, formatDateTime, one, type CandidateStatus } from "@/lib/constants";
import { fromDbRow } from "@/lib/form-config";
import { deleteCandidate, updateStatus } from "../../actions";

const REVIEW_OPTIONS: CandidateStatus[] = ["approved", "needs_changes", "rejected", "submitted"];

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: entry } = await supabase
    .from("shortlist")
    .select("*, submissions(*), documents(doc_type, storage_path, file_name, uploaded_at)")
    .eq("id", id)
    .maybeSingle();
  if (!entry) notFound();

  const submission = one(entry.submissions) as Record<string, unknown> | null;
  const docs = (entry.documents ?? []) as { doc_type: string; storage_path: string; file_name: string | null }[];
  const status = entry.status as CandidateStatus;

  let urls: Record<string, string> = {};
  if (docs.length) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(docs.map((d) => d.storage_path), 60 * 60);
    urls = Object.fromEntries((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl]));
  }

  const photo = docs.find((d) => d.doc_type === "passport_photo");
  const photoUrl = photo ? urls[photo.storage_path] : null;
  const isImage = (path: string) => /\.(jpe?g|png)$/i.test(path);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-slate-600 hover:underline">← All candidates</Link>

      <div className="flex flex-wrap items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {photoUrl && isImage(photo!.storage_path) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-xl bg-slate-100 text-xs text-slate-400">No photo</div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{entry.full_name as string}</h1>
            <p className="text-sm text-slate-600">
              {[entry.email, entry.phone].filter(Boolean).join(" · ")} · {entry.cohort as string}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <StatusBadge status={status} />
              {submission?.submitted_at ? <span>Submitted {formatDateTime(submission.submitted_at as string)}</span> : null}
              {entry.reviewed_at ? (
                <span>· Last reviewed {formatDateTime(entry.reviewed_at as string)} by {entry.reviewed_by as string}</span>
              ) : null}
            </div>
          </div>
        </div>

        <form action={updateStatus.bind(null, id)} className="w-full max-w-sm space-y-3">
          <div>
            <label htmlFor="status" className="text-sm font-medium text-slate-700">Decision</label>
            <select id="status" name="status" defaultValue={REVIEW_OPTIONS.includes(status) ? status : "approved"} className="input mt-1">
              {REVIEW_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "submitted" ? "Submitted (awaiting review)" : s === "needs_changes" ? "Needs changes (reopen form)" : STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="review_note" className="text-sm font-medium text-slate-700">
              Note to candidate <span className="font-normal text-slate-500">(shown in their portal)</span>
            </label>
            <textarea
              id="review_note"
              name="review_note"
              rows={3}
              defaultValue={(entry.review_note as string | null) ?? ""}
              placeholder="e.g. Please upload a clearer photo of your NIN slip."
              className="input mt-1"
            />
          </div>
          <button className="btn-primary w-full">Save decision</button>
        </form>
      </div>

      {submission ? (
        <SubmissionSummary
          values={fromDbRow(submission)}
          docs={docs.map((d) => ({ type: d.doc_type, fileName: d.file_name, url: urls[d.storage_path] ?? null }))}
        />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          This candidate hasn&apos;t started their biodata form yet.
        </p>
      )}

      <div className="rounded-xl border border-rose-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-rose-800">Remove from shortlist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Permanently deletes this candidate&apos;s shortlist entry, biodata and uploaded documents.
        </p>
        <form action={deleteCandidate.bind(null, id)} className="mt-3">
          <ConfirmSubmit message={`Delete ${entry.full_name as string} and all their data? This cannot be undone.`} className="btn-danger">
            Delete candidate
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}
