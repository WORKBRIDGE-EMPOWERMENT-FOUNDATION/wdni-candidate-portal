import { DOCUMENTS, SECTIONS, displayValue, isVisible, type Values } from "@/lib/form-config";

export type SummaryDoc = { type: string; fileName: string | null; url?: string | null };

/** Read-only view of a candidate file. Used on the review step, after submission, and in the HR console. */
export function SubmissionSummary({ values, docs }: { values: Values; docs: SummaryDoc[] }) {
  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-white">
      {SECTIONS.map((section) => (
        <section key={section.id} className="grid gap-4 px-5 py-5 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
          <h3 className="text-[15px]">{section.title}</h3>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {section.fields.filter((f) => isVisible(f, values)).map((f) => (
              <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
                <dt className="text-[13px] text-muted">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-[15px] font-semibold">
                  {displayValue(f, values) || <span className="font-normal text-muted/60">Not given</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="grid gap-4 px-5 py-5 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
        <h3 className="text-[15px]">Documents</h3>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {DOCUMENTS.map((d) => {
            const doc = docs.find((x) => x.type === d.type);
            const needed = d.required(values);
            if (!doc && !needed && d.type === "drivers_licence") return null;
            return (
              <li key={d.type} className="min-w-0">
                <p className="text-[13px] text-muted">{d.label}</p>
                {doc ? (
                  doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-[15px] font-semibold text-brand underline underline-offset-2">
                      {doc.fileName ?? "View file"}
                    </a>
                  ) : (
                    <p className="mt-0.5 truncate text-[15px] font-semibold">{doc.fileName ?? "Uploaded"}</p>
                  )
                ) : (
                  <p className={`mt-0.5 text-[15px] ${needed ? "font-semibold text-red-800" : "text-muted/60"}`}>
                    {needed ? "Missing" : "Not provided"}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
