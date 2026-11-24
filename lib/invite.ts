import { PHONE_SIGNIN } from "@/lib/constants";
import { COLLECT_FINAL_STAGE } from "@/lib/form-config";

/** Default invite wording, used on the shortlist page (copy for WhatsApp/SMS) and as the starting bulk email. */
export function defaultInvite(siteUrl: string) {
  return (
    `Congratulations! You have been shortlisted for the Women Drive Nigeria Initiative (WDNI) Pioneer 100.\n\n` +
    `Please complete your biodata and upload your documents at ${siteUrl || "[portal link]"}\n` +
    (PHONE_SIGNIN
      ? `Sign in with the email address or phone number you applied with. You will receive a one-time code.\n\n`
      : `Sign in with the email address you applied with. We will email you a one-time code (check your spam folder if you can't see it).\n\n`) +
    (COLLECT_FINAL_STAGE
      ? `Have these ready: your NIN, next of kin and guarantor details, a passport photograph, your NIN slip, ` +
        `a signed guarantor form, a medical fitness certificate, and your driver's licence if you have one.\n\n`
      : `Have these ready: your NIN, your next of kin's details, a passport photograph, your NIN slip, ` +
        `and your driver's licence if you have one. We will ask for a guarantor and a medical fitness certificate before training.\n\n`) +
    `Workbridge Empowerment Foundation`
  );
}

export const DEFAULT_EMAIL_SUBJECT = "WDNI: Create your participant profile";

/** Default bulk email for the current phase (profile registration before orientation and induction). */
export function defaultInviteEmail(siteUrl: string) {
  return `Dear {first_name},

Greetings from the Women Drive Nigeria Initiative (WDNI).

We sincerely apologise for the delay in commencing the programme and appreciate your patience and continued interest.

As part of our next phase, all shortlisted candidates are required to create their participant profiles using the link below.

Profile Registration Link: ${siteUrl || "[Insert Link]"}

Registration Requirements:

\u2022  Personal information
\u2022  Next of kin details
\u2022  Driving experience
\u2022  Recent passport photograph
\u2022  National Identification Number (NIN) slip
\u2022  Valid driver\u2019s licence, if available

Please note that guarantor information and medical fitness certificates are not required at this stage.

All 140 shortlisted candidates will participate in our capacity-building talk, orientation and induction programme. Further details regarding the schedule and participation will be communicated in due course.

Kindly ensure that all information provided is accurate and that sensitive documents are uploaded only through the designated registration portal.

We look forward to supporting your journey towards professional development and sustainable employment in the transport sector.

Best regards,
WDNI Programme Team
Workbridge Empowerment Foundation
www.workbridgefoundation.org`;
}
