import { requireAdmin } from "@/lib/auth";
import { PHONE_SIGNIN } from "@/lib/constants";
import { defaultInvite } from "@/lib/invite";
import { ShortlistForms } from "./ShortlistForms";

export default async function ShortlistPage() {
  await requireAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const invite = defaultInvite(siteUrl);

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
