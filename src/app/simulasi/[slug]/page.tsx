import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, History, MessageSquareText, MonitorPlay } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { SimulationPlayer } from "@/components/SimulationPlayer";
import { computeMaxScore, parseSimulationSteps } from "@/lib/simulation";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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

  const simulation = await prisma.simulation.findUnique({
    where: { slug },
  });

  if (!simulation) {
    notFound();
  }

  const [previousAttempts, nextSimulation] = await Promise.all([
    prisma.simulationAttempt.findMany({
      where: { userId: user.id, simulationId: simulation.id },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.simulation.findFirst({
      where: { isPublished: true, order: { gt: simulation.order } },
      orderBy: { order: "asc" },
      select: { slug: true, order: true, title: true },
    }),
  ]);

  const steps = parseSimulationSteps(simulation.stepsJson);
  const maxScore = computeMaxScore(steps);

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <span>Simulasi Pelayanan Digital • Skenario {simulation.order} dari 5</span>
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {simulation.title}
          </h1>
          <p className="text-sm text-slate-600">{simulation.subtitle}</p>
        </header>

        {/* Interactive Player (Siswa) atau Pratinjau Kunci Skenario (Guru/Admin) */}
        {user.role === "STUDENT" ? (
          <SimulationPlayer
            simulation={{
              id: simulation.id,
              order: simulation.order,
              slug: simulation.slug,
              title: simulation.title,
              subtitle: simulation.subtitle,
              scenarioContext: simulation.scenarioContext,
              customerName: simulation.customerName,
              customerRole: simulation.customerRole,
              difficulty: simulation.difficulty,
            }}
            steps={steps}
            maxScore={maxScore}
            nextSimulation={nextSimulation}
            userRole={user.role}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
              <div>
                <p className="text-sm font-extrabold text-[#0f294a]">
                  Mode Pratinjau Skenario ({user.role === "ADMIN" ? "Admin" : "Guru"})
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Anda melihat seluruh alur dialog, bobot poin, dan umpan balik sistem. Untuk
                  mengubah atau menambah skenario, buka Panel Guru.
                </p>
              </div>
              <Link
                href="/guru?tab=simulations"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#163a66]"
              >
                <span>Edit Skenario di Panel Guru</span>
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <p className="font-bold text-[#0f294a]">
                Tamu: {simulation.customerName} ({simulation.customerRole})
              </p>
              <p className="mt-1 text-slate-600">{simulation.scenarioContext}</p>
            </div>

            {steps.map((step, idx) => (
              <section key={step.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-xs font-bold uppercase text-[#1d4ed8]">Langkah {idx + 1}</p>
                <p className="text-sm font-bold text-slate-900">{step.situation}</p>
                <p className="rounded-xl bg-slate-900 p-3.5 text-xs text-slate-100">
                  <strong>{simulation.customerName}:</strong> &ldquo;{step.customerDialog}&rdquo;
                </p>
                <p className="text-xs font-semibold text-slate-700">Pertanyaan: {step.prompt}</p>
                <ul className="space-y-2">
                  {step.options.map((opt, oIdx) => (
                    <li key={opt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                        <span>
                          {String.fromCharCode(65 + oIdx)}. {opt.text}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[#0f294a]">
                          {opt.rating} (+{opt.score} poin)
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Umpan balik: {opt.feedback}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Riwayat Percobaan Sebelumnya */}
        {previousAttempts.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Riwayat Percobaanmu pada Skenario Ini
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {previousAttempts.map((att, idx) => {
                const pct = Math.round((att.score / Math.max(1, att.maxScore)) * 100);
                return (
                  <div
                    key={att.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">
                        Percobaan #{previousAttempts.length - idx} •{" "}
                        <span className="font-normal text-slate-500">
                          {formatDateTime(att.completedAt)}
                        </span>
                      </span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-extrabold text-[#0f294a]">
                        Skor {att.score}/{att.maxScore} ({pct}%)
                      </span>
                    </div>
                    {att.reflection && (
                      <p className="mt-2 text-slate-600">
                        <strong>Refleksimu:</strong> {att.reflection}
                      </p>
                    )}
                    {att.teacherFeedback && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-50 p-2.5 text-emerald-900">
                        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>
                          <strong>Umpan Balik Guru:</strong> {att.teacherFeedback}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
