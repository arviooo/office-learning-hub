import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, HelpCircle, RotateCcw, Trophy } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { parseQuizQuestions } from "@/lib/assessment";

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
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const bestByQuiz = new Map<string, { best: number; count: number }>();
  for (const a of attempts) {
    const cur = bestByQuiz.get(a.quizId);
    if (!cur) bestByQuiz.set(a.quizId, { best: a.score, count: 1 });
    else {
      cur.count += 1;
      if (a.score > cur.best) cur.best = a.score;
    }
  }

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-indigo-500 via-violet-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-200/60 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-200">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Evaluasi Pemahaman • Skor &amp; Pembahasan Otomatis</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
            Kuis Interaktif Pelayanan Prima
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Uji pemahaman konsep 6A, etika 5S, komunikasi efektif, dan studi kasus perkantoran.
            Raih nilai 100 untuk membuka lencana <strong>Bintang Kuis</strong>!
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const qCount = parseQuizQuestions(quiz.questionsJson).length;
            const stat = bestByQuiz.get(quiz.id);
            const passed = stat ? stat.best >= quiz.passingScore : false;

            return (
              <article
                key={quiz.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs transition hover:shadow-md ${
                  passed ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      {quiz.category}
                    </span>
                    {stat ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          passed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>Skor Terbaik: {stat.best}/100</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Belum Dikerjakan
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
                    <span>
                      {qCount} soal • KKM {quiz.passingScore}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {quiz.timeLimitMinutes} menit
                      {stat ? ` • ${stat.count}x dicoba` : ""}
                    </span>
                  </div>

                  <Link
                    href={`/kuis/${quiz.id}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      stat
                        ? "border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    {stat ? (
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        <span>Kerjakan Ulang Kuis</span>
                      </>
                    ) : (
                      <>
                        <span>Mulai Kuis Sekarang</span>
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
