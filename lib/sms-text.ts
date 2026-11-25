// SMS length and cost maths, shared by the composer (browser) and the send action (server).

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€"; // count as 2 characters each

/** Replaces characters that would force the expensive Unicode encoding (curly quotes, bullets, dashes). */
export function toPlainSms(text: string) {
  return text
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");
}

export function smsStats(text: string) {
  let units = 0;
  let unicode = false;
  for (const ch of text) {
    if (GSM7.includes(ch)) units += 1;
    else if (GSM7_EXT.includes(ch)) units += 2;
    else unicode = true;
  }
  const length = unicode ? [...text].length : units;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const pages = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { length, pages, unicode, perPage: pages > 1 ? multi : single };
}

/** Naira per SMS page on Termii's DND route at the time of writing. Only used for the estimate shown to HR. */
export const NAIRA_PER_PAGE = 11.8;
