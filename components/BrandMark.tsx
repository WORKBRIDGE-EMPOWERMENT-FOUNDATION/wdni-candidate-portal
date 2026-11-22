/**
 * Workbridge logo. The file lives at public/workbridge-logo.png (copied from workbridgefoundation.org).
 * The logo has dark lettering, so on dark backgrounds it sits on a white chip.
 */
export function BrandMark({ size = "md", onDark = false }: { size?: "sm" | "md" | "lg"; onDark?: boolean }) {
  const height = size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src="/workbridge-logo.png" alt="Workbridge Empowerment Foundation" width={1059} height={567} className={`${height} w-auto`} />;
  return onDark ? <span className="inline-flex rounded-xl bg-white px-3 py-1.5">{img}</span> : img;
}
