import { redirect } from "next/navigation";
import { SignOutButton, SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionSummary } from "@/components/SubmissionSummary";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL, CONTACT_PHONE, formatDateTime, type CandidateStatus } from "@/lib/constants";
import { fromDbRow } from "@/lib/form-config";
import { normalizeNgPhone } from "@/lib/phone";
import { PortalForm } from "./PortalForm";
import type { DocRecord } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shortlistId } = await supabase.rpc("claim_shortlist");

  if (!shortlistId) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) redirect("/admin");
    return (
      <>
        <SiteHeader right={<SignOutButton />} />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold">We couldn't find you on the shortlist</h1>
          <p className="mt-3 text-slate-600">
            You signed in as {user.email || user.phone}, but that isn't on the WDNI shortlist. If you think this is a
            mistake, contact {CONTACT_EMAIL} or call {CONTACT_PHONE}.
          </p>
        </main>
      </>
    );
  }

  const [{ data: entry }, { data: submission }, { data: docs }] = await Promise.all([
    supabase.from("shortlist").select("full_name, email, phone, status, review_note").eq("id", shortlistId).single(),
    supabase.from("submissions").select("*").eq("shortlist_id", shortlistId).maybeSingle(),
    supabase
      .from("documents")
      .select("doc_type, storage_path, file_name, mime_type, size_bytes, uploaded_at")
      .eq("shortlist_id", shortlistId),
  ]);

  if (!entry) redirect("/login");
  const status = entry.status as CandidateStatus;
  const values = fromDbRow(submission);
  const documents = (docs ?? []) as DocRecord[];

  // Prefill from the shortlist on first visit.
  if (!submission) {
    const [first, ...rest] = (entry.full_name as string).trim().split(/\s+/);
    values.first_name = first ?? "";
    values.surname = rest.length ? rest[rest.length - 1] : "";
    values.email = (entry.email as string | null) ?? "";
    values.phone = entry.phone ? "0" + (normalizeNgPhone(entry.phone as string) ?? "").slice(4) : "";
    values.gender = "Female";
  }

  const editable = status === "shortlisted" || status === "in_progress" || status === "needs_changes";
  const firstName = values.first_name || (entry.full_name as string).split(" ")[0];

  return (
    <>
      <SiteHeader right={<SignOutButton />} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {firstName}</h1>
            <p className="text-sm text-slate-600">Women Drive Nigeria Initiative · Pioneer 100</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "needs_changes" && entry.review_note && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <p className="font-semibold">The WDNI team has asked you to update your application:</p>
            <p className="mt-1 whitespace-pre-line">{entry.review_note as string}</p>
          </div>
        )}

        {editable ? (
          <PortalForm userId={user.id} initialValues={values} initialDocs={documents} />
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              {status === "submitted" && (
                <p>
                  <span className="font-semibold text-slate-900">Thank you — your application has been submitted</span>
                  {submission?.submitted_at ? ` on ${formatDateTime(submission.submitted_at as string)}` : ""}. The WDNI
                  team is reviewing it and will contact you with next steps. If we need anything else, you'll be able to
                  sign in here and update your form.
                </p>
              )}
              {status === "approved" && (
                <p>
                  <span className="font-semibold text-emerald-800">Congratulations — your application has been approved.</span>{" "}
                  The WDNI team will contact you about training dates and next steps.
                  {entry.review_note ? <span className="mt-2 block whitespace-pre-line">{entry.review_note as string}</span> : null}
                </p>
              )}
              {status === "rejected" && (
                <p>
                  Thank you for your interest in WDNI. After review, we are unable to move your application forward at
                  this time. For questions, contact {CONTACT_EMAIL}.
                </p>
              )}
            </div>
            <h2 className="mb-3 text-lg font-semibold">What you submitted</h2>
            <SubmissionSummary
              values={values}
              docs={documents.map((d) => ({ type: d.doc_type, fileName: d.file_name }))}
            />
          </>
        )}
      </main>
    </>
  );
}
