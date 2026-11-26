"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Loader2,
  MessageSquareQuote,
  RotateCcw,
  Send,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  getCompetencyPredicate,
  type SimulationOption,
  type SimulationStep,
} from "@/lib/simulation";

interface SimulationPlayerProps {
  simulation: {
    id: string;
    order: number;
    slug: string;
    title: string;
    subtitle: string;
    scenarioContext: string;
    customerName: string;
    customerRole: string;
    difficulty: string;
  };
  steps: SimulationStep[];
  maxScore: number;
  nextSimulation: { slug: string; order: number; title: string } | null;
  userRole: string;
}

interface RecordedTurn {
  step: SimulationStep;
  option: SimulationOption;
  customResponse: string;
}

interface SavedResult {
  score: number;
  maxScore: number;
  percent: number;
  pointsAwarded: number;
  unlockedBadges: string[];
}

function getRatingStyles(rating: string) {
  if (rating === "Sangat Tepat") {
    return {
      box: "border-emerald-200 bg-emerald-50 text-emerald-950",
      badge: "bg-emerald-600 text-white",
      Icon: CheckCircle2,
      iconColor: "text-emerald-600",
    };
  }
  if (rating === "Cukup") {
    return {
      box: "border-amber-200 bg-amber-50 text-amber-950",
      badge: "bg-amber-600 text-white",
      Icon: AlertTriangle,
      iconColor: "text-amber-600",
    };
  }
  return {
    box: "border-rose-200 bg-rose-50 text-rose-950",
    badge: "bg-rose-600 text-white",
    Icon: XCircle,
    iconColor: "text-rose-600",
  };
}

