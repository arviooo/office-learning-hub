# Panduan Deploy Gratis: GitHub + Vercel + Neon PostgreSQL — OFFICE LEARNING HUB

Aplikasi **OFFICE LEARNING HUB** sudah disiapkan sepenuhnya untuk **Vercel + Neon PostgreSQL**:
- Frontend + Backend API Next.js 15 berjalan menyatu dalam **1 proyek Vercel** (tidak perlu server terpisah).
- Database menggunakan **Neon PostgreSQL** (`prisma/schema.prisma`).
- File PDF yang diunggah Guru & Siswa disimpan langsung ke tabel `UploadedFile` di **Neon PostgreSQL** sehingga aman, permanen, dan langsung tampil di semua perangkat (tidak hilang saat Vercel redeploy).
- Saat deploy pertama di Vercel, skrip `vercel-build` otomatis membuat seluruh tabel (`prisma db push`) dan mengisi 7 materi, 5 simulasi, 2 kuis, 2 LKPD, 3 proyek, dan akun awal (`prisma/seed.ts`) **tanpa menimpa perubahan di deploy berikutnya**.

---

## Langkah 1: Buat Database Gratis di Neon (`neon.tech`)
1. Buka **[https://neon.tech](https://neon.tech)** lalu daftar/masuk (bisa langsung pakai akun GitHub).
2. Klik **Create Project**:
   - **Project name**: `office-learning-hub`
   - **Region**: pilih **AWS Asia Pacific (Singapore)** (`ap-southeast-1`) agar akses dari Indonesia paling cepat.
3. Setelah project selesai dibuat, klik tombol **Connect** → salin **Connection String** (pastikan opsi **Pooled connection** aktif). Bentuknya seperti:
   ```text
   postgresql://neondb_owner:xxxx@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Simpan string ini — akan kita tempel di Vercel pada Langkah 3.

---

## Langkah 2: Upload Kode ke GitHub
1. Buka **[https://github.com/new](https://github.com/new)** dan buat repository baru:
   - **Repository name**: `office-learning-hub`
   - **Visibility**: Private atau Public (bebas).
   - **JANGAN** centang *Add a README*, *.gitignore*, atau *License* (karena proyek lokal sudah punya).
2. Klik **Create repository**, lalu salin URL repository-nya (misal `https://github.com/username-kamu/office-learning-hub.git`).
3. Jalankan perintah berikut di terminal folder proyek (Windows PowerShell):
   ```powershell
   git branch -M main
   git remote add origin https://github.com/USERNAME_KAMU/office-learning-hub.git
   git push -u origin main
   ```

---

## Langkah 3: Deploy ke Vercel (`vercel.com`)
1. Buka **[https://vercel.com](https://vercel.com)** → login menggunakan akun **GitHub**.
2. Klik **Add New... → Project**, lalu klik **Import** pada repository `office-learning-hub`.
3. Buka bagian **Environment Variables** sebelum menekan Deploy, lalu tambahkan **2 variabel**:
   - **Key 1**: `DATABASE_URL`
     - **Value**: tempel Connection String Neon dari Langkah 1.
   - **Key 2**: `AUTH_SECRET`
     - **Value**: teks acak panjang (minimal 32 karakter, contoh: `olh-smkmplb-2026-rahasia-super-aman-9x8k2m4p7q`).
4. Klik tombol **Deploy** dan tunggu ± 1–2 menit.
5. Begitu status menjadi **Ready**, klik link domain `.vercel.app` yang diberikan Vercel!

---

## Akun Awal Setelah Deploy Pertama
Kata sandi awal semua akun demo: **`smkmplb123`** (segera ubah lewat menu **Profil & Sandi** atau **Dashboard Admin** setelah live):
- **Admin**: `admin@officehub.sch.id`
- **Guru**: `guru@officehub.sch.id`
- **Siswa**: `siswa@officehub.sch.id`

---

## Cara Update Website di Masa Depan (Cukup 3 Perintah!)
Setiap kali ada perbaikan kode atau fitur baru di laptop, kamu **tidak perlu WinSCP atau upload manual lagi**. Cukup jalankan:
```powershell
git add .
git commit -m "Update tampilan / fitur"
git push
```
Dalam ± 1 menit, Vercel otomatis mem-build ulang dan memperbarui website live tanpa menghapus data siswa, nilai, maupun PDF di Neon PostgreSQL.

---

## (Opsional) Menjalankan di Laptop Setelah Pindah ke PostgreSQL
Jika kamu masih ingin menjalankan `npm run dev` di laptop setelah pindah ke PostgreSQL:
1. Buka file `.env` di laptop.
2. Ganti baris `DATABASE_URL="file:./dev.db"` menjadi Connection String Neon PostgreSQL dari Langkah 1.
3. Jalankan `npx prisma generate` lalu `npm run dev`.
