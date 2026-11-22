import { requireAdmin } from "@/lib/auth";
import { PHONE_SIGNIN } from "@/lib/constants";
import { ShortlistForms } from "./ShortlistForms";

export default async function ShortlistPage() {
  await requireAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const invite =
    `Congratulations! You have been shortlisted for the Women Drive Nigeria Initiative (WDNI) Pioneer 100.\n\n` +
    `Please complete your biodata and upload your documents at ${siteUrl || "[portal link]"}\n` +
    (PHONE_SIGNIN
      ? `Sign in with the email address or phone number you applied with. You will receive a one-time code.\n\n`
      : `Sign in with the email address you applied with. We will email you a one-time code (check your spam folder if you can't see it).\n\n`) +
    `Have these ready: your NIN, next of kin and guarantor details, a passport photograph, your NIN slip, ` +
    `a signed guarantor form, a medical fitness certificate, and your driver's licence if you have one.\n\n` +
    `Workbridge Empowerment Foundation`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Add to shortlist</h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">
          {PHONE_SIGNIN
            ? "Only people on the shortlist can sign in to the portal. Each candidate needs an email address, a phone number, or both. They must sign in with exactly what you enter here."
            : "Only people on the shortlist can sign in to the portal. Each candidate needs the email address they will sign in with. A phone number is optional and is kept for your records."}
        </p>
      </div>
      <ShortlistForms invite={invite} />
    </div>
  );
}