export function SimulationPlayer({
  simulation,
  steps,
  maxScore,
  nextSimulation,
  userRole,
}: SimulationPlayerProps) {
  const router = useRouter();
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<"PLAYING" | "REFLECTION" | "RESULT">("PLAYING");
  const [selectedOption, setSelectedOption] = useState<SimulationOption | null>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [history, setHistory] = useState<RecordedTurn[]>([]);
  const [reflection, setReflection] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);

  const currentStep = steps[currentIdx];
  const runningScore =
    history.reduce((sum, h) => sum + h.option.score, 0) + (selectedOption ? selectedOption.score : 0);
  const progressPercent =
    phase === "RESULT"
      ? 100
      : phase === "REFLECTION"
      ? 92
      : Math.round(((currentIdx + (selectedOption ? 1 : 0)) / Math.max(1, steps.length)) * 85);

  function handleSelectOption(opt: SimulationOption) {
    if (selectedOption) return; // Kunci pilihan langkah ini agar umpan balik konsisten
    setSelectedOption(opt);
    setLiveAnnouncement(
      `Pilihan ${opt.rating}, memperoleh ${opt.score} poin. Umpan balik: ${opt.feedback}`
    );
  }

  function handleNextStep() {
    if (!selectedOption || !currentStep) return;

    const updatedHistory: RecordedTurn[] = [
      ...history,
      {
        step: currentStep,
        option: selectedOption,
        customResponse: customDraft.trim(),
      },
    ];

    setHistory(updatedHistory);
    setSelectedOption(null);
    setCustomDraft("");

    if (currentIdx + 1 < steps.length) {
      setCurrentIdx(currentIdx + 1);
      setTimeout(() => stepHeadingRef.current?.focus(), 60);
    } else {
      setPhase("REFLECTION");
      setLiveAnnouncement("Seluruh dialog selesai. Silakan tulis refleksi singkat lalu simpan hasil.");
    }
  }

  async function handleSaveAttempt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/simulations/${simulation.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: history.map((h) => ({
            stepId: h.step.id,
            choiceId: h.option.id,
            customResponse: h.customResponse || undefined,
          })),
          reflection: reflection.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menyimpan hasil simulasi.");
        setSubmitting(false);
        return;
      }

      setSavedResult({
        score: data.score,
        maxScore: data.maxScore,
        percent: data.percent,
        pointsAwarded: data.pointsAwarded || 0,
        unlockedBadges: data.unlockedBadges || [],
      });
      setPhase("RESULT");
      setLiveAnnouncement(`Simulasi selesai dengan skor ${data.percent} persen.`);
      router.refresh();
      setTimeout(() => resultHeadingRef.current?.focus(), 80);
    } catch {
      setErrorMsg("Koneksi ke server terganggu. Silakan coba simpan lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setCurrentIdx(0);
    setPhase("PLAYING");
    setSelectedOption(null);
    setCustomDraft("");
    setHistory([]);
    setReflection("");
    setSavedResult(null);
    setErrorMsg(null);
    setLiveAnnouncement("Simulasi dimulai ulang dari langkah pertama.");
    setTimeout(() => stepHeadingRef.current?.focus(), 60);
  }

  const finalPercent = savedResult?.percent ?? Math.round((runningScore / Math.max(1, maxScore)) * 100);
  const predicate = getCompetencyPredicate(finalPercent);

  return (
    <div className="space-y-6">
      {/* Live region terpusat (polite) untuk umpan balik simulasi */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {liveAnnouncement}
      </div>

      {/* Bar Status Skenario & Meteran Skor Real-time */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0f294a] to-[#0f766e] text-white">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">
                Lawan Bicara (Tamu Kantor)
              </p>
              <p className="text-sm font-extrabold text-slate-900">
                {simulation.customerName}{" "}
                <span className="font-normal text-slate-500">— {simulation.customerRole}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Skor Pelayanan Sementara
              </p>
              <p className="text-lg font-extrabold text-[#0f294a]">
                {runningScore} <span className="text-xs font-semibold text-slate-400">/ {maxScore}</span>
              </p>
            </div>
            <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8]">
              {phase === "RESULT"
                ? "Selesai"
                : phase === "REFLECTION"
                ? "Tahap Refleksi"
                : `Langkah ${currentIdx + 1} / ${steps.length}`}
            </span>
          </div>
        </div>

        {/* Konteks Skenario */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
          <strong className="text-[#0f294a]">Konteks Situasi:</strong> {simulation.scenarioContext}
        </div>

        {/* Progress Bar */}
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kemajuan langkah simulasi"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#0f766e] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Riwayat Dialog Langkah Sebelumnya */}
      {history.length > 0 && phase !== "RESULT" && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Riwayat Percakapan Sebelumnya
          </h2>
          <div className="space-y-3">
            {history.map((turn, idx) => (
              <div key={turn.step.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                <p className="font-bold text-slate-500">Langkah {idx + 1}</p>
                <p className="text-slate-700">
                  <strong>{simulation.customerName}:</strong> {turn.step.customerDialog}
                </p>
                <p className="rounded-lg bg-blue-50 p-2.5 text-[#0f294a]">
                  <strong>Tindakanmu ({turn.option.rating} • +{turn.option.score} poin):</strong>{" "}
                  {turn.option.text}
                </p>
                {turn.customResponse && (
                  <p className="rounded-lg bg-teal-50 p-2.5 text-teal-900">
                    <strong>Kalimat Versimu:</strong> {turn.customResponse}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FASE 1: PLAYING STEP */}
      {phase === "PLAYING" && currentStep && (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
              Situasi Langkah {currentIdx + 1} dari {steps.length}
            </p>
            <h2
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mt-1.5 text-lg font-extrabold text-[#0f294a] focus:outline-none [text-wrap:balance]"
            >
              {currentStep.situation}
            </h2>
          </div>

          {/* Balon Dialog Tamu Kantor */}
          <div className="rounded-2xl rounded-tl-sm border border-blue-100 bg-gradient-to-br from-slate-900 to-[#0f294a] p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
              <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
              <span>{simulation.customerName} berkata:</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-100 sm:text-base">
              &ldquo;{currentStep.customerDialog}&rdquo;
            </p>
          </div>

          {/* Pertanyaan & Pilihan Tindakan */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-900">{currentStep.prompt}</p>

            <div className="space-y-2.5">
              {currentStep.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isChosen = selectedOption?.id === opt.id;
                const isLocked = Boolean(selectedOption);

                let cardStyle =
                  "border-slate-200 bg-white text-slate-800 hover:border-[#1d4ed8] hover:bg-blue-50/40";
                if (isChosen) {
                  cardStyle =
                    opt.rating === "Sangat Tepat"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200"
                      : opt.rating === "Cukup"
                      ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-200"
                      : "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-200";
                } else if (isLocked) {
                  cardStyle = "border-slate-200 bg-slate-50/70 text-slate-400";
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isLocked && !isChosen}
                    aria-pressed={isChosen}
                    onClick={() => handleSelectOption(opt)}
                    className={`flex min-h-[52px] w-full items-start gap-3.5 rounded-2xl border p-4 text-left text-sm transition ${cardStyle}`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                        isChosen
                          ? "bg-[#0f294a] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Umpan Balik Instan + Kolom Kalimat Respons Versi Siswa */}
          {selectedOption && (
            <div className="space-y-4 pt-2">
              {(() => {
                const st = getRatingStyles(selectedOption.rating);
                const RatingIcon = st.Icon;
                return (
                  <div className={`rounded-2xl border p-5 ${st.box}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <RatingIcon className={`h-5 w-5 ${st.iconColor}`} aria-hidden="true" />
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.badge}`}>
                          {selectedOption.rating}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold">+{selectedOption.score} poin</span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed">
                      <strong>Umpan Balik Sistem:</strong> {selectedOption.feedback}
                    </p>
                  </div>
                );
              })()}

              {/* Kolom Respons Opsional Versi Siswa */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <label
                  htmlFor="custom-response"
                  className="block text-xs font-bold text-slate-700"
                >
                  Latih Kalimat Respons Versimu Sendiri (Opsional)
                </label>
                <span id="custom-response-hint" className="mt-0.5 block text-[11px] text-slate-500">
                  Kamu boleh menuliskan redaksi kalimat pelayananmu sendiri untuk langkah ini agar bisa ditinjau guru.
                </span>
                <textarea
                  id="custom-response"
                  rows={2}
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  aria-describedby="custom-response-hint"
                  placeholder="Contoh: Selamat pagi Bapak, izinkan saya membantu..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#163a66]"
                >
                  <span>
                    {currentIdx + 1 < steps.length
                      ? "Lanjut ke Langkah Berikutnya"
                      : "Lanjut ke Refleksi & Simpan Hasil"}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* FASE 2: REFLECTION & SUBMIT */}
      {phase === "REFLECTION" && (
        <form
          onSubmit={handleSaveAttempt}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0f766e]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Seluruh Langkah Dialog Selesai</span>
            </span>
            <h2 className="mt-3 text-xl font-extrabold text-[#0f294a]">
              Refleksi Singkat &amp; Simpan Hasil Simulasi
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Skor sementara kamu: <strong>{runningScore} / {maxScore}</strong> (
              {Math.round((runningScore / Math.max(1, maxScore)) * 100)}%). Tuliskan refleksi
              singkat sebelum menyimpan hasil ke riwayat belajarmu.
            </p>
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

          <div>
            <label htmlFor="sim-reflection" className="block text-sm font-semibold text-slate-700">
              Refleksi Praktik Pelayanan (Opsional, dianjurkan)
            </label>
            <span id="reflection-hint" className="mt-0.5 block text-xs text-slate-500">
              Apa sikap, kalimat, atau prosedur terpenting yang kamu pelajari dari skenario ini?
            </span>
            <textarea
              id="sim-reflection"
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              aria-describedby="reflection-hint"
              placeholder="Contoh: Saya belajar pentingnya mendengarkan keluhan tanpa memotong pembicaraan dan segera memberi kepastian waktu penyelesaian..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Ulangi dari Awal</span>
            </button>

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
                  ? "Menyimpan..."
                  : `Simpan Hasil Simulasi${userRole === "STUDENT" ? " & Klaim XP" : ""}`}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* FASE 3: RESULT SUMMARY */}
      {phase === "RESULT" && savedResult && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-r from-[#0f294a] to-[#0f766e] p-6 text-white sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-200">
                Hasil Evaluasi Simulasi
              </p>
              <h2
                ref={resultHeadingRef}
                tabIndex={-1}
                className="mt-1.5 text-2xl font-extrabold focus:outline-none"
              >
                {predicate.label}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-blue-100">{predicate.summary}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/15 px-6 py-4 text-center backdrop-blur-xs">
              <p className="text-xs font-semibold text-blue-100">Skor Akhir</p>
              <p className="mt-0.5 text-4xl font-extrabold text-teal-300">
                {savedResult.percent}%
              </p>
              <p className="text-xs text-blue-100">
                {savedResult.score} / {savedResult.maxScore} poin
              </p>
            </div>
          </div>

          {/* Reward XP & Badges */}
          {(savedResult.pointsAwarded > 0 || savedResult.unlockedBadges.length > 0) && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <Award className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="space-y-0.5">
                {savedResult.pointsAwarded > 0 && (
                  <p className="font-bold">
                    +{savedResult.pointsAwarded} XP ditambahkan ke profil belajarmu!
                  </p>
                )}
                {savedResult.unlockedBadges.map((b) => (
                  <p key={b} className="text-xs font-semibold text-amber-900">
                    Lencana baru terbuka: <strong>{b}</strong>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Rekap Langkah & Umpan Balik */}
          <div>
            <h3 className="text-base font-extrabold text-[#0f294a]">
              Rekap Pilihan &amp; Umpan Balik Tiap Langkah
            </h3>
            <ol className="mt-3 space-y-3">
              {history.map((turn, i) => {
                const st = getRatingStyles(turn.option.rating);
                return (
                  <li
                    key={turn.step.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#0f294a]">Langkah {i + 1}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.badge}`}>
                        {turn.option.rating} (+{turn.option.score} poin)
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      <strong>Tamu:</strong> &ldquo;{turn.step.customerDialog}&rdquo;
                    </p>
                    <p className="mt-1.5 text-xs text-slate-900">
                      <strong>Pilihanmu:</strong> {turn.option.text}
                    </p>
                    <p className="mt-2 rounded-lg bg-white p-2.5 text-xs text-slate-700 ring-1 ring-slate-200/80">
                      <strong>Pembahasan:</strong> {turn.option.feedback}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Ulangi Simulasi Ini</span>
            </button>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/simulasi"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>Daftar 5 Simulasi</span>
              </Link>
              {nextSimulation && (
                <Link
                  href={`/simulasi/${nextSimulation.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#163a66]"
                >
                  <span>Lanjut ke Simulasi {nextSimulation.order}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
