import { requireAdmin } from "@/lib/auth";
import { ShortlistForms } from "./ShortlistForms";

export default async function ShortlistPage() {
  await requireAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const invite =
    `Congratulations! You have been shortlisted for the Women Drive Nigeria Initiative (WDNI) Pioneer 100.\n\n` +
    `Please complete your biodata and upload your documents at ${siteUrl || "[portal link]"}\n` +
    `Sign in with the email address or phone number you applied with. You will receive a one-time code.\n\n` +
    `Have these ready: your NIN, next of kin and guarantor details, a passport photograph, your NIN slip, ` +
    `a signed guarantor form, a medical fitness certificate, and your driver's licence if you have one.\n\n` +
    `Workbridge Empowerment Foundation`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add to shortlist</h1>
        <p className="text-sm text-slate-600">
          Only people on the shortlist can sign in to the portal. Each candidate needs an email address, a phone
          number, or both. They must sign in with exactly what you enter here.
        </p>
      </div>
      <ShortlistForms invite={invite} />
    </div>
  );
}
