import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, HelpCircle, Lock, Shuffle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { parseQuizQuestions } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const [quizzes, attempts] = await Promise.all([
    prisma.quiz.findMany({
      where: { isPublished: true },
      include: { material: { select: { order: true, title: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      select: { quizId: true },
    }),
  ]);

  const completedQuizIds = new Set(attempts.map((a) => a.quizId));
  const isStudent = user.role === "STUDENT";

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-indigo-500 via-violet-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-200/60 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-200">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Evaluasi Pemahaman • 1x Kesempatan • Soal Acak</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
            Kuis Interaktif Pelayanan Tamu
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Uji pemahaman Materi 1 (Penanganan Tamu Secara Langsung) dan Materi 2 (Penanganan Tamu
            Melalui Telepon). Setiap kuis hanya dapat dikerjakan <strong>1 kali</strong> dengan
            urutan soal diacak otomatis per siswa.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const qCount = parseQuizQuestions(quiz.questionsJson).length;
            const done = isStudent && completedQuizIds.has(quiz.id);

            return (
              <article
                key={quiz.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs transition hover:shadow-md ${
                  done ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      {quiz.category}
                    </span>
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sudah Dikerjakan</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {isStudent ? "Belum Dikerjakan" : "Mode Pratinjau"}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-[#0f294a] [text-wrap:balance]">
                    {quiz.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {quiz.description}
                  </p>
                  {quiz.material && (
                    <p className="mt-2.5 text-xs font-semibold text-[#0f766e]">
                      Terkait Materi {quiz.material.order}: {quiz.material.title}
                    </p>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{qCount} soal</span>
                      {quiz.shuffleQuestions && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          <Shuffle className="h-3 w-3" aria-hidden="true" />
                          Acak
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {quiz.timeLimitMinutes} menit • 1x kesempatan
                    </span>
                  </div>

                  <Link
                    href={`/kuis/${quiz.id}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      done
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    {done ? (
                      <>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        <span>Sudah Dikerjakan (1x)</span>
                      </>
                    ) : (
                      <>
                        <span>{isStudent ? "Mulai Kuis Sekarang" : "Lihat Pratinjau & Kunci"}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
