import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OFFICE LEARNING HUB — Belajar Seru Pelayanan Tamu SMK MPLB",
  description:
    "Platform Learning Management System (LMS) yang santai, interaktif, dan ramah siswa SMK MPLB untuk belajar Pelayanan Tamu di Lingkungan Perkantoran (Langsung & Telepon).",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="min-h-dvh antialiased font-[family-name:var(--font-jakarta),system-ui,sans-serif] bg-[#f7faff] text-slate-900">
        {children}
      </body>
    </html>
  );
}
