import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import {
  flattenLkpdQuestions,
  formatIndoDate,
  parseLkpdCases,
  parseQuizQuestions,
  parseStringArray,
} from "@/lib/assessment";
import { parseSimulationSteps } from "@/lib/simulation";
import { TeacherWorkspace } from "@/components/TeacherWorkspace";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=teacher");
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/dashboard");

  const { tab } = await searchParams;

  const [students, materials, simulations, assignments, quizzes, submissions, simAttempts] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        include: {
          materialProgress: { where: { status: "COMPLETED" }, select: { id: true } },
          simulationAttempts: { select: { simulationId: true } },
          quizAttempts: { select: { score: true } },
          submissions: { select: { id: true } },
        },
        orderBy: { points: "desc" },
      }),
      prisma.material.findMany({ orderBy: { order: "asc" } }),
      prisma.simulation.findMany({
        include: { _count: { select: { attempts: true } } },
        orderBy: { order: "asc" },
      }),
      prisma.assignment.findMany({
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.quiz.findMany({
        include: { _count: { select: { attempts: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.submission.findMany({
        include: {
          user: { select: { name: true, className: true } },
          assignment: { select: { title: true, type: true, questionsJson: true, caseSummary: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.simulationAttempt.findMany({
        include: {
          user: { select: { name: true, className: true } },
          simulation: { select: { title: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 50,
      }),
    ]);

  const studentRows = students.map((s) => {
    const distinctSims = new Set(s.simulationAttempts.map((a) => a.simulationId)).size;
    const avgQuiz =
      s.quizAttempts.length > 0
        ? Math.round(s.quizAttempts.reduce((acc, q) => acc + q.score, 0) / s.quizAttempts.length)
        : null;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      className: s.className,
      points: s.points,
      materialsDone: s.materialProgress.length,
      totalMaterials: materials.length,
      simulationsDone: distinctSims,
      totalSimulations: simulations.length,
      avgQuiz,
      submissionsCount: s.submissions.length,
    };
  });

  const pendingGradingCount =
    submissions.filter((s) => s.status !== "GRADED").length +
    simAttempts.filter((sa) => sa.status !== "GRADED").length;

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        {/* Banner Sapaan Guru yang Cerah, Hangat & Ramah Orang Awam */}
        <section className="rounded-[28px] border border-sky-100 bg-gradient-to-br from-[#e5f5ff] via-white to-[#fff4ec] p-6 shadow-xs sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200/80">
                Ruang Kerja Guru • SMK MPLB
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Selamat Datang, {user.name} 👋
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                Pilih menu cepat di bawah ini untuk mengunggah PDF materi &amp; LKPD, mengedit
                simulasi/kuis, atau menilai hasil kerja siswa dengan mudah.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Siswa", value: students.length, bg: "bg-sky-50 text-sky-800 ring-sky-200/70" },
                { label: "Materi", value: materials.length, bg: "bg-emerald-50 text-emerald-800 ring-emerald-200/70" },
                { label: "Simulasi", value: simulations.length, bg: "bg-violet-50 text-violet-800 ring-violet-200/70" },
                { label: "Perlu Dinilai", value: pendingGradingCount, bg: "bg-orange-50 text-orange-800 ring-orange-200/70" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl px-4 py-3 text-center ring-1 ${stat.bg}`}
                >
                  <p className="text-[11px] font-semibold opacity-80">{stat.label}</p>
                  <p className="mt-0.5 text-xl font-extrabold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TeacherWorkspace
          initialTab={tab}
          students={studentRows}
          materials={materials.map((m) => ({
            id: m.id,
            order: m.order,
            slug: m.slug,
            title: m.title,
            subtitle: m.subtitle,
            summary: m.summary,
            content: m.content,
            videoUrl: m.videoUrl,
            pdfUrl: m.pdfUrl,
            pdfName: m.pdfName,
            durationMinutes: m.durationMinutes,
            activityPrompt: m.activityPrompt,
          }))}
          simulations={simulations.map((s) => ({
            id: s.id,
            order: s.order,
            slug: s.slug,
            title: s.title,
            subtitle: s.subtitle,
            scenarioContext: s.scenarioContext,
            instructions: s.instructions,
            customerName: s.customerName,
            customerRole: s.customerRole,
            difficulty: s.difficulty,
            estimatedMinutes: s.estimatedMinutes,
            imageUrl: s.imageUrl,
            imageName: s.imageName,
            pdfUrl: s.pdfUrl,
            pdfName: s.pdfName,
            steps: parseSimulationSteps(s.stepsJson),
            attemptsCount: s._count.attempts,
          }))}
          assignments={assignments.map((a) => {
            const parsedCases = parseLkpdCases(a.questionsJson, a.caseSummary);
            return {
              id: a.id,
              type: a.type,
              title: a.title,
              description: a.description,
              instructions: a.instructions,
              caseSummary: a.caseSummary,
              cases: parsedCases,
              questions: flattenLkpdQuestions(parsedCases).map((q) => q.text),
              pdfUrl: a.pdfUrl,
              pdfName: a.pdfName,
              dueDateIso: a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null,
              dueDateLabel: formatIndoDate(a.dueDate),
              submissionsCount: a._count.submissions,
            };
          })}
          quizzes={quizzes.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            category: q.category,
            timeLimitMinutes: q.timeLimitMinutes,
            passingScore: q.passingScore,
            shuffleQuestions: q.shuffleQuestions,
            questions: parseQuizQuestions(q.questionsJson),
            attemptsCount: q._count.attempts,
          }))}
          submissions={submissions.map((s) => {
            const parsedCases = parseLkpdCases(s.assignment.questionsJson, s.assignment.caseSummary);
            const flatQs = flattenLkpdQuestions(parsedCases);
            return {
              id: s.id,
              studentName: s.user.name,
              studentClass: s.user.className,
              assignmentTitle: s.assignment.title,
              assignmentType: s.assignment.type,
              answers: parseStringArray(s.answersJson),
              questions: flatQs.map((q) =>
                parsedCases.length > 1
                  ? `[${q.caseTitle} — No. ${q.questionNumberInCase}] ${q.text}`
                  : q.text
              ),
              fileUrl: s.fileUrl,
              fileName: s.fileName,
              videoLink: s.videoLink,
              notes: s.notes,
              status: s.status,
              score: s.score,
              teacherFeedback: s.teacherFeedback,
              submittedAtLabel: formatIndoDate(s.submittedAt),
            };
          })}
          simAttempts={simAttempts.map((sa) => ({
            id: sa.id,
            studentName: sa.user.name,
            studentClass: sa.user.className,
            simulationTitle: sa.simulation.title,
            status: sa.status,
            score: sa.score,
            maxScore: sa.maxScore,
            fileUrl: sa.fileUrl,
            fileName: sa.fileName,
            reflection: sa.reflection,
            teacherFeedback: sa.teacherFeedback,
            completedAtLabel: formatIndoDate(sa.completedAt),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
