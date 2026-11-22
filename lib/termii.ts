import "server-only";

/** Sends one SMS through Termii (https://developers.termii.com/messaging-api). */
export async function sendTermiiSms(to: string, message: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.TERMII_API_KEY;
  const baseUrl = process.env.TERMII_BASE_URL?.replace(/\/+$/, "");
  const senderId = process.env.TERMII_SENDER_ID;
  if (!apiKey || !baseUrl || !senderId) {
    return { ok: false, error: "Termii is not configured (TERMII_API_KEY, TERMII_BASE_URL, TERMII_SENDER_ID)." };
  }

  try {
    const res = await fetch(`${baseUrl}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: to.replace(/^\+/, ""), // Termii wants 2348012345678
        from: senderId,
        sms: message,
        type: "plain",
        // "dnd" reaches numbers on Do-Not-Disturb, which most Nigerian lines are. Needs an approved sender ID.
        channel: process.env.TERMII_CHANNEL || "dnd",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { message_id?: string; message?: string } | null;
    if (!res.ok || !data?.message_id) {
      return { ok: false, error: `Termii rejected the message (${res.status}): ${data?.message ?? "no details"}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Could not reach Termii: ${err instanceof Error ? err.message : String(err)}` };
  }
}
