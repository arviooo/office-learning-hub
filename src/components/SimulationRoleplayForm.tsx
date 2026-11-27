"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  Send,
  Upload,
  UserRound,
} from "lucide-react";
import { uploadPdfClient } from "@/lib/uploadPdf";

interface SimulationRoleplayFormProps {
  simulation: {
    id: string;
    order: number;
    slug: string;
    title: string;
    subtitle: string;
    scenarioContext: string;
    instructions: string | null;
    imageUrl: string | null;
    imageName: string | null;
    pdfUrl: string | null;
    pdfName: string | null;
    customerName: string;
    customerRole: string;
    difficulty: string;
  };
  initialAttempt: {
    fileUrl: string | null;
    fileName: string | null;
    reflection: string | null;
    status: string;
    teacherFeedback: string | null;
    completedAtLabel: string;
  } | null;
  nextSimulation: { slug: string; order: number; title: string } | null;
}

export function SimulationRoleplayForm({
  simulation,
  initialAttempt,
  nextSimulation,
}: SimulationRoleplayFormProps) {
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState(initialAttempt?.fileUrl || "");
  const [fileName, setFileName] = useState(initialAttempt?.fileName || "");
  const [reflection, setReflection] = useState(initialAttempt?.reflection || "");
  const [status, setStatus] = useState<string | null>(initialAttempt?.status || null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadPercent(0);
    setFeedback(null);
    try {
      const up = await uploadPdfClient(file, "simulasi-dialog", (pct) => setUploadPercent(pct));
      setFileUrl(up.fileUrl);
      setFileName(up.fileName);
      setFeedback({
        type: "ok",
        text: `File PDF "${up.fileName}" siap dikirim. Klik tombol Kumpulkan PDF Dialog di bawah.`,
      });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal mengunggah file PDF.",
      });
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileUrl) {
      setFeedback({
        type: "err",
        text: "Silakan unggah file PDF naskah dialog roleplay terlebih dahulu.",
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/simulations/${simulation.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl,
          fileName: fileName || "dialog-roleplay.pdf",
          reflection: reflection.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal mengumpulkan tugas simulasi." });
      } else {
        setStatus(data.attempt?.status || "SUBMITTED");
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
    <div className="space-y-6">
      {/* Lembar Soal Skenario Roleplay (Bisa Diunduh / Cetak PDF) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0f766e]">
              Lembar Soal Tugas Roleplay • Skenario {simulation.order}
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-[#0f294a]">{simulation.title}</h2>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-[#0f294a]" aria-hidden="true" />
              <span>Unduh / Cetak Soal (PDF)</span>
            </button>
            {simulation.pdfUrl && (
              <a
                href={simulation.pdfUrl}
                download={simulation.pdfName || `${simulation.slug}-soal.pdf`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unduh PDF Soal Guru</span>
              </a>
            )}
          </div>
        </div>

        {/* Gambar Ilustrasi Skenario (jika diunggah guru) */}
        {simulation.imageUrl && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={simulation.imageUrl}
              alt={`Ilustrasi ${simulation.title}`}
              className="max-h-[380px] w-full object-contain bg-slate-50"
            />
          </div>
        )}

        {/* Profil Tamu */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0f294a]">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Tokoh Tamu / Lawan Bicara</p>
            <p className="text-sm font-extrabold text-slate-900">
              {simulation.customerName}{" "}
              <span className="font-medium text-slate-600">({simulation.customerRole})</span>
            </p>
          </div>
        </div>

        {/* Teks Soal / Situasi Skenario */}
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/75 p-4 text-sm text-slate-800">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              Teks Soal &amp; Situasi Skenario
            </p>
            <p className="mt-1.5 whitespace-pre-line leading-relaxed [text-wrap:pretty]">
              {simulation.scenarioContext}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#1d4ed8]">
              Instruksi Tugas Roleplay (Hasil Dialog dalam PDF)
            </p>
            <p className="mt-1.5 whitespace-pre-line leading-relaxed">
              {simulation.instructions ||
                "Unduh atau cetak soal skenario di atas, kemudian susun naskah dialog roleplay lengkap (mulai dari salam pembuka, penanganan inti sesuai prosedur Pelayanan Tamu, hingga penutup). Simpan naskah dialogmu dalam format PDF (.pdf) lalu unggah pada formulir pengumpulan di bawah ini."}
            </p>
          </div>
        </div>

        {/* Pratinjau PDF Soal dari Guru (jika ada) */}
        {simulation.pdfUrl && (
          <div className="no-print mt-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4 text-rose-600" aria-hidden="true" />
                <span>Lampiran PDF Soal: {simulation.pdfName || "Soal-Simulasi.pdf"}</span>
              </p>
              <a
                href={simulation.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1d4ed8] hover:underline"
              >
                <span>Buka di Tab Baru</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <iframe
                src={simulation.pdfUrl}
                title={`PDF Soal ${simulation.title}`}
                className="h-[460px] w-full"
              />
            </div>
          </div>
        )}
      </section>

      {/* Catatan Guru (tanpa angka nilai di sisi siswa) */}
      {initialAttempt?.status === "GRADED" && (
        <section className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <h2 className="text-base font-extrabold">Tugas Dialog Sudah Diperiksa Guru</h2>
            </div>
            <span className="rounded-xl bg-emerald-600 px-3.5 py-1 text-xs font-extrabold text-white">
              Tercatat di Rekap Guru
            </span>
          </div>
          {initialAttempt.teacherFeedback && (
            <p className="mt-2.5 text-sm leading-relaxed text-emerald-950">
              <strong>Catatan Guru:</strong> {initialAttempt.teacherFeedback}
            </p>
          )}
        </section>
      )}

      {/* Formulir Upload Hasil Dialog Roleplay (PDF) */}
      <form
        onSubmit={handleSubmit}
        className="no-print space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#0f294a]">
              Pengumpulan Hasil Dialog Roleplay (PDF)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Buat dialog roleplay sesuai skenario lalu kirimkan dokumen PDF-nya di sini.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status === "GRADED"
                ? "bg-emerald-100 text-emerald-800"
                : status
                  ? "bg-blue-100 text-[#1d4ed8]"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {status === "GRADED"
              ? "Sudah Diperiksa"
              : status
                ? "Terkirim (Menunggu Pemeriksaan)"
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <label htmlFor="sim-dialog-pdf" className="block text-sm font-bold text-slate-800">
            Unggah File PDF Naskah Dialog Roleplay (Wajib)
          </label>
          <span id="sim-dialog-pdf-hint" className="mt-0.5 block text-xs text-slate-500">
            Format khusus PDF (.pdf), ukuran maksimal 15 MB.
          </span>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              htmlFor="sim-dialog-pdf"
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
                    ? "Ganti File PDF Dialog"
                    : "Pilih File PDF Dialog"}
              </span>
            </label>
            <input
              id="sim-dialog-pdf"
              type="file"
              accept=".pdf,application/pdf"
              aria-describedby="sim-dialog-pdf-hint"
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
                <span>{fileName || "Lihat PDF Dialog Terunggah"}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="sim-reflection" className="block text-sm font-bold text-slate-800">
            Catatan / Nama Pasangan Roleplay (Opsional)
          </label>
          <textarea
            id="sim-reflection"
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Contoh: Peran Resepsionis: Nadia, Peran Tamu: Dimas. Catatan singkat pelaksanaan roleplay..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {nextSimulation ? (
            <Link
              href={`/simulasi/${nextSimulation.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0f294a]"
            >
              <span>Lanjut ke Skenario {nextSimulation.order}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={submitting || uploading || !fileUrl}
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
                : status
                  ? "Perbarui PDF Dialog"
                  : "Kumpulkan PDF Dialog (+40 XP)"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
