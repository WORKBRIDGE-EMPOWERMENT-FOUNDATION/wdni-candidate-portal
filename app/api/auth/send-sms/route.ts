import { verifyStandardWebhook } from "@/lib/standard-webhooks";
import { sendTermiiSms } from "@/lib/termii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase "Send SMS" Auth Hook. Supabase calls this when a candidate asks for a sign-in code by phone;
 * we deliver the code through Termii. Set it up in Supabase → Authentication → Hooks (see docs/sign-in-codes.md).
 */
export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) return hookError(500, "SMS hook secret is not configured.");

  const body = await request.text();
  if (!verifyStandardWebhook(body, request.headers, secret)) {
    return hookError(401, "Invalid signature.");
  }

  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return hookError(400, "Invalid payload.");
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return hookError(400, "Missing phone number or code.");

  const message = `Your WDNI portal code is ${otp}. Use it within 10 minutes. Do not share this code with anyone. - Workbridge`;
  const result = await sendTermiiSms(phone, message);
  if (!result.ok) {
    console.error("[send-sms hook]", result.error);
    return hookError(502, "We couldn't send the SMS. Please try again or sign in with your email address.");
  }

  return Response.json({});
}

function hookError(httpCode: number, message: string) {
  return Response.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}
