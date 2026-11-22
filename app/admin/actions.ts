"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { BUCKET, PHONE_SIGNIN, STATUSES, type CandidateStatus } from "@/lib/constants";
import { normalizeNgPhone } from "@/lib/phone";

export type FormState = { ok?: string; error?: string; details?: string[] } | null;

type NewCandidate = { full_name: string; email: string | null; phone: string | null };

function parseCandidate(name: string, emailRaw: string, phoneRaw: string): NewCandidate | string {
  const full_name = name.trim().replace(/\s+/g, " ");
  const email = emailRaw.trim().toLowerCase() || null;
  const phoneInput = phoneRaw.trim();
  const phone = phoneInput ? normalizeNgPhone(phoneInput) : null;

  if (!full_name) return "missing name";
  if (!PHONE_SIGNIN && !email) return "needs an email address (candidates sign in by email)";
  if (!email && !phoneInput) return "needs an email or phone number";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `invalid email "${emailRaw.trim()}"`;
  if (phoneInput && !phone) return `invalid phone "${phoneInput}"`;
  return { full_name, email, phone };
}

function duplicateMessage(err: { code?: string; message?: string }) {
  if (err.code === "23505") {
    return /phone/.test(err.message ?? "") ? "phone number already on the shortlist" : "email already on the shortlist";
  }
  return err.message ?? "could not be added";
}

export async function addCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parseCandidate(
    String(formData.get("full_name") ?? ""),
    String(formData.get("email") ?? ""),
    String(formData.get("phone") ?? ""),
  );
  if (typeof parsed === "string") return { error: `Not added: ${parsed}.` };

  const { error } = await supabase.from("shortlist").insert({
    ...parsed,
    cohort: String(formData.get("cohort") ?? "").trim() || "Pioneer 100",
  });
  if (error) return { error: `Not added: ${duplicateMessage(error)}.` };

  revalidatePath("/admin");
  return { ok: `${parsed.full_name} added to the shortlist.` };
}

/** Minimal CSV parser that handles quoted fields and commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export async function importCsv(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const file = formData.get("file");
  let text = String(formData.get("pasted") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: "CSV file is too large (max 2 MB)." };
    text = await file.text();
  }
  text = text.replace(/^﻿/, "").trim();
  if (!text) return { error: "Choose a CSV file or paste rows first." };

  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const hasHeader = header.some((h) => ["name", "full_name", "email", "phone"].includes(h));
  const col = (names: string[], fallback: number) => {
    const i = header.findIndex((h) => names.includes(h));
    return hasHeader ? i : fallback;
  };
  const nameCol = col(["full_name", "name", "fullname"], 0);
  const emailCol = col(["email", "email_address"], 1);
  const phoneCol = col(["phone", "phone_number", "mobile", "telephone"], 2);
  if (hasHeader && nameCol < 0) return { error: 'The CSV header needs a "full_name" (or "name") column.' };

  const cohort = String(formData.get("cohort") ?? "").trim() || "Pioneer 100";
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length > 2000) return { error: "Import at most 2,000 rows at a time." };

  let added = 0;
  const problems: string[] = [];
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const lineNo = r + (hasHeader ? 2 : 1);
    const parsed = parseCandidate(
      cells[nameCol] ?? "",
      emailCol >= 0 ? cells[emailCol] ?? "" : "",
      phoneCol >= 0 ? cells[phoneCol] ?? "" : "",
    );
    if (typeof parsed === "string") {
      problems.push(`Row ${lineNo}: ${parsed}`);
      continue;
    }
    const { error } = await supabase.from("shortlist").insert({ ...parsed, cohort });
    if (error) problems.push(`Row ${lineNo} (${parsed.full_name}): ${duplicateMessage(error)}`);
    else added++;
  }

  revalidatePath("/admin");
  return {
    ok: `${added} candidate${added === 1 ? "" : "s"} added.`,
    error: problems.length ? `${problems.length} row${problems.length === 1 ? "" : "s"} skipped:` : undefined,
    details: problems.slice(0, 50),
  };
}

export async function updateStatus(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const status = String(formData.get("status") ?? "") as CandidateStatus;
  if (!STATUSES.includes(status)) return;
  const note = String(formData.get("review_note") ?? "").trim();

  await supabase
    .from("shortlist")
    .update({
      status,
      review_note: note || null,
      reviewed_by: user.email ?? user.phone ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/admin/candidates/${id}`);
  revalidatePath("/admin");
}

export async function deleteCandidate(id: string) {
  const { supabase } = await requireAdmin();
  const { data: docs } = await supabase.from("documents").select("storage_path").eq("shortlist_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from("shortlist").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}
