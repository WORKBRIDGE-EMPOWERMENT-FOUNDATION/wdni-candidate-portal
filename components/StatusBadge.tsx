import { STATUS_LABELS, type CandidateStatus } from "@/lib/constants";

const STYLES: Record<CandidateStatus, { pill: string; dot: string }> = {
  shortlisted: { pill: "bg-mist text-muted ring-line", dot: "bg-muted/50" },
  in_progress: { pill: "bg-brand-50 text-brand-dark ring-brand-100", dot: "bg-brand" },
  submitted: { pill: "bg-accent-soft text-[#8a3a0c] ring-accent-light", dot: "bg-accent" },
  needs_changes: { pill: "bg-orange-50 text-orange-900 ring-orange-200", dot: "bg-orange-500" },
  approved: { pill: "bg-emerald-50 text-emerald-900 ring-emerald-200", dot: "bg-emerald-600" },
  rejected: { pill: "bg-red-50 text-red-900 ring-red-200", dot: "bg-red-600" },
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
