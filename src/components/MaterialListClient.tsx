"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  PlayCircle,
  Search,
} from "lucide-react";

export interface MaterialCardItem {
  id: string;
  order: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  durationMinutes: number;
  hasVideo: boolean;
  hasPdf: boolean;
  pdfName: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  keyPointsCount: number;
}

export function MaterialListClient({ items }: { items: MaterialCardItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">("ALL");

  const filtered = items.filter((item) => {
    const matchesFilter = filter === "ALL" || item.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: "ALL", label: `Semua (${items.length})` },
    {
      key: "IN_PROGRESS",
      label: `Sedang Dipelajari (${items.filter((i) => i.status === "IN_PROGRESS").length})`,
    },
    {
      key: "COMPLETED",
      label: `Selesai (${items.filter((i) => i.status === "COMPLETED").length})`,
    },
    {
      key: "NOT_STARTED",
      label: `Belum Mulai (${items.filter((i) => i.status === "NOT_STARTED").length})`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Bar Pencarian & Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="search-material" className="visually-hidden">
            Cari materi pelayanan tamu
          </label>
          <input
            id="search-material"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik materi (misal: 3S, buku tamu, telepon, LPT)..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2 pr-3.5 pl-10 text-sm text-slate-900 focus:border-[#1d4ed8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status materi">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              aria-pressed={filter === btn.key}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === btn.key
                  ? "bg-[#0f294a] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Kartu Materi */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Tidak ada materi yang cocok dengan filter atau kata kunci tersebut.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("ALL");
            }}
            className="mt-3 text-xs font-bold text-[#1d4ed8] hover:underline"
          >
            Tampilkan semua materi
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isCompleted = item.status === "COMPLETED";
            const isInProgress = item.status === "IN_PROGRESS";

            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition hover:shadow-md ${
                  isCompleted
                    ? "border-emerald-200"
                    : isInProgress
                    ? "border-blue-300 ring-1 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : isInProgress
                          ? "bg-blue-100 text-[#1d4ed8]"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        `0${item.order}`
                      )}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : isInProgress
                          ? "bg-blue-50 text-[#1d4ed8]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isCompleted
                        ? "Selesai"
                        : isInProgress
                        ? "Sedang Dipelajari"
                        : "Belum Mulai"}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-extrabold text-[#0f294a] [text-wrap:balance]">
                    Materi {item.order}: {item.title}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#0f766e]">{item.subtitle}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.summary}</p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.durationMinutes} menit
                    </span>
                    {item.hasVideo && (
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Video
                      </span>
                    )}
                    {item.hasPdf && (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Modul PDF
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/materi/${item.slug}`}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      isCompleted
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-[#0f294a] text-white hover:bg-[#163a66]"
                    }`}
                  >
                    <span>
                      {isCompleted
                        ? "Buka Ulang Materi"
                        : isInProgress
                        ? "Lanjutkan Belajar"
                        : "Mulai Pelajari"}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
