// Sends a signed fake "Send SMS" hook request to the portal, the way Supabase does.
// Tests the signature check and the Termii delivery without Supabase.
//
//   node scripts/test-sms-hook.mjs 2348012345678                 # hits http://localhost:3000
//   node scripts/test-sms-hook.mjs 2348012345678 https://xyz.trycloudflare.com
//
// This sends a REAL SMS (code 000000) and uses Termii credit.
import { createHmac, randomUUID } from "node:crypto";

process.loadEnvFile(".env");

const [phone, base = "http://localhost:3000"] = process.argv.slice(2);
if (!phone || !/^\+?\d{10,15}$/.test(phone)) {
  console.error("Usage: node scripts/test-sms-hook.mjs <phone e.g. 2348012345678> [base-url]");
  process.exit(1);
}
const secret = process.env.SEND_SMS_HOOK_SECRET;
if (!secret) throw new Error("SEND_SMS_HOOK_SECRET is not set in .env");

const body = JSON.stringify({ user: { phone: phone.replace(/^\+/, "") }, sms: { otp: "000000" } });
const id = `msg_${randomUUID()}`;
const ts = Math.floor(Date.now() / 1000).toString();
const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");

const url = `${base.replace(/\/+$/, "")}/api/auth/send-sms`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` },
  body,
});
console.log(res.status, await res.text());
console.log(res.ok ? "OK: check your phone and the '[send-sms hook] sent' line in the dev server log." : "Failed: see the '[send-sms hook]' line in the dev server log.");
