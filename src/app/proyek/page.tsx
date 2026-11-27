import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  Send,
  Video,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { formatIndoDate } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const [projects, submissions] = await Promise.all([
    prisma.assignment.findMany({
      where: { isPublished: true, type: "PROJECT" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.submission.findMany({
      where: { userId: user.id },
    }),
  ]);

  const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-lg shadow-amber-200/60 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-200">
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Proyek Praktik Kerja • Berorientasi Produk &amp; Roleplay</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
            Proyek Praktik Pelayanan Tamu
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-amber-50">
            Wujudkan keterampilan Materi 1 &amp; Materi 2 dalam karya nyata: menyusun bagian SOP
            tamu langsung &amp; telepon, video adegan resepsionis/penerima telepon, serta panduan
            menghadapi tamu mengeluh &amp; penelepon marah.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((proj, idx) => {
            const sub = subMap.get(proj.id);
            return (
              <article
                key={proj.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs transition hover:shadow-md ${
                  sub?.status === "GRADED"
                    ? "border-emerald-200"
                    : sub
                    ? "border-blue-200"
                    : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                      Proyek {idx + 1}
                    </span>
                    {sub?.status === "GRADED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sudah Diperiksa</span>
                      </span>
                    ) : sub ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Terkirim</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Belum Dikumpulkan
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-[#0f294a] [text-wrap:balance]">
                    {proj.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {proj.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatIndoDate(proj.dueDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      {proj.title.toLowerCase().includes("video") ? (
                        <>
                          <Video className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                          <span>Tautan Video / PDF</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                          <span>Dokumen PDF / Link</span>
                        </>
                      )}
                    </span>
                  </div>

                  <Link
                    href={`/proyek/${proj.id}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      sub
                        ? "border border-slate-300 bg-slate-50 text-[#0f294a] hover:bg-slate-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    <span>{sub ? "Lihat / Perbarui Proyek" : "Kumpulkan Proyek"}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
