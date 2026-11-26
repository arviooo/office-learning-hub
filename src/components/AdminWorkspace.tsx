"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  School,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  identityNo: string | null;
  className: string | null;
  classroomId: string | null;
  points: number;
}

export interface AdminClassroomItem {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  description: string | null;
  studentCount: number;
}

interface AdminWorkspaceProps {
  currentAdminId: string;
  users: AdminUserItem[];
  classrooms: AdminClassroomItem[];
}

const ADMIN_TABS = [
  { id: "users", label: "Kelola Akun Pengguna", icon: Users },
  { id: "classrooms", label: "Kelola Kelas & Kode", icon: School },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export function AdminWorkspace({
  currentAdminId,
  users,
  classrooms,
}: AdminWorkspaceProps) {
  const router = useRouter();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTabId>("users");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STUDENT" | "TEACHER" | "ADMIN">("ALL");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "primary";
    run: () => Promise<void>;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form Tambah / Edit Akun
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("smkmplb123");
  const [uRole, setURole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [uIdentity, setUIdentity] = useState("");
  const [uClassroomId, setUClassroomId] = useState(classrooms[0]?.id || "");
  const [savingUser, setSavingUser] = useState(false);

  // Form Tambah / Edit Kelas
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [cName, setCName] = useState("");
  const [cCode, setCCode] = useState("");
  const [cYear, setCYear] = useState("2026/2027");
  const [cDesc, setCDesc] = useState("");
  const [savingClass, setSavingClass] = useState(false);

  const filteredUsers = users.filter((u) => roleFilter === "ALL" || u.role === roleFilter);

  function startEditUser(u: AdminUserItem) {
    setEditingUserId(u.id);
    setUName(u.name);
    setUEmail(u.email);
    setURole(
      u.role === "ADMIN" || u.role === "TEACHER" ? u.role : "STUDENT"
    );
    setUIdentity(u.identityNo || "");
    setUClassroomId(u.classroomId || "");
    setBanner({ type: "ok", text: `Mode Edit aktif untuk akun "${u.name}".` });
  }

  function resetUserForm() {
    setEditingUserId(null);
    setUName("");
    setUEmail("");
    setUPassword("smkmplb123");
    setURole("STUDENT");
    setUIdentity("");
    setUClassroomId(classrooms[0]?.id || "");
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSavingUser(true);
    setBanner(null);
    try {
      const url = editingUserId ? `/api/admin/users/${editingUserId}` : "/api/admin/users";
      const method = editingUserId ? "PATCH" : "POST";
      const payload = editingUserId
        ? {
            name: uName,
            email: uEmail,
            role: uRole,
            identityNo: uIdentity || null,
            classroomId: uRole === "STUDENT" ? uClassroomId || null : null,
          }
        : {
            name: uName,
            email: uEmail,
            password: uPassword,
            role: uRole,
            identityNo: uIdentity || null,
            classroomId: uRole === "STUDENT" ? uClassroomId || null : null,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan akun.");
      resetUserForm();
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menyimpan akun." });
    } finally {
      setSavingUser(false);
    }
  }

  async function handlePatchUser(userId: string, body: Record<string, unknown>) {
    setBusyId(userId);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui akun.");
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal update akun." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    setBusyId(userId);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus akun.");
      setConfirmAction(null);
      if (editingUserId === userId) resetUserForm();
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menghapus." });
    } finally {
      setBusyId(null);
    }
  }

  function startEditClassroom(c: AdminClassroomItem) {
    setEditingClassId(c.id);
    setCName(c.name);
    setCCode(c.code);
    setCYear(c.academicYear);
    setCDesc(c.description || "");
    setBanner({ type: "ok", text: `Mode Edit aktif untuk kelas "${c.name}".` });
  }

  function resetClassForm() {
    setEditingClassId(null);
    setCName("");
    setCCode("");
    setCYear("2026/2027");
    setCDesc("");
  }

  async function handleSaveClassroom(e: React.FormEvent) {
    e.preventDefault();
    setSavingClass(true);
    setBanner(null);
    try {
      const url = editingClassId
        ? `/api/admin/classrooms/${editingClassId}`
        : "/api/admin/classrooms";
      const method = editingClassId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cName,
          code: cCode,
          academicYear: cYear,
          description: cDesc || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kelas.");
      resetClassForm();
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menyimpan kelas." });
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClassroom(id: string) {
    setBusyId(id);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/classrooms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kelas.");
      setConfirmAction(null);
      if (editingClassId === id) resetClassForm();
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menghapus." });
    } finally {
      setBusyId(null);
    }
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % ADMIN_TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + ADMIN_TABS.length) % ADMIN_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ADMIN_TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(ADMIN_TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="space-y-5">
      {banner && (
        <div
          role={banner.type === "err" ? "alert" : "status"}
          className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {banner.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Accessible Single-Row Tablist */}
      <div className="rounded-t-2xl border-b border-slate-200 bg-white px-2">
        <div
          role="tablist"
          aria-label="Manajemen Administrator"
          className="flex flex-nowrap gap-1 overflow-x-auto"
        >
          {ADMIN_TABS.map((t, idx) => {
            const Icon = t.icon;
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`admin-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className="olh-tab flex flex-none items-center gap-2 whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-600 transition-colors hover:text-[#0f294a]"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL 1: KELOLA AKUN PENGGUNA (TAMBAH / EDIT / RESET / HAPUS) */}
      <div role="tabpanel" aria-labelledby="admin-tab-users" hidden={activeTab !== "users"}>
        <div className="space-y-6">
          <form
            onSubmit={handleSaveUser}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
                <h2 className="text-base font-extrabold text-[#0f294a]">
                  {editingUserId ? "Edit Data Akun Pengguna" : "Tambah Akun Baru"}
                </h2>
              </div>
              {editingUserId && (
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="adm-name" className="block text-xs font-bold text-slate-700">
                  Nama Lengkap
                </label>
                <input
                  id="adm-name"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="adm-email" className="block text-xs font-bold text-slate-700">
                  Email
                </label>
                <input
                  id="adm-email"
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {!editingUserId && (
                <div>
                  <label htmlFor="adm-pass" className="block text-xs font-bold text-slate-700">
                    Kata Sandi Awal
                  </label>
                  <input
                    id="adm-pass"
                    required
                    minLength={6}
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label htmlFor="adm-role" className="block text-xs font-bold text-slate-700">
                  Peran
                </label>
                <select
                  id="adm-role"
                  disabled={editingUserId === currentAdminId}
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as "STUDENT" | "TEACHER" | "ADMIN")}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="STUDENT">Siswa</option>
                  <option value="TEACHER">Guru</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="adm-id" className="block text-xs font-bold text-slate-700">
                  NISN / NIP (Opsional)
                </label>
                <input
                  id="adm-id"
                  value={uIdentity}
                  onChange={(e) => setUIdentity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {uRole === "STUDENT" && (
                <div>
                  <label htmlFor="adm-cls" className="block text-xs font-bold text-slate-700">
                    Kelas
                  </label>
                  <select
                    id="adm-cls"
                    value={uClassroomId}
                    onChange={(e) => setUClassroomId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— Tanpa Kelas —</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={savingUser}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
            >
              {savingUser ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : editingUserId ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{editingUserId ? "Simpan Perubahan Akun" : "Simpan Akun Baru"}</span>
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Daftar Pengguna ({filteredUsers.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(["ALL", "STUDENT", "TEACHER", "ADMIN"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={roleFilter === r}
                    onClick={() => setRoleFilter(r)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      roleFilter === r
                        ? "bg-[#0f294a] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {r === "ALL" ? "Semua" : r === "STUDENT" ? "Siswa" : r === "TEACHER" ? "Guru" : "Admin"}
                  </button>
                ))}
              </div>
            </div>

            <div tabIndex={0} role="region" aria-label="Tabel akun pengguna" className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[740px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-3">Pengguna</th>
                    <th scope="col" className="px-3 py-3">Peran</th>
                    <th scope="col" className="px-3 py-3">Kelas</th>
                    <th scope="col" className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentAdminId;
                    return (
                      <tr key={u.id}>
                        <td className="px-3 py-3">
                          <p className="text-sm font-bold text-slate-900">{u.name}</p>
                          <p className="text-slate-500">
                            {u.email}
                            {u.identityNo ? ` • ${u.identityNo}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          {u.role === "STUDENT" ? "Siswa" : u.role === "TEACHER" ? "Guru" : "Admin"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{u.className || "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditUser(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-bold text-[#1d4ed8] hover:bg-blue-100"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={busyId === u.id}
                              onClick={() =>
                                setConfirmAction({
                                  title: "Reset kata sandi akun ini?",
                                  description: `Kata sandi untuk ${u.name} (${u.email}) akan direset ke sandi bawaan "smkmplb123".`,
                                  confirmLabel: "Ya, Reset Sandi",
                                  variant: "primary",
                                  run: async () => {
                                    await handlePatchUser(u.id, { resetPassword: true });
                                    setConfirmAction(null);
                                  },
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <KeyRound className="h-3 w-3" aria-hidden="true" />
                              <span>Reset Sandi</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({
                                    title: "Hapus akun pengguna ini?",
                                    description: `Akun ${u.name} (${u.email}) beserta seluruh progres dan riwayat nilainya akan dihapus permanen.`,
                                    confirmLabel: "Ya, Hapus Akun",
                                    variant: "danger",
                                    run: () => handleDeleteUser(u.id),
                                  })
                                }
                                aria-label={`Hapus akun ${u.name}`}
                                className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL 2: KELOLA KELAS (TAMBAH / EDIT / HAPUS) */}
      <div role="tabpanel" aria-labelledby="admin-tab-classrooms" hidden={activeTab !== "classrooms"}>
        <div className="space-y-6">
          <form
            onSubmit={handleSaveClassroom}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#0f294a]">
                {editingClassId ? "Edit Data Kelas" : "Tambah Kelas MPLB Baru"}
              </h2>
              {editingClassId && (
                <button
                  type="button"
                  onClick={resetClassForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="cls-name" className="block text-xs font-bold text-slate-700">
                  Nama Kelas
                </label>
                <input
                  id="cls-name"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Contoh: XI MPLB 3"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cls-code" className="block text-xs font-bold text-slate-700">
                  Kode Gabung Siswa
                </label>
                <input
                  id="cls-code"
                  required
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: MPLB11C"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
                />
              </div>
              <div>
                <label htmlFor="cls-year" className="block text-xs font-bold text-slate-700">
                  Tahun Ajaran
                </label>
                <input
                  id="cls-year"
                  required
                  value={cYear}
                  onChange={(e) => setCYear(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="cls-desc" className="block text-xs font-bold text-slate-700">
                  Keterangan (Opsional)
                </label>
                <input
                  id="cls-desc"
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingClass}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
            >
              {savingClass ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : editingClassId ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{editingClassId ? "Simpan Perubahan Kelas" : "Tambah Kelas Baru"}</span>
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-extrabold text-[#0f294a]">{c.name}</h3>
                    <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 font-mono text-xs font-bold text-[#0f294a]">
                      {c.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Tahun Ajaran {c.academicYear} • {c.studentCount} siswa terdaftar
                  </p>
                  {c.description && <p className="mt-2 text-xs text-slate-600">{c.description}</p>}
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => startEditClassroom(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        title: `Hapus kelas ${c.name}?`,
                        description: `Kelas "${c.name}" (${c.code}) akan dihapus. Siswa yang terdaftar tidak terhapus tetapi akan dilepas dari kelas ini.`,
                        confirmLabel: "Ya, Hapus Kelas",
                        variant: "danger",
                        run: () => handleDeleteClassroom(c.id),
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || "Konfirmasi"}
        description={confirmAction?.description || ""}
        confirmLabel={confirmAction?.confirmLabel || "Ya, Lanjutkan"}
        cancelLabel="Batal"
        variant={confirmAction?.variant || "primary"}
        loading={Boolean(busyId)}
        onConfirm={() => {
          if (confirmAction) void confirmAction.run();
        }}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
