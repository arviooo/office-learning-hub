import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Crown,
  HelpCircle,
  MonitorPlay,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getSessionUser, getStudentLevel } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "Fleksibel";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?role=student");
  }
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
    announcements,
    schedules,
    userBadges,
  ] = await Promise.all([
    prisma.material.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    prisma.materialProgress.findMany({ where: { userId: user.id } }),
    prisma.simulation.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    prisma.simulationAttempt.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
    }),
    prisma.quiz.findMany({ where: { isPublished: true }, orderBy: { createdAt: "asc" } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
    }),
    prisma.assignment.findMany({ where: { isPublished: true }, orderBy: { dueDate: "asc" } }),
    prisma.submission.findMany({ where: { userId: user.id } }),
    prisma.announcement.findMany({
      include: { author: { select: { name: true } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.scheduleItem.findMany({ orderBy: { weekLabel: "asc" } }),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const progressMap = new Map(materialProgress.map((p) => [p.materialId, p.status]));
  const completedMaterialsCount = materials.filter(
    (m) => progressMap.get(m.id) === "COMPLETED"
  ).length;
  const completedSimIds = new Set(simulationAttempts.map((a) => a.simulationId));
  const completedQuizIds = new Set(quizAttempts.map((a) => a.quizId));
  const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]));

  const totalItems =
    materials.length + simulations.length + quizzes.length + assignments.length;
  const doneItems =
    completedMaterialsCount +
    completedSimIds.size +
    completedQuizIds.size +
    submissions.length;
  const overallPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const activeMaterial =
    materials.find((m) => progressMap.get(m.id) === "IN_PROGRESS") ||
    materials.find((m) => progressMap.get(m.id) !== "COMPLETED") ||
    materials[0];

  const levelInfo = getStudentLevel(user.points);
  const pendingQuizzes = quizzes.filter((q) => !completedQuizIds.has(q.id));
  const pendingAssignments = assignments.filter((a) => !submissionMap.has(a.id));

  return (
    <DashboardShell user={user}>
      <div className="space-y-7">
        {/* 1. BANNER SAPAAN HANGAT & RAMAH (Tema Pastel Terang, Tidak Kaku) */}
        <section className="rounded-[28px] border border-sky-100 bg-gradient-to-br from-[#e5f5ff] via-white to-[#fff4ec] p-6 shadow-xs sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-2.5">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200/80">
                  {user.className || "XI MPLB 1"}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200/80">
                  Level {levelInfo.level} • {levelInfo.title}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Hai, {user.name.split(" ")[0]}! Semangat belajar hari ini 👋
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                Kamu sudah menyelesaikan <strong>{overallPercent}%</strong> dari seluruh rangkaian
                Pelayanan Tamu. Yuk lanjutkan satu langkah lagi biar makin jago!
              </p>

              {/* 1 Langkah Selanjutnya yang Paling Jelas */}
              {activeMaterial && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/materi/${activeMaterial.slug}`}
                    className="interactive-lift inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6a45] to-[#ff512f] px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200/70 hover:from-[#ff5a32] hover:to-[#f04422]"
                  >
                    <span>Lanjut Materi {activeMaterial.order}: {activeMaterial.title}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/simulasi"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <MonitorPlay className="h-4 w-4 text-[#ff5f3d]" aria-hidden="true" />
                    <span>Coba Simulasi</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Kartu Progres Sederhana & Mudah Dibaca */}
            <div className="w-full max-w-xs rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Progres Belajarmu</span>
                <span className="text-xl font-extrabold text-slate-950">{overallPercent}%</span>
              </div>
              <div
                className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={overallPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Persentase kemajuan belajar"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{doneItems} dari {totalItems} aktivitas</span>
                <span className="font-bold text-amber-600">{user.points} XP</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. 4 KARTU MENU PINTAS BESAR ("Mau Belajar Apa Hari Ini?") */}
        <section aria-label="Menu Pintas Belajar">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-950">Mau belajar apa hari ini?</h2>
            <Link href="/progres" className="text-xs font-bold text-sky-600 hover:underline">
              Lihat Progres Belajar Lengkap →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/materi"
              className="interactive-lift flex flex-col justify-between rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-2xs hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-xs">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-800">
                  {completedMaterialsCount}/{materials.length} Materi
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-extrabold text-slate-950">Baca Materi</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Materi ringkas, video &amp; handout PDF dari guru.
                </p>
              </div>
            </Link>

            <Link
              href="/simulasi"
              className="interactive-lift flex flex-col justify-between rounded-3xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-2xs hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5f3d] text-white shadow-xs">
                  <MonitorPlay className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-800">
                  {completedSimIds.size}/{simulations.length} Selesai
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-extrabold text-slate-950">Tugas Simulasi</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Unduh skenario roleplay &amp; kirim hasil dialog dalam PDF.
                </p>
              </div>
            </Link>

            <Link
              href="/kuis"
              className="interactive-lift flex flex-col justify-between rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-2xs hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xs">
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-800">
                  {completedQuizIds.size}/{quizzes.length} Selesai
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-extrabold text-slate-950">Kerjakan Kuis</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Tes pemahaman singkat (1x kesempatan, soal acak).
                </p>
              </div>
            </Link>

            <Link
              href="/lkpd"
              className="interactive-lift flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs">
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                  {pendingAssignments.length} Menunggu
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-extrabold text-slate-950">LKPD &amp; Proyek</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Analisis studi kasus &amp; kumpulkan proyek praktik.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* 3. KONTEN UTAMA 2 KOLOM YANG LEGA & RAPI */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Kolom Kiri (8): Tugas Belum Selesai + Peta 7 Materi */}
          <div className="space-y-6 lg:col-span-8">
            {/* Daftar Tugas & Kuis yang Perlu Diselesaikan */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    Tugas &amp; Kuis yang Menunggumu
                  </h2>
                  <p className="text-xs text-slate-500">
                    Klik salah satu di bawah ini untuk langsung mengerjakan
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  {pendingQuizzes.length + pendingAssignments.length} Tersisa
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {pendingQuizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/kuis/${quiz.id}`}
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-[#fafaf7] p-4 transition hover:border-violet-200 hover:bg-violet-50/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <HelpCircle className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{quiz.title}</p>
                        <p className="text-xs text-slate-500">
                          Kuis • {quiz.timeLimitMinutes} menit • 1x kesempatan
                        </p>
                      </div>
                    </div>
                    <span className="w-fit rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
                      Mulai Kuis →
                    </span>
                  </Link>
                ))}

                {pendingAssignments.map((task) => (
                  <Link
                    key={task.id}
                    href={task.type === "LKPD" ? `/lkpd/${task.id}` : `/proyek/${task.id}`}
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-[#fafaf7] p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          task.type === "LKPD"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500">
                          {task.type === "LKPD" ? "LKPD Kasus" : "Proyek Praktik"} • Tenggat{" "}
                          {formatDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                    <span className="w-fit rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      Kerjakan →
                    </span>
                  </Link>
                ))}

                {pendingQuizzes.length === 0 && pendingAssignments.length === 0 && (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                    Keren! Semua tugas dan kuis saat ini sudah kamu selesaikan 🎉
                  </div>
                )}
              </div>
            </section>

            {/* Peta Materi Pelayanan Tamu */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    Peta Belajar Materi Pelayanan Tamu
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pilih bab mana saja untuk langsung membaca &amp; mencatat rangkuman
                  </p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  {completedMaterialsCount}/{materials.length} Tuntas
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {materials.map((m) => {
                  const status = progressMap.get(m.id) || "NOT_STARTED";
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/materi/${m.slug}`}
                        className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-[#fafaf7] px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50/40 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                              status === "COMPLETED"
                                ? "bg-emerald-500 text-white"
                                : status === "IN_PROGRESS"
                                ? "bg-sky-500 text-white"
                                : "bg-white text-slate-600 ring-1 ring-slate-200"
                            }`}
                          >
                            {status === "COMPLETED" ? (
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              m.order
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{m.title}</p>
                            <p className="text-xs text-slate-500">{m.subtitle}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                            status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "IN_PROGRESS"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-white text-slate-500 ring-1 ring-slate-200"
                          }`}
                        >
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {status === "COMPLETED"
                            ? "Selesai"
                            : status === "IN_PROGRESS"
                            ? "Lanjutkan"
                            : `${m.durationMinutes} mnt`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* Kolom Kanan (4): Pengumuman Guru, Lencana & Jadwal */}
          <div className="space-y-6 lg:col-span-4">
            {/* Pengumuman Guru */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#ff5f3d]" aria-hidden="true" />
                  <h2 className="text-sm font-extrabold text-slate-950">Pengumuman Guru</h2>
                </div>
                <Link href="/diskusi" className="text-xs font-bold text-sky-600 hover:underline">
                  Semua
                </Link>
              </div>
              <div className="mt-3.5 space-y-3">
                {announcements.map((ann) => (
                  <article
                    key={ann.id}
                    className={`rounded-2xl border p-3.5 ${
                      ann.isPinned
                        ? "border-sky-200 bg-sky-50/60"
                        : "border-slate-100 bg-[#fafaf7]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="rounded-full bg-white px-2.5 py-0.5 font-bold uppercase text-slate-600 ring-1 ring-slate-200">
                        {ann.category}
                      </span>
                      <span className="text-slate-400">{formatDate(ann.createdAt)}</span>
                    </div>
                    <h3 className="mt-2 text-xs font-bold text-slate-900">{ann.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{ann.content}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Lencana Prestasi */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <h2 className="text-sm font-extrabold text-slate-950">Lencana Prestasimu</h2>
                </div>
                <Link href="/sertifikat" className="text-xs font-bold text-emerald-600 hover:underline">
                  E-Sertifikat
                </Link>
              </div>

              {userBadges.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Selesaikan materi atau simulasi pertamamu untuk meraih lencana!
                </p>
              ) : (
                <div className="mt-3.5 space-y-2.5">
                  {userBadges.map((ub) => {
                    const BadgeIcon = getBadgeIcon(ub.badge.icon);
                    return (
                      <div
                        key={ub.id}
                        className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs">
                          <BadgeIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{ub.badge.name}</p>
                          <p className="text-[11px] text-slate-600">{ub.badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Jadwal Mingguan */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <h2 className="text-sm font-extrabold text-slate-950">Jadwal Belajar</h2>
              </div>
              <ol className="mt-3.5 space-y-2.5">
                {schedules.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-2xl border p-3 ${
                      item.isCurrent
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-100 bg-[#fafaf7]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-700">{item.weekLabel}</span>
                      <span className="text-slate-500">{item.dateRange}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-900">{item.topic}</p>
                    <p className="text-[11px] text-slate-500">{item.activity}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
