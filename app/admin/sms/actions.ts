"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { personalise } from "@/lib/email-html";
import { normalizeNgPhone } from "@/lib/phone";
import { smsStats, toPlainSms } from "@/lib/sms-text";
import { sendTermiiSms } from "@/lib/termii";

export type SmsResult = { id: string; ok: boolean; error?: string };

const MAX_BATCH = 10;
const MAX_PAGES = 4;

function checkMessage(body: string): string | null {
  if (!body.trim()) return "Write a message.";
  if (smsStats(toPlainSms(body)).pages > MAX_PAGES) return `The message is too long (${MAX_PAGES} SMS pages at most).`;
  return null;
}

/** Sends one test SMS to a number HR types in. */
export async function sendTestSms(phone: string, body: string, sampleName: string): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const problem = checkMessage(body);
  if (problem) return { error: problem };
  const to = normalizeNgPhone(phone);
  if (!to) return { error: "Enter a Nigerian mobile number, like 0803 123 4567." };

  const res = await sendTermiiSms(to, toPlainSms(personalise(body, sampleName || "Amina Bello")));
  return res.ok ? { ok: `Test sent to ${phone}. It can take a minute to arrive.` } : { error: `Test not sent: ${res.error}` };
}

/** Sends to up to 10 candidates; the browser calls it repeatedly. Numbers come from the database, not the browser. */
export async function sendSmsBatch(ids: string[], body: string): Promise<{ results?: SmsResult[]; error?: string }> {
  const { supabase, user } = await requireAdmin();
  const problem = checkMessage(body);
  if (problem) return { error: problem };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BATCH) return { error: "Invalid batch." };

  const { data: rows, error } = await supabase.from("shortlist").select("id, full_name, phone").in("id", ids);
  if (error) return { error: `Could not load candidates: ${error.message}` };

  const template = body.trim();
  const results: SmsResult[] = [];
  const log: Record<string, unknown>[] = [];
  for (const id of ids) {
    const row = rows?.find((r) => r.id === id);
    const to = row?.phone ? normalizeNgPhone(row.phone) : null;
    if (!row || !to) {
      results.push({ id, ok: false, error: !row ? "Candidate not found" : row.phone ? "Phone number isn't a valid Nigerian mobile" : "No phone number" });
      continue;
    }
    const res = await sendTermiiSms(to, toPlainSms(personalise(template, row.full_name)));
    results.push({ id, ok: res.ok, error: res.ok ? undefined : res.error });
    log.push({
      shortlist_id: id,
      to_phone: to,
      message: template,
      status: res.ok ? "sent" : "failed",
      provider_id: res.ok ? res.messageId : null,
      error: res.ok ? null : res.error,
      sent_by: user.email ?? null,
    });
  }

  if (log.length) {
    const { error: logError } = await supabase.from("sms_log").insert(log);
    if (logError) console.error("[sms_log]", logError.message);
  }
  revalidatePath("/admin/sms");
  return { results };
}
