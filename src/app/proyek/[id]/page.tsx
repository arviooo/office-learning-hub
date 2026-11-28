import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { AssignmentSubmissionForm } from "@/components/AssignmentSubmissionForm";
import { formatIndoDate, parseStringArray } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const { id } = await params;
  const project = await prisma.assignment.findFirst({
    where: { id, type: "PROJECT" },
  });
  if (!project) notFound();

  const submission = await prisma.submission.findUnique({
    where: { userId_assignmentId: { userId: user.id, assignmentId: project.id } },
  });

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/proyek"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0f294a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Daftar Proyek</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tenggat: {formatIndoDate(project.dueDate)}</span>
          </span>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Proyek Praktik Pelayanan Tamu</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {project.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{project.description}</p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
              Panduan &amp; Kriteria Proyek
            </p>
            <p className="mt-1.5 leading-relaxed [text-wrap:pretty]">{project.instructions}</p>
          </div>
        </header>

        {project.pdfUrl && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-rose-50 p-2 text-rose-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#0f294a]">
                    Panduan / Template PDF dari Guru
                  </h2>
                  <p className="text-xs text-slate-500">
                    {project.pdfName || "Panduan Proyek (.pdf)"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={project.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Buka PDF</span>
                </a>
                <a
                  href={project.pdfUrl}
                  download={project.pdfName || "panduan-proyek.pdf"}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <iframe
                src={project.pdfUrl}
                title={`Pratinjau PDF ${project.title}`}
                className="h-[480px] w-full"
              />
            </div>
          </section>
        )}

        {user.role === "STUDENT" ? (
          <AssignmentSubmissionForm
            assignmentId={project.id}
            type="PROJECT"
            questions={[]}
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
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Mode Pratinjau Proyek ({user.role === "ADMIN" ? "Admin" : "Guru"})
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Akun Guru/Admin tidak mengumpulkan proyek. Kelola panduan PDF atau nilai hasil
                proyek siswa di Panel Guru.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/guru?tab=assignments"
                className="rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66]"
              >
                Edit Proyek &amp; PDF
              </Link>
              <Link
                href="/guru?tab=grading"
                className="rounded-xl bg-[#0f766e] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d625c]"
              >
                Nilai Proyek Siswa
              </Link>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
