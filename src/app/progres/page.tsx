import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Crown,
  ExternalLink,
  HelpCircle,
  Lock,
  MessageSquareText,
  MonitorPlay,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { getSessionUser, getStudentLevel } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { formatIndoDate } from "@/lib/assessment";

export const dynamic = "force-dynamic";

function getBadgeIcon(icon: string) {
  switch (icon) {
    case "trophy":
      return Trophy;
    case "crown":
      return Crown;
    case "sparkles":
      return Sparkles;
    default:
      return Award;
  }
}

export default async function StudentProgressPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");
  if (user.role === "TEACHER") redirect("/guru");
  if (user.role === "ADMIN") redirect("/admin");

  const [
    materials,
    materialProgress,
    simulations,
    simulationAttempts,
    quizzes,
    quizAttempts,
    assignments,
    submissions,
    allBadges,
    userBadges,
  ] = await Promise.all([
    prisma.material.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    prisma.materialProgress.findMany({
      where: { userId: user.id },
      include: { material: { select: { order: true, title: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.simulation.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    prisma.simulationAttempt.findMany({
      where: { userId: user.id },
      include: { simulation: { select: { order: true, title: true, slug: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.quiz.findMany({ where: { isPublished: true } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      include: { quiz: { select: { title: true, passingScore: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.assignment.findMany({ where: { isPublished: true }, orderBy: { createdAt: "asc" } }),
    prisma.submission.findMany({
      where: { userId: user.id },
      include: { assignment: { select: { id: true, title: true, type: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId: user.id } }),
  ]);

  const completedMaterials = materialProgress.filter((p) => p.status === "COMPLETED").length;
  const matPct = materials.length > 0 ? Math.round((completedMaterials / materials.length) * 100) : 0;

  const uniqueSims = new Set(simulationAttempts.map((a) => a.simulationId)).size;
  const simPct = simulations.length > 0 ? Math.round((uniqueSims / simulations.length) * 100) : 0;

  const uniqueQuizzes = new Set(quizAttempts.map((a) => a.quizId)).size;
  const quizPct = quizzes.length > 0 ? Math.round((uniqueQuizzes / quizzes.length) * 100) : 0;

  const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));
  const assignPct =
    assignments.length > 0 ? Math.round((submissions.length / assignments.length) * 100) : 0;

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));
  const levelInfo = getStudentLevel(user.points);

  // Linimasa Aktivitas Terbaru
  type ActivityItem = { id: string; label: string; detail: string; date: Date; badge: string };
  const timeline: ActivityItem[] = [
    ...materialProgress
      .filter((p) => p.status === "COMPLETED" && p.completedAt)
      .map((p) => ({
        id: `m-${p.id}`,
        label: `Menyelesaikan Materi ${p.material.order}: ${p.material.title}`,
        detail: "Status: Selesai Dipelajari",
        date: p.completedAt as Date,
        badge: "Materi",
      })),
    ...simulationAttempts.map((s) => ({
      id: `s-${s.id}`,
      label: `Menyelesaikan ${s.simulation.title}`,
      detail: `Skor ${s.score}/${s.maxScore} (${Math.round((s.score / Math.max(1, s.maxScore)) * 100)}%)`,
      date: s.completedAt,
      badge: "Simulasi",
    })),
    ...quizAttempts.map((q) => ({
      id: `q-${q.id}`,
      label: `Mengerjakan ${q.quiz.title}`,
      detail: `Nilai ${q.score}/100 (Benar ${q.correctCount}/${q.totalQuestions})`,
      date: q.completedAt,
      badge: "Kuis",
    })),
    ...submissions.map((sub) => ({
      id: `a-${sub.id}`,
      label: `Mengumpulkan ${sub.assignment.title}`,
      detail:
        sub.status === "GRADED"
          ? `Sudah Dinilai: ${sub.score}/100`
          : "Menunggu penilaian guru",
      date: sub.submittedAt,
      badge: sub.assignment.type,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 12);

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        {/* Header Progres & Nilai */}
        <section className="rounded-[28px] bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-500 p-6 text-white shadow-lg shadow-teal-200/60 sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-teal-200">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Rekap Pembelajaran &amp; Transkrip Nilai</span>
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Progres Belajar &amp; Nilai — {user.name}
              </h1>
              <p className="mt-1.5 text-sm text-blue-100">
                {user.className || "XI MPLB 1"} • Level {levelInfo.level} ({levelInfo.title}) •{" "}
                <strong>{user.points} XP</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Materi", pct: matPct, val: `${completedMaterials}/${materials.length}` },
                { label: "Simulasi", pct: simPct, val: `${uniqueSims}/${simulations.length}` },
                { label: "Kuis", pct: quizPct, val: `${uniqueQuizzes}/${quizzes.length}` },
                { label: "LKPD/Proyek", pct: assignPct, val: `${submissions.length}/${assignments.length}` },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-xs"
                >
                  <p className="text-[11px] font-semibold text-blue-100">{m.label}</p>
                  <p className="mt-0.5 text-xl font-extrabold text-teal-300">{m.pct}%</p>
                  <p className="text-[11px] text-blue-100/80">{m.val}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nilai LKPD & Proyek + Catatan Guru */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Status Pengumpulan &amp; Nilai LKPD / Proyek
            </h2>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Tabel status pengumpulan LKPD dan proyek"
            className="mt-4 overflow-x-auto"
          >
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Tugas / Proyek</th>
                  <th scope="col" className="px-4 py-3">Jenis</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Nilai</th>
                  <th scope="col" className="px-4 py-3">Umpan Balik Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const sub = subMap.get(a.id);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        <Link
                          href={a.type === "LKPD" ? `/lkpd/${a.id}` : `/proyek/${a.id}`}
                          className="inline-flex items-center gap-1 hover:text-[#1d4ed8] hover:underline"
                        >
                          <span>{a.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-600">{a.type}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {sub?.status === "GRADED" ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                            Sudah Dinilai
                          </span>
                        ) : sub ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-[#1d4ed8]">
                            Menunggu Nilai
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-500">
                            Belum Dikumpulkan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-[#0f294a]">
                        {sub?.score !== null && sub?.score !== undefined ? `${sub.score}/100` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {sub?.teacherFeedback || "Belum ada catatan guru."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grid 2 Kolom: Rekap Kuis & Rekap Simulasi */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rekap Nilai Kuis */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">Riwayat Nilai Kuis</h2>
            </div>

            {quizAttempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada kuis yang dikerjakan.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {quizAttempts.map((qa) => (
                  <li
                    key={qa.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{qa.quiz.title}</p>
                      <p className="mt-0.5 text-slate-500">
                        Benar {qa.correctCount}/{qa.totalQuestions} • {formatIndoDate(qa.completedAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-1 font-extrabold ${
                        qa.score >= qa.quiz.passingScore
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {qa.score}/100
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Rekap Simulasi & Umpan Balik Guru */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Riwayat Simulasi &amp; Umpan Balik Guru
              </h2>
            </div>

            {simulationAttempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada simulasi yang diselesaikan.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {simulationAttempts.slice(0, 6).map((sa) => {
                  const pct = Math.round((sa.score / Math.max(1, sa.maxScore)) * 100);
                  return (
                    <li
                      key={sa.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/simulasi/${sa.simulation.slug}`}
                          className="font-bold text-slate-900 hover:text-[#1d4ed8] hover:underline"
                        >
                          {sa.simulation.title}
                        </Link>
                        <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 font-extrabold text-[#0f294a]">
                          {pct}% ({sa.score}/{sa.maxScore})
                        </span>
                      </div>
                      {sa.teacherFeedback && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 p-2 text-emerald-900">
                          <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>
                            <strong>Umpan Balik Guru:</strong> {sa.teacherFeedback}
                          </span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Pencapaian Lencana & Riwayat Aktivitas */}
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-5">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">Koleksi Lencana</h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {allBadges.map((b) => {
                const earned = earnedBadgeIds.has(b.id);
                const Icon = getBadgeIcon(b.icon);
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      earned
                        ? "border-amber-200 bg-amber-50/70"
                        : "border-slate-200 bg-slate-50/60 opacity-65"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        earned ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {earned ? (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.name}</p>
                      <p className="text-[11px] text-slate-600">
                        {earned ? b.description : `Syarat: ${b.criteria}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-7">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#1d4ed8]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Riwayat Aktivitas Pembelajaran
              </h2>
            </div>

            {timeline.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {timeline.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{item.label}</p>
                        <p className="mt-0.5 text-slate-600">{item.detail}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 ring-1 ring-slate-200">
                        {item.badge}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-400">{formatIndoDate(item.date)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Shortcut Cetak Sertifikat */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-700">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
            <span>Selesaikan 7 materi dan 5 simulasi untuk membuka sertifikat &amp; lencana Juara Pelayanan Prima!</span>
          </span>
          <Link
            href="/sertifikat"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66]"
          >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Buka Halaman Sertifikat</span>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
