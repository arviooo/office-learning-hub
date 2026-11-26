import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GraduationCap, School, Shield, UserCog, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminWorkspace } from "@/components/AdminWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?role=admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const { tab } = await searchParams;
  const activeSection = tab === "users" ? "users" : tab === "classrooms" ? "classrooms" : "overview";

  const [users, classrooms] = await Promise.all([
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
  ]);

  const studentCount = users.filter((u) => u.role === "STUDENT").length;
  const teacherCount = users.filter((u) => u.role === "TEACHER").length;

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-r from-[#0b2559] via-blue-700 to-indigo-600 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Panel Administrator</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            {activeSection === "users"
              ? "Kelola Akun Pengguna"
              : activeSection === "classrooms"
                ? "Kelola Kelas & Kode Gabung"
                : "Dashboard Administrator"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-blue-100">
            {activeSection === "users"
              ? "Tambah, edit, ubah peran, reset kata sandi, atau hapus akun Siswa, Guru, dan Admin secara langsung."
              : activeSection === "classrooms"
                ? "Atur daftar kelas SMK MPLB, tahun ajaran, dan kode gabung untuk pendaftaran siswa."
                : "Pantau ringkasan akun dan kelas aktif di OFFICE LEARNING HUB, lalu kelola langsung dari menu sidebar."}
          </p>
        </section>

        {activeSection === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Pengguna", value: users.length, icon: Users, color: "bg-blue-50 text-blue-700" },
                { label: "Akun Siswa", value: studentCount, icon: GraduationCap, color: "bg-emerald-50 text-emerald-700" },
                { label: "Akun Guru", value: teacherCount, icon: UserCog, color: "bg-violet-50 text-violet-700" },
                { label: "Kelas Aktif", value: classrooms.length, icon: School, color: "bg-amber-50 text-amber-700" },
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

            <section className="grid gap-4 md:grid-cols-2">
              <Link
                href="/admin?tab=users"
                className="interactive-lift flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs hover:border-blue-300"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Users className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-950">Kelola Akun Pengguna</h2>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Tambah akun baru, edit data, reset sandi, atau hapus akun.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </Link>

              <Link
                href="/admin?tab=classrooms"
                className="interactive-lift flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs hover:border-teal-300"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <School className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-950">Kelola Kelas &amp; Kode</h2>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Buat kelas baru, atur tahun ajaran, dan kelola kode pendaftaran.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </Link>
            </section>
          </>
        )}

        <AdminWorkspace
          currentAdminId={user.id}
          initialTab={activeSection === "classrooms" ? "classrooms" : "users"}
          hideTabs={activeSection !== "overview"}
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
