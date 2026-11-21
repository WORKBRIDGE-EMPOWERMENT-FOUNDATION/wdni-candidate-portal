"use client";

import { useState, useTransition } from "react";
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold">{sent ? "Enter your code" : "Sign in"}</h1>

      {!sent ? (
        <form onSubmit={send} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            Enter the email address or phone number you used when you applied to WDNI.
          </p>
          <div>
            <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
              Email or phone number
            </label>
            <input
              id="identifier"
              className="input mt-1"
              autoComplete="username"
              placeholder="you@example.com or 0803 123 4567"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          {info && <p className="text-sm text-slate-600">{info} It expires in a few minutes.</p>}
          <div>
            <label htmlFor="code" className="text-sm font-medium text-slate-700">
              One-time code
            </label>
            <input
              id="code"
              className="input mt-1 text-center text-lg tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary w-full" disabled={pending || code.length < 6}>
            {pending ? "Checking…" : "Sign in"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-slate-600 underline" onClick={() => { setSent(null); setError(null); }}>
              Use a different email or phone
            </button>
            <button type="button" className="font-medium text-brand underline" disabled={pending} onClick={() => send()}>
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
