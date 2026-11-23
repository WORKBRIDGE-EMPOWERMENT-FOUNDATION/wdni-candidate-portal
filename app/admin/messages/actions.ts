"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { personalise, renderEmailHtml } from "@/lib/email-html";
import { sendMail } from "@/lib/mailer";

export type BatchResult = { id: string; ok: boolean; error?: string };

const MAX_BATCH = 10;

function checkMessage(subject: string, body: string): string | null {
  if (!subject.trim()) return "Add a subject.";
  if (subject.length > 200) return "The subject is too long (200 characters at most).";
  if (!body.trim()) return "Write a message.";
  if (body.length > 10_000) return "The message is too long (10,000 characters at most).";
  return null;
}

/** Sends the message to the signed-in HR admin only, so they can check it in a real inbox. */
export async function sendTestEmail(subject: string, body: string, sampleName: string): Promise<{ ok?: string; error?: string }> {
  const { user } = await requireAdmin();
  const problem = checkMessage(subject, body);
  if (problem) return { error: problem };
  if (!user.email) return { error: "Your HR account has no email address to send a test to." };

  const text = personalise(body, sampleName || "Amina Bello");
  const error = await sendMail(user.email, `[TEST] ${subject.trim()}`, text, renderEmailHtml(text));
  return error ? { error: `Test not sent: ${error}` } : { ok: `Test sent to ${user.email}. Check your inbox (and spam).` };
}

/**
 * Sends to up to 10 candidates. The browser calls this repeatedly with the next 10, so a long send
 * never hits a server time limit and HR sees progress. Addresses come from the database, not the browser.
 */
export async function sendBatch(ids: string[], subject: string, body: string): Promise<{ results?: BatchResult[]; error?: string }> {
  const { supabase, user } = await requireAdmin();
  const problem = checkMessage(subject, body);
  if (problem) return { error: problem };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BATCH) return { error: "Invalid batch." };

  const { data: rows, error } = await supabase.from("shortlist").select("id, full_name, email").in("id", ids);
  if (error) return { error: `Could not load candidates: ${error.message}` };

  const results: BatchResult[] = [];
  const log: Record<string, unknown>[] = [];
  for (const id of ids) {
    const row = rows?.find((r) => r.id === id);
    if (!row?.email) {
      results.push({ id, ok: false, error: row ? "No email address" : "Candidate not found" });
      continue;
    }
    const text = personalise(body, row.full_name);
    const sendError = await sendMail(row.email, subject.trim(), text, renderEmailHtml(text));
    results.push({ id, ok: !sendError, error: sendError ?? undefined });
    log.push({
      shortlist_id: id,
      to_email: row.email,
      subject: subject.trim(),
      status: sendError ? "failed" : "sent",
      error: sendError,
      sent_by: user.email ?? null,
    });
  }

  if (log.length) {
    const { error: logError } = await supabase.from("email_log").insert(log);
    if (logError) console.error("[email_log]", logError.message);
  }
  revalidatePath("/admin/messages");
  return { results };
}
