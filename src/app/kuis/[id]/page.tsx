import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, HelpCircle, Shuffle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { QuizRunner } from "@/components/QuizRunner";
import {
  formatIndoDate,
  parseQuizQuestions,
  shuffleItemsForStudent,
} from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) notFound();

  const existingAttempt =
    user.role === "STUDENT"
      ? await prisma.quizAttempt.findFirst({
          where: { userId: user.id, quizId: quiz.id },
          orderBy: { completedAt: "desc" },
          select: { id: true, completedAt: true },
        })
      : null;

  const allQuestions = parseQuizQuestions(quiz.questionsJson);
  // Hapus correctIndex & explanation dari payload client siswa agar kunci tidak bocor
  const safeQuestionsRaw = allQuestions.map((q) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
  }));

  // Acak urutan soal unik per siswa apabila fitur acak soal aktif
  const safeQuestions =
    user.role === "STUDENT" && quiz.shuffleQuestions
      ? shuffleItemsForStudent(safeQuestionsRaw, `${user.id}:${quiz.id}`)
      : safeQuestionsRaw;

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/kuis"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0f294a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Daftar Kuis</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {quiz.shuffleQuestions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Soal Diacak</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{quiz.timeLimitMinutes} menit • 1x kesempatan</span>
            </span>
          </div>
        </div>

        <header className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kuis Interaktif • {quiz.category}</span>
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {quiz.title}
          </h1>
          <p className="text-sm text-slate-600">{quiz.description}</p>
        </header>

        {user.role === "STUDENT" ? (
          <QuizRunner
            quiz={{
              id: quiz.id,
              title: quiz.title,
              description: quiz.description,
              category: quiz.category,
              timeLimitMinutes: quiz.timeLimitMinutes,
              shuffleQuestions: quiz.shuffleQuestions,
            }}
            questions={safeQuestions}
            alreadySubmittedAt={
              existingAttempt ? formatIndoDate(existingAttempt.completedAt) : null
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
              <div>
                <p className="text-sm font-extrabold text-[#0f294a]">
                  Mode Pratinjau &amp; Kunci Jawaban ({user.role === "ADMIN" ? "Admin" : "Guru"})
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Kuis ini hanya bisa dikerjakan 1x per siswa{" "}
                  {quiz.shuffleQuestions
                    ? "dengan urutan soal diacak otomatis per siswa."
                    : "dengan urutan soal tetap."}
                </p>
              </div>
              <Link
                href="/guru?tab=quizzes"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#163a66]"
              >
                <span>Edit Kuis di Panel Guru</span>
              </Link>
            </div>

            {allQuestions.map((q, idx) => (
              <article key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-bold text-slate-900">
                  {idx + 1}. {q.question}
                </p>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {q.options.map((opt, oIdx) => (
                    <li
                      key={oIdx}
                      className={`rounded-xl border px-3 py-2 ${
                        oIdx === q.correctIndex
                          ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-900"
                          : "border-slate-100 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}. {opt}
                      {oIdx === q.correctIndex && " (Kunci Jawaban)"}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-xl bg-blue-50/70 p-3 text-xs text-slate-700">
                  <strong>Pembahasan:</strong> {q.explanation}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
