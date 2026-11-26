"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, BookMarked, CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";

interface MaterialStudyActionsProps {
  materialId: string;
  initialStatus: string;
  initialNotes: string;
  activityPrompt: string | null;
  userRole: string;
}

export function MaterialStudyActions({
  materialId,
  initialStatus,
  initialNotes,
  activityPrompt,
  userRole,
}: MaterialStudyActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
    badge?: string | null;
  } | null>(null);

  async function saveProgress(nextStatus?: "IN_PROGRESS" | "COMPLETED") {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus ?? (status === "NOT_STARTED" ? "IN_PROGRESS" : status),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal menyimpan progres." });
      } else {
        setStatus(data.progress.status);
        setFeedback({
          type: "ok",
          text: data.message,
          badge: data.newBadgeName,
        });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "err", text: "Koneksi ke server terganggu." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl bg-teal-50 p-2 text-[#0f766e]">
            <BookMarked className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-[#0f294a]">
              Aktivitas &amp; Catatan Belajar Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Tuliskan rangkuman atau jawaban aktivitasmu — otomatis tersimpan di akunmu.
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-800"
              : status === "IN_PROGRESS"
              ? "bg-blue-100 text-[#1d4ed8]"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Status:{" "}
          {status === "COMPLETED"
            ? "Selesai Dipelajari"
            : status === "IN_PROGRESS"
            ? "Sedang Dipelajari"
            : "Belum Mulai"}
        </span>
      </div>

      {activityPrompt && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-950">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">
            Panduan Aktivitas Mandiri
          </p>
          <p className="mt-1 leading-relaxed">{activityPrompt}</p>
        </div>
      )}

      <div>
        <label htmlFor="student-notes" className="block text-sm font-semibold text-slate-700">
          Catatan / Rangkuman Belajarmu
        </label>
        <textarea
          id="student-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catat poin penting dari materi ini atau tuliskan hasil rangkumanmu di sini..."
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
        />
      </div>

      {feedback && (
        <div
          role={feedback.type === "err" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">{feedback.text}</p>
          {feedback.badge && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Award className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span>Lencana baru terbuka: {feedback.badge}!</span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => saveProgress(status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Simpan Catatan</span>
        </button>

        {status !== "COMPLETED" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProgress("COMPLETED")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d625c] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              Tandai Materi Selesai{userRole === "STUDENT" ? " (+30 XP)" : ""}
            </span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-800">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Materi Sudah Tuntas</span>
          </span>
        )}
      </div>
    </section>
  );
}
