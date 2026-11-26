"use client";

import Link from "next/link";
import { Menu, GraduationCap } from "lucide-react";

interface LandingNavbarProps {
  loggedInHome?: string | null;
  loggedInName?: string | null;
}

const navLinks = [
  { href: "#fitur", label: "Fitur" },
  { href: "#materi", label: "Materi" },
  { href: "#simulasi", label: "Simulasi" },
  { href: "#mulai", label: "Mulai" },
];

export function LandingNavbar({ loggedInHome, loggedInName }: LandingNavbarProps) {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm shadow-slate-200/60 backdrop-blur-md">
        {/* Brand ringkas satu baris seperti referensi */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-offset-4"
        >
          <img
            src="/logo.png"
            alt="Logo Office Learning Hub"
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <span className="text-sm font-extrabold tracking-tight text-slate-950 sm:text-[15px]">
            Office Learning Hub
          </span>
        </Link>

        {/* Navigasi tengah + tombol kanan */}
        <nav aria-label="Utama" className="flex items-center gap-4">
          <ul className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 sm:flex">
            {loggedInHome ? (
              <Link
                href={loggedInHome}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                <span>Dashboard ({loggedInName?.split(" ")[0]})</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login?role=teacher"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Masuk Guru
                </Link>
                <Link
                  href="/login?role=student"
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                >
                  Masuk Siswa
                </Link>
              </>
            )}
          </div>

          {/* Mobile popover trigger */}
          <button
            type="button"
            popoverTarget="landing-mobile-nav"
            popoverTargetAction="toggle"
            aria-controls="landing-mobile-nav"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span>Menu</span>
          </button>

          <div id="landing-mobile-nav" popover="auto" className="landing-mobile-menu">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Navigasi
            </p>
            <ul className="space-y-1">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {loggedInHome ? (
                <Link
                  href={loggedInHome}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Buka Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login?role=student"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Masuk Siswa
                  </Link>
                  <Link
                    href="/login?role=teacher"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Masuk Guru
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
