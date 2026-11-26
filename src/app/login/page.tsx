import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getHomePathForRole, getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { AuthLottiePanel } from "@/components/AuthLottiePanel";

interface LoginPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();
  if (user) {
    redirect(getHomePathForRole(user.role));
  }

  const params = await searchParams;
  const roleParam =
    params.role === "teacher" ? "teacher" : params.role === "admin" ? "admin" : "student";

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* Kiri: Panel Gradasi Biru Langit Lembut + Animasi Lottie */}
      <AuthLottiePanel />

      {/* Kanan: Panel Putih Hangat Minimalis (Persis Referensi) */}
      <main className="flex flex-col justify-center bg-[#fafaf7] px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="mb-8 lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          {/* Logo Bulat Pastel di Tengah Atas */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e3f3fc] p-2.5 shadow-2xs">
              <img
                src="/logo.png"
                alt="Logo Office Learning Hub"
                className="h-full w-full rounded-full object-cover"
              />
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
              {roleParam === "teacher" ? "Halo, Bapak/Ibu Guru" : "Selamat Datang"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Masuk untuk melanjutkan belajar di Office Learning Hub.
            </p>
          </div>

          <div className="mt-7">
            <AuthForm mode="login" initialRole={roleParam} />
          </div>
        </div>
      </main>
    </div>
  );
}
