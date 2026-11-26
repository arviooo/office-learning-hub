import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Send,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { formatIndoDate, parseStringArray } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function LkpdListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=student");

  const [lkpds, submissions] = await Promise.all([
    prisma.assignment.findMany({
      where: { isPublished: true, type: "LKPD" },
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
        <section className="rounded-[28px] bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white shadow-lg shadow-teal-200/60 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-teal-200">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lembar Kerja Peserta Didik • Studi Kasus Perkantoran</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight [text-wrap:balance] sm:text-3xl">
            LKPD Analisis Pelayanan Prima
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Analisis situasi pelayanan nyata di lingkungan perkantoran, unduh lembar kerja PDF dari
            guru jika tersedia, dan kirimkan jawaban atau dokumen PDF hasil kerjamu untuk dinilai.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {lkpds.map((item) => {
            const sub = subMap.get(item.id);
            const qCount = parseStringArray(item.questionsJson).length;

            return (
              <article
                key={item.id}
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
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-[#0f766e]">
                      LKPD
                    </span>
                    {sub?.status === "GRADED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Dinilai: {sub.score}/100</span>
                      </span>
                    ) : sub ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#1d4ed8]">
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sudah Dikumpulkan</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        Belum Dikerjakan
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-[#0f294a] [text-wrap:balance]">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Tenggat: {formatIndoDate(item.dueDate)}
                    </span>
                    <div className="flex items-center gap-3">
                      {qCount > 0 && <span>{qCount} pertanyaan analisis</span>}
                      {item.pdfUrl && (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          PDF Guru
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/lkpd/${item.id}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      sub
                        ? "border border-slate-300 bg-slate-50 text-[#0f294a] hover:bg-slate-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    <span>{sub ? "Lihat / Perbarui Jawaban" : "Kerjakan LKPD Sekarang"}</span>
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
