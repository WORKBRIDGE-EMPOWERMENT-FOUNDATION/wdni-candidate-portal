"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeNgPhone } from "@/lib/phone";
import { CONTACT_EMAIL, PHONE_SIGNIN } from "@/lib/constants";

export type Channel = "email" | "phone";
export type RequestResult = { ok: true; channel: Channel; target: string } | { ok: false; error: string };
export type VerifyResult = { ok: true; redirectTo: string } | { ok: false; error: string };

/** Step 1: check the email/phone is on the shortlist (or is an HR admin), then send a one-time code. */
export async function requestOtp(identifier: string): Promise<RequestResult> {
  const raw = identifier.trim();
  if (!raw) return { ok: false, error: PHONE_SIGNIN ? "Enter your email address or phone number." : "Enter your email address." };

  const channel: Channel = raw.includes("@") ? "email" : "phone";
  if (channel === "phone" && !PHONE_SIGNIN) {
    return { ok: false, error: "Sign in with your email address. Phone sign-in isn't available yet." };
  }
  let target: string;
  if (channel === "email") {
    target = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return { ok: false, error: "Enter a valid email address." };
  } else {
    const phone = normalizeNgPhone(raw);
    if (!phone) return { ok: false, error: "Enter a valid Nigerian phone number, e.g. 0803 123 4567." };
    target = phone;
  }

  const service = createAdminClient();
  const { data: entry, error: lookupError } = await service
    .from("shortlist")
    .select("id")
    .eq(channel, target)
    .maybeSingle();
  if (lookupError) {
    console.error("[requestOtp] shortlist lookup failed:", lookupError);
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again in a moment."
          : `Shortlist lookup failed: ${lookupError.code ?? ""} ${lookupError.message}`,
    };
  }

  let allowed = !!entry;
  if (!allowed && channel === "email") {
    const { data: admin, error: adminError } = await service.from("admins").select("email").eq("email", target).maybeSingle();
    if (adminError) console.error("[requestOtp] admins lookup failed:", adminError);
    allowed = !!admin;
  }
  if (!allowed) {
    return {
      ok: false,
      error: PHONE_SIGNIN
        ? `We couldn't find this ${channel === "email" ? "email address" : "phone number"} on the WDNI shortlist. ` +
          `Use the one you applied with, try your ${channel === "email" ? "phone number" : "email address"} instead, ` +
          `or contact ${CONTACT_EMAIL}.`
        : `We couldn't find this email address on the WDNI shortlist. Use the email you applied with, or contact ${CONTACT_EMAIL}.`,
    };
  }

  const supabase = await createClient();
  const { error } =
    channel === "email"
      ? await supabase.auth.signInWithOtp({ email: target, options: { shouldCreateUser: true } })
      : await supabase.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: true, channel: "sms" } });

  if (error) {
    console.error("[requestOtp] sending code failed:", error.status, error.message);
    if (error.status === 429 || /rate|seconds/i.test(error.message)) {
      return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
    }
    return { ok: false, error: "We couldn't send your code. Please try again shortly." };
  }
  return { ok: true, channel, target };
}

/** Step 2: verify the code, which signs the user in, then send them to the right place. */
export async function verifyOtp(channel: Channel, target: string, token: string): Promise<VerifyResult> {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(code)) return { ok: false, error: "Enter the code we sent you." };

  const supabase = await createClient();
  const { error } =
    channel === "email"
      ? await supabase.auth.verifyOtp({ email: target, token: code, type: "email" })
      : await supabase.auth.verifyOtp({ phone: target, token: code, type: "sms" });
  if (error) {
    console.error("[verifyOtp] failed:", error.status, error.code, error.message);
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "production"
          ? "That code is incorrect or has expired. Request a new one."
          : `Code rejected: ${error.code ?? error.status ?? ""} ${error.message}`,
    };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { ok: true, redirectTo: isAdmin ? "/admin" : "/portal" };
}
