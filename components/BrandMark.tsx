/**
 * WDNI round mark (public/wdni-mark.png) and full stacked logo (public/wdni-logo.png),
 * both copied from wdni.ng. Transparent backgrounds, so they work on light and dark.
 */
export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? 56 : size === "sm" ? 32 : 40;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/wdni-mark.png" alt="WDNI" width={px} height={px} className="shrink-0" style={{ width: px, height: px }} />;
}

export function BrandLogo({ width = 160 }: { width?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/wdni-logo.png" alt="Women Drive Nigeria Initiative" width={width} height={Math.round((width * 765) / 791)} />;
}
