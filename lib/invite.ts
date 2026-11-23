import { PHONE_SIGNIN } from "@/lib/constants";

/** Default invite wording, used on the shortlist page (copy for WhatsApp/SMS) and as the starting bulk email. */
export function defaultInvite(siteUrl: string) {
  return (
    `Congratulations! You have been shortlisted for the Women Drive Nigeria Initiative (WDNI) Pioneer 100.\n\n` +
    `Please complete your biodata and upload your documents at ${siteUrl || "[portal link]"}\n` +
    (PHONE_SIGNIN
      ? `Sign in with the email address or phone number you applied with. You will receive a one-time code.\n\n`
      : `Sign in with the email address you applied with. We will email you a one-time code (check your spam folder if you can't see it).\n\n`) +
    `Have these ready: your NIN, next of kin and guarantor details, a passport photograph, your NIN slip, ` +
    `a signed guarantor form, a medical fitness certificate, and your driver's licence if you have one.\n\n` +
    `Workbridge Empowerment Foundation`
  );
}

export const DEFAULT_EMAIL_SUBJECT = "You've been shortlisted for WDNI Pioneer 100";

/** Default bulk-email body: the invite with a personal greeting. */
export function defaultInviteEmail(siteUrl: string) {
  return `Dear {first_name},\n\n${defaultInvite(siteUrl)}`;
}
