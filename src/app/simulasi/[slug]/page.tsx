import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Download, ExternalLink, FileText, MonitorPlay } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { SimulationRoleplayForm } from "@/components/SimulationRoleplayForm";
import { formatIndoDate } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?role=student");
  }

  const { slug } = await params;
  const simulation = await prisma.simulation.findUnique({ where: { slug } });
  if (!simulation) notFound();

  const [totalSimulations, latestAttempt, nextSimulation] = await Promise.all([
    prisma.simulation.count({ where: { isPublished: true } }),
    prisma.simulationAttempt.findFirst({
      where: { userId: user.id, simulationId: simulation.id },
      orderBy: { completedAt: "desc" },
    }),
    prisma.simulation.findFirst({
      where: { isPublished: true, order: { gt: simulation.order } },
      orderBy: { order: "asc" },
      select: { slug: true, order: true, title: true },
    }),
  ]);

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/simulasi"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0f294a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Daftar Simulasi</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              ~{simulation.estimatedMinutes} menit • Tingkat {simulation.difficulty}
            </span>
          </span>
        </div>

        {/* Judul Skenario */}
        <header className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0f766e]">
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Tugas Roleplay PDF • Skenario {simulation.order} dari {totalSimulations}
            </span>
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {simulation.title}
          </h1>
          <p className="text-sm text-slate-600">{simulation.subtitle}</p>
        </header>

        {user.role === "STUDENT" ? (
          <SimulationRoleplayForm
            simulation={{
              id: simulation.id,
              order: simulation.order,
              slug: simulation.slug,
              title: simulation.title,
              subtitle: simulation.subtitle,
              scenarioContext: simulation.scenarioContext,
              instructions: simulation.instructions,
              imageUrl: simulation.imageUrl,
              imageName: simulation.imageName,
              pdfUrl: simulation.pdfUrl,
              pdfName: simulation.pdfName,
              customerName: simulation.customerName,
              customerRole: simulation.customerRole,
              difficulty: simulation.difficulty,
            }}
            initialAttempt={
              latestAttempt
                ? {
                    fileUrl: latestAttempt.fileUrl,
                    fileName: latestAttempt.fileName,
                    reflection: latestAttempt.reflection,
                    status: latestAttempt.status,
                    teacherFeedback: latestAttempt.teacherFeedback,
                    completedAtLabel: formatIndoDate(latestAttempt.completedAt),
                  }
                : null
            }
            nextSimulation={nextSimulation}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
              <div>
                <p className="text-sm font-extrabold text-[#0f294a]">
                  Mode Pratinjau Skenario Roleplay ({user.role === "ADMIN" ? "Admin" : "Guru"})
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Kelola gambar ilustrasi, file PDF soal, dan nilai hasil dialog siswa melalui Panel
                  Guru.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/guru?tab=simulations"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#163a66]"
                >
                  <span>Edit Skenario, Gambar &amp; PDF</span>
                </Link>
                <Link
                  href="/guru?tab=grading"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0d625c]"
                >
                  <span>Nilai PDF Dialog Siswa</span>
                </Link>
              </div>
            </div>

            {simulation.imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                <img
                  src={simulation.imageUrl}
                  alt={`Ilustrasi ${simulation.title}`}
                  className="max-h-[380px] w-full rounded-xl object-contain bg-slate-50"
                />
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm">
              <p className="font-bold text-[#0f294a]">
                Tamu: {simulation.customerName} ({simulation.customerRole})
              </p>
              <p className="whitespace-pre-line leading-relaxed text-slate-700">
                {simulation.scenarioContext}
              </p>
              {simulation.instructions && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-slate-700">
                  <strong className="text-[#1d4ed8]">Instruksi Roleplay:</strong>{" "}
                  {simulation.instructions}
                </div>
              )}
            </div>

            {simulation.pdfUrl && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0f294a]">
                    <FileText className="h-4 w-4 text-rose-600" aria-hidden="true" />
                    <span>PDF Soal: {simulation.pdfName || "Soal-Simulasi.pdf"}</span>
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={simulation.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Buka PDF</span>
                    </a>
                    <a
                      href={simulation.pdfUrl}
                      download={simulation.pdfName || `${simulation.slug}.pdf`}
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Unduh PDF</span>
                    </a>
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <iframe
                    src={simulation.pdfUrl}
                    title={`PDF Soal ${simulation.title}`}
                    className="h-[460px] w-full"
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
