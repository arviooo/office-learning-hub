import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Memeriksa status awal database OFFICE LEARNING HUB...");

  const [existingUsers, existingMaterials] = await Promise.all([
    prisma.user.count(),
    prisma.material.count(),
  ]);

  if (existingUsers > 0 && existingMaterials > 0) {
    console.log("Database sudah terisi data awal — melewati seeding agar perubahan Guru/Admin aman.");
    return;
  }

  console.log("Menyiapkan data awal OFFICE LEARNING HUB...");

  const passwordHash = await bcrypt.hash("smkmplb123", 10);

  // 1. Akun Pengguna Awal (Admin, Guru, Siswa)
  const admin = await prisma.user.upsert({
    where: { email: "admin@officehub.sch.id" },
    update: {},
    create: {
      name: "Admin MPLB",
      email: "admin@officehub.sch.id",
      passwordHash,
      role: "ADMIN",
      identityNo: "ADM-001",
      avatarColor: "#1e293b",
      bio: "Administrator platform Office Learning Hub SMK Program Keahlian MPLB.",
      points: 0,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "guru@officehub.sch.id" },
    update: {},
    create: {
      name: "Ibu Ratna Sari, S.Pd.",
      email: "guru@officehub.sch.id",
      passwordHash,
      role: "TEACHER",
      identityNo: "198704152012012004",
      className: "XI MPLB 1",
      avatarColor: "#0f766e",
      bio: "Guru Produktif Manajemen Perkantoran dan Layanan Bisnis (MPLB).",
      points: 0,
    },
  });

  // 2. Kelas
  const classroom = await prisma.classroom.upsert({
    where: { code: "MPLB11A" },
    update: {},
    create: {
      name: "XI MPLB 1",
      code: "MPLB11A",
      academicYear: "2026/2027",
      description: "Kelas XI Manajemen Perkantoran dan Layanan Bisnis 1 — Mata Pelajaran Pelayanan Prima.",
      teacherId: teacher.id,
    },
  });

  await prisma.classroom.upsert({
    where: { code: "MPLB11B" },
    update: {},
    create: {
      name: "XI MPLB 2",
      code: "MPLB11B",
      academicYear: "2026/2027",
      description: "Kelas XI Manajemen Perkantoran dan Layanan Bisnis 2 — Mata Pelajaran Pelayanan Prima.",
      teacherId: teacher.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "siswa@officehub.sch.id" },
    update: {},
    create: {
      name: "Nadia Putri Rahmawati",
      email: "siswa@officehub.sch.id",
      passwordHash,
      role: "STUDENT",
      identityNo: "0094827162",
      className: "XI MPLB 1",
      classroomId: classroom.id,
      avatarColor: "#0f4c81",
      bio: "Siswa XI MPLB 1 yang antusias mendalami komunikasi perkantoran dan pelayanan prima.",
      points: 340,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "dimas@officehub.sch.id" },
    update: {},
    create: {
      name: "Dimas Pratama",
      email: "dimas@officehub.sch.id",
      passwordHash,
      role: "STUDENT",
      identityNo: "0094827163",
      className: "XI MPLB 1",
      classroomId: classroom.id,
      avatarColor: "#1d4ed8",
      bio: "Siswa XI MPLB 1.",
      points: 210,
    },
  });

  // 3. 7 Materi Pembelajaran (Urutan Tabel Bagian 4: Komunikasi dulu, baru Prosedur)
  const materialsData = [
    {
      order: 1,
      slug: "konsep-pelayanan-prima",
      title: "Konsep Pelayanan Prima",
      subtitle: "Pengertian, tujuan, manfaat, dan peran pelayanan prima di perkantoran",
      summary:
        "Memahami hakikat service excellence (pelayanan prima) sebagai standar layanan terbaik yang melampaui harapan tamu maupun pelanggan internal dan eksternal kantor.",
      durationMinutes: 20,
      videoUrl: "https://www.youtube.com/embed/eFZbWXN5IHg?rel=0",
      objectivesJson: JSON.stringify([
        "Menjelaskan pengertian pelayanan prima (service excellence) di lingkungan perkantoran.",
        "Mengidentifikasi tujuan dan manfaat pelayanan prima bagi instansi dan pelanggan.",
        "Membedakan pelanggan internal dan pelanggan eksternal di lingkungan kerja kantor.",
      ]),
      keyPointsJson: JSON.stringify([
        "Pelayanan prima adalah layanan terbaik yang memenuhi bahkan melampaui harapan pelanggan.",
        "Pelanggan kantor terbagi dua: pelanggan internal (rekan kerja/atasan) dan eksternal (tamu/klien/masyarakat).",
        "Manfaat utama: membangun citra positif instansi, meningkatkan kepuasan, dan menumbuhkan loyalitas.",
      ]),
      activityPrompt: "Baca ringkasan materi di atas lalu tuliskan rangkuman singkat mengenai mengapa pelayanan prima menjadi wajah utama sebuah perkantoran.",
      content: `## 1. Pengertian Pelayanan Prima
Pelayanan prima (*Service Excellence*) adalah kegiatan memberikan layanan terbaik kepada pelanggan atau tamu secara cepat, tepat, ramah, dan profesional sehingga kebutuhan mereka terpenuhi dan tercipta rasa puas.

Di lingkungan perkantoran, petugas administrasi, resepsionis, maupun staf layanan bisnis merupakan garda terdepan yang membentuk kesan pertama (*first impression*) terhadap instansi atau perusahaan.

## 2. Tujuan Pelayanan Prima
- Memberikan pelayanan yang bermutu tinggi kepada setiap tamu dan mitra kerja.
- Menciptakan rasa percaya, nyaman, dan dihargai bagi penerima layanan.
- Mencegah terjadinya kesalahpahaman atau keluhan yang berlarut-larut.
- Membangun reputasi profesional lembaga atau perusahaan.

## 3. Jenis Pelanggan di Lingkungan Perkantoran
1. **Pelanggan Internal**: Pimpinan, rekan sejawat antarbagian, dan staf di dalam organisasi yang membutuhkan dukungan administrasi.
2. **Pelanggan Eksternal**: Tamu kantor, klien bisnis, mitra kerja, orang tua/masyarakat, dan pihak luar yang datang atau menghubungi kantor.`,
    },
    {
      order: 2,
      slug: "prinsip-pelayanan-prima",
      title: "Prinsip dan Standar Pelayanan Prima",
      subtitle: "Konsep 6A (Ability, Attitude, Appearance, Attention, Action, Accountability)",
      summary:
        "Mengenal enam prinsip utama pelayanan prima (6A) serta standar kualitas layanan yang menjadi tolok ukur profesionalisme di kantor modern.",
      durationMinutes: 25,
      objectivesJson: JSON.stringify([
        "Menjabarkan 6 prinsip pelayanan prima (konsep 6A).",
        "Menganalisis standar kualitas pelayanan perkantoran (kecepatan, ketepatan, keramahan, keamanan).",
        "Mengevaluasi contoh praktik pelayanan berdasarkan prinsip 6A.",
      ]),
      keyPointsJson: JSON.stringify([
        "Konsep 6A: Ability (Kemampuan), Attitude (Sikap), Appearance (Penampilan), Attention (Perhatian), Action (Tindakan), Accountability (Tanggung Jawab).",
        "Standar pelayanan mencakup kejelasan prosedur, ketepatan waktu, dan konsistensi sikap.",
        "Kualitas pelayanan dinilai dari kesesuaian antara harapan tamu dengan layanan nyata yang diterima.",
      ]),
      activityPrompt: "Analisis satu contoh pelayanan kantor yang pernah kamu temui dan identifikasi prinsip 6A mana yang sudah terpenuhi atau masih kurang.",
      content: `## Konsep 6A dalam Pelayanan Prima
Agar pelayanan berjalan konsisten dan profesional, petugas layanan berpegang pada konsep **6A**:
1. **Ability (Kemampuan)**: Penguasaan prosedur kantor, informasi layanan, dan keterampilan komunikasi.
2. **Attitude (Sikap)**: Ramah, sabar, sopan, dan menghargai setiap tamu tanpa membeda-bedakan.
3. **Appearance (Penampilan)**: Berpakaian rapi, bersih, serasi, dan menjaga bahasa tubuh yang profesional.
4. **Attention (Perhatian)**: Mendengarkan kebutuhan tamu secara penuh dan peka terhadap situasi.
5. **Action (Tindakan)**: Melakukan langkah nyata dengan sigap untuk membantu kebutuhan tamu.
6. **Accountability (Tanggung Jawab)**: Memastikan layanan tuntas dan bertanggung jawab atas informasi yang diberikan.`,
    },
    {
      order: 3,
      slug: "etika-petugas-pelayanan",
      title: "Sikap, Etika, dan Penampilan Petugas",
      subtitle: "Grooming, bahasa tubuh, sopan santun, dan budaya 5S di kantor",
      summary:
        "Mempelajari standar etika profesi, penampilan diri (grooming), bahasa tubuh positif, serta penerapan budaya 5S (Senyum, Salam, Sapa, Sopan, Santun).",
      durationMinutes: 25,
      objectivesJson: JSON.stringify([
        "Menerapkan budaya 5S dalam interaksi pelayanan perkantoran.",
        "Menjelaskan standar grooming dan kerapian penampilan petugas front office.",
        "Mengidentifikasi bahasa tubuh yang ramah dan profesional saat melayani tamu.",
      ]),
      keyPointsJson: JSON.stringify([
        "Budaya 5S: Senyum, Salam, Sapa, Sopan, Santun adalah fondasi keramahan kantor.",
        "Grooming mencerminkan kredibilitas diri dan citra perusahaan.",
        "Kontak mata wajar, postur tegak, dan gestur terbuka menunjukkan kesiapan melayani.",
      ]),
      activityPrompt: "Identifikasi 3 perilaku profesional dan 3 perilaku yang harus dihindari oleh petugas resepsionis saat tamu memasuki lobi kantor.",
      content: `## 1. Budaya 5S di Lingkungan Perkantoran
- **Senyum**: Tulus dan hangat saat menyambut tamu.
- **Salam**: Mengucapkan salam sesuai waktu ("Selamat pagi/siang/sore").
- **Sapa**: Menyapa dengan menyebut sapaan hormat ("Bapak/Ibu") dan menawarkan bantuan.
- **Sopan**: Memilih kata-kata yang halus dan menghormati lawan bicara.
- **Santun**: Menunjukkan budi pekerti baik melalui tindakan dan gestur.

## 2. Penampilan Diri (*Professional Grooming*)
Penampilan rapi meliputi seragam/busana kerja bersih dan disetrika, tanda pengenal terpasang jelas, rambut tertata rapi, riasan wajah natural, serta kebersihan kuku dan sepatu.

## 3. Bahasa Tubuh Positif
Hindari melipat tangan di dada, menunduk terus-menerus melihat ponsel, atau menunjuk dengan satu jari. Gunakan telapak tangan terbuka saat mempersilakan tamu duduk atau mengarahkan ruangan.`,
    },
    {
      order: 4,
      slug: "komunikasi-pelayanan-efektif",
      title: "Teknik Komunikasi Pelayanan Efektif",
      subtitle: "Mendengarkan aktif, bertanya tepat, menjelaskan jelas, dan memberi informasi",
      summary:
        "Menguasai keterampilan komunikasi verbal dan nonverbal untuk menggali kebutuhan tamu serta menyampaikan informasi perkantoran secara akurat.",
      durationMinutes: 30,
      objectivesJson: JSON.stringify([
        "Menerapkan teknik active listening (mendengarkan aktif) saat berdialog dengan tamu.",
        "Menggunakan kalimat positif dan pilihan diksi profesional dalam pelayanan.",
        "Menyampaikan informasi dan arahan secara ringkas, jelas, dan mudah dipahami.",
      ]),
      keyPointsJson: JSON.stringify([
        "Mendengarkan aktif: fokus penuh, tidak memotong pembicaraan, dan mengonfirmasi ulang inti kebutuhan.",
        "Ubah kalimat negatif ('Saya tidak tahu') menjadi kalimat solutif ('Baik Bapak, izinkan saya mengecek informasi tersebut ke bagian terkait').",
        "Intonasi suara yang tenang, jelas, dan bersahabat meningkatkan kenyamanan tamu.",
      ]),
      activityPrompt: "Susun 3 kalimat pelayanan profesional untuk mengubah pernyataan negatif menjadi respons yang solutif dan ramah.",
      content: `## 1. Teknik Mendengarkan Aktif (*Active Listening*)
1. Berikan perhatian penuh dan jaga kontak mata yang sopan.
2. Catat informasi penting (nama tamu, instansi, tujuan bertemu, keperluan).
3. Lakukan parafrase untuk memastikan pemahaman: *"Baik Ibu Rina, jadi Ibu ingin bertemu dengan Bapak Hendra dari Bagian Keuangan terkait dokumen kerja sama, benar ya Bu?"*

## 2. Menggunakan Kalimat Positif & Solutif
| Hindari | Gunakan |
| --- | --- |
| "Bapaknya sedang keluar, tidak tahu kapan balik." | "Mohon maaf Ibu, saat ini Bapak Hendra sedang rapat di luar kantor. Apakah Ibu berkenan meninggalkan pesan atau menjadwalkan ulang?" |
| "Tunggu saja di sana." | "Silakan Bapak menunggu sejenak di ruang tunggu sebelah kiri, saya akan segera menghubungi bagian terkait." |`,
    },
    {
      order: 5,
      slug: "prosedur-pelayanan-pelanggan",
      title: "Prosedur Melayani Pelanggan dan Tamu",
      subtitle: "Alur standar dari menyambut, identifikasi kebutuhan, membantu, hingga menutup layanan",
      summary:
        "Mempraktikkan langkah operasional standar (SOP) penerimaan tamu kantor secara sistematis dari awal kedatangan hingga tamu meninggalkan kantor.",
      durationMinutes: 30,
      objectivesJson: JSON.stringify([
        "Mengurutkan tahapan prosedur pelayanan tamu di lingkungan perkantoran.",
        "Melakukan pencatatan buku tamu dan verifikasi janji temu secara tertib.",
        "Mengarahkan tamu dan menutup sesi pelayanan dengan kesan positif.",
      ]),
      keyPointsJson: JSON.stringify([
        "5 Tahap Prosedur: (1) Menyambut, (2) Mengidentifikasi Kebutuhan, (3) Mencatat & Konfirmasi, (4) Memberi Informasi/Mengarahkan, (5) Mengakhiri Layanan.",
        "Selalu tawarkan bantuan segera dalam 5–10 detik pertama sejak tamu tiba di meja resepsionis.",
        "Akhiri layanan dengan memastikan tidak ada kebutuhan lain, ucapan terima kasih, dan salam penutup.",
      ]),
      activityPrompt: "Setelah membaca materi ini, langsung praktikkan seluruh alurnya pada menu Simulasi Pelayanan Digital (Simulasi 1 sampai 5).",
      content: `## Alur Prosedur Penerimaan Tamu Kantor
1. **Menyambut Tamu**: Berdiri/condong ramah, senyum, ucapkan salam, dan tanyakan apa yang bisa dibantu.
2. **Identifikasi Kebutuhan**: Tanyakan nama, asal instansi, orang/bagian yang dituju, serta apakah sudah memiliki janji temu.
3. **Pencatatan & Konfirmasi**: Minta tamu mengisi buku tamu/kartu identitas tamu dengan sopan, lalu konfirmasi ketersediaan pihak yang dituju.
4. **Memberi Informasi & Mengarahkan**: Jelaskan lokasi ruangan dengan jelas atau antar tamu jika diperlukan. Jika harus menunggu, informasikan estimasi waktu tunggu.
5. **Mengakhiri Pelayanan**: Tanyakan apakah ada hal lain yang bisa dibantu, ucapkan terima kasih atas kunjungan, dan berikan salam perpisahan yang hangat.`,
    },
    {
      order: 6,
      slug: "penanganan-keluhan-pelanggan",
      title: "Penanganan Keluhan dan Kebutuhan Tamu",
      subtitle: "Strategi empati, meredakan emosi, mencari solusi, dan tindak lanjut",
      summary:
        "Mempelajari metode L.A.S.T (Listen, Apologize, Solve, Thank) dalam menangani tamu yang kecewa, bingung, atau menyampaikan keluhan layanan secara tenang dan solutif.",
      durationMinutes: 30,
      objectivesJson: JSON.stringify([
        "Menerapkan metode L.A.S.T dalam menangani keluhan tamu perkantoran.",
        "Menjaga kendali emosi dan sikap empati saat menghadapi tamu yang kecewa.",
        "Menyusun langkah solusi dan tindak lanjut (eskalasi) secara profesional.",
      ]),
      keyPointsJson: JSON.stringify([
        "Metode L.A.S.T: Listen (Dengarkan), Apologize (Minta Maaf dengan Empati), Solve (Cari Solusi), Thank (Ucapkan Terima Kasih).",
        "Jangan menyalahkan tamu, jangan berdebat, dan jangan melempar tanggung jawab ke rekan lain di depan tamu.",
        "Catat detail keluhan untuk tindak lanjut dan perbaikan layanan kantor.",
      ]),
      activityPrompt: "Selesaikan Studi Kasus Penanganan Keluhan pada LKPD 2 dan Simulasi 4 untuk melatih penerapan metode L.A.S.T.",
      content: `## Metode L.A.S.T untuk Menangani Keluhan
1. **Listen (Dengarkan)**: Biarkan tamu menyampaikan keluhannya tanpa dipotong. Tunjukkan empati melalui anggukan dan ekspresi serius namun tenang.
2. **Apologize (Minta Maaf)**: Ucapkan permohonan maaf yang tulus atas ketidaknyamanan yang dialami, meskipun kesalahan bukan berasal langsung dari Anda secara pribadi.
3. **Solve (Cari Solusi)**: Tawarkan solusi konkret yang bisa dilakukan segera, atau lakukan eskalasi ke atasan/bagian berwenang dengan estimasi waktu yang jelas.
4. **Thank (Ucapkan Terima Kasih)**: Terima kasih atas masukan yang diberikan karena membantu kantor memperbaiki mutu layanan.`,
    },
    {
      order: 7,
      slug: "evaluasi-kualitas-pelayanan",
      title: "Evaluasi Kualitas Pelayanan dan Refleksi",
      subtitle: "Indikator keberhasilan layanan, umpan balik pelanggan, dan perbaikan berkelanjutan",
      summary:
        "Mengukur kualitas pelayanan berdasarkan indikator nyata (SERVQUAL) dan menyusun refleksi diri untuk peningkatan kompetensi layanan bisnis.",
      durationMinutes: 20,
      objectivesJson: JSON.stringify([
        "Menjelaskan 5 dimensi kualitas layanan (Tangibles, Reliability, Responsiveness, Assurance, Empathy).",
        "Menggunakan umpan balik pelanggan sebagai dasar evaluasi perbaikan layanan.",
        "Menyusun refleksi praktik pelayanan prima dan standar SOP sederhana.",
      ]),
      keyPointsJson: JSON.stringify([
        "Lima dimensi SERVQUAL: Bukti Fisik, Keandalan, Daya Tanggap, Jaminan, dan Empati.",
        "Evaluasi dilakukan melalui survei kepuasan tamu, kotak saran, catatan keluhan, dan observasi kinerja.",
        "Refleksi diri membantu petugas mengenali kekuatan komunikasi dan aspek yang perlu ditingkatkan.",
      ]),
      activityPrompt: "Susun refleksi pembelajaran serta kerjakan Proyek Praktik penyusunan SOP Pelayanan Sederhana.",
      content: `## 5 Dimensi Kualitas Pelayanan (SERVQUAL)
1. **Tangibles (Bukti Fisik)**: Kebersihan lobi, kerapian meja resepsionis, dan penampilan petugas.
2. **Reliability (Keandalan)**: Kemampuan memberikan informasi dan layanan yang tepat sejak pertama kali.
3. **Responsiveness (Daya Tanggap)**: Kecepatan dan kesigapan membantu tamu yang datang.
4. **Assurance (Jaminan)**: Pengetahuan, kesopanan, dan sikap petugas yang menumbuhkan rasa percaya.
5. **Empathy (Empati)**: Kepedulian tulus dan perhatian personal terhadap kebutuhan tamu.`,
    },
  ];

  const createdMaterials: Record<number, string> = {};
  for (const m of materialsData) {
    const rec = await prisma.material.upsert({
      where: { order: m.order },
      update: {},
      create: m,
    });
    createdMaterials[m.order] = rec.id;
  }

  // Progres awal siswa demo (Materi 1 & 2 selesai, Materi 3 sedang dipelajari)
  await prisma.materialProgress.upsert({
    where: { userId_materialId: { userId: student.id, materialId: createdMaterials[1] } },
    update: {},
    create: {
      userId: student.id,
      materialId: createdMaterials[1],
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.materialProgress.upsert({
    where: { userId_materialId: { userId: student.id, materialId: createdMaterials[2] } },
    update: {},
    create: {
      userId: student.id,
      materialId: createdMaterials[2],
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.materialProgress.upsert({
    where: { userId_materialId: { userId: student.id, materialId: createdMaterials[3] } },
    update: {},
    create: {
      userId: student.id,
      materialId: createdMaterials[3],
      status: "IN_PROGRESS",
    },
  });

  // 4. 5 Simulasi Pelayanan Digital
  const simulationsData = [
    {
      order: 1,
      slug: "menyambut-tamu-kantor",
      title: "Simulasi 1: Menyambut Tamu yang Datang ke Kantor",
      subtitle: "Membangun kesan pertama (first impression) yang hangat dan profesional",
      scenarioContext:
        "Pukul 09.15 WIB di lobi PT Nusantara Karya Mandiri. Anda bertugas sebagai staf Front Office. Seorang tamu berpakaian rapi masuk membawa map dokumen dan tampak mencari meja informasi.",
      customerName: "Bapak Arif Wibowo",
      customerRole: "Perwakilan Klien — PT Sinar Abadi",
      difficulty: "Dasar",
      estimatedMinutes: 8,
      stepsJson: JSON.stringify([
        {
          id: "s1-step1",
          situation: "Bapak Arif berjalan mendekati meja resepsionis saat Anda sedang merapikan berkas surat masuk.",
          customerDialog: "(Berhenti di depan meja resepsionis sambil melihat sekeliling)",
          prompt: "Apa tindakan pertama yang paling tepat Anda lakukan?",
          options: [
            {
              id: "a",
              text: "Menyelesaikan merapikan berkas terlebih dahulu selama 1 menit sambil tetap duduk agar pekerjaan tidak terputus.",
              score: 10,
              rating: "Kurang Tepat",
              feedback: "Tamu harus diprioritaskan segera saat tiba. Membiarkan tamu menunggu tanpa sapaan memberi kesan kurang ramah.",
            },
            {
              id: "b",
              text: "Segera menghentikan aktivitas sejenak, tersenyum, kontak mata ramah, dan mengucapkan: 'Selamat pagi Bapak, selamat datang di PT Nusantara Karya Mandiri. Ada yang bisa saya bantu?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback: "Luar biasa! Anda menerapkan budaya 5S dan merespons cepat dalam 5 detik pertama sehingga menciptakan first impression profesional.",
            },
            {
              id: "c",
              text: "Langsung bertanya singkat: 'Mau ketemu siapa, Pak?' tanpa tersenyum.",
              score: 15,
              rating: "Cukup",
              feedback: "Meskipun langsung merespons, kalimat terlalu singkat tanpa salam dan senyum terasa kaku dan kurang menghargai tamu.",
            },
          ],
        },
        {
          id: "s1-step2",
          situation: "Bapak Arif membalas salam Anda dengan ramah.",
          customerDialog: "Selamat pagi, Mbak. Saya Arif dari PT Sinar Abadi. Saya ada janji temu dengan Ibu Diah dari Bagian Pemasaran pukul 09.30.",
          prompt: "Bagaimana respons profesional Anda selanjutnya?",
          options: [
            {
              id: "a",
              text: "'Baik Bapak Arif, terima kasih informasinya. Mohon berkenan mengisi buku tamu terlebih dahulu, sambil saya konfirmasi ke Ibu Diah di Bagian Pemasaran. Silakan Bapak menunggu di kursi ruang tunggu sebelah kanan.'",
              score: 35,
              rating: "Sangat Tepat",
              feedback: "Tepat sekali! Anda menyebut nama tamu, menjalankan prosedur buku tamu dengan sopan, melakukan konfirmasi, dan mempersilakan duduk dengan jelas.",
            },
            {
              id: "b",
              text: "'Langsung naik saja ke lantai 2 belok kiri, Pak. Ruangan Ibu Diah di ujung.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback: "Melewatkan pencatatan tamu dan konfirmasi ketersediaan pihak yang dituju melanggar prosedur keamanan dan etika penerimaan tamu kantor.",
            },
            {
              id: "c",
              text: "'Tulis nama di buku ini dulu ya Pak, nanti tunggu dipanggil.'",
              score: 20,
              rating: "Cukup",
              feedback: "Prosedur buku tamu sudah dilakukan, tetapi pilihan kalimat kurang santun dan belum menjelaskan lokasi ruang tunggu.",
            },
          ],
        },
        {
          id: "s1-step3",
          situation: "Anda telah menelepon Ibu Diah dan beliau menyampaikan sedang menyelesaikan rapat 5 menit lagi, lalu segera menemui Bapak Arif.",
          customerDialog: "(Bapak Arif duduk di ruang tunggu sambil mengecek jam tangannya)",
          prompt: "Informasi apa yang sebaiknya Anda sampaikan kepada Bapak Arif?",
          options: [
            {
              id: "a",
              text: "Diam saja di meja resepsionis sampai Ibu Diah keluar sendiri.",
              score: 10,
              rating: "Kurang Tepat",
              feedback: "Tamu membutuhkan kepastian informasi agar tidak merasa diabaikan.",
            },
            {
              id: "b",
              text: "Menghampiri dengan sopan: 'Mohon maaf Bapak Arif, saya sudah menghubungi Ibu Diah. Beliau sedang menyelesaikan rapat sekitar 5 menit lagi dan akan segera menemui Bapak. Apakah Bapak berkenan air mineral selagi menunggu?'",
              score: 30,
              rating: "Sangat Tepat",
              feedback: "Sempurna! Menyampaikan estimasi waktu tunggu dan menawarkan kenyamanan menunjukkan perhatian (Attention) dan kualitas pelayanan prima.",
            },
          ],
        },
      ]),
    },
    {
      order: 2,
      slug: "identifikasi-kebutuhan-kunjungan",
      title: "Simulasi 2: Mengidentifikasi Kebutuhan dan Tujuan Kunjungan",
      subtitle: "Menggali keperluan tamu yang datang tanpa janji temu secara ramah & terstruktur",
      scenarioContext:
        "Seorang tamu datang ke kantor layanan administrasi tanpa membawa surat panggilan dan terlihat bingung harus menuju loket atau divisi yang mana.",
      customerName: "Ibu Lestari",
      customerRole: "Wali Murid / Mitra Eksternal",
      difficulty: "Dasar",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s2-step1",
          situation: "Ibu Lestari datang terlihat ragu-ragu di dekat meja layanan.",
          customerDialog: "Permisi, saya mau mengurus surat keterangan kerja sama magang, tapi saya bingung harus ke bagian mana ya?",
          prompt: "Bagaimana cara Anda menggali kebutuhan Ibu Lestari dengan teknik komunikasi efektif?",
          options: [
            {
              id: "a",
              text: "'Selamat siang Ibu, tenang saja saya bantu arahkan. Boleh saya tahu nama Ibu, dari instansi mana, dan surat kerja sama magang tersebut ditujukan untuk periode kapan ya Bu?'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Sangat baik! Anda menenangkan tamu terlebih dahulu lalu mengajukan pertanyaan terbuka yang sopan untuk memetakan divisi yang tepat.",
            },
            {
              id: "b",
              text: "'Ibu sudah bawa surat pengantar resmi belum? Kalau belum, tidak bisa diproses di sini.'",
              score: 15,
              rating: "Kurang Tepat",
              feedback: "Respons bernada menolak di awal membuat tamu merasa tidak terbantu. Gali kebutuhan terlebih dahulu sebelum mengecek kelengkapan berkas.",
            },
            {
              id: "c",
              text: "'Coba langsung tanya ke bagian TU saja di lantai dua.'",
              score: 20,
              rating: "Cukup",
              feedback: "Mengarahkan tanpa memastikan kebutuhan spesifik berisiko membuat tamu bolak-balik antarbagian.",
            },
          ],
        },
        {
          id: "s2-step2",
          situation: "Ibu Lestari menjelaskan bahwa ia dari SMK Harapan Bangsa ingin menyerahkan surat permohonan PKL siswa untuk bagian HRD.",
          customerDialog: "Saya Ibu Lestari dari SMK Harapan Bangsa. Ini surat permohonan PKL untuk bulan depan, katanya diserahkan ke bagian kepegawaian atau HRD.",
          prompt: "Langkah konfirmasi apa yang paling tepat?",
          options: [
            {
              id: "a",
              text: "Melakukan parafrase dan verifikasi: 'Baik Ibu Lestari dari SMK Harapan Bangsa, jadi Ibu ingin menyerahkan surat permohonan PKL untuk Bagian HRD ya Bu. Boleh saya bantu catat di buku tamu dan menerima berkasnya untuk saya teruskan, atau saya hubungkan dengan staf HRD terlebih dahulu?'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Mantap! Anda menerapkan active listening dengan mengonfirmasi ulang data tamu dan menawarkan langkah tindak lanjut yang jelas.",
            },
            {
              id: "b",
              text: "'Oh iya taruh sini aja suratnya nanti saya kasih ke HRD kalau sempat.'",
              score: 15,
              rating: "Kurang Tepat",
              feedback: "Kata 'kalau sempat' tidak profesional dan tidak memberikan tanda terima atau kepastian tindak lanjut bagi tamu.",
            },
          ],
        },
      ]),
    },
    {
      order: 3,
      slug: "memberikan-informasi-dan-arahan",
      title: "Simulasi 3: Memberikan Informasi dan Mengarahkan Tamu",
      subtitle: "Menyampaikan informasi prosedur dan arah ruangan secara akurat dan sopan",
      scenarioContext:
        "Seorang tamu baru pertama kali datang ke gedung kantor berlantai 3 dan menanyakan lokasi ruang rapat Melati serta prosedur pengajuan legalisir dokumen.",
      customerName: "Bapak Hendra Kusuma",
      customerRole: "Tamu Instansi Mitra",
      difficulty: "Menengah",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s3-step1",
          situation: "Bapak Hendra menanyakan arah menuju Ruang Rapat Melati di lantai 3.",
          customerDialog: "Mbak, Ruang Rapat Melati sebelah mana ya? Gedung ini lumayan besar, saya takut salah ruangan.",
          prompt: "Bagaimana cara Anda mengarahkan Bapak Hendra?",
          options: [
            {
              id: "a",
              text: "Menunjuk ke arah lift dengan satu jari sambil berkata: 'Di lantai 3, Pak. Nanti cari saja tulisan Melati.'",
              score: 15,
              rating: "Kurang Tepat",
              feedback: "Menunjuk dengan satu jari kurang sopan dalam etika perkantoran, dan instruksi 'cari saja' tidak membantu tamu baru.",
            },
            {
              id: "b",
              text: "Menggunakan gestur telapak tangan terbuka ke arah lift: 'Baik Bapak Hendra, untuk Ruang Rapat Melati berada di lantai 3. Bapak dapat menggunakan lift di sebelah kanan, keluar lift belok kiri, ruangan kedua di sebelah kanan bertuliskan Ruang Melati. Ini kartu akses tamu Bapak, silakan dipakai ya Pak.'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Sangat profesional! Gestur terbuka, petunjuk arah runtut dan jelas, serta mematuhi prosedur kartu akses tamu.",
            },
          ],
        },
        {
          id: "s3-step2",
          situation: "Sebelum menuju lift, Bapak Hendra juga menanyakan persyaratan pengajuan surat rekomendasi kerja sama yang ternyata menjadi wewenang bagian Legal (bukan resepsionis).",
          customerDialog: "Oh iya satu lagi, kalau mau mengajukan perpanjangan MoU syarat berkasnya apa saja ya?",
          prompt: "Anda belum hafal detail syarat terbaru dari Bagian Legal. Apa respons terbaik Anda?",
          options: [
            {
              id: "a",
              text: "'Wah maaf Pak, saya bukan bagian Legal jadi saya tidak tahu syaratnya.'",
              score: 15,
              rating: "Kurang Tepat",
              feedback: "Menjawab 'tidak tahu' tanpa menawarkan bantuan terkesan lepas tangan.",
            },
            {
              id: "b",
              text: "'Terima kasih pertanyaannya, Pak. Agar informasinya 100% akurat sesuai ketentuan terbaru, izinkan saya menghubungi Bagian Legal atau mengambilkan lembar panduan persyaratannya untuk Bapak saat ini juga.'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Tepat sekali! Anda jujur menjaga akurasi informasi (Accountability) sekaligus tetap proaktif mencarikan solusi.",
            },
          ],
        },
      ]),
    },
    {
      order: 4,
      slug: "menangani-keluhan-pelanggan",
      title: "Simulasi 4: Menangani Tamu yang Menyampaikan Keluhan",
      subtitle: "Menerapkan metode L.A.S.T (Listen, Apologize, Solve, Thank) saat tamu kecewa",
      scenarioContext:
        "Seorang klien datang dengan nada suara tinggi karena sudah menunggu dokumen penawaran selama 3 hari namun belum menerima kabar dari tim administrasi.",
      customerName: "Ibu Dewi Anggraini",
      customerRole: "Manajer Pengadaan — CV Mandiri Jaya",
      difficulty: "Lanjut",
      estimatedMinutes: 12,
      stepsJson: JSON.stringify([
        {
          id: "s4-step1",
          situation: "Ibu Dewi menghampiri meja layanan dengan raut kesal.",
          customerDialog: "Ini bagaimana sih pelayanannya?! Saya sudah kirim berkas sejak hari Senin, katanya 2 hari selesai. Sekarang sudah hari Kamis belum ada kabar sama sekali!",
          prompt: "Bagaimana reaksi pertama Anda sesuai metode L.A.S.T?",
          options: [
            {
              id: "a",
              text: "'Ibu tenang dulu ya, jangan marah-marah di lobi. Bagian administrasi memang lagi banyak kerjaan minggu ini.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback: "Menyuruh pelanggan 'jangan marah' dan memberi alasan defensif justru memperburuk emosi pelanggan.",
            },
            {
              id: "b",
              text: "Mendengarkan hingga selesai tanpa memotong, menjaga ekspresi tenang dan empati: 'Mohon maaf sebesar-besarnya atas ketidaknyamanan yang Ibu alami. Saya memahami betul berkas tersebut sangat penting bagi Ibu. Izinkan saya segera mengecek status berkas atas nama Ibu sekarang juga.'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Sangat tepat! Anda menerapkan Listen & Apologize dengan empati tinggi tanpa bersikap defensif.",
            },
            {
              id: "c",
              text: "'Itu bukan bagian saya Bu, yang pegang berkas itu Mas Raka di belakang.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback: "Melempar kesalahan ke rekan kerja merusak citra profesional perusahaan.",
            },
          ],
        },
        {
          id: "s4-step2",
          situation: "Setelah mengecek sistem, ternyata berkas sudah selesai ditandatangani pagi ini namun email konfirmasi belum terkirim.",
          customerDialog: "Jadi bagaimana nasib dokumen saya sekarang? Saya butuh hari ini juga.",
          prompt: "Bagaimana Anda menyampaikan solusi dan menutup penanganan keluhan?",
          options: [
            {
              id: "a",
              text: "'Kabar baik Ibu Dewi, berkas Ibu sudah selesai ditandatangani pagi ini. Mohon tunggu 5 menit di ruang tamu, saya akan segera mengambilkan dokumen aslinya dan mengirimkan salinan PDF ke email Ibu. Terima kasih banyak atas masukannya, ini menjadi evaluasi penting bagi layanan kami.'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Brilian! Anda menerapkan Solve & Thank dengan tuntas, memberi kepastian waktu, dan menutup dengan sikap profesional.",
            },
            {
              id: "b",
              text: "'Oh sudah selesai kok Bu, cuma lupa dikabari saja. Tunggu sebentar ya saya ambilkan.'",
              score: 25,
              rating: "Cukup",
              feedback: "Solusi sudah ada, tetapi kalimat 'cuma lupa' terdengar meremehkan masalah dan belum ada ucapan terima kasih atas masukan pelanggan.",
            },
          ],
        },
      ]),
    },
    {
      order: 5,
      slug: "mengakhiri-pelayanan-profesional",
      title: "Simulasi 5: Mengakhiri Pelayanan dengan Sopan & Profesional",
      subtitle: "Menutup sesi kunjungan dengan konfirmasi tuntas dan kesan positif berkelanjutan",
      scenarioContext:
        "Tamu telah selesai bertemu dengan pimpinan dan kembali ke meja resepsionis untuk mengembalikan kartu identitas tamu sebelum meninggalkan kantor.",
      customerName: "Bapak Ridwan Santoso",
      customerRole: "Auditor Mitra Kerja",
      difficulty: "Dasar",
      estimatedMinutes: 8,
      stepsJson: JSON.stringify([
        {
          id: "s5-step1",
          situation: "Bapak Ridwan menyerahkan kartu tamu kembali ke meja resepsionis.",
          customerDialog: "Mbak, pertemuan saya sudah selesai. Ini saya kembalikan kartu tamunya ya.",
          prompt: "Apa langkah penutupan pelayanan yang paling lengkap dan profesional?",
          options: [
            {
              id: "a",
              text: "Menerima kartu dengan satu tangan sambil mengangguk: 'Iya Pak, makasih.'",
              score: 15,
              rating: "Kurang Tepat",
              feedback: "Terlalu singkat dan kurang menunjukkan keramahan penutup.",
            },
            {
              id: "b",
              text: "Menerima kartu dengan dua tangan sambil tersenyum, mencocokkan catatan keluar, dan berkata: 'Terima kasih kembali Bapak Ridwan. Apakah ada dokumen atau informasi lain yang masih bisa saya bantu sebelum Bapak meninggalkan kantor?'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Sempurna! Menerima dengan dua tangan dan memastikan tidak ada kebutuhan tersisa adalah ciri khas pelayanan prima.",
            },
          ],
        },
        {
          id: "s5-step2",
          situation: "Bapak Ridwan menjawab bahwa semua keperluannya sudah terpenuhi dengan baik.",
          customerDialog: "Sudah cukup semua, Mbak. Pelayanannya sangat membantu hari ini.",
          prompt: "Kalimat penutup apa yang meninggalkan kesan terbaik?",
          options: [
            {
              id: "a",
              text: "'Alhamdulillah, terima kasih banyak atas apresiasi dan kunjungan Bapak Ridwan ke kantor kami. Hati-hati di jalan, semoga perjalanan Bapak lancar. Selamat siang, Bapak.'",
              score: 50,
              rating: "Sangat Tepat",
              feedback: "Hangat, santun, dan berkesan! Tamu akan pulang membawa pengalaman pelayanan yang sangat positif.",
            },
            {
              id: "b",
              text: "'Sama-sama Pak, silakan.'",
              score: 25,
              rating: "Cukup",
              feedback: "Sopan, namun masih bisa dibuat lebih hangat dan personal dengan menyebut nama tamu dan doa perjalanan.",
            },
          ],
        },
      ]),
    },
  ];

  const createdSimulations: Record<number, string> = {};
  for (const s of simulationsData) {
    const rec = await prisma.simulation.upsert({
      where: { order: s.order },
      update: {},
      create: s,
    });
    createdSimulations[s.order] = rec.id;
  }

  // Contoh 1 riwayat simulasi siswa demo
  const existingSimAttempt = await prisma.simulationAttempt.findFirst({
    where: { userId: student.id, simulationId: createdSimulations[1] },
  });
  if (!existingSimAttempt) {
    await prisma.simulationAttempt.create({
      data: {
        userId: student.id,
        simulationId: createdSimulations[1],
        score: 95,
        maxScore: 100,
        responsesJson: JSON.stringify([
          { stepId: "s1-step1", choiceId: "b", score: 35 },
          { stepId: "s1-step2", choiceId: "a", score: 35 },
          { stepId: "s1-step3", choiceId: "b", score: 25 },
        ]),
        reflection: "Saya belajar bahwa menyapa tamu dalam 5 detik pertama dan memberi info waktu tunggu membuat tamu merasa dihargai.",
      },
    });
  }

  // 5. Kuis Interaktif
  const existingQuizCount = await prisma.quiz.count();
  if (existingQuizCount === 0) {
    const q1 = await prisma.quiz.create({
      data: {
        materialId: createdMaterials[1],
        title: "Kuis 1: Konsep & Prinsip 6A Pelayanan Prima",
        description: "Uji pemahamanmu mengenai pengertian, jenis pelanggan kantor, dan prinsip 6A pelayanan prima.",
        category: "KONSEP",
        timeLimitMinutes: 10,
        passingScore: 75,
        questionsJson: JSON.stringify([
          {
            id: "q1-1",
            type: "MCQ",
            question: "Pimpinan dan rekan kerja dari divisi lain yang membutuhkan dukungan administrasi kita disebut sebagai...",
            options: ["Pelanggan eksternal", "Pelanggan internal", "Mitra luar", "Konsumen akhir"],
            correctIndex: 1,
            explanation: "Pelanggan internal adalah pihak di dalam organisasi sendiri (atasan, rekan sejawat, antarbagian) yang menggunakan hasil kerja kita.",
          },
          {
            id: "q1-2",
            type: "MCQ",
            question: "Dalam konsep 6A Pelayanan Prima, kerapian seragam, kebersihan diri, dan bahasa tubuh yang baik termasuk dalam unsur...",
            options: ["Ability", "Attention", "Appearance", "Accountability"],
            correctIndex: 2,
            explanation: "Appearance (Penampilan) mencakup penampilan fisik maupun nonfisik yang mencerminkan kredibilitas petugas layanan.",
          },
          {
            id: "q1-3",
            type: "TRUE_FALSE",
            question: "Benar atau Salah: Pelayanan prima hanya wajib diberikan kepada tamu penting atau pejabat yang datang ke kantor.",
            options: ["Benar", "Salah"],
            correctIndex: 1,
            explanation: "Salah. Pelayanan prima harus diberikan secara adil, ramah, dan profesional kepada setiap tamu tanpa membeda-bedakan status.",
          },
          {
            id: "q1-4",
            type: "MCQ",
            question: "Saat petugas resepsionis segera menindaklanjuti janji temu tamu dengan menelepon divisi terkait, ia sedang menerapkan prinsip...",
            options: ["Action", "Appearance", "Accountability", "Ability"],
            correctIndex: 0,
            explanation: "Action (Tindakan) adalah langkah nyata yang dilakukan petugas untuk memenuhi kebutuhan pelanggan secara cepat dan tepat.",
          },
        ]),
      },
    });

    await prisma.quiz.create({
      data: {
        materialId: createdMaterials[3],
        title: "Kuis 2: Etika, Grooming, & Komunikasi Pelayanan",
        description: "Soal benar/salah dan studi kasus tentang etika petugas front office serta komunikasi efektif.",
        category: "ETIKA",
        timeLimitMinutes: 12,
        passingScore: 75,
        questionsJson: JSON.stringify([
          {
            id: "q2-1",
            type: "TRUE_FALSE",
            question: "Benar atau Salah: Menggunakan telapak tangan terbuka saat mengarahkan tamu ke ruang tunggu lebih sopan daripada menunjuk dengan satu jari.",
            options: ["Benar", "Salah"],
            correctIndex: 0,
            explanation: "Benar. Gestur telapak tangan terbuka mencerminkan sikap ramah, menghormati, dan profesional.",
          },
          {
            id: "q2-2",
            type: "MCQ",
            question: "Manakah kalimat berikut yang paling mencerminkan komunikasi positif & solutif?",
            options: [
              "Bapaknya lagi rapat, tidak bisa diganggu.",
              "Mohon maaf Ibu, saat ini Bapak Andi sedang rapat hingga pukul 11.00. Apakah Ibu berkenan menunggu atau menitipkan pesan?",
              "Saya tidak tahu jadwalnya, coba tunggu saja.",
              "Ibu salah ruangan, harusnya ke lantai atas.",
            ],
            correctIndex: 1,
            explanation: "Kalimat tersebut menyampaikan informasi jelas dengan bahasa santun sekaligus menawarkan alternatif solusi.",
          },
          {
            id: "q2-3",
            type: "MCQ",
            question: "Langkah pertama dalam metode L.A.S.T saat menghadapi tamu yang menyampaikan keluhan adalah...",
            options: ["Solve (Mencari solusi)", "Listen (Mendengarkan aktif)", "Thank (Mengucapkan terima kasih)", "Explain (Membela diri)"],
            correctIndex: 1,
            explanation: "Listen (Mendengarkan penuh tanpa memotong) adalah kunci utama meredakan emosi tamu dan memahami akar masalah.",
          },
        ]),
      },
    });

    // Contoh 1 hasil kuis siswa demo
    await prisma.quizAttempt.create({
      data: {
        userId: student.id,
        quizId: q1.id,
        score: 100,
        correctCount: 4,
        totalQuestions: 4,
        answersJson: JSON.stringify({ "q1-1": 1, "q1-2": 2, "q1-3": 1, "q1-4": 0 }),
      },
    });
  }

  // 6. LKPD & Proyek Praktik
  const existingAssignmentCount = await prisma.assignment.count();
  if (existingAssignmentCount === 0) {
    const lkpd1 = await prisma.assignment.create({
      data: {
        type: "LKPD",
        title: "LKPD 1: Analisis Penerapan Prinsip 6A di Lingkungan Kantor",
        description: "Menganalisis skenario pelayanan resepsionis berdasarkan prinsip 6A dan budaya 5S.",
        instructions:
          "Bacalah ringkasan kasus di bawah ini dengan saksama, lalu jawab setiap pertanyaan analisis dengan bahasa yang runtut dan profesional.",
        caseSummary:
          "Seorang tamu datang ke kantor dinas pukul 10.00 untuk menyerahkan berkas kerja sama. Petugas meja depan sedang asyik melihat ponsel dan baru menyapa setelah 2 menit dengan pertanyaan singkat: 'Mau ngapain, Pak?'. Tamu merasa bingung dan kurang nyaman.",
        questionsJson: JSON.stringify([
          "Identifikasi minimal 3 prinsip 6A yang belum diterapkan oleh petugas pada kasus di atas!",
          "Tuliskan contoh kalimat penyambutan yang tepat sesuai budaya 5S untuk situasi tersebut!",
          "Menurutmu, apa dampak sikap petugas tersebut terhadap citra instansi di mata tamu?",
        ]),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.assignment.create({
      data: {
        type: "LKPD",
        title: "LKPD 2: Studi Kasus Penanganan Keluhan Tamu (Metode L.A.S.T)",
        description: "Menyusun dialog penanganan keluhan pelanggan yang menunggu terlalu lama.",
        instructions: "Analisis situasi keluhan berikut dan susun langkah respons berdasarkan tahapan Listen, Apologize, Solve, dan Thank.",
        caseSummary:
          "Ibu Sinta sudah menunggu 40 menit di ruang tunggu karena staf yang ingin ditemui lupa mengabari jadwal perubahan rapat. Ibu Sinta mulai kesal dan menghampiri meja front office.",
        questionsJson: JSON.stringify([
          "Tuliskan kalimat permohonan maaf (Apologize) yang tulus tanpa menyalahkan rekan kerja!",
          "Solusi konkret apa (Solve) yang bisa kamu tawarkan segera kepada Ibu Sinta?",
          "Bagaimana kamu mengakhiri dialog dengan langkah Thank agar Ibu Sinta tetap merasa dihargai?",
        ]),
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.assignment.create({
      data: {
        type: "PROJECT",
        title: "Proyek 1: Menyusun SOP Pelayanan Tamu Sederhana",
        description: "Buat dokumen Standar Operasional Prosedur (SOP) penerimaan tamu perkantoran dalam 1–2 halaman rapi.",
        instructions:
          "Susun SOP mencakup: Tujuan, Ruang Lingkup, Peralatan/Dokumen (buku tamu, kartu visitor), dan Alur Langkah 1–5. Unggah dokumen atau cantumkan tautan Google Docs/PDF.",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.assignment.create({
      data: {
        type: "PROJECT",
        title: "Proyek 2: Video Roleplay Pelayanan Prima & Penanganan Keluhan",
        description: "Buat video bermain peran berpasangan (petugas layanan & tamu) berdurasi 3–5 menit.",
        instructions:
          "Praktikkan penampilan profesional (grooming), budaya 5S, komunikasi efektif, dan penanganan keluhan. Unggah video ke YouTube (Unlisted) atau Google Drive lalu tempel tautannya.",
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.assignment.create({
      data: {
        type: "PROJECT",
        title: "Proyek 3: Panduan Singkat Menghadapi Keluhan Pelanggan",
        description: "Rancang poster digital atau panduan saku (1 halaman) mengenai langkah menghadapi keluhan pelanggan di kantor.",
        instructions:
          "Cantumkan prinsip L.A.S.T, contoh kalimat positif vs kalimat yang harus dihindari, serta etika komunikasi nonverbal.",
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    });

    // Contoh 1 pengumpulan LKPD yang sudah dinilai guru untuk siswa demo
    await prisma.submission.create({
      data: {
        userId: student.id,
        assignmentId: lkpd1.id,
        answersJson: JSON.stringify([
          "Prinsip yang belum diterapkan adalah Attitude (sikap kurang ramah), Attention (sibuk dengan ponsel sehingga mengabaikan tamu), dan Action (lambat merespons kedatangan tamu).",
          "Selamat pagi Bapak, selamat datang di kantor kami. Ada yang bisa saya bantu hari ini?",
          "Tamu akan menilai instansi kurang profesional dan tidak menghargai mitra kerja, sehingga menurunkan kepercayaan.",
        ]),
        status: "GRADED",
        score: 92,
        teacherFeedback: "Analisis sangat runtut dan kalimat 5S yang disusun sudah sangat profesional. Pertahankan, Nadia!",
        gradedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 7. Pengumuman Guru
  const existingAnn = await prisma.announcement.count();
  if (existingAnn === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          title: "Selamat Datang di Office Learning Hub Semester Genap!",
          content:
            "Halo siswa XI MPLB 1 & 2! Silakan pelajari Materi 1 sampai 3 minggu ini dan jangan lupa mencoba Simulasi 1: Menyambut Tamu Kantor sebelum hari Jumat.",
          category: "INFO",
          isPinned: true,
          authorId: teacher.id,
        },
        {
          title: "Batas Pengumpulan LKPD 1 & Persiapan Roleplay",
          content:
            "Pengumpulan LKPD 1 dibuka hingga akhir minggu ini. Mulai minggu depan kita akan membentuk kelompok berpasangan untuk Proyek Video Roleplay Pelayanan Prima.",
          category: "TUGAS",
          isPinned: false,
          authorId: teacher.id,
        },
        {
          title: "Jadwal Praktik Laboratorium Perkantoran",
          content:
            "Hari Kamis pukul 08.00–10.30 WIB seluruh siswa XI MPLB 1 mengenakan seragam praktik lengkap (rapi & berdasi/blazer) untuk simulasi langsung di Lab Perkantoran.",
          category: "JADWAL",
          isPinned: false,
          authorId: teacher.id,
        },
      ],
    });
  }

  // 8. Jadwal Pembelajaran
  const existingSchedule = await prisma.scheduleItem.count();
  if (existingSchedule === 0) {
    await prisma.scheduleItem.createMany({
      data: [
        {
          weekLabel: "Minggu 1",
          topic: "Konsep & Prinsip 6A Pelayanan Prima",
          activity: "Membaca Materi 1–2 & Kuis 1",
          dateRange: "Senin – Jumat",
          materialOrder: 1,
          isCurrent: false,
        },
        {
          weekLabel: "Minggu 2",
          topic: "Etika Petugas & Komunikasi Pelayanan",
          activity: "Materi 3–4, LKPD 1, & Latihan Dialog",
          dateRange: "Minggu Ini",
          materialOrder: 3,
          isCurrent: true,
        },
        {
          weekLabel: "Minggu 3",
          topic: "Prosedur Pelayanan & Simulasi Digital",
          activity: "Materi 5 & Praktik Simulasi 1–3",
          dateRange: "Minggu Depan",
          materialOrder: 5,
          isCurrent: false,
        },
        {
          weekLabel: "Minggu 4",
          topic: "Penanganan Keluhan & Evaluasi Proyek",
          activity: "Materi 6–7, Simulasi 4–5, & Proyek SOP",
          dateRange: "2 Minggu Lagi",
          materialOrder: 6,
          isCurrent: false,
        },
      ],
    });
  }

  // 9. Diskusi Awal
  const existingPosts = await prisma.discussionPost.count();
  if (existingPosts === 0) {
    const p1 = await prisma.discussionPost.create({
      data: {
        title: "Bagaimana jika tamu datang saat resepsionis sedang menelepon?",
        content:
          "Bu Ratna dan teman-teman, kalau kita sedang menerima telepon masuk dari klien, lalu tiba-tiba ada tamu langsung datang ke meja resepsionis, mana yang harus didahulukan ya?",
        category: "STUDI_KASUS",
        authorId: student.id,
      },
    });

    await prisma.discussionReply.create({
      data: {
        postId: p1.id,
        authorId: teacher.id,
        content:
          "Pertanyaan bagus sekali, Nadia! Berikan kontak mata, senyum, dan anggukan sopan kepada tamu yang baru datang agar beliau tahu kehadirannya disadari. Jika telepon bisa diakhiri cepat, segera selesaikan; jika lama, izin 'mohon tunggu sebentar' kepada penelepon lalu sapa tamu di meja depan.",
      },
    });

    await prisma.discussionReply.create({
      data: {
        postId: p1.id,
        authorId: student2.id,
        content: "Terima kasih penjelasannya Bu! Jadi kuncinya tamu yang datang langsung tetap diberi isyarat ramah dulu ya Bu.",
      },
    });
  }

  // 10. Badges Gamifikasi
  const badgesData = [
    {
      code: "FIRST_STEP",
      name: "Langkah Pertama",
      description: "Menyelesaikan materi pertama Pelayanan Prima.",
      icon: "award",
      criteria: "Selesaikan minimal 1 materi pembelajaran",
    },
    {
      code: "SIMULATION_ROOKIE",
      name: "Duta Sapa Ramah",
      description: "Berhasil menyelesaikan Simulasi 1 dengan skor minimal 80.",
      icon: "sparkles",
      criteria: "Skor >= 80 pada Simulasi 1",
    },
    {
      code: "QUIZ_MASTER",
      name: "Bintang Kuis",
      description: "Meraih nilai sempurna (100) pada Kuis Interaktif.",
      icon: "trophy",
      criteria: "Raih nilai 100 di salah satu kuis",
    },
    {
      code: "EXCELLENCE_CHAMPION",
      name: "Juara Pelayanan Prima",
      description: "Menyelesaikan seluruh 7 materi dan 5 simulasi pelayanan digital.",
      icon: "crown",
      criteria: "Tuntaskan 7 materi & 5 simulasi",
    },
  ];

  const createdBadges: Record<string, string> = {};
  for (const b of badgesData) {
    const rec = await prisma.badge.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
    createdBadges[b.code] = rec.id;
  }

  // Berikan 3 badge awal untuk siswa demo sesuai pencapaiannya
  for (const code of ["FIRST_STEP", "SIMULATION_ROOKIE", "QUIZ_MASTER"]) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: student.id, badgeId: createdBadges[code] } },
      update: {},
      create: { userId: student.id, badgeId: createdBadges[code] },
    });
  }

  console.log("Seed selesai! Akun demo siap digunakan:");
  console.log("- Siswa : siswa@officehub.sch.id / smkmplb123");
  console.log("- Guru  : guru@officehub.sch.id  / smkmplb123");
  console.log("- Admin : admin@officehub.sch.id / smkmplb123");
  console.log(`Admin ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
