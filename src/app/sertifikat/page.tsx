import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { formatIndoDate } from "@/lib/assessment";
import { CertificateView } from "@/components/CertificateView";

export const dynamic = "force-dynamic";

export default async function CertificatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [
    totalMaterials,
    completedMaterials,
    totalSimulations,
    simAttempts,
    quizAttempts,
    classroomWithTeacher,
    fallbackTeacher,
    sampleStudent,
  ] = await Promise.all([
    prisma.material.count({ where: { isPublished: true } }),
    prisma.materialProgress.count({ where: { userId: user.id, status: "COMPLETED" } }),
    prisma.simulation.count({ where: { isPublished: true } }),
    prisma.simulationAttempt.findMany({ where: { userId: user.id } }),
    prisma.quizAttempt.findMany({ where: { userId: user.id } }),
    user.classroomId
      ? prisma.classroom.findUnique({
          where: { id: user.classroomId },
          include: { teacher: { select: { name: true, identityNo: true } } },
        })
      : Promise.resolve(null),
    prisma.user.findFirst({
      where: { role: "TEACHER" },
      select: { name: true, identityNo: true },
      orderBy: { createdAt: "asc" },
    }),
    user.role !== "STUDENT"
      ? prisma.user.findFirst({
          where: { role: "STUDENT" },
          select: { name: true, className: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),
  ]);

  const completedSimulations = new Set(simAttempts.map((s) => s.simulationId)).size;
  const eligible =
    totalMaterials > 0 &&
    completedMaterials >= totalMaterials &&
    totalSimulations > 0 &&
    completedSimulations >= totalSimulations;

  const scores = [
    ...quizAttempts.map((q) => q.score),
    ...simAttempts.map((s) => Math.round((s.score / Math.max(1, s.maxScore)) * 100)),
  ];
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const certNumber = `OLH-MPLB-${new Date().getFullYear()}-${user.id.slice(-6).toUpperCase()}`;

  // Nama Guru Pengampu 100% dinamis dari database (bukan hardcoded!)
  const teacherName =
    user.role === "TEACHER"
      ? user.name
      : classroomWithTeacher?.teacher?.name || fallbackTeacher?.name || "Guru Pengampu MPLB";
  const teacherIdentityNo =
    user.role === "TEACHER"
      ? user.identityNo
      : classroomWithTeacher?.teacher?.identityNo || fallbackTeacher?.identityNo || null;

  // Untuk pratinjau Guru/Admin, tampilkan nama contoh siswa agar jelas beda penerima vs penandatangan
  const recipientName =
    user.role === "STUDENT"
      ? user.name
      : sampleStudent?.name || "Nama Siswa (Contoh Pratinjau)";
  const recipientClass =
    user.role === "STUDENT"
      ? user.className || "XI MPLB 1"
      : sampleStudent?.className || user.className || "XI MPLB 1";

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="no-print space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Apresiasi Penyelesaian Pembelajaran</span>
          </span>
          <h1 className="text-2xl font-extrabold text-[#0f294a] sm:text-3xl">
            Sertifikat Pelayanan Prima
          </h1>
          <p className="text-sm text-slate-600">
            Cetak atau simpan sertifikat kompetensi sebagai PDF setelah menyelesaikan seluruh 7
            materi dan 5 simulasi pelayanan digital.
          </p>
        </header>

        <CertificateView
          eligible={eligible}
          isPreviewRole={user.role === "TEACHER" || user.role === "ADMIN"}
          studentName={recipientName}
          className={recipientClass}
          teacherName={teacherName}
          teacherIdentityNo={teacherIdentityNo}
          certificateNumber={certNumber}
          issuedDate={formatIndoDate(new Date())}
          averageScore={avgScore}
          completedMaterials={completedMaterials}
          totalMaterials={totalMaterials}
          completedSimulations={completedSimulations}
          totalSimulations={totalSimulations}
        />
      </div>
    </DashboardShell>
  );
}
