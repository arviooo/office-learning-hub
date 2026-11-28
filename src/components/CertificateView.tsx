"use client";

import { CheckCircle2, Lock, Printer } from "lucide-react";

interface CertificateViewProps {
  eligible: boolean;
  isPreviewRole: boolean;
  studentName: string;
  className: string;
  teacherName: string;
  teacherIdentityNo?: string | null;
  certificateNumber: string;
  issuedDate: string;
  averageScore: number;
  completedMaterials: number;
  totalMaterials: number;
  completedSimulations: number;
  totalSimulations: number;
}

export function CertificateView({
  eligible,
  isPreviewRole,
  studentName,
  className,
  teacherName,
  teacherIdentityNo,
  certificateNumber,
  issuedDate,
  averageScore,
  completedMaterials,
  totalMaterials,
  completedSimulations,
  totalSimulations,
}: CertificateViewProps) {
  const canPrint = eligible || isPreviewRole;

  return (
    <div className="space-y-6">
      {/* Status Kelayakan & Tombol Cetak (Disembunyikan saat Print) */}
      <div className="no-print flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {canPrint ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-extrabold text-[#0f294a]">
              {eligible
                ? "Selamat! Sertifikat Kompetensimu Sudah Terbuka"
                : isPreviewRole
                ? "Mode Pratinjau Sertifikat (Guru / Admin)"
                : "Selesaikan Syarat Berikut untuk Membuka Sertifikat Resmi"}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {isPreviewRole ? (
                <>
                  Menampilkan contoh nama siswa dengan tanda tangan otomatis atas nama{" "}
                  <strong>{teacherName}</strong>.
                </>
              ) : (
                <>
                  Materi selesai: <strong>{completedMaterials}/{totalMaterials}</strong> • Simulasi
                  selesai: <strong>{completedSimulations}/{totalSimulations}</strong>
                  {!canPrint && " — Tuntaskan seluruh materi & simulasi terlebih dahulu."}
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canPrint}
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#163a66] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* Piagam Sertifikat */}
      <div
        className={`certificate-sheet relative overflow-hidden rounded-3xl border-[10px] border-double border-[#0f294a] bg-white p-8 shadow-xl sm:p-12 ${
          !canPrint ? "opacity-75 grayscale-[30%]" : ""
        }`}
      >
        <div
          className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-bl-full bg-gradient-to-bl from-teal-100/70 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-tr-full bg-gradient-to-tr from-blue-100/70 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 text-center">
          <img
            src="/logo.png"
            alt="Logo Office Learning Hub"
            className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-md ring-2 ring-blue-100"
          />

          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.25em] text-[#0f766e]">
            OFFICE LEARNING HUB • SMK PROGRAM KEAHLIAN MPLB
          </p>

          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0f294a] sm:text-4xl">
            SERTIFIKAT KOMPETENSI
          </h2>

          <p className="mt-1 font-mono text-xs text-slate-500">No. {certificateNumber}</p>

          <p className="mt-6 text-sm text-slate-600">Diberikan dengan bangga kepada:</p>

          <p className="mt-2 text-2xl font-extrabold text-[#0f294a] underline decoration-amber-400 decoration-4 underline-offset-8 sm:text-3xl">
            {studentName}
          </p>

          <p className="mt-3 text-sm font-semibold text-slate-600">Kelas {className}</p>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-700">
            Atas keberhasilannya menyelesaikan seluruh rangkaian pembelajaran ({totalMaterials} Materi
            Inti), kuis evaluasi, dan{" "}
            <strong>{totalSimulations} Skenario Simulasi Pelayanan Digital</strong> pada mata
            pelajaran <strong>Pelayanan Tamu</strong> dengan penuh dedikasi dan standar profesional
            perkantoran.
          </p>

          <div className="mt-10 grid gap-8 border-t border-slate-200 pt-8 text-xs sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Tanggal Terbit</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{issuedDate}</p>
              <p className="mt-6 font-semibold text-slate-500">
                Terverifikasi Digital oleh Office Learning Hub
              </p>
            </div>
            <div>
              <p className="text-slate-500">Guru Pengampu Pelayanan Tamu</p>
              <p className="mt-10 text-sm font-extrabold text-[#0f294a] underline underline-offset-4">
                {teacherName}
              </p>
              {teacherIdentityNo && (
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  NIP. {teacherIdentityNo}
                </p>
              )}
              <p className="mt-0.5 text-slate-500">
                Program Keahlian Manajemen Perkantoran &amp; Layanan Bisnis
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
