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
import { formatIndoDate, parseLkpdCases, parseStringArray } from "@/lib/assessment";

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

  const lkpdCases = parseLkpdCases(assignment.questionsJson, assignment.caseSummary);

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

          {/* Petunjuk Pengerjaan */}
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                Petunjuk Pengerjaan
              </p>
              <p className="mt-1 leading-relaxed">{assignment.instructions}</p>
            </div>
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
            cases={lkpdCases}
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
                  Akun Guru/Admin tidak mengumpulkan LKPD. Gunakan Panel Guru untuk mengedit kasus
                  &amp; pertanyaan, mengunggah PDF LKPD, atau menilai jawaban siswa.
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
            {lkpdCases.length > 0 && (
              <div className="space-y-4">
                {lkpdCases.map((c, cIdx) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-[#0f294a]">{c.title}</h3>
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                        {c.questions.length} Pertanyaan
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-2 whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-sm leading-relaxed text-slate-800">
                        {c.description}
                      </p>
                    )}
                    {c.questions.length > 0 && (
                      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-800">
                        {c.questions.map((q) => (
                          <li key={q.id}>{q.text}</li>
                        ))}
                      </ol>
                    )}
                    {c.questions.length === 0 && (
                      <p className="mt-2 text-xs italic text-slate-400">
                        Belum ada pertanyaan pada kasus #{cIdx + 1}.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
