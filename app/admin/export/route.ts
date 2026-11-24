import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABELS, one, type CandidateStatus } from "@/lib/constants";
// Only the current stage's questions and documents (guarantor and medical columns appear once they are collected).
import { ACTIVE_FIELDS as ALL_FIELDS, ACTIVE_DOCUMENTS as DOCUMENTS, displayValue, fromDbRow, isVisible } from "@/lib/form-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("shortlist")
    .select("*, submissions(*), documents(doc_type)")
    .order("full_name");
  if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "WDNI Candidate Portal";
  const ws = wb.addWorksheet("Candidates");

  ws.columns = [
    { header: "Shortlist name", key: "sl_name", width: 26 },
    { header: "Shortlist email", key: "sl_email", width: 28 },
    { header: "Shortlist phone", key: "sl_phone", width: 16 },
    { header: "Cohort", key: "cohort", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Submitted at", key: "submitted_at", width: 18 },
    { header: "Review note", key: "review_note", width: 30 },
    ...ALL_FIELDS.map((f) => ({ header: f.label, key: f.name, width: f.type === "textarea" ? 34 : 18 })),
    ...DOCUMENTS.map((d) => ({ header: `Doc: ${d.label}`, key: `doc_${d.type}`, width: 14 })),
  ];

  for (const r of data ?? []) {
    const sub = one(r.submissions) as Record<string, unknown> | null;
    const values = fromDbRow(sub);
    const uploaded = new Set(((r.documents ?? []) as { doc_type: string }[]).map((d) => d.doc_type));
    const row: Record<string, string | Date | null> = {
      sl_name: r.full_name,
      sl_email: r.email,
      sl_phone: r.phone,
      cohort: r.cohort,
      status: STATUS_LABELS[r.status as CandidateStatus],
      // Excel has no time zones: shift to Lagos time (UTC+1) so the cell shows local time.
      submitted_at: sub?.submitted_at ? new Date(new Date(sub.submitted_at as string).getTime() + 3600_000) : null,
      review_note: r.review_note,
    };
    for (const f of ALL_FIELDS) row[f.name] = sub && isVisible(f, values) ? displayValue(f, values) : "";
    for (const d of DOCUMENTS) row[`doc_${d.type}`] = uploaded.has(d.type) ? "Yes" : "No";
    ws.addRow(row);
  }

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  ws.getColumn("submitted_at").numFmt = "dd mmm yyyy hh:mm";

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer as unknown as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="wdni-candidates-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
