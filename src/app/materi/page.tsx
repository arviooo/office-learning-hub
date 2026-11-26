import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Pencil } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { MaterialListClient, type MaterialCardItem } from "@/components/MaterialListClient";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?role=student");
  }

  const [materials, progressList] = await Promise.all([
    prisma.material.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
    }),
    prisma.materialProgress.findMany({
      where: { userId: user.id },
    }),
  ]);

  const progressMap = new Map(progressList.map((p) => [p.materialId, p.status]));

  const items: MaterialCardItem[] = materials.map((m) => {
    let keyPointsCount = 0;
    try {
      const parsed = JSON.parse(m.keyPointsJson);
      if (Array.isArray(parsed)) keyPointsCount = parsed.length;
    } catch {
      keyPointsCount = 0;
    }

    const rawStatus = progressMap.get(m.id);
    const status: MaterialCardItem["status"] =
      rawStatus === "COMPLETED" || rawStatus === "IN_PROGRESS" ? rawStatus : "NOT_STARTED";

    return {
      id: m.id,
      order: m.order,
      slug: m.slug,
      title: m.title,
      subtitle: m.subtitle,
      summary: m.summary,
      durationMinutes: m.durationMinutes,
      hasVideo: Boolean(m.videoUrl),
      hasPdf: Boolean(m.pdfUrl),
      pdfName: m.pdfName,
      status,
      keyPointsCount,
    };
  });

  const completedCount = items.filter((i) => i.status === "COMPLETED").length;
  const totalMinutes = items.reduce((acc, i) => acc + i.durationMinutes, 0);
  const percent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        {/* Header Modul Materi */}
        <section className="rounded-[28px] bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-teal-200">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kurikulum Pelayanan Prima • SMK MPLB</span>
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
                7 Pokok Materi Pelayanan Prima di Perkantoran
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Pelajari setiap bab secara berurutan mulai dari konsep dasar, prinsip 6A, etika &amp;
                budaya 5S, komunikasi efektif, prosedur pelayanan tamu, penanganan keluhan, hingga
                evaluasi kualitas layanan.
              </p>
            </div>

            {user.role === "STUDENT" ? (
              <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
                  <span>Progres Modul Materi</span>
                  <span className="text-base font-extrabold text-teal-300">{percent}%</span>
                </div>
                <div
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progres penyelesaian 7 materi"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-blue-100">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                    {completedCount}/{items.length} bab selesai
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                    ~{totalMinutes} menit total
                  </span>
                </div>
              </div>
            ) : (
              <Link
                href="/guru?tab=materials"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm hover:bg-teal-300"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Kelola, Edit &amp; Upload PDF Materi</span>
              </Link>
            )}
          </div>
        </section>

        <MaterialListClient items={items} />
      </div>
    </DashboardShell>
  );
}
