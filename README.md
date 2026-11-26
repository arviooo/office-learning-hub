# OFFICE LEARNING HUB — LMS Pelayanan Prima SMK MPLB

Platform **Learning Management System (LMS)** khusus untuk Siswa SMK Program Keahlian **Manajemen Perkantoran dan Layanan Bisnis (MPLB)** dengan fokus pembelajaran **Pelayanan Prima di Lingkungan Perkantoran**.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **Database**: SQLite lokal via Prisma ORM 6 (`prisma/dev.db`)
- **Validasi & Autentikasi**: Zod, `bcryptjs`, HttpOnly Session Cookie (HMAC-SHA256)

## Cara Menjalankan di Lokal
```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```
Lalu buka `http://localhost:3000`.

## Akun Demo Awal
Semua akun demo menggunakan kata sandi: **`smkmplb123`**

| Peran | Email | Arah Dashboard |
| --- | --- | --- |
| **Siswa** (XI MPLB 1) | `siswa@officehub.sch.id` | `/dashboard` |
| **Guru** | `guru@officehub.sch.id` | `/guru` |
| **Admin** | `admin@officehub.sch.id` | `/admin` |

Kode kelas untuk pendaftaran siswa baru: `MPLB11A` (XI MPLB 1) atau `MPLB11B` (XI MPLB 2).

## Peta Pengembangan Bertahap
- [x] **Fase 1**: Setup Proyek, Skema Database SQLite + Seed Data, Landing Page, Login/Registrasi & Profil, Dashboard Siswa, serta Pondasi Panel Guru & Admin.
- [x] **Fase 2**: Modul 7 Materi Pelayanan Prima (halaman daftar + filter, halaman baca lengkap, embed video, preview/unduh lampiran PDF dari guru, simpan catatan & progres +30 XP, serta pondasi API upload PDF `/api/uploads`).
- [x] **Fase 3**: Simulasi Pelayanan Digital (5 skenario interaktif, skor kompetensi real-time, umpan balik langsung per langkah, kolom respons/refleksi siswa, XP & badge otomatis, serta riwayat percobaan).
- [x] **Fase 4**: Kuis Interaktif (timer, auto-skor & pembahasan), LKPD (identitas siswa, studi kasus, preview PDF guru, jawaban analisis, unggah PDF siswa), dan Proyek Praktik (SOP, video roleplay, panduan keluhan).
- [x] **Fase 5**: Halaman Progress & Nilai Lengkap Siswa (`/progres`) + Dashboard Guru Penuh (`/guru`: pantau siswa, kelola materi + upload PDF, kelola LKPD/Proyek + upload PDF, buat kuis interaktif, serta penilaian & umpan balik tugas/simulasi).
- [x] **Fase 6**: Forum Diskusi & Pengumuman Guru (`/diskusi`), Dashboard Admin Penuh CRUD Akun & Kelas (`/admin`), serta Sertifikat Penyelesaian siap cetak/PDF (`/sertifikat`).
