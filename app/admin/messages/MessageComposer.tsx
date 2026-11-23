"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_LABELS, STATUS_STYLES, formatDateTime, type CandidateStatus } from "@/lib/constants";
import { personalise, renderEmailHtml } from "@/lib/email-html";
import { sendBatch, sendTestEmail, type BatchResult } from "./actions";

export type Recipient = {
  id: string;
  name: string;
  email: string | null;
  status: CandidateStatus;
  cohort: string;
  sent: { subject: string; at: string }[];
};

const BATCH = 10;

type Phase = "edit" | "confirm" | "sending" | "done";

export function MessageComposer({
  recipients,
  defaultSubject,
  defaultBody,
  adminEmail,
}: {
  recipients: Recipient[];
  defaultSubject: string;
  defaultBody: string;
  adminEmail: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("shortlisted");
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(true);

  const [phase, setPhase] = useState<Phase>("edit");
  const [results, setResults] = useState<Record<string, BatchResult>>({});
  const [fatal, setFatal] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);
  const stopRef = useRef(false);

  const [testMsg, setTestMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [testing, startTest] = useTransition();

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const alreadySent = (r: Recipient) => r.sent.some((s) => s.subject.trim() === subject.trim());

  // Everyone matching the status filter.
  const inFilter = useMemo(
    () => recipients.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [recipients, statusFilter],
  );
  const noEmail = inFilter.filter((r) => !r.email);
  const eligible = inFilter.filter((r) => r.email && !(skipAlreadySent && alreadySent(r)));
  const selected = eligible.filter((r) => !excluded.has(r.id));
  const skippedAsSent = inFilter.filter((r) => r.email && skipAlreadySent && alreadySent(r)).length;

  const sample = selected[0]?.name ?? recipients[0]?.name ?? "Amina Bello";
  const previewHtml = useMemo(() => renderEmailHtml(personalise(body, sample)), [body, sample]);
  const leftoverPlaceholder = /\[portal link\]/i.test(body);

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
      const batch = queue.slice(i, i + BATCH);
      try {
        const res = await sendBatch(batch, subject, body);
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
        setFatal(`Sending stopped: ${err instanceof Error ? err.message : "connection lost"}. Nobody after this point was emailed.`);
        break;
      }
    }
    setPhase("done");
    router.refresh();
  }

  const total = phase === "edit" || phase === "confirm" ? selected.length : Object.keys(results).length;
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
          <label htmlFor="subject" className="field-label">Subject</label>
          <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} className="input mt-1.5" maxLength={200} />
        </div>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="body" className="field-label">Message</label>
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
            id="body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={locked}
            rows={14}
            className="input mt-1.5 leading-relaxed"
          />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>{"{first_name}"} becomes each candidate&apos;s first name. Links are made clickable.</span>
            <button type="button" className="font-semibold text-brand underline underline-offset-2"
              onClick={() => { setSubject(defaultSubject); setBody(defaultBody); }} disabled={locked}>
              Reset to the standard invite
            </button>
          </div>
          {leftoverPlaceholder && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The message still says “[portal link]”. Set NEXT_PUBLIC_SITE_URL or type the portal address in.
            </p>
          )}
        </div>

        <div>
          <button type="button" className="text-sm font-semibold text-brand" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          {showPreview && (
            <div className="mt-2 overflow-hidden rounded-lg border border-line">
              <div className="border-b border-line bg-mist px-4 py-2 text-sm">
                <span className="text-muted">To:</span> {sample} · <span className="text-muted">Subject:</span>{" "}
                <span className="font-semibold">{subject || "(no subject)"}</span>
              </div>
              <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="h-[520px] w-full bg-mist" />
            </div>
          )}
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
          <span>Skip anyone who has already been sent an email with this subject</span>
        </label>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-semibold">{selected.length} of {eligible.length} selected</span>
          <span className="flex gap-3">
            <button type="button" className="font-semibold text-brand" disabled={locked} onClick={() => setExcluded(new Set())}>All</button>
            <button type="button" className="font-semibold text-brand" disabled={locked} onClick={() => setExcluded(new Set(eligible.map((r) => r.id)))}>None</button>
          </span>
        </div>

        <ul className="mt-2 min-h-24 flex-1 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {eligible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nobody to email in this group.</li>}
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
                    <span className="block truncate text-xs text-muted">{r.email}</span>
                    {last && <span className="block text-xs text-muted">Last emailed {formatDateTime(last.at)}</span>}
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

        {(noEmail.length > 0 || skippedAsSent > 0) && (
          <p className="mt-3 text-xs text-muted">
            {skippedAsSent > 0 && <>{skippedAsSent} skipped as already sent this subject. </>}
            {noEmail.length > 0 && <>{noEmail.length} in this group {noEmail.length === 1 ? "has" : "have"} no email address: {noEmail.slice(0, 5).map((r) => r.name).join(", ")}{noEmail.length > 5 ? "…" : ""}. Contact them by SMS or WhatsApp.</>}
          </p>
        )}
      </section>

      {/* ---------- Send ---------- */}
      <section className="panel space-y-4 p-6 lg:col-span-2">
        {phase === "edit" && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={selected.length === 0 || !subject.trim() || !body.trim()} onClick={() => setPhase("confirm")}>
              Send to {selected.length} candidate{selected.length === 1 ? "" : "s"}…
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={testing || !subject.trim() || !body.trim()}
              onClick={() => startTest(async () => setTestMsg(await sendTestEmail(subject, body, sample)))}
            >
              {testing ? "Sending test…" : `Send a test to ${adminEmail || "me"}`}
            </button>
            {testMsg?.ok && <p role="status" className="text-sm text-emerald-800">{testMsg.ok}</p>}
            {testMsg?.error && <p role="alert" className="text-sm text-red-800">{testMsg.error}</p>}
          </div>
        )}

        {phase === "confirm" && (
          <div className="rounded-lg border-l-4 border-accent-dark bg-accent-soft p-4">
            <p className="text-[15px]">
              Send <strong>“{subject.trim()}”</strong> to <strong>{selected.length} candidate{selected.length === 1 ? "" : "s"}</strong>?
              Emails can&apos;t be recalled once sent.
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
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={queued} aria-valuenow={total}>
              <div className="h-full bg-brand transition-[width]" style={{ width: `${queued ? (total / queued) * 100 : 0}%` }} />
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
            {phase === "done" && skipAlreadySent && (
              <p className="text-xs text-muted">Anyone who was sent this subject is now skipped, so sending again only reaches people who failed or were left out.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
