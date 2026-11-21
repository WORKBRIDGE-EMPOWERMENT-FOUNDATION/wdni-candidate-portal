import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP } from "@/lib/constants";
import { DOCUMENTS } from "@/lib/form-config";

export default function Home() {
  return (
    <>
      <SiteHeader right={<Link href="/login" className="btn-primary">Sign in</Link>} />
      <main>
        <section className="bg-brand text-white">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Pioneer 100 · Candidate portal</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
              Congratulations on being shortlisted for the Women Drive Nigeria Initiative
            </h1>
            <p className="mt-4 max-w-2xl text-slate-200">
              Complete your biodata and upload your documents so we can verify your details and get you ready for
              training. It takes about 20 minutes, and you can save and come back at any time.
            </p>
            <Link href="/login" className="btn mt-8 bg-accent px-6 py-3 text-base text-brand-dark hover:brightness-95">
              Start or continue my application
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">How it works</h2>
            <ol className="mt-4 space-y-4 text-sm text-slate-700">
              {[
                ["Sign in", "Use the email address or phone number you applied with. We'll send you a one-time code."],
                ["Fill your biodata", "Personal details, next of kin, driving experience, guarantor and health."],
                ["Upload documents", "Clear photos or scans (JPG, PNG or PDF, up to 5 MB each)."],
                ["Review and submit", "Check everything, accept the declaration and submit. We'll contact you after review."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-slate-900">{title}</span>
                    {text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Have these ready</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Your NIN (11 digits)</li>
              <li>Next of kin and guarantor contact details</li>
              {DOCUMENTS.map((d) => (
                <li key={d.type}>
                  {d.label}
                  {d.type === "drivers_licence" && " (if you have one)"}
                  {d.type === "education_certificate" && " (optional)"}
                  {d.type === "guarantor_form" && (
                    <>
                      {" "}
                      — <Link href="/guarantor-form" className="font-medium text-brand underline">download the form</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-600">
          Need help? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, call{" "}
          {CONTACT_PHONE} or WhatsApp {CONTACT_WHATSAPP}.
        </div>
      </footer>
    </>
  );
}
