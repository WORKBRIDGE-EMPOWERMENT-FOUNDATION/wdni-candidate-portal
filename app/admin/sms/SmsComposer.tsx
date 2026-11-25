"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_LABELS, STATUS_STYLES, formatDateTime, type CandidateStatus } from "@/lib/constants";
import { personalise } from "@/lib/email-html";
import { NAIRA_PER_PAGE, smsStats, toPlainSms } from "@/lib/sms-text";
import { sendSmsBatch, sendTestSms, type SmsResult } from "./actions";

export type SmsRecipient = {
  id: string;
  name: string;
  phone: string | null; // +234… or null if missing/invalid
  rawPhone: string | null;
  status: CandidateStatus;
  sent: { message: string; at: string }[];
};

const BATCH = 10;
type Phase = "edit" | "confirm" | "sending" | "done";

const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const showPhone = (p: string) => "0" + p.slice(4, 7) + " " + p.slice(7, 10) + " " + p.slice(10);

export function SmsComposer({
  recipients,
  defaultBody,
  balance,
}: {
  recipients: SmsRecipient[];
  defaultBody: string;
  balance: { balance: number; currency: string } | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState(defaultBody);
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("shortlisted");
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>("edit");
  const [results, setResults] = useState<Record<string, SmsResult>>({});
  const [fatal, setFatal] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);
  const stopRef = useRef(false);

  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [testing, startTest] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const alreadySent = (r: SmsRecipient) => r.sent.some((s) => s.message.trim() === body.trim());

  const inFilter = useMemo(
    () => recipients.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [recipients, statusFilter],
  );
  const noPhone = inFilter.filter((r) => !r.phone);
  const eligible = inFilter.filter((r) => r.phone && !(skipAlreadySent && alreadySent(r)));
  const selected = eligible.filter((r) => !excluded.has(r.id));
  const skippedAsSent = inFilter.filter((r) => r.phone && skipAlreadySent && alreadySent(r)).length;

  const sample = selected[0]?.name ?? recipients[0]?.name ?? "Amina Bello";
  const sampleText = toPlainSms(personalise(body, sample));
  const stats = smsStats(sampleText);
  const hasFancyChars = toPlainSms(body) !== body;

  // Pages differ by name length, so add them up per person.
  const totalPages = useMemo(
    () => selected.reduce((sum, r) => sum + smsStats(toPlainSms(personalise(body, r.name))).pages, 0),
    [selected, body],
  );
  const maxPages = useMemo(
    () => selected.reduce((m, r) => Math.max(m, smsStats(toPlainSms(personalise(body, r.name))).pages), 0),
    [selected, body],
  );
  const cost = totalPages * NAIRA_PER_PAGE;
  const shortOfCredit = balance !== null && cost > balance.balance;
  const tooLong = stats.pages > 4;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: recipients.length };
    for (const s of STATUSES) c[s] = recipients.filter((r) => r.status === s).length;
    return c;
  }, [recipients]);

  function insert(token: string) {
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: a, selectionEnd: b } = el;
    setBody(body.slice(0, a) + token + body.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  }

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendAll() {
    const queue = selected.map((r) => r.id);
    setQueued(queue.length);
    setPhase("sending");
    setResults({});
    setFatal(null);
    stopRef.current = false;
    for (let i = 0; i < queue.length; i += BATCH) {
      if (stopRef.current) break;
      try {
        const res = await sendSmsBatch(queue.slice(i, i + BATCH), body);
        if (res.error) {
          setFatal(res.error);
          break;
        }
        setResults((prev) => {
          const next = { ...prev };
          for (const r of res.results ?? []) next[r.id] = r;
          return next;
        });
      } catch (err) {
        setFatal(`Sending stopped: ${err instanceof Error ? err.message : "connection lost"}. Nobody after this point was texted.`);
        break;
      }
    }
    setPhase("done");
    router.refresh();
  }

  const done = Object.keys(results).length;
  const sentOk = Object.values(results).filter((r) => r.ok).length;
  const failed = Object.values(results).filter((r) => !r.ok);
  const nameOf = (id: string) => recipients.find((r) => r.id === id)?.name ?? id;
  const locked = phase === "sending";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      {/* ---------- Message ---------- */}
      <section className="panel space-y-4 p-6">
        <h2 className="text-lg">Message</h2>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="sms-body" className="field-label">Text message</label>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              Insert:
              {(["{first_name}", "{full_name}"] as const).map((t) => (
                <button key={t} type="button" onClick={() => insert(t)} disabled={locked}
                  className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink hover:bg-mist">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="sms-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={locked}
            rows={5}
            className="input mt-1.5 leading-relaxed"
          />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              <strong className={stats.pages > 1 ? "text-amber-800" : "text-ink"}>
                {stats.length} characters · {stats.pages} SMS page{stats.pages === 1 ? "" : "s"}
              </strong>{" "}
              for {sample.split(" ")[0]}. One page holds {stats.unicode ? 70 : 160} characters
              {stats.pages > 1 ? `; longer messages are charged per ${stats.perPage}` : ""}.
            </span>
            <button type="button" className="font-semibold text-brand underline underline-offset-2"
              onClick={() => setBody(defaultBody)} disabled={locked}>
              Reset to the standard SMS
            </button>
          </div>
          {hasFancyChars && (
            <p className="mt-2 rounded-md bg-mist px-3 py-2 text-xs text-muted">
              Curly quotes, dashes and bullets will be sent as plain &apos; &quot; and - so the message stays cheap.
            </p>
          )}
          {stats.unicode && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The message has a special character or emoji, so each page only holds 70 characters and costs more. Remove it
              to fit 160 per page.
            </p>
          )}
          {tooLong && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">Too long: keep it to 4 SMS pages at most. Put the details in the email.</p>
          )}
          {/localhost|127\.0\.0\.1/.test(body) && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
              The message links to a local test address (localhost), which candidates can&apos;t open. Use https://portal.wdni.ng.
            </p>
          )}
          {/\[(portal link|insert link)\]/i.test(body) && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The message still has a placeholder instead of the portal link. Type the portal address in.
            </p>
          )}
        </div>

        <div>
          <p className="field-label">Preview</p>
          <div className="mt-2 rounded-2xl bg-mist p-4">
            <p className="text-xs font-semibold text-muted">To {sample}</p>
            <p className="mt-2 max-w-sm whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-relaxed text-ink shadow-sm [overflow-wrap:anywhere]">
              {sampleText || " "}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Recipients ---------- */}
      <section className="panel flex flex-col p-6 lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-6">
        <h2 className="text-lg">Recipients</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={locked}
              onClick={() => { setStatusFilter(s); setExcluded(new Set()); }}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                statusFilter === s ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-mist"
              }`}
            >
              {s === "all" ? "Everyone" : STATUS_LABELS[s]} <span className="opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={skipAlreadySent} onChange={(e) => setSkipAlreadySent(e.target.checked)} disabled={locked} className="mt-0.5 accent-brand" />
          <span>Skip anyone who has already been sent this exact message</span>
        </label>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-semibold">{selected.length} of {eligible.length} selected</span>
          <span className="flex gap-3">
            <button type="button" className="font-semibold text-brand" disabled={locked} onClick={() => setExcluded(new Set())}>All</button>
            <button type="button" className="font-semibold text-brand" disabled={locked} onClick={() => setExcluded(new Set(eligible.map((r) => r.id)))}>None</button>
          </span>
        </div>

        <ul className="mt-2 min-h-24 flex-1 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {eligible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nobody to text in this group.</li>}
          {eligible.map((r) => {
            const res = results[r.id];
            const last = r.sent[0];
            return (
              <li key={r.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-mist">
                  <input type="checkbox" className="mt-1 accent-brand" checked={!excluded.has(r.id)} onChange={() => toggle(r.id)} disabled={locked} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{r.name}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                    </span>
                    <span className="block text-xs text-muted">{r.phone && showPhone(r.phone)}</span>
                    {last && <span className="block text-xs text-muted">Last texted {formatDateTime(last.at)}</span>}
                  </span>
                  {res && (
                    <span className={`shrink-0 text-xs font-bold ${res.ok ? "text-emerald-700" : "text-red-700"}`}>
                      {res.ok ? "Sent" : "Failed"}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {(noPhone.length > 0 || skippedAsSent > 0) && (
          <p className="mt-3 text-xs text-muted">
            {skippedAsSent > 0 && <>{skippedAsSent} skipped as already sent this message. </>}
            {noPhone.length > 0 && (
              <>
                {noPhone.length} in this group {noPhone.length === 1 ? "has" : "have"} no valid mobile number:{" "}
                {noPhone.slice(0, 5).map((r) => r.name + (r.rawPhone ? ` (${r.rawPhone})` : "")).join(", ")}
                {noPhone.length > 5 ? "…" : ""}. Fix it on the shortlist page or email them instead.
              </>
            )}
          </p>
        )}
      </section>

      {/* ---------- Send ---------- */}
      <section className="panel space-y-4 p-6 lg:col-span-2">
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span>
            Estimated cost: <strong>{naira(cost)}</strong>{" "}
            <span className="text-muted">({totalPages} page{totalPages === 1 ? "" : "s"} at about ₦{NAIRA_PER_PAGE} each)</span>
          </span>
          <span>
            Termii balance:{" "}
            {balance ? <strong className={shortOfCredit ? "text-red-700" : ""}>{naira(balance.balance)}</strong> : <span className="text-muted">couldn&apos;t check</span>}
          </span>
        </div>
        {shortOfCredit && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
            Not enough Termii credit for this send. Top up at least {naira(cost - balance!.balance + 500)} first, or
            messages will start failing partway through.
          </p>
        )}

        {phase === "edit" && (
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" className="btn-primary" disabled={selected.length === 0 || !body.trim() || tooLong} onClick={() => setPhase("confirm")}>
              Text {selected.length} candidate{selected.length === 1 ? "" : "s"}…
            </button>
            <div className="flex items-end gap-2">
              <div>
                <label htmlFor="test-phone" className="text-xs font-semibold text-muted">Send a test to</label>
                <input id="test-phone" type="tel" inputMode="tel" placeholder="0803 123 4567" value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)} className="input mt-1 w-44 py-2" />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={testing || !testPhone.trim() || !body.trim() || tooLong}
                onClick={() => startTest(async () => setTestMsg(await sendTestSms(testPhone, body, sample)))}
              >
                {testing ? "Sending…" : "Send test"}
              </button>
            </div>
            {testMsg?.ok && <p role="status" className="text-sm text-emerald-800">{testMsg.ok}</p>}
            {testMsg?.error && <p role="alert" className="text-sm text-red-800">{testMsg.error}</p>}
          </div>
        )}

        {phase === "confirm" && (
          <div className="rounded-lg border-l-4 border-accent-dark bg-accent-soft p-4">
            <p className="text-[15px]">
              Text <strong>{selected.length} candidate{selected.length === 1 ? "" : "s"}</strong>
              {maxPages > 1 ? ` (up to ${maxPages} pages each)` : ""}, costing about <strong>{naira(cost)}</strong>?
              SMS can&apos;t be recalled once sent.
            </p>
            <div className="mt-3 flex gap-3">
              <button type="button" className="btn-primary" onClick={sendAll}>Yes, send now</button>
              <button type="button" className="btn-secondary" onClick={() => setPhase("edit")}>Go back</button>
            </div>
          </div>
        )}

        {(phase === "sending" || phase === "done") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {phase === "sending" ? "Sending…" : "Finished."} {sentOk} sent{failed.length ? `, ${failed.length} failed` : ""} of {queued}
              </span>
              {phase === "sending" && (
                <button type="button" className="btn-secondary py-1.5" onClick={() => { stopRef.current = true; }}>
                  Stop after this batch
                </button>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={queued} aria-valuenow={done}>
              <div className="h-full bg-brand transition-[width]" style={{ width: `${queued ? (done / queued) * 100 : 0}%` }} />
            </div>
            {fatal && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">{fatal}</p>}
            {failed.length > 0 && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
                <p className="font-semibold">Not sent:</p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {failed.map((f) => <li key={f.id}>{nameOf(f.id)}: {f.error}</li>)}
                </ul>
              </div>
            )}
            {phase === "done" && (
              <button type="button" className="btn-secondary" onClick={() => { setPhase("edit"); setResults({}); setExcluded(new Set()); setFatal(null); }}>
                Done
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
