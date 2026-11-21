import { STATUS_LABELS, STATUS_STYLES, type CandidateStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
