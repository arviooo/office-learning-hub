import { redirect } from "next/navigation";
import { BookOpen, MonitorPlay, School, Shield, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminWorkspace } from "@/components/AdminWorkspace";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, classrooms, materialsCount, simulationsCount] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        identityNo: true,
        className: true,
        classroomId: true,
        points: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.classroom.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.material.count(),
    prisma.simulation.count(),
  ]);

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-[#0b2559] via-blue-700 to-indigo-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Panel Administrator Penuh</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            Pengelolaan Sistem OFFICE LEARNING HUB
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-blue-100">
            Kelola akun Siswa, Guru, dan Admin, atur peran &amp; reset kata sandi, serta kelola
            kelas MPLB beserta kode gabung siswa.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Pengguna", value: users.length, icon: Users, color: "bg-blue-50 text-blue-700" },
            { label: "Kelas Aktif", value: classrooms.length, icon: School, color: "bg-teal-50 text-teal-700" },
            { label: "Total Materi", value: materialsCount, icon: BookOpen, color: "bg-indigo-50 text-indigo-700" },
            { label: "Simulasi Digital", value: simulationsCount, icon: MonitorPlay, color: "bg-amber-50 text-amber-700" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{stat.label}</span>
                  <span className={`rounded-lg p-2 ${stat.color}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-extrabold text-slate-900">{stat.value}</p>
              </div>
            );
          })}
        </section>

        <AdminWorkspace
          currentAdminId={user.id}
          users={users}
          classrooms={classrooms.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            academicYear: c.academicYear,
            description: c.description,
            studentCount: c._count.students,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
