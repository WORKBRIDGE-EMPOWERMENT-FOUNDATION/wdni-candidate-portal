import { requireAdmin } from "@/lib/auth";
import type { CandidateStatus } from "@/lib/constants";
import { DEFAULT_EMAIL_SUBJECT, defaultInviteEmail } from "@/lib/invite";
import { mailerConfigured } from "@/lib/mailer";
import { MessageComposer, type Recipient } from "./MessageComposer";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { supabase, user } = await requireAdmin();

  const [{ data: rows }, { data: logs, error: logError }] = await Promise.all([
    supabase.from("shortlist").select("id, full_name, email, status, cohort").order("full_name"),
    supabase
      .from("email_log")
      .select("shortlist_id, subject, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const sentBy = new Map<string, { subject: string; at: string }[]>();
  for (const l of logs ?? []) {
    const list = sentBy.get(l.shortlist_id) ?? [];
    list.push({ subject: l.subject, at: l.created_at });
    sentBy.set(l.shortlist_id, list);
  }

  const recipients: Recipient[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.full_name,
    email: r.email,
    status: r.status as CandidateStatus,
    cohort: r.cohort,
    sent: sentBy.get(r.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Email candidates</h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">
          Write one message and send it to many candidates. Each person gets their own email from{" "}
          {process.env.SMTP_USER ?? "the HR mailbox"}, so nobody sees anyone else&apos;s address. Replies come to the HR inbox.
        </p>
      </div>

      {!mailerConfigured() && (
        <p role="alert" className="rounded-md border-l-4 border-red-700 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          Email sending isn&apos;t set up yet. Add SMTP_HOST, SMTP_USER and SMTP_PASS to the environment (see .env.example).
        </p>
      )}
      {logError && (
        <p role="alert" className="rounded-md border-l-4 border-amber-600 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          The email history table is missing, so we can&apos;t show who has already been emailed. Run{" "}
          <code>supabase/migrations/2026-11-22-email-log.sql</code> in the Supabase SQL editor. ({logError.message})
        </p>
      )}

      <MessageComposer
        recipients={recipients}
        defaultSubject={DEFAULT_EMAIL_SUBJECT}
        defaultBody={defaultInviteEmail(process.env.NEXT_PUBLIC_SITE_URL ?? "")}
        adminEmail={user.email ?? ""}
      />
    </div>
  );
}
