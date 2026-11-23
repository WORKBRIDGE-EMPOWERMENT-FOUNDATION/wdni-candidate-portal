import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { CONTACT_EMAIL } from "@/lib/constants";

let transport: Transporter | null = null;

export function mailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 587 upgrades to TLS with STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true, // reuse the connection across a batch
      maxConnections: 2,
      connectionTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return transport;
}

/** Sends one email. Returns an error message instead of throwing. */
export async function sendMail(to: string, subject: string, text: string, html: string): Promise<string | null> {
  if (!mailerConfigured()) return "Email sending is not set up (SMTP_HOST, SMTP_USER, SMTP_PASS).";
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      replyTo: CONTACT_EMAIL,
      to,
      subject,
      text,
      html,
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
