"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPdfClient } from "@/lib/uploadPdf";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Send,
  Upload,
} from "lucide-react";

interface AssignmentSubmissionFormProps {
  assignmentId: string;
  type: "LKPD" | "PROJECT";
  questions: string[];
  initialSubmission: {
    answers: string[];
    fileUrl: string | null;
    fileName: string | null;
    videoLink: string | null;
    notes: string | null;
    status: string;
    score: number | null;
    teacherFeedback: string | null;
  } | null;
}

export function AssignmentSubmissionForm({
  assignmentId,
  type,
  questions,
  initialSubmission,
}: AssignmentSubmissionFormProps) {
  const router = useRouter();

  const [answers, setAnswers] = useState<string[]>(() =>
    questions.map((_, i) => initialSubmission?.answers[i] || "")
  );
  const [fileUrl, setFileUrl] = useState<string>(initialSubmission?.fileUrl || "");
  const [fileName, setFileName] = useState<string>(initialSubmission?.fileName || "");
  const [videoLink, setVideoLink] = useState<string>(initialSubmission?.videoLink || "");
  const [notes, setNotes] = useState<string>(initialSubmission?.notes || "");

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(
    initialSubmission?.status || null
  );
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadPercent(0);
    setFeedback(null);
    try {
      const data = await uploadPdfClient(
        file,
        type === "PROJECT" ? "projects" : "lkpd",
        (pct) => setUploadPercent(pct)
      );
      setFileUrl(data.fileUrl);
      setFileName(data.fileName);
      setFeedback({ type: "ok", text: `Dokumen "${data.fileName}" berhasil diunggah.` });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal mengunggah file ke server.",
      });
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.length > 0 ? answers : undefined,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          videoLink: videoLink.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal mengirim tugas." });
      } else {
        setSubmissionStatus((prev) => (prev === "GRADED" ? "GRADED" : "SUBMITTED"));
        setFeedback({ type: "ok", text: data.message });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "err", text: "Koneksi ke server terganggu." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Status Penilaian Guru (jika sudah dinilai) */}
      {initialSubmission?.status === "GRADED" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <h2 className="text-base font-extrabold">Sudah Dinilai oleh Guru</h2>
            </div>
            <span className="rounded-xl bg-emerald-600 px-3.5 py-1 text-sm font-extrabold text-white">
              Nilai: {initialSubmission.score ?? 0} / 100
            </span>
          </div>
          {initialSubmission.teacherFeedback && (
            <p className="mt-2.5 text-sm leading-relaxed text-emerald-950">
              <strong>Catatan Guru:</strong> {initialSubmission.teacherFeedback}
            </p>
          )}
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <h2 className="text-base font-extrabold text-[#0f294a]">
            {type === "LKPD" ? "Lembar Jawaban Analisis LKPD" : "Formulir Pengumpulan Proyek"}
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              submissionStatus === "GRADED"
                ? "bg-emerald-100 text-emerald-800"
                : submissionStatus
                ? "bg-blue-100 text-[#1d4ed8]"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {submissionStatus === "GRADED"
              ? "Sudah Dinilai"
              : submissionStatus
              ? "Terkirim (Menunggu Penilaian)"
              : "Belum Dikumpulkan"}
          </span>
        </div>

        {feedback && (
          <div
            role={feedback.type === "err" ? "alert" : "status"}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Pertanyaan Analisis LKPD */}
        {questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx}>
                <label
                  htmlFor={`lkpd-q-${idx}`}
                  className="block text-sm font-bold text-slate-800"
                >
                  {idx + 1}. {q}
                </label>
                <textarea
                  id={`lkpd-q-${idx}`}
                  rows={3}
                  required={type === "LKPD"}
                  value={answers[idx] || ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[idx] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Tuliskan jawaban analisismu secara runtut dan jelas..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Unggah Dokumen PDF */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <label htmlFor="pdf-upload" className="block text-sm font-bold text-slate-800">
            Unggah Dokumen PDF {type === "LKPD" ? "(Opsional jika melampirkan berkas)" : "(SOP / Panduan / Laporan PDF)"}
          </label>
          <span id="pdf-upload-hint" className="mt-0.5 block text-xs text-slate-500">
            Format khusus PDF (.pdf), ukuran maksimal 15 MB.
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              htmlFor="pdf-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
              )}
              <span>
                {uploading
                  ? `Mengunggah... ${uploadPercent > 0 ? `${uploadPercent}%` : ""}`
                  : fileUrl
                    ? "Ganti File PDF"
                    : "Pilih File PDF"}
              </span>
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf,application/pdf"
              aria-describedby="pdf-upload-hint"
              onChange={handleFileUpload}
              className="visually-hidden"
            />

            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-[#1d4ed8] hover:underline"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>{fileName || "Lihat PDF Terunggah"}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {/* Tautan Video / Drive (terutama untuk Proyek Video Roleplay) */}
        {type === "PROJECT" && (
          <div>
            <label htmlFor="video-link" className="block text-sm font-bold text-slate-800">
              Tautan Video Roleplay / Google Drive / YouTube (Opsional)
            </label>
            <span id="video-link-hint" className="mt-0.5 block text-xs text-slate-500">
              Tempel tautan lengkap diawali https:// (misal link YouTube Unlisted atau Google Drive).
            </span>
            <div className="relative mt-1.5">
              <Link2
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="video-link"
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                aria-describedby="video-link-hint"
                placeholder="https://youtu.be/... atau https://drive.google.com/..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-[#1d4ed8] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Catatan Siswa */}
        <div>
          <label htmlFor="submission-notes" className="block text-sm font-bold text-slate-800">
            {type === "PROJECT" ? "Deskripsi / Ringkasan Hasil Proyek" : "Catatan Tambahan untuk Guru (Opsional)"}
          </label>
          <textarea
            id="submission-notes"
            rows={3}
            required={type === "PROJECT" && !fileUrl && !videoLink}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              type === "PROJECT"
                ? "Jelaskan peran anggota kelompok, skenario yang dipilih, atau ringkasan SOP/panduan yang kamu buat..."
                : "Tuliskan catatan singkat bila diperlukan..."
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#163a66] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {submitting
                ? "Mengirim..."
                : initialSubmission
                ? "Perbarui Pengumpulan"
                : type === "PROJECT"
                ? "Kumpulkan Proyek (+50 XP)"
                : "Kirim Jawaban LKPD (+35 XP)"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
