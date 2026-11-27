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
  Lock,
  Send,
  Shuffle,
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
    shuffleQuestions: boolean;
  };
  questions: Omit<QuizQuestion, "correctIndex" | "explanation">[];
  alreadySubmittedAt: string | null;
}

interface SubmissionReceipt {
  submittedAtLabel: string;
  pointsAwarded: number;
  unlockedBadges: string[];
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuizRunner({ quiz, questions, alreadySubmittedAt }: QuizRunnerProps) {
  const router = useRouter();
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(quiz.timeLimitMinutes * 60);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(() =>
    alreadySubmittedAt
      ? { submittedAtLabel: alreadySubmittedAt, pointsAwarded: 0, unlockedBadges: [] }
      : null
  );

  useEffect(() => {
    if (receipt) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [receipt]);

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
        setErrorMsg(data.error || "Gagal mengirim jawaban kuis.");
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      setReceipt({
        submittedAtLabel: "Baru saja",
        pointsAwarded: data.pointsAwarded || 0,
        unlockedBadges: data.unlockedBadges || [],
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

  // Kuis terkunci setelah 1x pengerjaan (nilai tidak ditampilkan di halaman siswa)
  if (receipt) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-[#0f294a] to-[#0f766e] p-6 text-white shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kuis Selesai • Batas 1x Pengerjaan</span>
          </span>
          <h2
            ref={resultHeadingRef}
            tabIndex={-1}
            className="mt-3 text-2xl font-extrabold focus:outline-none sm:text-3xl"
          >
            Jawaban Kuis Telah Tersimpan
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
            Terima kasih telah mengerjakan <strong>{quiz.title}</strong> ({receipt.submittedAtLabel}).
            Jawabanmu sudah otomatis masuk ke rekap penilaian Guru. Setiap siswa hanya memiliki 1
            kali kesempatan untuk mengerjakan kuis ini.
          </p>
        </section>

        {(receipt.pointsAwarded > 0 || receipt.unlockedBadges.length > 0) && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              {receipt.pointsAwarded > 0 && (
                <p className="font-bold">+{receipt.pointsAwarded} XP ditambahkan ke akunmu!</p>
              )}
              {receipt.unlockedBadges.map((b) => (
                <p key={b} className="text-xs font-semibold">
                  Lencana baru terbuka: <strong>{b}</strong>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Status: Sudah Dikerjakan</span>
          </span>
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
      {/* Info 1x Pengerjaan & Acak Soal */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span>
          <strong>Perhatian:</strong> Kuis ini hanya dapat dikerjakan <strong>1 kali</strong>.
          {quiz.shuffleQuestions && (
            <> Urutan soal telah diacak secara otomatis untuk setiap siswa.</>
          )}
        </span>
      </div>

      {/* Status Bar Timer & Jumlah Terjawab */}
      <div className="sticky top-[62px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-xs backdrop-blur-xs">
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          <span>
            Soal Terjawab:{" "}
            <span className="font-extrabold text-[#0f294a]">
              {answeredCount} / {questions.length}
            </span>
          </span>
          {quiz.shuffleQuestions && (
            <span className="hidden items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 sm:inline-flex">
              <Shuffle className="h-3 w-3" aria-hidden="true" />
              Acak Soal Aktif
            </span>
          )}
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
            ? "Semua soal sudah dijawab. Periksa kembali sebelum mengirim (hanya 1x kesempatan)."
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
          <span>{submitting ? "Mengirim Jawaban..." : "Kirim Jawaban Kuis"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kirim jawaban kuis sekarang?"
        description={
          allAnswered
            ? `Semua ${questions.length} soal sudah kamu jawab. Kuis ini hanya bisa dikerjakan 1 kali dan jawaban tidak dapat diubah setelah dikirim.`
            : `Kamu baru menjawab ${answeredCount} dari ${questions.length} soal (${
                questions.length - answeredCount
              } soal masih kosong). Kuis hanya bisa dikerjakan 1 kali — yakin ingin mengirim sekarang?`
        }
        confirmLabel="Ya, Kirim Final"
        cancelLabel="Periksa Lagi"
        variant="primary"
        loading={submitting}
        onConfirm={executeSubmitQuiz}
        onClose={() => setConfirmOpen(false)}
      />
    </form>
  );
}
