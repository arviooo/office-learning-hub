"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Save, KeyRound } from "lucide-react";

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    role: string;
    identityNo: string | null;
    className: string | null;
    bio: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [identityNo, setIdentityNo] = useState(user.identityNo || "");
  const [bio, setBio] = useState(user.bio || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const payload: Record<string, string> = { name, identityNo, bio };
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Gagal menyimpan perubahan." });
      } else {
        setMessage({ type: "ok", text: data.message || "Profil berhasil diperbarui." });
        setCurrentPassword("");
        setNewPassword("");
        router.refresh();
      }
    } catch {
      setMessage({ type: "err", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role={message.type === "err" ? "alert" : "status"}
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <h2 className="text-base font-extrabold text-[#0f294a]">Informasi Profil</h2>
        <p className="mt-1 text-xs text-slate-500">
          Perbarui nama tampilan, nomor identitas, dan bio singkat Anda.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-semibold text-slate-700">
              Nama Lengkap
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              required
              minLength={3}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-semibold text-slate-700">
              Email Akun
            </label>
            <input
              id="profile-email"
              type="email"
              disabled
              value={user.email}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="profile-id" className="block text-sm font-semibold text-slate-700">
              {user.role === "STUDENT" ? "NISN" : "NIP / Kode Pengenal"}
            </label>
            <input
              id="profile-id"
              type="text"
              value={identityNo}
              onChange={(e) => setIdentityNo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-class" className="block text-sm font-semibold text-slate-700">
              Kelas / Peran
            </label>
            <input
              id="profile-class"
              type="text"
              disabled
              value={user.className || user.role}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-bio" className="block text-sm font-semibold text-slate-700">
              Bio Singkat
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tuliskan minat atau target belajarmu di bidang pelayanan perkantoran..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#0f294a]">Ubah Kata Sandi (Opsional)</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Kosongkan bagian ini jika tidak ingin mengganti kata sandi.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="current-password" className="block text-sm font-semibold text-slate-700">
              Kata Sandi Saat Ini
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">
              Kata Sandi Baru (min. 6 karakter)
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#163a66] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </button>
      </div>
    </form>
  );
}
