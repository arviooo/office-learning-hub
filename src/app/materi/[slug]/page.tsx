import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  PlayCircle,
  Target,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toEmbedVideoUrl, toExternalVideoUrl } from "@/lib/video";
import { DashboardShell } from "@/components/DashboardShell";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MaterialStudyActions } from "@/components/MaterialStudyActions";

function safeJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?role=student");
  }

  const { slug } = await params;

  const material = await prisma.material.findUnique({
    where: { slug },
  });

  if (!material) {
    notFound();
  }

  // Otomatis catat sebagai IN_PROGRESS jika siswa baru pertama kali membuka materi
  let progress = await prisma.materialProgress.findUnique({
    where: { userId_materialId: { userId: user.id, materialId: material.id } },
  });

  if (!progress && user.role === "STUDENT") {
    progress = await prisma.materialProgress.create({
      data: {
        userId: user.id,
        materialId: material.id,
        status: "IN_PROGRESS",
      },
    });
  }

  const [prevMaterial, nextMaterial] = await Promise.all([
    prisma.material.findFirst({
      where: { isPublished: true, order: { lt: material.order } },
      orderBy: { order: "desc" },
      select: { slug: true, order: true, title: true },
    }),
    prisma.material.findFirst({
      where: { isPublished: true, order: { gt: material.order } },
      orderBy: { order: "asc" },
      select: { slug: true, order: true, title: true },
    }),
  ]);

  const objectives = safeJsonArray(material.objectivesJson);
  const keyPoints = safeJsonArray(material.keyPointsJson);
  const embedVideoUrl = toEmbedVideoUrl(material.videoUrl);
  const externalVideoUrl = toExternalVideoUrl(material.videoUrl);

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/materi"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0f294a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Daftar 7 Materi</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Estimasi baca {material.durationMinutes} menit</span>
          </span>
        </div>

        {/* Header Materi */}
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0f294a] px-3 py-1 text-xs font-bold text-white">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Materi {material.order} dari 7</span>
            </span>
            {progress?.status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Selesai Dipelajari</span>
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-3xl">
            {material.title}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-[#0f766e]">{material.subtitle}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 [text-wrap:pretty]">
            {material.summary}
          </p>

          {/* Tujuan Pembelajaran */}
          {objectives.length > 0 && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                <Target className="h-4 w-4" aria-hidden="true" />
                <span>Tujuan Pembelajaran</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-sm text-slate-700">
                {objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#1d4ed8]"
                      aria-hidden="true"
                    />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>

        {/* Konten Bacaan Utama */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
          <MarkdownRenderer content={material.content} />

          {/* Poin Penting */}
          {keyPoints.length > 0 && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>Poin Kunci yang Wajib Diingat</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        {/* Video Pembelajaran (jika ada) */}
        {embedVideoUrl && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-[#1d4ed8]" aria-hidden="true" />
                  <h2 className="text-base font-extrabold text-[#0f294a]">Video Pembelajaran</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Simak ilustrasi praktik pelayanan perkantoran melalui video pendukung berikut.
                </p>
              </div>
              {externalVideoUrl && (
                <a
                  href={externalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Buka di YouTube</span>
                </a>
              )}
            </div>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
              <iframe
                src={embedVideoUrl}
                title={`Video pembelajaran ${material.title}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Modul PDF dari Guru */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-rose-50 p-2 text-rose-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-[#0f294a]">
                  Modul / Handout PDF dari Guru
                </h2>
                <p className="text-xs text-slate-500">
                  {material.pdfUrl
                    ? material.pdfName || "Dokumen materi pendukung (.pdf)"
                    : "Belum ada lampiran PDF tambahan yang diunggah guru untuk bab ini."}
                </p>
              </div>
            </div>

            {material.pdfUrl && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={material.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Buka PDF</span>
                </a>
                <a
                  href={material.pdfUrl}
                  download={material.pdfName || `${material.slug}.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            )}
          </div>

          {material.pdfUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <iframe
                src={material.pdfUrl}
                title={`Pratinjau PDF ${material.title}`}
                className="h-[520px] w-full"
              />
            </div>
          )}
        </section>

        {/* Aktivitas & Simpan Progres (Khusus Siswa) atau Mode Pratinjau (Guru/Admin) */}
        {user.role === "STUDENT" ? (
          <MaterialStudyActions
            materialId={material.id}
            initialStatus={progress?.status || "IN_PROGRESS"}
            initialNotes={progress?.notes || ""}
            activityPrompt={material.activityPrompt}
            userRole={user.role}
          />
        ) : (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
            <div>
              <p className="text-sm font-extrabold text-[#0f294a]">
                Mode Pratinjau {user.role === "ADMIN" ? "Administrator" : "Guru"}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Akun Guru/Admin tidak mencatat progres belajar atau poin XP. Kelola, edit, atau
                unggah PDF materi ini melalui Panel Guru.
              </p>
            </div>
            <Link
              href="/guru?tab=materials"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#163a66]"
            >
              <span>Kelola / Edit Materi &amp; PDF</span>
            </Link>
          </section>
        )}

        {/* Navigasi Materi Sebelumnya / Berikutnya */}
        <nav
          aria-label="Navigasi antar materi"
          className="grid gap-3 pt-2 sm:grid-cols-2"
        >
          {prevMaterial ? (
            <Link
              href={`/materi/${prevMaterial.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-xs"
            >
              <ArrowLeft className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Materi Sebelumnya
                </p>
                <p className="truncate text-sm font-bold text-[#0f294a]">
                  {prevMaterial.order}. {prevMaterial.title}
                </p>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextMaterial ? (
            <Link
              href={`/materi/${nextMaterial.slug}`}
              className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:border-blue-300 hover:shadow-xs"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Materi Berikutnya
                </p>
                <p className="truncate text-sm font-bold text-[#0f294a]">
                  {nextMaterial.order}. {nextMaterial.title}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#1d4ed8]" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href="/materi"
              className="flex items-center justify-end gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right transition hover:bg-emerald-100"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase text-emerald-700">
                  Bab Terakhir
                </p>
                <p className="text-sm font-bold text-emerald-900">
                  Kembali ke Daftar 7 Materi
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            </Link>
          )}
        </nav>
      </div>
    </DashboardShell>
  );
}
