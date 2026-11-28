import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import { getHomePathForRole, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingNavbar } from "@/components/LandingNavbar";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingHubHero } from "@/components/LandingHubHero";
import { ScrollRevealFallback } from "@/components/ScrollRevealFallback";
import { formatTitleSummary } from "@/lib/assessment";

export const dynamic = "force-dynamic";

const fallbackTopics = [
  "Materi inti pelayanan tamu yang terstruktur lengkap dengan ringkasan, video pembelajaran, dan modul PDF",
];

const fallbackSimulations = [
  "Skenario roleplay pelayanan tamu perkantoran dengan lembar soal PDF dan pengumpulan dialog",
];

export default async function LandingPage() {
  const [sessionUser, dbMaterials, dbSimulations] = await Promise.all([
    getSessionUser(),
    prisma.material
      .findMany({
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { title: true, subtitle: true },
      })
      .catch(() => []),
    prisma.simulation
      .findMany({
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { title: true },
      })
      .catch(() => []),
  ]);

  const loggedInHome = sessionUser ? getHomePathForRole(sessionUser.role) : null;
  const topicList =
    dbMaterials.length > 0
      ? dbMaterials.map((m) => (m.subtitle ? `${m.title} — ${m.subtitle}` : m.title))
      : fallbackTopics;
  const simulationList =
    dbSimulations.length > 0 ? dbSimulations.map((s) => s.title) : fallbackSimulations;

  const materialSummaryText =
    dbMaterials.length > 0
      ? `Pelajari ${formatTitleSummary(
          dbMaterials.map((m) => m.title),
          3
        )} secara runtut lengkap dengan ringkasan, video pembelajaran, dan handout PDF dari guru.`
      : "Pelajari seluruh materi pelayanan tamu secara runtut lengkap dengan ringkasan, video pembelajaran, dan handout PDF dari guru.";

  const simulationSummaryText =
    dbSimulations.length > 0
      ? `Kerjakan tugas roleplay (${formatTitleSummary(
          dbSimulations.map((s) => s.title),
          3
        )}) dalam format PDF, ditambah kuis interaktif acak soal dan LKPD studi kasus.`
      : "Praktikkan berbagai skenario roleplay pelayanan tamu dalam format PDF, ditambah kuis interaktif acak soal dan LKPD studi kasus.";

  const featureCards = [
    {
      code: "01 • MATERI & PDF",
      title: "Materi Inti Pelayanan Tamu",
      desc: materialSummaryText,
      icon: BookOpen,
      cardClass:
        "border-sky-200/80 bg-gradient-to-br from-sky-50/80 via-white to-white hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/70",
      pillClass: "bg-sky-500 text-white",
      iconWrapClass: "bg-white text-sky-600 ring-1 ring-sky-100",
    },
    {
      code: "02 • SIMULASI & KUIS",
      title: "Simulasi Roleplay & Kuis",
      desc: simulationSummaryText,
      icon: MonitorPlay,
      cardClass:
        "border-orange-200/80 bg-gradient-to-br from-orange-50/80 via-white to-white hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/70",
      pillClass: "bg-[#ff5f3d] text-white",
      iconWrapClass: "bg-white text-[#ff5f3d] ring-1 ring-orange-100",
    },
    {
      code: "03 • PROYEK & SERTIFIKAT",
      title: "Proyek Praktik & E-Sertifikat",
      desc: "Kerjakan LKPD studi kasus dan proyek praktik kerja sesuai arahan guru, lalu cetak E-Sertifikat kompetensi otomatis saat pembelajaran tuntas.",
      icon: Award,
      cardClass:
        "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/70",
      pillClass: "bg-emerald-500 text-white",
      iconWrapClass: "bg-white text-emerald-600 ring-1 ring-emerald-100",
    },
  ];

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <ScrollRevealFallback />
      <LandingNavbar
        loggedInHome={loggedInHome}
        loggedInName={sessionUser?.name ?? null}
      />

      <main>
        {/* HERO TERPUSAT — Hanya Animasi Lottie Bersih di Tengah Atas */}
        <section className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6 sm:pt-10 sm:pb-24 lg:px-8">
          <LandingHubHero />

          <div className="mx-auto mt-3 max-w-2xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 [text-wrap:balance] sm:text-6xl sm:leading-[1.08]">
              Platform Belajar
              <span className="block">Pelayanan Tamu</span>
            </h1>

            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-500 [text-wrap:pretty] sm:text-base">
              Office Learning Hub adalah LMS modern dan santai untuk siswa SMK MPLB — belajar materi
              pelayanan tamu, simulasi roleplay, kuis, LKPD, proyek praktik, hingga E-Sertifikat
              dalam satu tempat.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3">
              <Link
                href={loggedInHome || "/login?role=student"}
                className="interactive-lift inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6a45] to-[#ff512f] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200/80 hover:from-[#ff5a32] hover:to-[#f04422] hover:shadow-xl hover:shadow-orange-200"
              >
                <span>{loggedInHome ? "Buka Dashboard Sekarang" : "Mulai Belajar Sekarang"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              {!loggedInHome && (
                <p className="text-xs text-slate-400">
                  Belum punya akun kelas?{" "}
                  <Link href="/register" className="font-semibold text-slate-700 hover:underline">
                    Daftar siswa baru
                  </Link>{" "}
                  atau{" "}
                  <Link
                    href="/login?role=teacher"
                    className="font-semibold text-slate-700 hover:underline"
                  >
                    Masuk sebagai Guru
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: 3 KARTU FITUR UNGGULAN (Smooth Scroll Reveal + Hover) */}
        <section id="fitur" className="scroll-mt-20 border-t border-slate-100 bg-[#fafaf7] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="scroll-reveal text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-[#ff5f3d]" aria-hidden="true" />
                <span>Fitur Unggulan</span>
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
                Semua yang Kamu Butuhkan, Tanpa Ribet
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
                Dirancang santai dan interaktif supaya siswa SMK MPLB lebih semangat belajar dan
                siap menghadapi dunia kerja perkantoran.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.code}
                    className={`scroll-reveal interactive-lift flex flex-col rounded-[28px] border p-7 shadow-xs ${card.cardClass}`}
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs ${card.iconWrapClass}`}
                    >
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <span
                      className={`mt-6 inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide ${card.pillClass}`}
                    >
                      {card.code}
                    </span>
                    <h3 className="mt-4 text-lg font-extrabold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 [text-wrap:pretty]">
                      {card.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 3: RINGKASAN MATERI & SIMULASI (Smooth Scroll Reveal + Hover Halus) */}
        <section id="materi" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="scroll-reveal interactive-lift rounded-[28px] border border-slate-200/80 bg-[#fafaf7] p-7 hover:border-sky-200 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">
                      Pokok Materi Pelayanan Tamu
                    </h2>
                    <p className="text-xs text-slate-500">Lengkap dengan video, handout PDF, LKPD &amp; Proyek</p>
                  </div>
                </div>
                <ol className="mt-5 space-y-2">
                  {topicList.map((topic, idx) => (
                    <li
                      key={topic}
                      className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-100 transition hover:translate-x-1 hover:ring-sky-200"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#32302d] text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div
                id="simulasi"
                className="scroll-reveal interactive-lift scroll-mt-20 flex flex-col justify-between gap-6 rounded-[28px] border border-slate-200/80 bg-[#fafaf7] p-7 hover:border-orange-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-[#ff5f3d]">
                      <MonitorPlay className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-950">
                        Simulasi Pelayanan Tamu Digital
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tugas roleplay kantor nyata dengan lembar soal &amp; pengumpulan dialog PDF
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {simulationList.map((sim) => (
                      <li
                        key={sim}
                        className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-100 transition hover:translate-x-1 hover:ring-orange-200"
                      >
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-[#ff5f3d]"
                          aria-hidden="true"
                        />
                        <span>{sim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Lengkap dengan Kuis, LKPD, Proyek Praktik &amp; Diskusi Kelas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: CTA RINGKAS */}
        <section id="mulai" className="scroll-mt-20 mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="scroll-reveal interactive-lift rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-[#e8f6ff] via-[#fafaf7] to-[#fff4ec] px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Yuk, Mulai Belajar Hari Ini!
            </h2>
            <p className="mx-auto mt-2.5 max-w-md text-sm text-slate-600">
              Masuk dengan akun kelasmu, selesaikan seluruh materi &amp; simulasi, dan dapatkan
              E-Sertifikat Pelayanan Tamu.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={loggedInHome || "/login?role=student"}
                className="interactive-lift inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6a45] to-[#ff512f] px-7 py-3 text-sm font-bold text-white shadow-md shadow-orange-200/70 hover:from-[#ff5a32] hover:to-[#f04422]"
              >
                <span>{loggedInHome ? "Buka Dashboard" : "Masuk Siswa"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {!loggedInHome && (
                <Link
                  href="/login?role=teacher"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Masuk Guru
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <BrandLogo size="sm" />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} OFFICE LEARNING HUB — LMS Pelayanan Tamu SMK MPLB.
          </p>
        </div>
      </footer>
    </div>
  );
}
