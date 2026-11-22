import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Standard Webhooks signature (https://www.standardwebhooks.com), which Supabase Auth Hooks use.
 * `secret` is the value Supabase shows, e.g. "v1,whsec_abc123...".
 */
export function verifyStandardWebhook(body: string, headers: Headers, secret: string, toleranceSeconds = 300): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  // The header can carry several space-separated signatures, each "v1,<base64>".
  return signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
