"use client";

import { useActionState, useState } from "react";
import { addCandidate, importCsv, type FormState } from "../actions";

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <div className="space-y-2 text-sm">
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{state.ok}</p>}
      {state.error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
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
      <form action={addAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Add one candidate</h2>
        <div>
          <label htmlFor="full_name" className="text-sm font-medium text-slate-700">Full name *</label>
          <input id="full_name" name="full_name" required className="input mt-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="email" name="email" type="email" className="input mt-1" />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone</label>
            <input id="phone" name="phone" type="tel" placeholder="0803 123 4567" className="input mt-1" />
          </div>
        </div>
        <div>
          <label htmlFor="cohort" className="text-sm font-medium text-slate-700">Cohort</label>
          <input id="cohort" name="cohort" defaultValue="Pioneer 100" className="input mt-1" />
        </div>
        <Feedback state={addState} />
        <button className="btn-primary" disabled={adding}>{adding ? "Adding…" : "Add to shortlist"}</button>
      </form>

      <form action={csvAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Import from a spreadsheet</h2>
        <p className="text-sm text-slate-600">
          In Excel or Google Sheets, save the list as CSV with the columns <code>full_name, email, phone</code>.
          Duplicates are skipped.
        </p>
        <input name="file" type="file" accept=".csv,text/csv" className="block w-full text-sm" />
        <div>
          <label htmlFor="pasted" className="text-sm font-medium text-slate-700">…or paste rows</label>
          <textarea
            id="pasted"
            name="pasted"
            rows={5}
            className="input mt-1 font-mono text-xs"
            placeholder={"full_name,email,phone\nAmina Bello,amina@example.com,08031234567"}
          />
        </div>
        <div>
          <label htmlFor="csv_cohort" className="text-sm font-medium text-slate-700">Cohort</label>
          <input id="csv_cohort" name="cohort" defaultValue="Pioneer 100" className="input mt-1" />
        </div>
        <Feedback state={csvState} />
        <button className="btn-primary" disabled={importing}>{importing ? "Importing…" : "Import"}</button>
      </form>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Invite message</h2>
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
        <p className="text-sm text-slate-600">Send this to shortlisted candidates by email, SMS or WhatsApp.</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800">{invite}</pre>
      </div>
    </div>
  );
}
