"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { QuizQuestion } from "@/lib/assessment";
import { ConfirmDialog } from "./ConfirmDialog";

interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    description: string;
    category: string;
    timeLimitMinutes: number;
    passingScore: number;
  };
  questions: Omit<QuizQuestion, "correctIndex" | "explanation">[];
  userRole: string;
}

interface ReviewItem {
  id: string;
  question: string;
  type: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  passed: boolean;
  pointsAwarded: number;
  unlockedBadges: string[];
  review: ReviewItem[];
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuizRunner({ quiz, questions, userRole }: QuizRunnerProps) {
  const router = useRouter();
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(quiz.timeLimitMinutes * 60);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (answeredCount === 0) {
      setErrorMsg("Pilih minimal satu jawaban sebelum mengirim kuis.");
      return;
    }
    setErrorMsg(null);
    setConfirmOpen(true);
  }

  async function executeSubmitQuiz() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menilai kuis.");
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      setResult({
        score: data.score,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        passingScore: data.passingScore,
        passed: data.passed,
        pointsAwarded: data.pointsAwarded || 0,
        unlockedBadges: data.unlockedBadges || [],
        review: data.review || [],
      });
      router.refresh();
      setTimeout(() => resultHeadingRef.current?.focus(), 80);
    } catch {
      setErrorMsg("Koneksi ke server terganggu. Coba kirim ulang.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setSecondsLeft(quiz.timeLimitMinutes * 60);
    setResult(null);
    setErrorMsg(null);
  }

  if (result) {
    return (
      <div className="space-y-6">
        {/* Ringkasan Skor Kuis */}
        <section
          className={`rounded-3xl p-6 text-white shadow-sm sm:p-8 ${
            result.passed
              ? "bg-gradient-to-r from-[#0f294a] to-[#0f766e]"
              : "bg-gradient-to-r from-slate-800 to-amber-700"
          }`}
        >
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                {result.passed ? "Lulus KKM" : "Belum Mencapai KKM"} • KKM {result.passingScore}
              </span>
              <h2
                ref={resultHeadingRef}
                tabIndex={-1}
                className="mt-3 text-2xl font-extrabold focus:outline-none sm:text-3xl"
              >
                {result.passed
                  ? "Selamat! Pemahamanmu Sangat Baik"
                  : "Terus Semangat! Pelajari Pembahasannya"}
              </h2>
              <p className="mt-1.5 text-sm text-blue-100">
                Kamu menjawab benar <strong>{result.correctCount}</strong> dari{" "}
                <strong>{result.totalQuestions}</strong> soal.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/15 px-6 py-4 text-center backdrop-blur-xs">
              <p className="text-xs font-semibold text-blue-100">Nilai Akhir</p>
              <p className="mt-0.5 text-4xl font-extrabold text-teal-200">{result.score}</p>
              <p className="text-xs text-blue-100">skala 0–100</p>
            </div>
          </div>
        </section>

        {(result.pointsAwarded > 0 || result.unlockedBadges.length > 0) && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              {result.pointsAwarded > 0 && (
                <p className="font-bold">+{result.pointsAwarded} XP ditambahkan ke akunmu!</p>
              )}
              {result.unlockedBadges.map((b) => (
                <p key={b} className="text-xs font-semibold">
                  Lencana baru terbuka: <strong>{b}</strong>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Pembahasan Jawaban Tiap Soal */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-[#0f294a]">Pembahasan Lengkap Jawaban</h3>
          {result.review.map((item, idx) => (
            <article
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-2xs ${
                item.isCorrect ? "border-emerald-200" : "border-rose-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">
                  {idx + 1}. {item.question}
                </p>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    item.isCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {item.isCorrect ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{item.isCorrect ? "Benar" : "Kurang Tepat"}</span>
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                {item.options.map((opt, optIdx) => {
                  const isCorrectOpt = optIdx === item.correctIndex;
                  const isUserOpt = optIdx === item.selectedIndex;
                  return (
                    <div
                      key={optIdx}
                      className={`rounded-xl border px-3.5 py-2 ${
                        isCorrectOpt
                          ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-950"
                          : isUserOpt
                          ? "border-rose-300 bg-rose-50 text-rose-950"
                          : "border-slate-100 bg-slate-50/50 text-slate-600"
                      }`}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                      {isCorrectOpt && (
                        <span className="ml-2 font-bold text-emerald-700">(Kunci Jawaban)</span>
                      )}
                      {isUserOpt && !isCorrectOpt && (
                        <span className="ml-2 font-bold text-rose-700">(Pilihanmu)</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl bg-blue-50/70 p-3 text-xs leading-relaxed text-slate-700">
                <strong className="text-[#0f294a]">Pembahasan:</strong> {item.explanation}
              </div>
            </article>
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Kerjakan Ulang Kuis</span>
          </button>
          <Link
            href="/kuis"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#163a66]"
          >
            Kembali ke Daftar Kuis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Bar Timer & Jumlah Terjawab */}
      <div className="sticky top-[62px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-xs backdrop-blur-xs">
        <div className="text-xs font-semibold text-slate-600">
          Soal Terjawab:{" "}
          <span className="font-extrabold text-[#0f294a]">
            {answeredCount} / {questions.length}
          </span>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold ${
            secondsLeft <= 60 ? "bg-rose-100 text-rose-700" : "bg-blue-50 text-[#0f294a]"
          }`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Sisa Waktu: {formatTimer(secondsLeft)}</span>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Daftar Soal */}
      <div className="space-y-5">
        {questions.map((q, idx) => (
          <fieldset
            key={q.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6"
          >
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#0f766e]">
              <span>Soal {idx + 1}</span>
              <span>•</span>
              <span>
                {q.type === "TRUE_FALSE"
                  ? "Benar / Salah"
                  : q.type === "CASE"
                  ? "Studi Kasus"
                  : "Pilihan Ganda"}
              </span>
            </div>
            <legend className="mt-2 text-sm font-bold leading-relaxed text-slate-900 sm:text-base">
              {q.question}
            </legend>

            <div className="mt-4 space-y-2.5">
              {q.options.map((opt, optIdx) => {
                const inputId = `${q.id}-opt-${optIdx}`;
                const checked = answers[q.id] === optIdx;
                return (
                  <label
                    key={inputId}
                    htmlFor={inputId}
                    className={`flex min-h-[46px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      checked
                        ? "border-[#1d4ed8] bg-blue-50 font-semibold text-[#0f294a]"
                        : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={q.id}
                      value={optIdx}
                      checked={checked}
                      onChange={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: optIdx,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="leading-relaxed">
                      <strong className="mr-1.5">{String.fromCharCode(65 + optIdx)}.</strong>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Tombol Submit Kuis */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-600">
          {allAnswered
            ? "Semua soal sudah dijawab. Kamu siap mengirim dan melihat pembahasan!"
            : `Masih ada ${questions.length - answeredCount} soal yang belum dipilih.`}
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d625c] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {submitting
              ? "Menilai Jawaban..."
              : `Kirim Jawaban & Lihat Skor${userRole === "STUDENT" ? " (+XP)" : ""}`}
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kirim jawaban kuis sekarang?"
        description={
          allAnswered
            ? `Semua ${questions.length} soal sudah kamu jawab. Setelah dikirim, sistem langsung menghitung skor dan menampilkan pembahasan.`
            : `Kamu baru menjawab ${answeredCount} dari ${questions.length} soal (${
                questions.length - answeredCount
              } soal masih kosong). Yakin ingin mengirim sekarang?`
        }
        confirmLabel="Ya, Kirim Jawaban"
        cancelLabel="Periksa Lagi"
        variant="primary"
        loading={submitting}
        onConfirm={executeSubmitQuiz}
        onClose={() => setConfirmOpen(false)}
      />
    </form>
  );
}
