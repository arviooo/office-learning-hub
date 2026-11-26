import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  UserRound,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { AssignmentSubmissionForm } from "@/components/AssignmentSubmissionForm";
import { formatIndoDate, parseStringArray } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function LkpdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const { id } = await params;
  const assignment = await prisma.assignment.findFirst({
    where: { id, type: "LKPD" },
  });
  if (!assignment) notFound();

  const submission = await prisma.submission.findUnique({
    where: { userId_assignmentId: { userId: user.id, assignmentId: assignment.id } },
  });

  const questions = parseStringArray(assignment.questionsJson);

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lkpd"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0f294a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Daftar LKPD</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tenggat: {formatIndoDate(assignment.dueDate)}</span>
          </span>
        </div>

        {/* Header LKPD + Identitas Siswa */}
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0f766e]">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lembar Kerja Peserta Didik (LKPD)</span>
          </span>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {assignment.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">{assignment.description}</p>

          {/* Identitas Peserta Didik */}
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
              <div>
                <p className="text-slate-400">Nama Peserta Didik</p>
                <p className="font-bold text-slate-900">{user.name}</p>
              </div>
            </div>
            <div>
              <p className="text-slate-400">Kelas</p>
              <p className="font-bold text-slate-900">{user.className || "XI MPLB 1"}</p>
            </div>
            <div>
              <p className="text-slate-400">NISN / Identitas</p>
              <p className="font-bold text-slate-900">{user.identityNo || "-"}</p>
            </div>
          </div>

          {/* Petunjuk & Ringkasan Kasus */}
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                Petunjuk Pengerjaan
              </p>
              <p className="mt-1 leading-relaxed">{assignment.instructions}</p>
            </div>

            {assignment.caseSummary && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Ringkasan Kasus Pelayanan
                </p>
                <p className="mt-1.5 leading-relaxed [text-wrap:pretty]">
                  {assignment.caseSummary}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Lampiran PDF LKPD dari Guru */}
        {assignment.pdfUrl && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-rose-50 p-2 text-rose-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#0f294a]">
                    Lembar Kerja PDF dari Guru
                  </h2>
                  <p className="text-xs text-slate-500">
                    {assignment.pdfName || "Dokumen LKPD (.pdf)"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={assignment.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Buka PDF</span>
                </a>
                <a
                  href={assignment.pdfUrl}
                  download={assignment.pdfName || "lkpd.pdf"}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <iframe
                src={assignment.pdfUrl}
                title={`Pratinjau PDF ${assignment.title}`}
                className="h-[480px] w-full"
              />
            </div>
          </section>
        )}

        {/* Form Pengumpulan LKPD (Khusus Siswa) atau Pratinjau Guru/Admin */}
        {user.role === "STUDENT" ? (
          <AssignmentSubmissionForm
            assignmentId={assignment.id}
            type="LKPD"
            questions={questions}
            initialSubmission={
              submission
                ? {
                    answers: parseStringArray(submission.answersJson),
                    fileUrl: submission.fileUrl,
                    fileName: submission.fileName,
                    videoLink: submission.videoLink,
                    notes: submission.notes,
                    status: submission.status,
                    score: submission.score,
                    teacherFeedback: submission.teacherFeedback,
                  }
                : null
            }
          />
        ) : (
          <section className="space-y-4 rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#0f294a]">
                  Mode Pratinjau LKPD ({user.role === "ADMIN" ? "Admin" : "Guru"})
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Akun Guru/Admin tidak mengumpulkan LKPD. Gunakan Panel Guru untuk mengedit
                  pertanyaan, mengunggah PDF LKPD, atau menilai jawaban siswa.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/guru?tab=assignments"
                  className="rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66]"
                >
                  Edit LKPD &amp; PDF
                </Link>
                <Link
                  href="/guru?tab=grading"
                  className="rounded-xl bg-[#0f766e] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d625c]"
                >
                  Nilai Jawaban Siswa
                </Link>
              </div>
            </div>
            {questions.length > 0 && (
              <div className="rounded-2xl bg-white p-4 text-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Daftar Pertanyaan Analisis:</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-slate-800">
                  {questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
