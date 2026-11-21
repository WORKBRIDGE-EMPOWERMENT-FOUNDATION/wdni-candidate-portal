import { DOCUMENTS, SECTIONS, displayValue, isVisible, type Values } from "@/lib/form-config";

export type SummaryDoc = { type: string; fileName: string | null; url?: string | null };

/** Read-only view of a candidate's answers and documents. Used on the review step, after submission, and in admin. */
export function SubmissionSummary({ values, docs }: { values: Values; docs: SummaryDoc[] }) {
  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <section key={section.id} className="rounded-xl border border-slate-200 bg-white">
          <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">{section.title}</h3>
          <dl className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
            {section.fields.filter((f) => isVisible(f, values)).map((f) => (
              <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-900">
                  {displayValue(f, values) || <span className="text-slate-400">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="rounded-xl border border-slate-200 bg-white">
        <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">Documents</h3>
        <ul className="divide-y divide-slate-100">
          {DOCUMENTS.map((d) => {
            const doc = docs.find((x) => x.type === d.type);
            return (
              <li key={d.type} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-slate-700">{d.label}</span>
                {doc ? (
                  doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="truncate font-medium text-brand underline">
                      {doc.fileName ?? "View file"}
                    </a>
                  ) : (
                    <span className="truncate text-slate-900">{doc.fileName ?? "Uploaded"}</span>
                  )
                ) : (
                  <span className="text-slate-400">{d.required(values) ? "Missing" : "Not provided"}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
