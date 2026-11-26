import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { formatIndoDate } from "@/lib/assessment";
import { DiscussionHub } from "@/components/DiscussionHub";

export default async function DiscussionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [announcements, posts] = await Promise.all([
    prisma.announcement.findMany({
      include: { author: { select: { name: true } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.discussionPost.findMany({
      include: {
        author: { select: { name: true, role: true } },
        replies: {
          include: { author: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-200">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Komunitas Belajar SMK MPLB</span>
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Forum Diskusi &amp; Pengumuman Kelas
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-blue-100">
            Ajukan pertanyaan seputar materi pelayanan prima, diskusikan studi kasus kantor bersama
            teman dan guru, serta pantau pengumuman jadwal terbaru.
          </p>
        </section>

        <DiscussionHub
          userRole={user.role}
          announcements={announcements.map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            category: a.category,
            isPinned: a.isPinned,
            authorName: a.author.name,
            createdAtLabel: formatIndoDate(a.createdAt),
          }))}
          posts={posts.map((p) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            category: p.category,
            authorName: p.author.name,
            authorRole: p.author.role,
            createdAtLabel: formatIndoDate(p.createdAt),
            replies: p.replies.map((r) => ({
              id: r.id,
              content: r.content,
              authorName: r.author.name,
              authorRole: r.author.role,
              createdAtLabel: formatIndoDate(r.createdAt),
            })),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
