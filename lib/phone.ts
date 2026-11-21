/** Converts common Nigerian mobile formats (0803…, 234803…, +234803…, 803…) to +234XXXXXXXXXX. */
export function normalizeNgPhone(input: string): string | null {
  const d = input.replace(/[\s\-().]/g, "");
  if (/^0[789][01]\d{8}$/.test(d)) return "+234" + d.slice(1);
  if (/^\+?234[789][01]\d{8}$/.test(d)) return "+" + d.replace(/^\+/, "");
  if (/^[789][01]\d{8}$/.test(d)) return "+234" + d;
  return null;
}
