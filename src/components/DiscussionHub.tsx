"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Loader2,
  Megaphone,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  authorName: string;
  createdAtLabel: string;
}

export interface DiscussionItem {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorRole: string;
  createdAtLabel: string;
  replies: {
    id: string;
    content: string;
    authorName: string;
    authorRole: string;
    createdAtLabel: string;
  }[];
}

interface DiscussionHubProps {
  userRole: string;
  announcements: AnnouncementItem[];
  posts: DiscussionItem[];
}

function getRoleTag(role: string) {
  if (role === "TEACHER") return { label: "Guru", cls: "bg-teal-100 text-teal-800" };
  if (role === "ADMIN") return { label: "Admin", cls: "bg-slate-200 text-slate-800" };
  return { label: "Siswa", cls: "bg-blue-100 text-[#0f294a]" };
}

export function DiscussionHub({ userRole, announcements, posts }: DiscussionHubProps) {
  const router = useRouter();
  const canAnnounce = userRole === "TEACHER" || userRole === "ADMIN";

  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "MATERI" | "STUDI_KASUS" | "UMUM">(
    "ALL"
  );
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form Topik Diskusi Baru
  const [postTitle, setPostTitle] = useState("");
  const [postCategory, setPostCategory] = useState<"MATERI" | "STUDI_KASUS" | "UMUM">("MATERI");
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Form Balasan per Topik
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  // Form Pengumuman Guru/Admin (Tambah / Edit)
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annCategory, setAnnCategory] = useState<"INFO" | "TUGAS" | "JADWAL">("INFO");
  const [annContent, setAnnContent] = useState("");
  const [annPinned, setAnnPinned] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    endpoint: string;
    title: string;
    description: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredPosts = posts.filter(
    (p) => categoryFilter === "ALL" || p.category === categoryFilter
  );

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle,
          category: postCategory,
          content: postContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan diskusi.");
      setPostTitle("");
      setPostContent("");
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal mengirim." });
    } finally {
      setPosting(false);
    }
  }

  async function handleReply(postId: string) {
    const content = (replyDrafts[postId] || "").trim();
    if (content.length < 3) {
      setBanner({ type: "err", text: "Tanggapan minimal 3 karakter." });
      return;
    }
    setReplyingId(postId);
    setBanner(null);
    try {
      const res = await fetch(`/api/discussions/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim tanggapan.");
      setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal membalas." });
    } finally {
      setReplyingId(null);
    }
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setSavingAnn(true);
    setBanner(null);
    try {
      const url = editingAnnId ? `/api/announcements/${editingAnnId}` : "/api/announcements";
      const method = editingAnnId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle,
          category: annCategory,
          content: annContent,
          isPinned: annPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengumuman.");
      setEditingAnnId(null);
      setAnnTitle("");
      setAnnContent("");
      setAnnPinned(false);
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setSavingAnn(false);
    }
  }

  async function executeDeleteItem() {
    if (!pendingDelete) return;
    setDeleting(true);
    setBanner(null);
    try {
      const res = await fetch(pendingDelete.endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus.");
      setPendingDelete(null);
      setBanner({ type: "ok", text: data.message });
      router.refresh();
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Gagal menghapus." });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-12">
        {/* KOLOM KIRI (8): Forum Tanya Jawab & Diskusi Kasus */}
        <div className="space-y-6 lg:col-span-8">
          {/* Form Buat Topik Diskusi */}
          <form
            onSubmit={handleCreatePost}
            className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">
                Mulai Topik Tanya Jawab / Diskusi Kasus
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="post-title" className="block text-xs font-bold text-slate-700">
                  Judul Pertanyaan / Topik
                </label>
                <input
                  id="post-title"
                  required
                  minLength={5}
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Contoh: Cara sopan menangani tamu yang tidak sabar menunggu?"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="post-cat" className="block text-xs font-bold text-slate-700">
                  Kategori
                </label>
                <select
                  id="post-cat"
                  value={postCategory}
                  onChange={(e) =>
                    setPostCategory(e.target.value as "MATERI" | "STUDI_KASUS" | "UMUM")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="MATERI">Tanya Materi</option>
                  <option value="STUDI_KASUS">Studi Kasus Kantor</option>
                  <option value="UMUM">Diskusi Umum</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="post-content" className="block text-xs font-bold text-slate-700">
                Uraian Pertanyaan / Pendapat
              </label>
              <textarea
                id="post-content"
                required
                minLength={10}
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Tuliskan konteks atau pertanyaanmu dengan sopan agar guru dan teman sekelas bisa memberi tanggapan..."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-sm focus:bg-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={posting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2 text-xs font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
              >
                {posting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Terbitkan Topik{userRole === "STUDENT" ? " (+10 XP)" : ""}</span>
              </button>
            </div>
          </form>

          {/* Filter Kategori Forum */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori forum">
            {[
              { key: "ALL" as const, label: `Semua (${posts.length})` },
              { key: "MATERI" as const, label: "Tanya Materi" },
              { key: "STUDI_KASUS" as const, label: "Studi Kasus" },
              { key: "UMUM" as const, label: "Umum" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={categoryFilter === f.key}
                onClick={() => setCategoryFilter(f.key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  categoryFilter === f.key
                    ? "bg-[#0f294a] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Daftar Topik & Balasan */}
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const roleBadge = getRoleTag(post.authorRole);
              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">{post.authorName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadge.cls}`}>
                        {roleBadge.label}
                      </span>
                      <span className="text-slate-400">• {post.createdAtLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {post.category.replace("_", " ")}
                      </span>
                      {canAnnounce && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              endpoint: `/api/discussions/${post.id}`,
                              title: "Hapus topik diskusi ini?",
                              description: `Topik "${post.title}" beserta seluruh tanggapannya akan dihapus permanen.`,
                            })
                          }
                          aria-label={`Hapus topik ${post.title}`}
                          className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-base font-extrabold text-[#0f294a]">{post.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700 [text-wrap:pretty]">
                    {post.content}
                  </p>

                  {/* Balasan */}
                  {post.replies.length > 0 && (
                    <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {post.replies.length} Tanggapan
                      </p>
                      {post.replies.map((rep) => {
                        const rTag = getRoleTag(rep.authorRole);
                        return (
                          <div
                            key={rep.id}
                            className={`rounded-xl p-3 text-xs ${
                              rep.authorRole === "TEACHER"
                                ? "border border-teal-200 bg-teal-50/70"
                                : "bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{rep.authorName}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rTag.cls}`}>
                                {rTag.label}
                              </span>
                              <span className="text-slate-400">• {rep.createdAtLabel}</span>
                            </div>
                            <p className="mt-1 leading-relaxed text-slate-700">{rep.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Form Kirim Tanggapan */}
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <label htmlFor={`reply-${post.id}`} className="visually-hidden">
                      Tulis tanggapan untuk {post.title}
                    </label>
                    <input
                      id={`reply-${post.id}`}
                      type="text"
                      value={replyDrafts[post.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Tulis tanggapan atau jawabanmu..."
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 py-2 text-xs focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={replyingId === post.id}
                      onClick={() => handleReply(post.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f766e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
                    >
                      {replyingId === post.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Balas</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN (4): Pengumuman Guru */}
        <div className="space-y-5 lg:col-span-4">
          {canAnnounce && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#0f294a]">
                  <Megaphone className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
                  <span>{editingAnnId ? "Edit Pengumuman" : "Buat Pengumuman Kelas"}</span>
                </div>
                {editingAnnId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAnnId(null);
                      setAnnTitle("");
                      setAnnContent("");
                      setAnnPinned(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    Batal
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="ann-title" className="block text-xs font-bold text-slate-700">
                  Judul Pengumuman
                </label>
                <input
                  id="ann-title"
                  required
                  minLength={5}
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label htmlFor="ann-cat" className="block text-xs font-bold text-slate-700">
                  Kategori
                </label>
                <select
                  id="ann-cat"
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as "INFO" | "TUGAS" | "JADWAL")}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="INFO">Informasi Umum</option>
                  <option value="TUGAS">Tugas / Tenggat</option>
                  <option value="JADWAL">Jadwal Praktik</option>
                </select>
              </div>

              <div>
                <label htmlFor="ann-content" className="block text-xs font-bold text-slate-700">
                  Isi Pengumuman
                </label>
                <textarea
                  id="ann-content"
                  required
                  minLength={10}
                  rows={3}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                />
                <span>Sematkan (Pin) di paling atas</span>
              </label>

              <button
                type="submit"
                disabled={savingAnn}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
              >
                {savingAnn ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Terbitkan Pengumuman</span>
              </button>
            </form>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#1d4ed8]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#0f294a]">Papan Pengumuman</h2>
            </div>

            <div className="mt-4 space-y-3">
              {announcements.map((a) => (
                <article
                  key={a.id}
                  className={`rounded-xl border p-3.5 text-xs ${
                    a.isPinned
                      ? "border-blue-200 bg-blue-50/70"
                      : "border-slate-100 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 ring-1 ring-slate-200">
                      {a.isPinned && <Pin className="h-3 w-3 text-[#1d4ed8]" aria-hidden="true" />}
                      {a.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{a.createdAtLabel}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{a.title}</h3>
                  <p className="mt-1 leading-relaxed text-slate-600">{a.content}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-500">— {a.authorName}</p>
                    {canAnnounce && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnnId(a.id);
                            setAnnTitle(a.title);
                            setAnnContent(a.content);
                            setAnnCategory(
                              a.category === "TUGAS" || a.category === "JADWAL" ? a.category : "INFO"
                            );
                            setAnnPinned(a.isPinned);
                          }}
                          aria-label={`Edit pengumuman ${a.title}`}
                          className="rounded-md p-1 text-[#1d4ed8] hover:bg-blue-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              endpoint: `/api/announcements/${a.id}`,
                              title: "Hapus pengumuman ini?",
                              description: `Pengumuman "${a.title}" akan dihapus dari papan pengumuman siswa dan guru.`,
                            })
                          }
                          aria-label={`Hapus pengumuman ${a.title}`}
                          className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title || "Konfirmasi Hapus"}
        description={pendingDelete?.description || ""}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deleting}
        onConfirm={executeDeleteItem}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
