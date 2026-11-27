"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  ClipboardList,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MonitorPlay,
  School,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: string;
  className: string | null;
  identityNo: string | null;
  avatarColor: string;
  points: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  ready: boolean;
}

function getNavItems(role: string): NavItem[] {
  if (role === "TEACHER") {
    return [
      { href: "/guru", label: "Dashboard Guru", icon: LayoutDashboard, ready: true },
      { href: "/materi", label: "Pratinjau Materi", icon: BookOpen, ready: true },
      { href: "/simulasi", label: "Pratinjau Simulasi", icon: MonitorPlay, ready: true },
      { href: "/kuis", label: "Pratinjau Kuis", icon: HelpCircle, ready: true },
      { href: "/lkpd", label: "Pratinjau LKPD", icon: ClipboardList, ready: true },
      { href: "/proyek", label: "Pratinjau Proyek", icon: FolderKanban, ready: true },
      { href: "/diskusi", label: "Diskusi & Pengumuman", icon: MessageSquare, ready: true },
      { href: "/sertifikat", label: "Pratinjau Sertifikat", icon: Award, ready: true },
      { href: "/profil", label: "Profil & Sandi", icon: Settings, ready: true },
    ];
  }
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: true },
      { href: "/admin?tab=users", label: "Kelola Akun", icon: Users, ready: true },
      { href: "/admin?tab=classrooms", label: "Kelola Kelas", icon: School, ready: true },
      { href: "/profil", label: "Profil & Kata Sandi", icon: Settings, ready: true },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard Siswa", icon: LayoutDashboard, ready: true },
    { href: "/materi", label: "Materi", icon: BookOpen, ready: true },
    { href: "/simulasi", label: "Simulasi Digital", icon: MonitorPlay, ready: true },
    { href: "/kuis", label: "Kuis Interaktif", icon: HelpCircle, ready: true },
    { href: "/lkpd", label: "LKPD", icon: ClipboardList, ready: true },
    { href: "/proyek", label: "Proyek Praktik", icon: FolderKanban, ready: true },
    { href: "/progres", label: "Progres Belajar", icon: TrendingUp, ready: true },
    { href: "/diskusi", label: "Diskusi & Info", icon: MessageSquare, ready: true },
    { href: "/sertifikat", label: "Sertifikat", icon: Award, ready: true },
    { href: "/profil", label: "Profil & Sandi", icon: Settings, ready: true },
  ];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function getRoleLabel(role: string) {
  if (role === "TEACHER") return "Guru MPLB";
  if (role === "ADMIN") return "Administrator";
  return "Siswa SMK MPLB";
}

function SidebarNavList({
  navItems,
  onNavigate,
}: {
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, currentTab]);

  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const [itemPath, itemQuery] = item.href.split("?");
        const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;

        let isActive = false;
        if (itemTab) {
          isActive = pathname === itemPath && currentTab === itemTab;
        } else if (itemPath === "/admin") {
          isActive = pathname === "/admin" && !currentTab;
        } else {
          isActive =
            pathname === itemPath ||
            (itemPath !== "/dashboard" &&
              itemPath !== "/guru" &&
              pathname.startsWith(`${itemPath}/`));
        }

        const isPending = pendingHref === item.href && !isActive;

        if (!item.ready) {
          return (
            <li key={item.href}>
              <div
                title={`Akan diaktifkan pada ${item.badge}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-400 select-none"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {item.badge}
                  </span>
                )}
              </div>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (!isActive) setPendingHref(item.href);
                onNavigate?.();
              }}
              className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                isActive
                  ? "border-l-4 border-[#ff5f3d] bg-orange-50/80 font-bold text-slate-950 shadow-2xs"
                  : isPending
                    ? "bg-slate-100 font-bold text-slate-900"
                    : "font-semibold text-slate-600 hover:translate-x-0.5 hover:bg-slate-100/80 hover:text-slate-950"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#ff5f3d]" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </span>
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ff5f3d]" aria-hidden="true" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = getNavItems(user.role);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLogoutModalOpen(false);
      window.location.assign("/login");
    }
  }

  const renderNavLinks = (closeOnClick = false) => (
    <Suspense fallback={<ul className="space-y-1" />}>
      <SidebarNavList
        navItems={navItems}
        onNavigate={closeOnClick ? () => setMobileOpen(false) : undefined}
      />
    </Suspense>
  );

  return (
    <div className="min-h-dvh bg-[#fafaf7] lg:flex">
      {/* Desktop Sidebar — Tetap / Fixed di kiri, hanya konten kanan yang scroll */}
      <aside className="no-print hidden w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-hidden">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <Link href="/">
            <BrandLogo />
          </Link>
        </div>

        <nav aria-label="Menu Dashboard" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {renderNavLinks()}
        </nav>

        <div className="shrink-0 border-t border-slate-100 bg-white p-4">
          {user.role === "STUDENT" && (
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-white shadow-sm shadow-orange-200">
              <span className="flex items-center gap-2 text-xs font-bold">
                <Sparkles className="h-4 w-4 text-amber-100" aria-hidden="true" />
                <span>Poin Belajarmu</span>
              </span>
              <span className="text-sm font-extrabold">{user.points} XP</span>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}
              aria-hidden="true"
            >
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">
                {user.className || getRoleLabel(user.role)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            disabled={loggingOut}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{loggingOut ? "Keluar..." : "Keluar Akun"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu navigasi"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="lg:hidden">
              <BrandLogo compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                OFFICE LEARNING HUB
              </p>
              <p className="text-sm font-bold text-[#0f294a]">
                Pelayanan Tamu di Lingkungan Perkantoran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role === "STUDENT" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                <Award className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>{user.points} Poin</span>
              </span>
            )}
            <Link
              href="/profil"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pr-3 pl-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {getInitials(user.name)}
              </span>
              <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
            </Link>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <BrandLogo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Tutup menu"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Menu Mobile" className="flex-1 overflow-y-auto px-4 py-4">
                {renderNavLinks(true)}
              </nav>
              <div className="border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setLogoutModalOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Pop-up Konfirmasi 2-Langkah Keluar Akun */}
      <ConfirmDialog
        open={logoutModalOpen}
        title="Yakin ingin keluar dari akun?"
        description={`Kamu sedang masuk sebagai ${user.name}. Progres dan datamu sudah aman tersimpan. Kamu bisa masuk kembali kapan saja.`}
        confirmLabel="Ya, Keluar"
        cancelLabel="Tetap di Sini"
        variant="logout"
        loading={loggingOut}
        onConfirm={confirmLogout}
        onClose={() => setLogoutModalOpen(false)}
      />
    </div>
  );
}
