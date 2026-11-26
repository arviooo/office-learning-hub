import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  MessageSquareText,
  MonitorPlay,
  RotateCcw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { computeMaxScore, parseSimulationSteps } from "@/lib/simulation";

export const dynamic = "force-dynamic";

function getDifficultyBadge(difficulty: string) {
  if (difficulty === "Lanjut") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (difficulty === "Menengah") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-teal-50 text-teal-700 ring-teal-200";
}

export default async function SimulationsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?role=student");
  }

  const [simulations, attempts] = await Promise.all([
    prisma.simulation.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
    }),
    prisma.simulationAttempt.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // Statistik per simulasi
  const attemptsBySim = new Map<
    string,
    { count: number; bestScore: number; bestMax: number; lastDate: Date }
  >();
  for (const a of attempts) {
    const existing = attemptsBySim.get(a.simulationId);
    if (!existing) {
      attemptsBySim.set(a.simulationId, {
        count: 1,
        bestScore: a.score,
        bestMax: a.maxScore,
        lastDate: a.completedAt,
      });
    } else {
      existing.count += 1;
      if (a.score > existing.bestScore) {
        existing.bestScore = a.score;
        existing.bestMax = a.maxScore;
      }
    }
  }

  const completedCount = attemptsBySim.size;
  const percent =
    simulations.length > 0 ? Math.round((completedCount / simulations.length) * 100) : 0;

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        {/* Header Simulasi Pelayanan Digital */}
        <section className="rounded-[28px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg shadow-orange-200/60 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-teal-200">
                <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fitur Utama • Roleplay Front Office Digital</span>
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
                Simulasi Pelayanan Digital (5 Skenario Kantor)
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Praktikkan sikap 5S, komunikasi efektif, prosedur penerimaan tamu, hingga penanganan
                keluhan pelanggan secara langsung. Setiap pilihan tindakan memberikan skor
                kompetensi dan umpan balik instan!
              </p>
            </div>

            {user.role === "STUDENT" ? (
              <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
                  <span>Skenario Terselesaikan</span>
                  <span className="text-base font-extrabold text-teal-300">
                    {completedCount} / {simulations.length}
                  </span>
                </div>
                <div
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progres penyelesaian 5 simulasi pelayanan"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-blue-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <span>+40 XP tiap skenario baru • Bonus +15 XP jika skor meningkat</span>
                </p>
              </div>
            ) : (
              <Link
                href="/guru?tab=simulations"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm hover:bg-teal-300"
              >
                <MonitorPlay className="h-4 w-4" aria-hidden="true" />
                <span>Kelola &amp; Edit Skenario Simulasi</span>
              </Link>
            )}
          </div>
        </section>

        {/* Daftar 5 Skenario Simulasi */}
        <section aria-label="Daftar 5 skenario simulasi" className="grid gap-5 lg:grid-cols-2">
          {simulations.map((sim) => {
            const steps = parseSimulationSteps(sim.stepsJson);
            const maxScore = computeMaxScore(steps);
            const stat = attemptsBySim.get(sim.id);
            const bestPercent = stat
              ? Math.round((stat.bestScore / Math.max(1, stat.bestMax)) * 100)
              : null;

            return (
              <article
                key={sim.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs transition hover:shadow-md ${
                  stat ? "border-emerald-200" : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0f294a] text-xs font-extrabold text-white">
                        S{sim.order}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${getDifficultyBadge(
                          sim.difficulty
                        )}`}
                      >
                        Tingkat {sim.difficulty}
                      </span>
                    </div>

                    {stat ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Skor Terbaik: {bestPercent}%</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Belum Dicoba
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-[#0f294a] [text-wrap:balance]">
                    {sim.title}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#0f766e]">{sim.subtitle}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 [text-wrap:pretty]">
                    {sim.scenarioContext}
                  </p>

                  {/* Profil Tamu */}
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0f294a]">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        Tamu: {sim.customerName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">{sim.customerRole}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                      {steps.length} tahap dialog • Maks {maxScore} poin
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      ~{sim.estimatedMinutes} menit
                      {stat ? ` • ${stat.count}x dicoba` : ""}
                    </span>
                  </div>

                  <Link
                    href={`/simulasi/${sim.slug}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      stat
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    {stat ? (
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        <span>Latih Ulang &amp; Tingkatkan Skor</span>
                      </>
                    ) : (
                      <>
                        <span>Mulai Simulasi Sekarang</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {/* Tips Praktik Simulasi */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-extrabold text-amber-950">
                Tips Meraih Predikat Pelayanan Prima (90%+)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Selalu prioritaskan budaya <strong>5S</strong> (Senyum, Salam, Sapa, Sopan,
                Santun), konfirmasi kebutuhan dengan <strong>active listening</strong>, gunakan
                kalimat positif &amp; solutif, serta terapkan metode <strong>L.A.S.T</strong> saat
                menghadapi keluhan tamu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
