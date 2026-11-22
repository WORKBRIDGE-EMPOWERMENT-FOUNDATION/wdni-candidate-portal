import { PrintButton } from "@/components/PrintButton";
import { BrandMark } from "@/components/BrandMark";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata = { title: "WDNI Guarantor Form" };

function Line({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-3 py-2">
      <span className="shrink-0 text-sm">{label}</span>
      <span className="h-6 flex-1 border-b border-slate-400" />
    </div>
  );
}

export default function GuarantorFormPage() {
  return (
    <main className="mx-auto max-w-3xl bg-white px-6 py-8 sm:px-10 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-mist p-4 text-sm text-slate-700">
        <span>Print this form, have your guarantor complete and sign it, then upload a scan or clear photo in the portal.</span>
        <PrintButton />
      </div>

      <header className="border-b-2 border-brand pb-4 text-center">
        <div className="mb-3 flex justify-center"><BrandMark size="lg" /></div>
        <p className="text-sm text-muted">Workbridge Empowerment Foundation</p>
        <h1 className="mt-1 text-xl font-bold">Women Drive Nigeria Initiative (WDNI)</h1>
        <p className="text-lg font-semibold">Guarantor Form</p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">Part A — Candidate</h2>
        <Line label="Candidate's full name:" />
        <Line label="Candidate's phone number:" />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">Part B — Guarantor</h2>
        <div className="flex gap-6">
          <div className="flex-1">
            <Line label="Full name:" />
            <Line label="Occupation / position:" />
            <Line label="Employer / business name:" />
            <Line label="Office address:" />
            <Line label="Home address:" />
            <Line label="Phone number:" />
            <Line label="Email address:" />
            <Line label="Relationship to candidate:" />
            <Line label="Number of years known:" />
            <Line label="Means of ID and ID number:" />
          </div>
          <div className="mt-2 grid h-40 w-32 shrink-0 place-items-center border border-dashed border-slate-400 p-2 text-center text-xs text-muted">
            Affix guarantor's passport photograph
          </div>
        </div>
      </section>

      <section className="mt-6 text-sm leading-relaxed">
        <h2 className="text-sm font-bold uppercase tracking-wide">Part C — Undertaking</h2>
        <p className="mt-2">
          I, the undersigned, confirm that I know the candidate named above personally, and that to the best of my
          knowledge they are of good character and conduct. I support their participation in the Women Drive Nigeria
          Initiative and agree to be contacted by Workbridge Empowerment Foundation to confirm these details or about
          the candidate's conduct during the programme. I confirm that the information I have given on this form is
          true.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-8">
          <Line label="Guarantor's signature:" />
          <Line label="Date:" />
        </div>
      </section>

      <section className="mt-6 text-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide">Part D — Witness (optional)</h2>
        <div className="grid grid-cols-2 gap-x-8">
          <Line label="Name:" />
          <Line label="Phone:" />
          <Line label="Signature:" />
          <Line label="Date:" />
        </div>
      </section>

      <p className="mt-8 border-t border-slate-300 pt-3 text-xs text-muted">
        Workbridge Empowerment Foundation (RC 9416201) · No. 10 Lord Lugard Street, Asokoro, Abuja FCT · {CONTACT_EMAIL}.
        The information on this form is used only to verify the candidate for WDNI.
      </p>
    </main>
  );
}
