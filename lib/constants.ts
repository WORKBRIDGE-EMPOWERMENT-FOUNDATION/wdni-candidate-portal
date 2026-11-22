export const BUCKET = "candidate-docs";

/**
 * Phone (SMS) sign-in. Off for now: candidates sign in with an email code only.
 * To turn on later, set NEXT_PUBLIC_PHONE_SIGNIN=true and finish Part B of docs/sign-in-codes.md.
 */
export const PHONE_SIGNIN = process.env.NEXT_PUBLIC_PHONE_SIGNIN === "true";
export const CONTACT_EMAIL = "admin@workbridgefoundation.org";
export const CONTACT_PHONE = "+234 706 632 7950";
export const CONTACT_WHATSAPP = "+234 810 727 8841";

export type CandidateStatus =
  | "shortlisted"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "rejected";

export const STATUSES: CandidateStatus[] = [
  "shortlisted", "in_progress", "submitted", "needs_changes", "approved", "rejected",
];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  shortlisted: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  needs_changes: "Needs changes",
  approved: "Approved",
  rejected: "Not selected",
};

export const STATUS_STYLES: Record<CandidateStatus, string> = {
  shortlisted: "bg-slate-100 text-slate-700",
  in_progress: "bg-sky-100 text-sky-800",
  submitted: "bg-amber-100 text-amber-800",
  needs_changes: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

/** PostgREST returns a one-to-one embed as an object, but older versions return an array. */
export function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null;
  return x ?? null;
}
