import { requireAdmin } from "@/lib/auth";
import type { CandidateStatus } from "@/lib/constants";
import { defaultInviteSms } from "@/lib/invite";
import { normalizeNgPhone } from "@/lib/phone";
import { getTermiiBalance, termiiConfigured } from "@/lib/termii";
import { SmsComposer, type SmsRecipient } from "./SmsComposer";

export const dynamic = "force-dynamic";

export default async function SmsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: rows }, { data: logs, error: logError }, balance] = await Promise.all([
    supabase.from("shortlist").select("id, full_name, phone, status").order("full_name"),
    supabase
      .from("sms_log")
      .select("shortlist_id, message, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(5000),
    getTermiiBalance(),
  ]);

  const sentBy = new Map<string, { message: string; at: string }[]>();
  for (const l of logs ?? []) {
    const list = sentBy.get(l.shortlist_id) ?? [];
    list.push({ message: l.message, at: l.created_at });
    sentBy.set(l.shortlist_id, list);
  }

  const recipients: SmsRecipient[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.full_name,
    phone: r.phone ? normalizeNgPhone(r.phone) : null,
    rawPhone: r.phone,
    status: r.status as CandidateStatus,
    sent: sentBy.get(r.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">SMS candidates</h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">
          Send a short text message to many candidates through Termii. Each person gets their own SMS from the sender
          name <strong>{process.env.TERMII_SENDER_ID ?? "(not set)"}</strong>. Candidates can&apos;t reply to it, so keep
          the full details in the email.
        </p>
      </div>

      {!termiiConfigured() && (
        <p role="alert" className="rounded-md border-l-4 border-red-700 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          SMS sending isn&apos;t set up yet. Add TERMII_API_KEY, TERMII_BASE_URL and TERMII_SENDER_ID to the environment.
        </p>
      )}
      {logError && (
        <p role="alert" className="rounded-md border-l-4 border-amber-600 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          The SMS history table is missing, so we can&apos;t show who has already been texted. Run{" "}
          <code>supabase/migrations/2026-11-25-sms-log.sql</code> in the Supabase SQL editor. ({logError.message})
        </p>
      )}

      <SmsComposer
        recipients={recipients}
        defaultBody={defaultInviteSms(process.env.NEXT_PUBLIC_SITE_URL ?? "")}
        balance={balance}
      />
    </div>
  );
}
