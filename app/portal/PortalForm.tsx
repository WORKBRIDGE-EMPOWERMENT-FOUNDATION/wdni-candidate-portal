"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmissionSummary } from "@/components/SubmissionSummary";
import {
  DOCUMENTS, SECTIONS, isVisible, missingDocuments, validateFields, type Field, type Values,
} from "@/lib/form-config";
import { saveDraft, submitApplication, type DocRecord } from "./actions";
import { DocumentUploader } from "./DocumentUploader";

const STEPS = [
  ...SECTIONS.map((s) => ({ id: s.id, title: s.title })),
  { id: "documents", title: "Documents" },
  { id: "review", title: "Review & submit" },
];

export function PortalForm({
  userId,
  initialValues,
  initialDocs,
}: {
  userId: string;
  initialValues: Values;
  initialDocs: DocRecord[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initialValues);
  const [docs, setDocs] = useState<DocRecord[]>(initialDocs);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [declaration, setDeclaration] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = STEPS[step];
  const section = SECTIONS.find((s) => s.id === current.id);
  const uploadedTypes = docs.map((d) => d.doc_type);

  const sectionComplete = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of SECTIONS) out[s.id] = Object.keys(validateFields(s.fields, values)).length === 0;
    out.documents = missingDocuments(values, uploadedTypes).length === 0;
    return out;
  }, [values, uploadedTypes]);

  function setValue(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  }

  function goTo(index: number) {
    setMessage(null);
    setStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save(advance: boolean) {
    setMessage(null);
    if (section && advance) {
      const sectionErrors = validateFields(section.fields, values);
      if (Object.keys(sectionErrors).length) {
        setErrors(sectionErrors);
        setMessage({ kind: "error", text: "Please complete the highlighted fields." });
        return;
      }
    }
    startTransition(async () => {
      const res = await saveDraft(values);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        setMessage({ kind: "error", text: res.error });
        return;
      }
      if (advance) goTo(step + 1);
      else setMessage({ kind: "ok", text: "Saved. You can sign out and come back any time." });
    });
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const res = await submitApplication(values, declaration);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        setMessage({ kind: "error", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  const allFieldErrors = validateFields(SECTIONS.flatMap((s) => s.fields), values);
  const missingDocs = missingDocuments(values, uploadedTypes);
  const readyToSubmit = Object.keys(allFieldErrors).length === 0 && missingDocs.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Step list */}
      <nav aria-label="Form steps" className="lg:sticky lg:top-6 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {STEPS.map((s, i) => {
            const done = sectionComplete[s.id];
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    i === step ? "bg-brand text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      i === step ? "bg-white text-brand" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {done && i !== step ? "✓" : i + 1}
                  </span>
                  <span className="whitespace-nowrap">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">{current.title}</h2>

        {section && (
          <>
            {section.description && <p className="mt-1 text-sm text-slate-600">{section.description}</p>}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {section.fields.filter((f) => isVisible(f, values)).map((f) => (
                <FieldInput key={f.name} field={f} value={values[f.name] ?? ""} error={errors[f.name]} onChange={setValue} />
              ))}
            </div>
          </>
        )}

        {current.id === "documents" && (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Upload clear photos or scans. JPG, PNG or PDF, up to 5 MB each. Need the guarantor form?{" "}
              <a href="/guarantor-form" target="_blank" className="font-medium text-brand underline">
                Download it here
              </a>
              .
            </p>
            <ul className="mt-6 space-y-3">
              {DOCUMENTS.filter((d) => d.type !== "drivers_licence" || values.has_drivers_licence === "yes").map((d) => (
                <DocumentUploader
                  key={d.type}
                  spec={d}
                  required={d.required(values)}
                  userId={userId}
                  existing={docs.find((x) => x.doc_type === d.type) ?? null}
                  onUploaded={(doc) => setDocs((all) => [...all.filter((x) => x.doc_type !== doc.doc_type), doc])}
                />
              ))}
            </ul>
          </>
        )}

        {current.id === "review" && (
          <div className="mt-4 space-y-6">
            {!readyToSubmit && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Before you can submit:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {SECTIONS.filter((s) => !sectionComplete[s.id]).map((s) => (
                    <li key={s.id}>
                      Complete{" "}
                      <button className="underline" onClick={() => goTo(STEPS.findIndex((x) => x.id === s.id))}>
                        {s.title}
                      </button>
                    </li>
                  ))}
                  {missingDocs.map((d) => (
                    <li key={d.type}>
                      Upload your{" "}
                      <button className="underline" onClick={() => goTo(STEPS.findIndex((x) => x.id === "documents"))}>
                        {d.label.toLowerCase()}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SubmissionSummary values={values} docs={docs.map((d) => ({ type: d.doc_type, fileName: d.file_name }))} />

            <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
              />
              <span>
                I confirm that the information I have given is true and complete, and I understand that false
                information may lead to my removal from the programme. I consent to Workbridge Empowerment Foundation
                using my personal data, including my identity documents and health information, to verify my
                eligibility and to organise my training, certification and job placement under the Women Drive Nigeria
                Initiative, in line with the Nigeria Data Protection Act 2023.
              </span>
            </label>
          </div>
        )}

        {message && (
          <p
            className={`mt-6 rounded-lg px-3 py-2 text-sm ${
              message.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <button type="button" className="btn-secondary" disabled={step === 0 || pending} onClick={() => goTo(step - 1)}>
            Back
          </button>
          <div className="flex flex-wrap gap-3">
            {section && (
              <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(false)}>
                Save draft
              </button>
            )}
            {current.id === "review" ? (
              <button
                type="button"
                className="btn-primary"
                disabled={pending || !readyToSubmit || !declaration}
                onClick={submit}
              >
                {pending ? "Submitting…" : "Submit application"}
              </button>
            ) : section ? (
              <button type="button" className="btn-primary" disabled={pending} onClick={() => save(true)}>
                {pending ? "Saving…" : "Save and continue"}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field: f,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
}) {
  const id = `f-${f.name}`;
  const common = {
    id,
    name: f.name,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : f.help ? `${id}-help` : undefined,
  };

  let control: React.ReactNode;
  if (f.type === "select") {
    control = (
      <select {...common} className="input mt-1" value={value} onChange={(e) => onChange(f.name, e.target.value)}>
        <option value="">Select…</option>
        {f.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  } else if (f.type === "textarea") {
    control = (
      <textarea {...common} rows={3} className="input mt-1" value={value} onChange={(e) => onChange(f.name, e.target.value)} />
    );
  } else if (f.type === "yesno") {
    control = (
      <div className="mt-2 flex gap-3" role="radiogroup" aria-labelledby={`${id}-label`}>
        {["yes", "no"].map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
              value === opt ? "border-brand bg-brand/5 font-medium text-brand" : "border-slate-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name={f.name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(f.name, opt)}
              className="sr-only"
            />
            {opt === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    );
  } else {
    control = (
      <input
        {...common}
        type={f.type === "number" ? "number" : f.type}
        inputMode={f.type === "number" ? "numeric" : f.type === "tel" ? "tel" : undefined}
        min={f.type === "number" ? 0 : undefined}
        placeholder={f.placeholder}
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(f.name, e.target.value)}
      />
    );
  }

  return (
    <div className={f.wide ? "sm:col-span-2" : ""}>
      <label id={`${id}-label`} htmlFor={f.type === "yesno" ? undefined : id} className="text-sm font-medium text-slate-700">
        {f.label}
        {f.required && <span className="text-rose-600"> *</span>}
      </label>
      {control}
      {f.help && !error && <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">{f.help}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
