import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WDNI Candidate Portal | Workbridge Empowerment Foundation",
  description: "Shortlisted candidates for the Women Drive Nigeria Initiative submit their biodata and documents here.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
