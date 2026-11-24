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
        <SiteHeader href="/portal" right={<SignOutButton />} />
        <main className="mx-auto max-w-xl px-6 py-20">
          <h1 className="text-2xl">This account isn&apos;t on the shortlist</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
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
    values.phone = entry.phone ? "0" + (normalizeNgPhone(entry.phone as string) ?? "").slice(4) : "";
  }

  // The email they were shortlisted with is fixed; candidates can't change it on the form.
  const lockedEmail = (entry.email as string | null) ?? null;
  if (lockedEmail) values.email = lockedEmail;

  const editable = status === "shortlisted" || status === "in_progress" || status === "needs_changes";
  const firstName = values.first_name || (entry.full_name as string).split(" ")[0];

  return (
    <>
      <SiteHeader href="/portal" right={<SignOutButton />} />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-muted">Candidate file for the Pioneer 100</p>
            <h1 className="mt-1 text-3xl sm:text-4xl">Welcome, {firstName}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "needs_changes" && entry.review_note && (
          <div role="alert" className="mb-8 rounded-lg border-l-4 border-orange-500 bg-orange-50 px-5 py-4 text-[15px] text-orange-950">
            <p className="font-bold">The WDNI team has asked you to update your file</p>
            <p className="mt-1 whitespace-pre-line leading-relaxed">{entry.review_note as string}</p>
          </div>
        )}

        {editable ? (
          <PortalForm userId={user.id} initialValues={values} initialDocs={documents} lockedEmail={lockedEmail} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="order-2 lg:order-1">
              <h2 className="mb-4 text-xl">What you submitted</h2>
              <SubmissionSummary
                values={values}
                docs={documents.map((d) => ({ type: d.doc_type, fileName: d.file_name }))}
              />
            </div>
            <aside className="order-1 lg:order-2">
              <div
                className={`rounded-lg p-6 lg:sticky lg:top-8 ${
                  status === "approved" ? "bg-navy-900 text-white" : "panel"
                }`}
              >
                {status === "submitted" && (
                  <>
                    <h2 className="text-xl">File submitted</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">
                      {submission?.submitted_at ? `Received ${formatDateTime(submission.submitted_at as string)}. ` : ""}
                      The WDNI team is checking your details and documents and will contact you with next steps. If
                      anything needs fixing, you&apos;ll be able to sign in and update it here.
                    </p>
                  </>
                )}
                {status === "approved" && (
                  <>
                    <h2 className="text-xl">You&apos;re verified</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/80">
                      Your candidate file has been approved. The WDNI team will contact you about training dates and
                      what to bring.
                    </p>
                    {entry.review_note ? (
                      <p className="mt-4 whitespace-pre-line border-t border-white/15 pt-4 text-[15px] leading-relaxed">
                        {entry.review_note as string}
                      </p>
                    ) : null}
                  </>
                )}
                {status === "rejected" && (
                  <>
                    <h2 className="text-xl">Application closed</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">
                      Thank you for your interest in WDNI. After review, we can&apos;t take your application forward at
                      this time. For questions, email {CONTACT_EMAIL}.
                    </p>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
