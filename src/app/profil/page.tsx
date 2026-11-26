import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell user={user}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f294a]">Pengaturan Profil &amp; Kata Sandi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola informasi akun dan keamanan kata sandi Anda di OFFICE LEARNING HUB.
          </p>
        </div>

        <ProfileForm user={user} />
      </div>
    </DashboardShell>
  );
}
