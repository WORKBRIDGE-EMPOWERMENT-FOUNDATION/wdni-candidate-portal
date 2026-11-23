"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PHONE_SIGNIN } from "@/lib/constants";
import { addCandidate, importCsv, type FormState } from "../actions";

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <div className="space-y-2 text-sm">
      {state.ok && <p role="status" className="rounded-md border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2.5 text-emerald-900">{state.ok}</p>}
      {state.error && (
        <div role="alert" className="rounded-md border-l-4 border-red-700 bg-red-50 px-3 py-2.5 text-red-900">
          <p>{state.error}</p>
          {state.details && state.details.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {state.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ShortlistForms({ invite }: { invite: string }) {
  const [addState, addAction, adding] = useActionState(addCandidate, null);
  const [csvState, csvAction, importing] = useActionState(importCsv, null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={addAction} className="panel space-y-4 p-6">
        <h2 className="text-lg">Add one candidate</h2>
        <div>
          <label htmlFor="full_name" className="field-label">Full name</label>
          <input id="full_name" name="full_name" required className="input mt-1.5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" name="email" type="email" required={!PHONE_SIGNIN} className="input mt-1.5" />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">Phone{!PHONE_SIGNIN && <span className="font-normal text-muted"> (optional)</span>}</label>
            <input id="phone" name="phone" type="tel" placeholder="0803 123 4567" className="input mt-1.5" />
          </div>
        </div>
        <div>
          <label htmlFor="cohort" className="field-label">Cohort</label>
          <input id="cohort" name="cohort" defaultValue="Pioneer 100" className="input mt-1.5" />
        </div>
        <Feedback state={addState} />
        <button className="btn-primary" disabled={adding}>{adding ? "Adding…" : "Add to shortlist"}</button>
      </form>

      <form action={csvAction} className="panel space-y-4 p-6">
        <h2 className="text-lg">Import from a spreadsheet</h2>
        <p className="text-[15px] text-muted">
          In Excel or Google Sheets, save the list as CSV with the columns <code>full_name, email, phone</code>.
          Duplicates are skipped.
        </p>
        <input name="file" type="file" accept=".csv,text/csv" className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:py-2 file:font-semibold hover:file:bg-mist" />
        <div>
          <label htmlFor="pasted" className="field-label">…or paste rows</label>
          <textarea
            id="pasted"
            name="pasted"
            rows={5}
            className="input mt-1.5 font-mono text-xs"
            placeholder={"full_name,email,phone\nAmina Bello,amina@example.com,08031234567"}
          />
        </div>
        <div>
          <label htmlFor="csv_cohort" className="field-label">Cohort</label>
          <input id="csv_cohort" name="cohort" defaultValue="Pioneer 100" className="input mt-1.5" />
        </div>
        <Feedback state={csvState} />
        <button className="btn-primary" disabled={importing}>{importing ? "Importing…" : "Import"}</button>
      </form>

      <div className="panel space-y-3 p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">Invite message</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(invite);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[15px] text-muted">
          Copy this for SMS or WhatsApp. To email everyone at once, use{" "}
          <Link href="/admin/messages" className="font-semibold text-brand underline underline-offset-2">Email candidates</Link>,
          where you can edit it before sending.
        </p>
        <pre className="whitespace-pre-wrap rounded-md border border-line bg-mist p-4 font-sans text-[15px] leading-relaxed">{invite}</pre>
      </div>
    </div>
  );
}
