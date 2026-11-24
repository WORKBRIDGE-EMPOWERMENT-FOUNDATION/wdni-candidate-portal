"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmissionSummary } from "@/components/SubmissionSummary";
import {
  ACTIVE_DOCUMENTS, ACTIVE_SECTIONS, COLLECT_FINAL_STAGE, isVisible, missingDocuments, validateFields, type Field, type Values,
} from "@/lib/form-config";
import { saveDraft, submitApplication, type DocRecord } from "./actions";
import { DocumentUploader } from "./DocumentUploader";

/** "Passport photograph" → "passport photograph", but acronyms like "NIN slip…" are left as they are. */
const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

const STEPS = [
  ...ACTIVE_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
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
  const section = ACTIVE_SECTIONS.find((s) => s.id === current.id);
  const uploadedTypes = docs.map((d) => d.doc_type);

  const sectionComplete = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of ACTIVE_SECTIONS) out[s.id] = Object.keys(validateFields(s.fields, values)).length === 0;
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

  const allFieldErrors = validateFields(ACTIVE_SECTIONS.flatMap((s) => s.fields), values);
  const missingDocs = missingDocuments(values, uploadedTypes);
  const readyToSubmit = Object.keys(allFieldErrors).length === 0 && missingDocs.length === 0;

  const totalSteps = STEPS.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Route-style step list (desktop) */}
      <nav aria-label="Form steps" className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
        <ol>
          {STEPS.map((s, i) => {
            const done = sectionComplete[s.id];
            const active = i === step;
            const last = i === totalSteps - 1;
            return (
              <li key={s.id} className="relative pb-5 last:pb-0">
                {!last &&
                  (done ? (
                    <span aria-hidden className="absolute left-[11px] top-6 h-full w-[3px] bg-brand" />
                  ) : (
                    <span aria-hidden className="dash-y absolute left-[11px] top-7 h-[calc(100%-8px)] w-[3px] text-line" />
                  ))}
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex w-full items-start gap-3 text-left"
                >
                  <span
                    className={`relative z-10 grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full border-[3px] ${
                      active
                        ? "border-accent-dark bg-white"
                        : done
                          ? "border-brand bg-brand"
                          : "border-line bg-white group-hover:border-muted/50"
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                    {!active && done && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span
                    className={`pt-0.5 text-[15px] leading-snug ${
                      active ? "font-extrabold text-ink" : done ? "font-semibold text-ink" : "text-muted group-hover:text-ink"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div>
        {/* Compact progress (mobile) */}
        <div className="mb-4 lg:hidden">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 flex-1 rounded-full ${
                  i === step ? "bg-accent-dark" : sectionComplete[s.id] ? "bg-brand" : "bg-line"
                }`}
              />
            ))}
          </div>
          <label htmlFor="step-select" className="sr-only">Go to step</label>
          <select
            id="step-select"
            className="input mt-3 font-semibold"
            value={step}
            onChange={(e) => goTo(Number(e.target.value))}
          >
            {STEPS.map((s, i) => (
              <option key={s.id} value={i}>
                Step {i + 1} of {totalSteps}: {s.title}
                {sectionComplete[s.id] ? " (done)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-6 sm:px-8">
            <p className="text-sm font-semibold text-muted">Step {step + 1} of {totalSteps}</p>
            <h2 className="mt-1 text-2xl">{current.title}</h2>
            {section?.description && <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">{section.description}</p>}
            {current.id === "documents" && (
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
                Clear photos or scans in JPG, PNG or PDF, up to 5 MB each.
                {COLLECT_FINAL_STAGE ? (
                  <>
                    {" "}You can{" "}
                    <a href="/guarantor-form" target="_blank" className="font-semibold text-brand underline underline-offset-2">
                      download the guarantor form here
                    </a>
                    .
                  </>
                ) : (
                  <> Your guarantor form and medical fitness certificate are not needed yet. We will ask for them before training.</>
                )}
              </p>
            )}
            {current.id === "review" && (
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
                Check your answers. Once you submit, you can&apos;t change them unless the WDNI team asks you to.
              </p>
            )}
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {section && (
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {section.fields.filter((f) => isVisible(f, values)).map((f) => (
                  <FieldInput key={f.name} field={f} value={values[f.name] ?? ""} error={errors[f.name]} onChange={setValue} />
                ))}
              </div>
            )}

            {current.id === "documents" && (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {ACTIVE_DOCUMENTS.filter((d) => d.type !== "drivers_licence" || values.has_drivers_licence === "yes").map((d) => (
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
            )}

            {current.id === "review" && (
              <div className="space-y-6">
                {!readyToSubmit && (
                  <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-[15px] text-ink">
                    <p className="font-bold">A few things are still missing</p>
                    <ul className="mt-2 space-y-1">
                      {ACTIVE_SECTIONS.filter((s) => !sectionComplete[s.id]).map((s) => (
                        <li key={s.id}>
                          <button className="font-semibold underline underline-offset-2" onClick={() => goTo(STEPS.findIndex((x) => x.id === s.id))}>
                            Finish {lowerFirst(s.title)}
                          </button>
                        </li>
                      ))}
                      {missingDocs.map((d) => (
                        <li key={d.type}>
                          <button className="font-semibold underline underline-offset-2" onClick={() => goTo(STEPS.findIndex((x) => x.id === "documents"))}>
                            Upload your {lowerFirst(d.label)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <SubmissionSummary values={values} docs={docs.map((d) => ({ type: d.doc_type, fileName: d.file_name }))} />

                <label className="flex cursor-pointer gap-3 rounded-lg border border-line bg-mist p-4 text-[15px] leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-brand"
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
                role={message.kind === "error" ? "alert" : "status"}
                className={`mt-6 rounded-md border-l-4 px-3 py-2.5 text-sm ${
                  message.kind === "ok" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-red-700 bg-red-50 text-red-900"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-mist/60 px-5 py-4 sm:px-8">
            <button type="button" className="btn-secondary" disabled={step === 0 || pending} onClick={() => goTo(step - 1)}>
              Back
            </button>
            <div className="flex flex-wrap gap-3">
              {section && (
                <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(false)}>
                  Save for later
                </button>
              )}
              {current.id === "review" ? (
                <button type="button" className="btn-primary" disabled={pending || !readyToSubmit || !declaration} onClick={submit}>
                  {pending ? "Submitting…" : "Submit my candidate file"}
                </button>
              ) : section ? (
                <button type="button" className="btn-primary" disabled={pending} onClick={() => save(true)}>
                  {pending ? "Saving…" : "Save and continue"}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>
                  Continue to review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      <select {...common} className="input mt-1.5" value={value} onChange={(e) => onChange(f.name, e.target.value)}>
        <option value="">Select…</option>
        {f.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  } else if (f.type === "textarea") {
    control = (
      <textarea {...common} rows={3} className="input mt-1.5" value={value} onChange={(e) => onChange(f.name, e.target.value)} />
    );
  } else if (f.type === "yesno") {
    control = (
      <div className="mt-1.5 flex gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
        {["yes", "no"].map((opt) => (
          <label
            key={opt}
            className={`flex min-w-24 cursor-pointer items-center justify-center rounded-md border px-5 py-2.5 text-[15px] font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
              value === opt
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-ink hover:border-muted/50"
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
        className="input mt-1.5"
        value={value}
        onChange={(e) => onChange(f.name, e.target.value)}
      />
    );
  }

  return (
    <div className={f.wide ? "sm:col-span-2" : ""}>
      <label id={`${id}-label`} htmlFor={f.type === "yesno" ? undefined : id} className="field-label">
        {f.label}
        {!f.required && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {control}
      {f.help && !error && <p id={`${id}-help`} className="mt-1.5 text-[13px] text-muted">{f.help}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-[13px] font-semibold text-red-800">{error}</p>}
    </div>
  );
}
