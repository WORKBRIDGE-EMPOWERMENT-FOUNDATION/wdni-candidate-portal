import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteMap } from "@/components/RouteMap";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP, PHONE_SIGNIN } from "@/lib/constants";

const CHECKLIST = [
  PHONE_SIGNIN ? "The email address or phone number you applied with" : "Access to the email address you applied with",
  "Your NIN (11 digits)",
  "Details of your next of kin",
  "Details of a guarantor who knows you well",
  "A recent passport photograph",
  "Your NIN slip or National ID card",
  "Your driver's licence, if you have one",
  "A medical fitness certificate",
];

export default function Home() {
  return (
    <>
      <SiteHeader right={<Link href="/login" className="btn-primary py-2">Sign in</Link>} />

      <main>
        <section className="bg-navy-900 text-white">
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 lg:pt-20">
            <div className="max-w-2xl">
              <p className="text-[15px] font-bold text-accent">Pioneer 100 shortlist</p>
              <h1 className="mt-3 text-[2.4rem] leading-[1.1] sm:text-[3.4rem]">
                Complete your candidate file
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                You have been shortlisted for the Women Drive Nigeria Initiative. Give us your details and documents
                so we can verify them before training begins.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/login" className="btn-accent px-6 py-3 text-base">
                  Start my candidate file
                </Link>
                <span className="text-sm text-white/65">About 20 minutes. Your progress is saved.</span>
              </div>
            </div>

            <div className="mt-16 border-t border-white/15 pt-10">
              <h2 className="mb-6 text-sm font-semibold text-white/65">Your route through WDNI</h2>
              <RouteMap current={1} />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-2xl">What happens in the portal</h2>
            <ol className="mt-6 space-y-6">
              {[
                ["Sign in with a code", PHONE_SIGNIN
                  ? "Use the email address or phone number you applied with. We send you a one-time code, so there's no password to remember."
                  : "Use the email address you applied with. We email you a one-time code, so there's no password to remember."],
                ["Fill in your details", "Personal details, next of kin, driving experience, your guarantor and a few health questions."],
                ["Upload your documents", "Clear photos or scans in JPG, PNG or PDF, up to 5 MB each. A phone camera is fine."],
                ["Check and submit", "Review everything, confirm the declaration and submit. The WDNI team will contact you after review."],
              ].map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-display text-[15px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 max-w-prose text-[15px] leading-relaxed text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="self-start rounded-2xl border border-brand-100 bg-accent-soft p-6 sm:p-8">
            <h2 className="text-lg">Have these ready</h2>
            <ul className="mt-5 divide-y divide-brand-100">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 py-2.5 text-[15px]">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">
              You will also need a signed guarantor form.{" "}
              <Link href="/guarantor-form" className="font-semibold text-brand underline underline-offset-2">
                Download the guarantor form
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-navy-950 text-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:px-6 md:grid-cols-2">
          <div>
            <p className="font-bold text-white">Workbridge Empowerment Foundation</p>
            <p className="mt-1">RC 9416201. No. 10 Lord Lugard Street, Asokoro, Abuja FCT.</p>
            <p className="mt-3 max-w-md">
              WDNI is delivered with the Nigerian Institute of Transport Technology (NITT) and the Female Drivers
              Association of Nigeria (FEDAN).
            </p>
          </div>
          <div className="md:text-right">
            <p className="font-bold text-white">Need help with your application?</p>
            <p className="mt-1">
              <a className="underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <p>Phone {CONTACT_PHONE}</p>
            <p>WhatsApp {CONTACT_WHATSAPP}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
