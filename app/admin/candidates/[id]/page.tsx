import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionSummary } from "@/components/SubmissionSummary";
import { requireAdmin } from "@/lib/auth";
import { BUCKET, formatDateTime, one, type CandidateStatus } from "@/lib/constants";
import { fromDbRow } from "@/lib/form-config";
import { deleteCandidate, updateStatus } from "../../actions";

const REVIEW_OPTIONS: CandidateStatus[] = ["approved", "needs_changes", "rejected", "submitted"];

const DECISION_COPY: Record<string, { label: string; hint: string }> = {
  approved: { label: "Approve", hint: "Verified and ready for training" },
  needs_changes: { label: "Ask for changes", hint: "Reopens their form with your note" },
  rejected: { label: "Not selected", hint: "Closes the application" },
  submitted: { label: "Awaiting review", hint: "Undo a decision" },
};

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

  const urls: Record<string, string> = {};
  if (docs.length) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(docs.map((d) => d.storage_path), 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    }
  }

  const photo = docs.find((d) => d.doc_type === "passport_photo");
  const photoUrl = photo ? urls[photo.storage_path] : null;
  const isImage = (path: string) => /\.(jpe?g|png)$/i.test(path);

  const initials = (entry.full_name as string).split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex text-sm font-semibold text-muted hover:text-ink hover:underline">
        Back to all candidates
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        {photoUrl && isImage(photo!.storage_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={`Passport photo of ${entry.full_name as string}`} className="h-24 w-20 rounded-md object-cover ring-1 ring-line" />
        ) : (
          <div className="grid h-24 w-20 place-items-center rounded-md bg-brand-50 text-xl font-extrabold text-brand">{initials}</div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl">{entry.full_name as string}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-[15px] text-muted">{[entry.email, entry.phone].filter(Boolean).join(", ")}</p>
          <p className="mt-0.5 text-sm text-muted">
            {entry.cohort as string}
            {submission?.submitted_at ? `. Submitted ${formatDateTime(submission.submitted_at as string)}` : ""}
            {entry.reviewed_at ? `. Last reviewed ${formatDateTime(entry.reviewed_at as string)} by ${entry.reviewed_by as string}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 lg:order-1">
          {submission ? (
            <SubmissionSummary
              values={fromDbRow(submission)}
              docs={docs.map((d) => ({ type: d.doc_type, fileName: d.file_name, url: urls[d.storage_path] ?? null }))}
            />
          ) : (
            <div className="panel px-6 py-10 text-center text-[15px] text-muted">
              This candidate hasn&apos;t started their candidate file yet.
            </div>
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <form action={updateStatus.bind(null, id)} className="panel space-y-4 p-5 lg:sticky lg:top-6">
            <h2 className="text-lg">Decision</h2>
            <fieldset className="space-y-2">
              <legend className="sr-only">Set status</legend>
              {REVIEW_OPTIONS.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    defaultChecked={REVIEW_OPTIONS.includes(status) ? status === s : s === "approved"}
                    className="mt-1 accent-brand"
                  />
                  <span>
                    <span className="block text-[15px] font-bold">{DECISION_COPY[s].label}</span>
                    <span className="block text-[13px] text-muted">{DECISION_COPY[s].hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="review_note" className="field-label">Note to the candidate</label>
              <p className="text-[13px] text-muted">Shown in their portal.</p>
              <textarea
                id="review_note"
                name="review_note"
                rows={4}
                defaultValue={(entry.review_note as string | null) ?? ""}
                placeholder="Please upload a clearer photo of your NIN slip."
                className="input mt-1.5"
              />
            </div>
            <button className="btn-primary w-full">Save decision</button>
          </form>

          <form action={deleteCandidate.bind(null, id)} className="rounded-lg border border-red-200 bg-white p-5">
            <h2 className="text-[15px] font-bold text-red-900">Remove from shortlist</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Deletes this candidate&apos;s shortlist entry, biodata and uploaded documents. This can&apos;t be undone.
            </p>
            <ConfirmSubmit
              message={`Delete ${entry.full_name as string} and all their data? This can't be undone.`}
              className="btn-danger mt-3 w-full"
            >
              Delete candidate
            </ConfirmSubmit>
          </form>
        </aside>
      </div>
    </div>
  );
}
