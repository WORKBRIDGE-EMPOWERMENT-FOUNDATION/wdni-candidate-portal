"use client";

import { useState, useTransition } from "react";
import { PHONE_SIGNIN } from "@/lib/constants";
import { requestOtp, verifyOtp, type Channel } from "./actions";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState<{ channel: Channel; target: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await requestOtp(identifier);
      if (!res.ok) return setError(res.error);
      setSent({ channel: res.channel, target: res.target });
      setCode("");
      setInfo(res.channel === "email" ? `We sent a code to ${res.target}.` : `We sent a code by SMS to ${res.target}.`);
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyOtp(sent.channel, sent.target, code);
      if (!res.ok) return setError(res.error);
      window.location.assign(res.redirectTo);
    });
  }

  return (
    <div>
      <h2 className="text-[1.75rem]">{sent ? (PHONE_SIGNIN ? "Check your messages" : "Check your email") : "Sign in"}</h2>

      {!sent ? (
        <form onSubmit={send} className="mt-3 space-y-5">
          <p className="text-[15px] leading-relaxed text-muted">
            {PHONE_SIGNIN
              ? "Use the email address or phone number you gave when you applied to WDNI. We'll send you a one-time code."
              : "Use the email address you gave when you applied to WDNI. We'll email you a one-time code."}
          </p>
          <div>
            <label htmlFor="identifier" className="field-label">
              {PHONE_SIGNIN ? "Email address or phone number" : "Email address"}
            </label>
            <input
              id="identifier"
              className="input mt-1.5"
              type={PHONE_SIGNIN ? "text" : "email"}
              inputMode={PHONE_SIGNIN ? "text" : "email"}
              autoComplete={PHONE_SIGNIN ? "username" : "email"}
              placeholder={PHONE_SIGNIN ? "0803 123 4567" : "you@example.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              required
            />
          </div>
          {error && (
            <p id="login-error" role="alert" className="rounded-md border-l-4 border-red-700 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={pending}>
            {pending ? "Sending code…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-3 space-y-5">
          {info && <p className="text-[15px] leading-relaxed text-muted">{info} Enter it below. It works for 10 minutes. If you can&apos;t see it, check your spam folder.</p>}
          <div>
            <label htmlFor="code" className="field-label">
              One-time code
            </label>
            <input
              id="code"
              className="input mt-1.5 py-3 text-center text-2xl font-bold tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-invalid={!!error}
              autoFocus
              required
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md border-l-4 border-red-700 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={pending || code.length < 6}>
            {pending ? "Checking code…" : "Sign in"}
          </button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button
              type="button"
              className="font-semibold text-muted underline underline-offset-2 hover:text-ink"
              onClick={() => { setSent(null); setError(null); }}
            >
              {PHONE_SIGNIN ? "Use a different email or phone" : "Use a different email address"}
            </button>
            <button
              type="button"
              className="font-semibold text-brand underline underline-offset-2"
              disabled={pending}
              onClick={() => send()}
            >
              Send a new code
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
