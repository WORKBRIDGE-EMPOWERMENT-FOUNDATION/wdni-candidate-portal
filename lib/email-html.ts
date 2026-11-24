// Turns the plain-text message HR writes into a branded HTML email. No server-only imports,
// so the composer can render the exact same preview in the browser.
import { CONTACT_EMAIL } from "@/lib/constants";

/** Fills {first_name} and {full_name}. */
export function personalise(text: string, fullName: string) {
  const name = fullName.trim().replace(/\s+/g, " ");
  const first = name.split(" ")[0] || name;
  return text.replaceAll("{first_name}", first).replaceAll("{full_name}", name);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Escapes the text, links URLs and email addresses, and keeps line breaks. */
function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      const html = escapeHtml(para)
        .replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)])/g, (_m, pre, url) =>
          `${pre}<a href="${url.startsWith("www.") ? `https://${url}` : url}" style="color:#118b73;">${url}</a>`)
        .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, (_m, pre, email) =>
          `${pre}<a href="mailto:${email}" style="color:#118b73;">${email}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#09162a;">${html}</p>`;
    })
    .join("");
}

export function renderEmailHtml(body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f7f9;">
<div style="background:#f4f7f9;padding:32px 16px;font-family:Figtree,'Segoe UI',Roboto,Arial,sans-serif;color:#09162a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dde5ea;border-radius:16px;">
    <tr><td style="padding:28px 32px 8px;">
      <img src="https://wdni.ng/assets/images/logo.png" alt="Women Drive Nigeria Initiative" width="84" style="display:block;height:auto;border:0;">
    </td></tr>
    <tr><td style="padding:16px 32px 8px;">${textToHtml(body)}</td></tr>
    <tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.6;color:#66758d;border-top:1px solid #dde5ea;">
      <p style="margin:20px 0 0;">Questions? Reply to this email or write to
        <a href="mailto:${CONTACT_EMAIL}" style="color:#118b73;">${CONTACT_EMAIL}</a>.</p>
      <p style="margin:8px 0 0;">Women Drive Nigeria Initiative, a Workbridge Empowerment Foundation programme. No. 10 Lord Lugard Street, Asokoro, Abuja FCT</p>
    </td></tr>
  </table>
</div></body></html>`;
}
