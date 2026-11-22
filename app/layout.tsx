import type { Metadata } from "next";
import { Manrope, Quicksand } from "next/font/google";
import "./globals.css";

// Same typefaces as workbridgefoundation.org: Quicksand for headings, Manrope for text.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WDNI Candidate Portal | Workbridge Empowerment Foundation",
  description: "Shortlisted candidates for the Women Drive Nigeria Initiative submit their biodata and documents here.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${quicksand.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
