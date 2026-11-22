import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

// Same typeface as wdni.ng.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WDNI Candidate Portal | Women Drive Nigeria Initiative",
  description: "Shortlisted candidates for the Women Drive Nigeria Initiative submit their biodata and documents here.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
