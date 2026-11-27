import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function syncTeacherIdentity() {
  // Pastikan nama guru = "Deby Nuraini" dan email guru = "debynuraini@gmail.com"
  const existingDeby = await prisma.user.findUnique({
    where: { email: "debynuraini@gmail.com" },
    select: { id: true, name: true },
  });

  if (existingDeby) {
    if (existingDeby.name !== "Deby Nuraini") {
      await prisma.user.update({
        where: { id: existingDeby.id },
        data: { name: "Deby Nuraini" },
      });
    }
    return existingDeby.id;
  }

  const legacyTeacher =
    (await prisma.user.findUnique({
      where: { email: "guru@officehub.sch.id" },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "TEACHER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  if (legacyTeacher) {
    await prisma.user.update({
      where: { id: legacyTeacher.id },
      data: {
        name: "Deby Nuraini",
        email: "debynuraini@gmail.com",
      },
    });
    console.log("Akun guru diperbarui menjadi Deby Nuraini (debynuraini@gmail.com).");
    return legacyTeacher.id;
  }

  return null;
}

async function main() {
  console.log("Memeriksa status kurikulum Pelayanan Tamu di OFFICE LEARNING HUB...");

  // Selalu sinkronkan identitas akun guru (Deby Nuraini / debynuraini@gmail.com)
  await syncTeacherIdentity();

  // Jika kurikulum baru (Pelayanan Tamu) sudah terpasang, lewati agar editan Guru/Admin & PDF aman
  const hasNewCurriculum = await prisma.material.findUnique({
    where: { slug: "penanganan-tamu-secara-langsung" },
    select: { id: true },
  });

  if (hasNewCurriculum) {
    console.log(
      "Kurikulum Pelayanan Tamu sudah terpasang — melewati seeding agar perubahan Guru/Admin aman."
    );
    return;
  }

  console.log("Menyiapkan kurikulum lengkap Pelayanan Tamu (2 Materi, 6 Simulasi, 2 LKPD, 2 Kuis, 6 Proyek)...");

  const passwordHash = await bcrypt.hash("smkmplb123", 10);

  // 1. Pastikan Akun & Kelas Awal Tersedia
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
    where: { email: "debynuraini@gmail.com" },
    update: { name: "Deby Nuraini" },
    create: {
      name: "Deby Nuraini",
      email: "debynuraini@gmail.com",
      passwordHash,
      role: "TEACHER",
      identityNo: "198704152012012004",
      className: "XI MPLB 1",
      avatarColor: "#0f766e",
      bio: "Guru Produktif Manajemen Perkantoran dan Layanan Bisnis (MPLB) — Mata Pelajaran Pelayanan Tamu.",
      points: 0,
    },
  });

  const classroom = await prisma.classroom.upsert({
    where: { code: "MPLB11A" },
    update: {},
    create: {
      name: "XI MPLB 1",
      code: "MPLB11A",
      academicYear: "2026/2027",
      description:
        "Kelas XI Manajemen Perkantoran dan Layanan Bisnis 1 — Mata Pelajaran Pelayanan Tamu.",
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
      description:
        "Kelas XI Manajemen Perkantoran dan Layanan Bisnis 2 — Mata Pelajaran Pelayanan Tamu.",
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
      bio: "Siswa XI MPLB 1 yang antusias mendalami pelayanan tamu perkantoran secara langsung dan melalui telepon.",
      points: 180,
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
      points: 120,
    },
  });

  // 2. Bersihkan data kurikulum lama (jika upgrade dari 7 Materi Pelayanan Prima) tanpa menghapus akun/kelas
  await prisma.discussionReply.deleteMany({});
  await prisma.discussionPost.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.simulationAttempt.deleteMany({});
  await prisma.materialProgress.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.simulation.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.scheduleItem.deleteMany({});

  // 3. 2 MATERI UTAMA PELAYANAN TAMU
  const material1 = await prisma.material.create({
    data: {
      order: 1,
      slug: "penanganan-tamu-secara-langsung",
      title: "Penanganan Tamu Secara Langsung",
      subtitle:
        "Resepsionis, prinsip 3S, 12 macam tamu, tata cara penerimaan, buku & kartu tamu, hambatan, dan dialog",
      summary:
        "Mempelajari standar penerimaan tamu yang datang langsung ke kantor mulai dari peran resepsionis, penerapan 3S, klasifikasi 12 macam tamu, administrasi buku & kartu tamu, hingga praktik dialog profesional.",
      durationMinutes: 35,
      videoUrl: "https://www.youtube.com/embed/eFZbWXN5IHg?rel=0",
      objectivesJson: JSON.stringify([
        "Menjelaskan pentingnya penanganan tamu dan peran strategis resepsionis di lingkungan kantor.",
        "Menerapkan prinsip 3S (Senyum, Salam, Sapa) serta mengenali 12 macam tamu beserta cara menghadapinya.",
        "Melaksanakan tata cara penerimaan tamu serta mengisi Buku Tamu dan Kartu Tamu (Visitor Card) dengan benar.",
        "Mengidentifikasi kesalahan/hambatan penanganan tamu dan mempraktikkan dialog pelayanan tamu secara langsung.",
      ]),
      keyPointsJson: JSON.stringify([
        "Resepsionis adalah wajah pertama instansi yang menentukan kesan awal (first impression) tamu.",
        "Terapkan prinsip 3S: Senyum tulus, Salam sopan sesuai waktu, dan Sapa ramah dalam 5 detik pertama.",
        "Kenali 12 macam tamu kantor agar pendekatan komunikasi sesuai dengan karakter dan situasi kunjungan.",
        "Setiap tamu wajib dicatat dalam Buku Tamu dan diberikan Kartu Tamu (Visitor Card) sesuai prosedur keamanan kantor.",
        "Hindari kesalahan fatal: sibuk dengan ponsel, membiarkan tamu menunggu tanpa kepastian, atau bersikap membeda-bedakan.",
      ]),
      activityPrompt:
        "Rangkum perbedaan cara menghadapi minimal 3 dari 12 macam tamu kantor, lalu tuliskan contoh kalimat penyambutan 3S di meja resepsionis.",
      content: `## 1. Pentingnya Penanganan Tamu
Penanganan tamu adalah kegiatan menyambut, melayani, mengarahkan, dan mendampingi setiap pihak yang datang ke kantor secara tertib, ramah, dan profesional. Kesan pertama (*first impression*) tamu terhadap sebuah perusahaan atau instansi sangat ditentukan sejak langkah pertama mereka memasuki lobi.

Manfaat penanganan tamu yang baik:
- Membangun citra dan reputasi positif instansi di mata klien, mitra kerja, maupun masyarakat.
- Menjaga ketertiban, keamanan, dan kenyamanan aktivitas kerja di dalam kantor.
- Mempercepat tercapainya tujuan kunjungan sehingga tercipta hubungan kerja sama jangka panjang.

## 2. Resepsionis
**Resepsionis** (*Front Office Officer*) adalah petugas garda terdepan yang bertugas menerima tamu, memberikan informasi awal, mencatat administrasi kunjungan, serta menghubungkan tamu dengan pimpinan atau bagian terkait.

Tugas & standar sikap resepsionis:
- **Berpenampilan rapi (grooming)**: seragam bersih, atribut/ID card terpasang, rambut dan riasan rapi, postur tubuh tegak.
- **Siaga di meja layanan**: tidak meninggalkan meja tanpa petugas pengganti dan tidak bermain ponsel pribadi saat ada tamu.
- **Menguasai informasi kantor**: memahami struktur divisi, jadwal pimpinan, lokasi ruangan, serta prosedur keamanan.

## 3. Prinsip 3S (Senyum, Salam, Sapa)
Prinsip dasar interaksi tatap muka di meja resepsionis adalah **3S**:
1. **Senyum**: berikan senyum yang tulus, hangat, dan kontak mata ramah begitu tamu mendekat.
2. **Salam**: ucapkan salam sesuai waktu (*"Selamat pagi/siang/sore"* atau *"Assalamu'alaikum"*) dengan intonasi jelas dan sopan.
3. **Sapa**: sapa tamu dengan menyebut sebutan hormat (*Bapak/Ibu*), sebutkan nama instansi, dan tawarkan bantuan (*"Selamat datang di PT Nusantara Karya, ada yang bisa saya bantu?"*).

## 4. 12 Macam Tamu Kantor & Cara Menghadapinya
Setiap tamu memiliki latar belakang dan karakter berbeda. Petugas layanan perlu mengenali **12 macam tamu**:
1. **Tamu dengan janji temu**: verifikasi jadwal di agenda pimpinan, catat di buku tamu, beri kartu tamu, segera konfirmasi dan arahkan ke ruangan.
2. **Tamu tanpa janji temu**: sambut tetap ramah, gali maksud kunjungan, cek ketersediaan pimpinan/staf terkait; bila tidak tersedia, tawarkan penjadwalan ulang atau penitipan pesan.
3. **Tamu VIP / Pejabat / Pimpinan Mitra**: beri penghormatan protokoler, segera laporkan ke pimpinan, dampingi langsung ke ruang tamu khusus.
4. **Tamu rutin / Rekanan tetap**: jaga keramahan dan keakraban profesional tanpa melupakan prosedur pencatatan tamu.
5. **Tamu yang terburu-buru**: bersikap cekatan, sampaikan informasi singkat-padat-jelas, dan bantu mempercepat koordinasi.
6. **Tamu yang ramah / banyak bicara**: dengarkan dengan sopan sambil mengarahkan percakapan kembali ke tujuan kunjungan secara halus agar antrean tidak terhambat.
7. **Tamu pendiam / ragu-ragu**: proaktif membantu dengan pertanyaan terbuka yang lembut agar tamu merasa nyaman menyampaikan keperluannya.
8. **Tamu yang mengeluh / marah**: tetap tenang, dengarkan tanpa memotong, minta maaf tulus atas ketidaknyamanan, tawarkan solusi nyata, dan arahkan ke ruang terpisah bila perlu.
9. **Tamu yang tidak dapat diterima / ditolak pimpinan**: sampaikan penolakan secara diplomatis dan halus (bukan dengan kata kasar seperti *"Bapak tidak mau ketemu"*), lalu tawarkan alternatif surat/email atau perwakilan staf.
10. **Tamu penawaran / sales**: tanyakan maksud dan surat pengantar, arahkan ke bagian pengadaan/umum sesuai jadwal penerimaan penawaran, atau terima brosur/profil perusahaan secara sopan.
11. **Tamu keluarga / urusan pribadi pimpinan**: tetap terapkan 3S, konfirmasi terlebih dahulu kepada pimpinan sebelum mempersilakan masuk.
12. **Tamu asing / berkebutuhan khusus (disabilitas & lansia)**: prioritaskan kenyamanan akses, gunakan bahasa yang jelas/sederhana atau bahasa Inggris dasar bila diperlukan, dan bantu mobilitas dengan penuh empati.

## 5. Tata Cara Penerimaan Tamu
Alur standar penerimaan tamu secara langsung:
1. **Menyambut (≤ 5 detik)**: hentikan aktivitas sejenak, berdiri/condong ramah, terapkan prinsip 3S.
2. **Mengidentifikasi tamu & keperluan**: tanyakan nama, asal instansi, orang yang dituju, serta apakah sudah memiliki janji temu.
3. **Administrasi Buku & Kartu Tamu**: minta tamu mengisi Buku Tamu dan menukarkan kartu identitas (KTP/SIM) dengan Kartu Tamu (*Visitor Card*).
4. **Konfirmasi ke pihak dituju**: hubungi sekretaris/pimpinan melalui telepon internal untuk memastikan kesiapan menerima tamu.
5. **Mempersilakan menunggu atau mengantar**: arahkan tamu dengan telapak tangan terbuka ke ruang tunggu/ruang rapat, tawarkan air mineral bila menunggu, dan informasikan estimasi waktu tunggu.
6. **Mengakhiri kunjungan**: saat tamu selesai, terima kembali Kartu Tamu, kembalikan identitas tamu, catat jam keluar, ucapkan terima kasih, dan beri salam perpisahan.

## 6. Buku Tamu dan Kartu Tamu
- **Buku Tamu (*Guest Book*)**: dokumen pencatatan resmi kunjungan kantor untuk keperluan keamanan, arsip, dan evaluasi layanan. Kolom wajib meliputi: *No, Tanggal, Jam Datang, Nama Tamu, Instansi/Alamat, Bertemu Dengan, Keperluan, Nomor Kartu Tamu, Jam Keluar, dan Tanda Tangan*.
- **Kartu Tamu (*Visitor Card*)**: tanda pengenal resmi bertuliskan *VISITOR / TAMU* bernomor urut yang wajib dipakai selama berada di area kantor dan dikembalikan saat meninggalkan gedung.

## 7. Kesalahan dan Hambatan dalam Penanganan Tamu
**Kesalahan yang harus dihindari:**
- Sibuk dengan ponsel atau mengobrol dengan rekan saat tamu berdiri di depan meja.
- Menunjuk arah dengan satu jari atau menggunakan kalimat ketus (*"Tunggu saja di situ"*).
- Tidak memberi kepastian waktu tunggu dan lupa mengembalikan KTP tamu.

**Hambatan umum & solusinya:**
- *Beberapa tamu datang bersamaan* → beri kontak mata & senyum ke seluruh tamu, layani tertib sesuai antrean/urgensi sambil memohon izin sopan.
- *Pimpinan mendadak rapat/keluar* → segera beri kabar jujur & santun kepada tamu serta tawarkan opsi menunggu, bertemu wakil, atau menjadwalkan ulang.

## 8. Contoh Dialog Penanganan Tamu Secara Langsung
**Resepsionis:** *"Selamat pagi Bapak, selamat datang di PT Nusantara Karya Mandiri. Ada yang bisa saya bantu?"*
**Tamu:** *"Selamat pagi Mbak. Saya Arif Wibowo dari PT Sinar Abadi, saya sudah ada janji temu dengan Ibu Diah pukul 09.30."*
**Resepsionis:** *"Baik Bapak Arif, terima kasih sudah datang tepat waktu. Mohon berkenan mengisi Buku Tamu terlebih dahulu dan menitipkan kartu identitas untuk penukaran Kartu Tamu, sementara saya konfirmasi ke ruangan Ibu Diah."*
**Tamu:** *"Baik Mbak, ini KTP saya dan buku tamunya sudah saya isi."*
**Resepsionis:** *"Terima kasih, Pak. Ini Kartu Tamu nomor 04, silakan dikenakan. Saya sudah menghubungi Ibu Diah dan beliau siap menerima Bapak. Mari saya antar ke Ruang Rapat Melati di sebelah kanan."*`,
      isPublished: true,
    },
  });

  const material2 = await prisma.material.create({
    data: {
      order: 2,
      slug: "penanganan-tamu-melalui-telepon",
      title: "Penanganan Tamu Melalui Telepon",
      subtitle:
        "Telepon kantor, etiket, 13 langkah prosedur, kalimat dianjurkan & dihindari, situasi khusus, LPT, menelepon keluar, dan dialog",
      summary:
        "Menguasai keterampilan profesional melayani tamu melalui telepon kantor: pengenalan perangkat PABX, etiket bertelepon, 13 langkah prosedur, pengisian Lembar Pesan Telepon (LPT), hingga prosedur menelepon keluar.",
      durationMinutes: 35,
      objectivesJson: JSON.stringify([
        "Menjelaskan pentingnya penanganan telepon kantor dan mengenal fungsi dasar telepon kantor (PABX, ekstensi, hold, transfer).",
        "Menerapkan etiket bertelepon dan 13 langkah prosedur menerima telepon kantor dengan tepat.",
        "Membedakan kalimat yang dianjurkan dan dihindari serta menangani berbagai situasi khusus saat bertelepon.",
        "Mengisi Lembar Pesan Telepon (LPT) secara lengkap dan mempraktikkan prosedur menelepon keluar.",
      ]),
      keyPointsJson: JSON.stringify([
        "Angkat telepon kantor maksimal pada dering ke-3 dengan suara ramah ('smiling voice'), jelas, dan tempo sedang.",
        "Pahami fungsi tombol telepon kantor: Hold (menahan panggilan), Transfer (menyambungkan ke ekstensi), Mute, dan Redial.",
        "Ikuti 13 langkah prosedur menerima telepon dan gunakan kalimat positif yang solutif (hindari kata 'Halo' saja atau 'Nggak tahu').",
        "Jika pimpinan tidak dapat menerima telepon, catat seluruh informasi pada Lembar Pesan Telepon (LPT) dan bacakan ulang untuk konfirmasi.",
        "Sebelum menelepon keluar, siapkan nomor tujuan, identitas instansi, serta pokok pesan yang ingin disampaikan.",
      ]),
      activityPrompt:
        "Tuliskan 3 contoh kalimat yang harus dihindari saat bertelepon beserta perbaikannya menjadi kalimat profesional yang dianjurkan, lalu sebutkan komponen wajib pada LPT.",
      content: `## 1. Pentingnya Penanganan Telepon Kantor
Melalui telepon, tamu tidak dapat melihat ekspresi wajah atau kerapian ruangan kantor. Oleh karena itu, **kualitas suara, kesantunan bahasa, dan ketepatan prosedur bertelepon** menjadi representasi penuh citra profesional instansi. Penanganan telepon yang lambat atau kasar dapat membuat klien membatalkan kerja sama.

## 2. Mengenal Telepon Kantor
Di perkantoran modern umumnya digunakan sistem **PABX (*Private Automatic Branch Exchange*)** yang menghubungkan saluran luar ke berbagai ekstensi (*extension*) antarbagian.
Fitur penting pada pesawat telepon kantor:
- **Extension (Ekstensi)**: nomor sambungan internal antarruangan/divisi (misal: 101 untuk Pimpinan, 202 untuk Keuangan).
- **Hold**: menahan panggilan sementara (biasanya terdengar musik tunggu) saat petugas mengecek informasi atau mengonfirmasi divisi lain.
- **Transfer**: memindahkan panggilan masuk ke nomor ekstensi pegawai/bagian tujuan.
- **Mute**: mematikan mikrofon sementara agar suara di sekitar meja tidak terdengar penelepon.
- **Speakerphone**: mode pengeras suara (gunakan hanya bila diperlukan dan tetap jaga privasi).

## 3. Etiket Bertelepon
- Angkat gagang telepon **maksimal pada dering ke-3** menggunakan tangan kiri agar tangan kanan siap menulis.
- Duduk tegak dan **tersenyum saat berbicara** (*smiling voice*) karena senyum memengaruhi kehangatan nada suara.
- Berbicara dengan artikulasi jelas, volume sedang, tidak terlalu cepat, dan jarak gagang ± 2–3 cm dari mulut.
- Jangan makan, minum, menguap, atau mengobrol dengan rekan saat sambungan aktif.
- Biarkan penelepon menutup gagang telepon terlebih dahulu, lalu letakkan gagang secara perlahan.

## 4. 13 Langkah Prosedur Menerima Telepon Kantor
1. Siapkan alat tulis dan formulir **Lembar Pesan Telepon (LPT)** di samping pesawat telepon.
2. Angkat gagang telepon segera (**maksimal dering ke-3**).
3. Ucapkan salam sesuai waktu (*"Selamat pagi/siang/sore"*).
4. Sebutkan **nama instansi/perusahaan** dengan jelas.
5. Sebutkan **nama petugas** dan tawarkan bantuan (*"Dengan Nadia, ada yang bisa saya bantu?"*).
6. Dengarkan identitas serta keperluan penelepon dengan penuh perhatian tanpa memotong.
7. Catat nama penelepon, instansi, nomor telepon, dan pihak yang ingin dihubungi.
8. Bila perlu mengecek ketersediaan pimpinan/staf, **minta izin** terlebih dahulu sebelum menekan tombol **Hold**.
9. Hubungi ekstensi pihak dituju dan sampaikan siapa yang menelepon sebelum melakukan **Transfer**.
10. Jika pihak dituju **tidak tersedia / sedang rapat**, sampaikan dengan kalimat santun dan tawarkan pencatatan pesan pada **LPT**.
11. **Bacakan ulang (konfirmasi)** isi pesan, ejaan nama, dan nomor telepon penelepon agar tidak terjadi kesalahan.
12. Tanyakan apakah masih ada hal lain yang dapat dibantu, lalu ucapkan **terima kasih dan salam penutup**.
13. Letakkan gagang telepon perlahan setelah penelepon menutup sambungan, kemudian **segera teruskan LPT** kepada pihak yang dituju.

## 5. Kalimat yang Dianjurkan dan Dihindari
- **Hindari:** *"Halo, siapa ini?"* → **Anjurkan:** *"Selamat pagi, PT Nusantara Karya Mandiri, dengan Nadia. Mohon maaf, boleh saya tahu dengan Bapak/Ibu siapa saya berbicara?"*
- **Hindari:** *"Bapaknya lagi keluar / nggak ada di tempat."* → **Anjurkan:** *"Mohon maaf Ibu, saat ini Bapak Hendra sedang dinas luar hingga pukul 14.00. Apakah ada pesan yang ingin Ibu sampaikan agar segera saya teruskan?"*
- **Hindari:** *"Tunggu sebentar ya!"* (lalu langsung ditinggal) → **Anjurkan:** *"Mohon izin menunggu sejenak Bapak, saya sambungkan terlebih dahulu ke Bagian Keuangan."*
- **Hindari:** *"Saya nggak tahu, coba telepon lagi nanti."* → **Anjurkan:** *"Mohon maaf, saya bantu cek terlebih dahulu ke bagian terkait. Boleh saya catat nomor Bapak agar kami hubungi kembali?"*

## 6. Situasi Khusus Saat Bertelepon
- **Penelepon marah / komplain**: tetap tenang, jangan ikut terpancing emosi, dengarkan penuh, catat poin keluhan, ucapkan permohonan maaf tulus atas ketidaknyamanan, dan sampaikan tindak lanjut yang jelas.
- **Salah sambung**: tetap sopan, sebutkan kembali nama instansi dan nomor kantor Anda agar penelepon dapat memeriksa ulang nomornya.
- **Penelepon menolak menyebut nama/keperluan**: jelaskan dengan halus bahwa konfirmasi identitas diperlukan agar petugas dapat menghubungkan ke bagian yang tepat.
- **Sambungan tiba-tiba terputus**: jika Anda yang menelepon keluar, segera hubungi kembali; jika penelepon dari luar, tunggu sejenak hingga mereka menelepon kembali dan ucapkan maaf atas gangguan jaringan.
- **Dua panggilan masuk bersamaan**: minta izin sebentar kepada penelepon pertama untuk menahan (*Hold*), angkat panggilan kedua, minta izin menunggu/tinggalkan pesan, lalu segera kembali ke penelepon pertama.

## 7. Mencatat Pesan — Lembar Pesan Telepon (LPT)
**Lembar Pesan Telepon (LPT)** adalah formulir resmi pencatatan pesan telepon masuk ketika orang yang dituju tidak dapat menerima panggilan.
Komponen wajib pada LPT:
1. **Untuk / Kepada** (nama pimpinan/staf dan bagiannya)
2. **Hari, Tanggal, & Jam Panggilan**
3. **Dari** (nama penelepon) & **Instansi/Perusahaan**
4. **Nomor Telepon / Ekstensi** yang bisa dihubungi kembali
5. **Status Panggilan** (*Menelepon / Ingin bertemu / Minta ditelepon kembali / Penting-Segera*)
6. **Isi Pesan** secara ringkas, jelas, dan akurat
7. **Nama & Paraf Penerima Pesan**

## 8. Prosedur Menelepon Keluar (Outgoing Call)
1. **Persiapan**: pastikan nomor telepon tujuan benar, siapkan dokumen pendukung, dan catat pokok pembicaraan yang akan disampaikan.
2. **Membuka panggilan**: setelah diangkat, ucapkan salam, sebutkan nama diri dan instansi, lalu sampaikan nama orang/bagian yang ingin dihubungi.
3. **Menyampaikan pesan**: bicaralah sistematis, sopan, singkat, dan jelas; catat kesepakatan/jawaban penting.
4. **Menutup panggilan**: konfirmasi ulang hasil pembicaraan (jadwal/tindak lanjut), ucapkan terima kasih dan salam penutup, lalu tutup gagang dengan sopan.

## 9. Contoh Dialog Penanganan Telepon
**Dialog Telepon Masuk (Mencatat LPT):**
- **Petugas:** *"Selamat pagi, PT Nusantara Karya Mandiri, dengan Nadia. Ada yang bisa saya bantu?"*
- **Penelepon:** *"Selamat pagi, saya Raka dari PT Mitra Sejati. Bisa bicara dengan Bapak Direktur?"*
- **Petugas:** *"Mohon maaf Bapak Raka, saat ini Bapak Direktur sedang memimpin rapat hingga pukul 11.30. Apakah ada pesan yang berkenan Bapak titipkan agar segera saya sampaikan melalui Lembar Pesan Telepon?"*
- **Penelepon:** *"Tolong sampaikan agar beliau menghubungi saya kembali di 0812-3456-7890 terkait revisi kontrak kerja sama."*
- **Petugas:** *"Baik Bapak Raka, saya konfirmasi ulang: pesan dari Bapak Raka (PT Mitra Sejati), nomor 0812-3456-7890, mohon Bapak Direktur menghubungi kembali terkait revisi kontrak kerja sama. Ada hal lain yang bisa saya bantu, Pak?"*
- **Penelepon:** *"Sudah cukup, terima kasih."*
- **Petugas:** *"Terima kasih kembali telah menghubungi PT Nusantara Karya Mandiri. Selamat pagi."*`,
      isPublished: true,
    },
  });

  // Progres awal siswa demo (Materi 1 selesai, Materi 2 sedang dipelajari)
  await prisma.materialProgress.createMany({
    data: [
      {
        userId: student.id,
        materialId: material1.id,
        status: "COMPLETED",
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: student.id,
        materialId: material2.id,
        status: "IN_PROGRESS",
      },
    ],
  });

  // 4. 6 SIMULASI DIGITAL (S1-S3 Materi 1, S4-S6 Materi 2)
  const simulationsData = [
    {
      order: 1,
      slug: "tamu-dengan-janji",
      title: "S1: Tamu dengan Janji",
      subtitle: "Materi 1 — Menyambut tamu berjanji temu dengan 3S, Buku Tamu, dan Kartu Tamu",
      scenarioContext:
        "Pukul 09.25 WIB di meja resepsionis PT Nusantara Karya Mandiri. Bapak Arif Wibowo dari PT Sinar Abadi datang membawa map dokumen karena memiliki janji temu pukul 09.30 dengan Ibu Diah (Manajer Operasional).",
      customerName: "Bapak Arif Wibowo",
      customerRole: "Klien PT Sinar Abadi (Sudah Punya Janji)",
      difficulty: "Dasar",
      estimatedMinutes: 8,
      stepsJson: JSON.stringify([
        {
          id: "s1-step1",
          situation:
            "Bapak Arif berjalan menghampiri meja resepsionis saat Anda sedang merapikan berkas surat masuk.",
          customerDialog: "(Berhenti di depan meja resepsionis sambil tersenyum membawa map)",
          prompt: "Bagaimana tindakan pertama sesuai prinsip 3S?",
          options: [
            {
              id: "a",
              text: "Segera menghentikan aktivitas, tersenyum, kontak mata ramah, dan menyapa: 'Selamat pagi Bapak, selamat datang di PT Nusantara Karya Mandiri. Ada yang bisa saya bantu?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Anda menerapkan prinsip 3S (Senyum, Salam, Sapa) dalam 5 detik pertama sehingga menciptakan kesan awal profesional.",
            },
            {
              id: "b",
              text: "Tetap merapikan berkas dulu 1 menit lalu bertanya: 'Ada perlu apa, Pak?'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Tamu harus selalu diprioritaskan segera. Membiarkan tamu menunggu tanpa salam melanggar standar resepsionis.",
            },
            {
              id: "c",
              text: "Langsung menyodorkan buku tamu tanpa mengucapkan salam.",
              score: 15,
              rating: "Cukup",
              feedback:
                "Pencatatan buku tamu penting, namun harus didahului prinsip 3S agar tamu merasa dihargai.",
            },
          ],
        },
        {
          id: "s1-step2",
          situation:
            "Bapak Arif menjelaskan bahwa ia sudah membuat janji temu dengan Ibu Diah pukul 09.30 WIB.",
          customerDialog:
            "Selamat pagi. Saya Arif Wibowo dari PT Sinar Abadi, saya ada janji temu dengan Ibu Diah pukul 09.30.",
          prompt: "Apa langkah administrasi tamu yang paling tepat Anda lakukan selanjutnya?",
          options: [
            {
              id: "a",
              text: "Mempersilakan Bapak Arif langsung naik ke lantai 2 tanpa mencatat di buku tamu karena sudah punya janji.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Setiap tamu tetap wajib mengisi Buku Tamu dan mengenakan Kartu Tamu (Visitor Card) demi keamanan dan tertib administrasi.",
            },
            {
              id: "b",
              text: "Mengecek jadwal janji temu, mempersilakan mengisi Buku Tamu & menukar identitas dengan Kartu Tamu, lalu menghubungi Ibu Diah via telepon internal.",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Tepat sekali! Verifikasi jadwal, Buku Tamu, Kartu Tamu, dan konfirmasi internal adalah prosedur baku penerimaan tamu.",
            },
            {
              id: "c",
              text: "Meminta Bapak Arif duduk saja tanpa menghubungi Ibu Diah.",
              score: 15,
              rating: "Kurang Tepat",
              feedback:
                "Pimpinan wajib segera dikonfirmasi agar jadwal pertemuan berjalan tepat waktu.",
            },
          ],
        },
        {
          id: "s1-step3",
          situation:
            "Ibu Diah mengonfirmasi siap menerima Bapak Arif di Ruang Rapat Melati. Kartu Tamu #04 sudah diserahkan.",
          customerDialog: "Terima kasih, saya sudah memakai kartu tamunya. Ruangan Ibu Diah di sebelah mana ya?",
          prompt: "Bagaimana cara Anda mengarahkan Bapak Arif dengan etiket resepsionis?",
          options: [
            {
              id: "a",
              text: "Menunjuk lorong dengan satu jari sambil berkata: 'Lurus saja nanti belok kanan.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Menunjuk dengan satu jari dianggap kurang sopan. Gunakan telapak tangan terbuka atau antar langsung tamu ke ruangan.",
            },
            {
              id: "b",
              text: "Mengarahkan dengan telapak tangan terbuka dan mengantar Bapak Arif: 'Mari Bapak Arif, saya antar menuju Ruang Rapat Melati di sebelah kanan. Silakan.'",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Luar biasa! Gestur telapak tangan terbuka dan pengantaran langsung mencerminkan standar pelayanan tamu yang unggul.",
            },
          ],
        },
      ]),
    },
    {
      order: 2,
      slug: "tamu-tanpa-janji-pimpinan-tidak-di-tempat",
      title: "S2: Tamu Tanpa Janji & Pimpinan Tidak di Tempat",
      subtitle: "Materi 1 — Melayani tamu tanpa janji secara diplomatis saat pimpinan dinas luar",
      scenarioContext:
        "Ibu Lestari dari CV Cipta Mandiri datang tanpa janji temu pukul 11.00 WIB untuk bertemu Bapak Hendra (Kepala Bagian Umum). Saat ini Bapak Hendra sedang dinas luar hingga besok pagi.",
      customerName: "Ibu Lestari",
      customerRole: "Perwakilan CV Cipta Mandiri (Tanpa Janji)",
      difficulty: "Dasar",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s2-step1",
          situation:
            "Ibu Lestari menghampiri meja resepsionis membawa berkas proposal kerja sama dan tampak ingin segera bertemu pimpinan.",
          customerDialog:
            "Permisi Mbak, saya Lestari dari CV Cipta Mandiri. Saya mau langsung bertemu Bapak Hendra untuk menyerahkan proposal kerja sama.",
          prompt: "Bagaimana respons awal yang paling profesional?",
          options: [
            {
              id: "a",
              text: "'Selamat siang Ibu Lestari, selamat datang. Mohon maaf, apakah sebelumnya Ibu sudah membuat janji temu dengan Bapak Hendra?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sangat baik! Anda menyapa hangat dengan menyebut nama tamu dan menanyakan status janji temu secara santun.",
            },
            {
              id: "b",
              text: "'Kalau belum bikin janji tidak boleh ketemu Bapak Hendra, Bu.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Kalimat bernada menolak secara langsung terkesan kaku dan tidak ramah terhadap tamu.",
            },
            {
              id: "c",
              text: "'Bapaknya lagi pergi, Ibu pulang saja dulu.'",
              score: 5,
              rating: "Kurang Tepat",
              feedback:
                "Sangat tidak profesional. Petugas harus menyampaikan informasi dengan halus dan menawarkan solusi.",
            },
          ],
        },
        {
          id: "s2-step2",
          situation:
            "Ibu Lestari menjawab belum membuat janji karena sedang melintas dekat kantor dan berharap bisa bertemu sebentar.",
          customerDialog: "Belum Mbak, saya kebetulan lewat sini jadi sekalian mampir. Bapak Hendra ada di ruangan?",
          prompt: "Bagaimana cara Anda menyampaikan bahwa Bapak Hendra sedang dinas luar sekaligus menawarkan solusi?",
          options: [
            {
              id: "a",
              text: "'Mohon maaf Ibu Lestari, saat ini Bapak Hendra sedang dinas luar hingga besok pagi. Sebagai alternatif, berkas proposal dapat Ibu titipkan melalui saya dengan tanda terima resmi, atau saya bantu jadwalkan pertemuan besok pukul 10.00. Mana yang lebih nyaman bagi Ibu?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Anda menyampaikan informasi jujur dengan bahasa diplomatis dan memberikan dua opsi solusi konkret.",
            },
            {
              id: "b",
              text: "'Tidak ada Bu, saya tidak tahu kapan Bapak kembali.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Resepsionis harus mengetahui agenda pimpinan dan tidak boleh menjawab 'tidak tahu' tanpa solusi.",
            },
          ],
        },
        {
          id: "s2-step3",
          situation:
            "Ibu Lestari memilih menitipkan berkas proposal dan meminta jadwal pertemuan besok pagi pukul 10.00 WIB.",
          customerDialog: "Baik Mbak, saya titipkan proposalnya saja dan tolong jadwalkan besok jam 10 ya.",
          prompt: "Langkah administrasi apa yang wajib Anda selesaikan sebelum Ibu Lestari berpamitan?",
          options: [
            {
              id: "a",
              text: "Mempersilakan Ibu Lestari mengisi Buku Tamu & nomor kontak, mencatat rencana janji temu di agenda, memberikan tanda terima berkas, dan mengucapkan terima kasih dengan 3S.",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Tepat sekali! Seluruh kunjungan dan berkas titipan tercatat rapi sehingga dapat segera ditindaklanjuti.",
            },
            {
              id: "b",
              text: "Langsung menerima map dan menaruhnya di tumpukan meja tanpa mencatat nomor kontak tamu.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Tanpa pencatatan di Buku Tamu dan nomor kontak, berkas berisiko terselip dan jadwal sulit dikonfirmasi.",
            },
          ],
        },
      ]),
    },
    {
      order: 3,
      slug: "tamu-mengeluh",
      title: "S3: Tamu Mengeluh",
      subtitle: "Materi 1 — Menenangkan tamu yang mengeluh dengan empati & solusi cepat",
      scenarioContext:
        "Bapak Rudi dari PT Maju Makmur sudah menunggu 35 menit di ruang tunggu karena staf bagian pemasaran lupa mengabari perubahan jadwal. Beliau menghampiri meja resepsionis dengan nada kesal.",
      customerName: "Bapak Rudi Hartono",
      customerRole: "Mitra Bisnis (Tamu Mengeluh)",
      difficulty: "Menengah",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s3-step1",
          situation:
            "Bapak Rudi berbicara dengan nada tinggi di depan meja resepsionis saat ada tamu lain duduk di lobi.",
          customerDialog:
            "Mbak, saya sudah menunggu lebih dari setengah jam! Kenapa tidak ada kabar sama sekali? Waktu saya sangat berharga!",
          prompt: "Bagaimana sikap pertama Anda menghadapi tamu yang mengeluh?",
          options: [
            {
              id: "a",
              text: "Tetap tenang, menjaga kontak mata empatik, mendengarkan tanpa memotong, lalu menyampaikan permohonan maaf tulus: 'Mohon maaf sebesar-besarnya atas ketidaknyamanan Bapak Rudi. Saya sangat memahami waktu Bapak sangat berharga.'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Luar biasa! Tetap tenang, mendengarkan penuh, dan meminta maaf tulus adalah langkah utama meredakan emosi tamu.",
            },
            {
              id: "b",
              text: "Menjawab defensif: 'Salah staf pemasarannya Pak, bukan salah saya di resepsionis.'",
              score: 5,
              rating: "Kurang Tepat",
              feedback:
                "Jangan pernah menyalahkan rekan kerja atau divisi lain di hadapan tamu karena itu merusak citra instansi.",
            },
            {
              id: "c",
              text: "Memotong pembicaraan: 'Sabar dong Pak, jangan marah-marah di lobi.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Menyuruh tamu yang sedang kesal untuk 'sabar' dengan nada menegur justru memperkeruh suasana.",
            },
          ],
        },
        {
          id: "s3-step2",
          situation:
            "Emosi Bapak Rudi mulai mereda, tetapi ia menuntut kepastian apakah pertemuannya jadi berlangsung hari ini.",
          customerDialog: "Lalu sekarang bagaimana? Jadi ketemu atau tidak?",
          prompt: "Tindakan solusi apa yang paling tepat segera Anda lakukan?",
          options: [
            {
              id: "a",
              text: "Segera menghubungi kepala bagian/staf pemasaran di hadapan Bapak Rudi dengan sopan, memastikan dalam 5 menit ada perwakilan yang menemui di ruang meeting, serta menawarkan minuman penyegar.",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sangat profesional! Anda bertindak sigap memberi kepastian waktu nyata dan memulihkan kenyamanan tamu.",
            },
            {
              id: "b",
              text: "Meminta Bapak Rudi menunggu 30 menit lagi tanpa menelepon bagian terkait.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Menambah waktu tunggu tanpa kepastian akan semakin menurunkan kepercayaan tamu.",
            },
          ],
        },
        {
          id: "s3-step3",
          situation:
            "Perwakilan pemasaran segera keluar menemui Bapak Rudi. Setelah selesai, Bapak Rudi mengembalikan Kartu Tamu.",
          customerDialog: "Terima kasih Mbak sudah cepat bantu tadi.",
          prompt: "Bagaimana Anda menutup pelayanan kepada tamu yang sempat mengeluh?",
          options: [
            {
              id: "a",
              text: "Tersenyum ramah, mengembalikan identitas tamu, mengucapkan terima kasih atas masukan Bapak Rudi sebagai bahan perbaikan layanan kami, dan mencatat evaluasi di log layanan.",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Mengapresiasi masukan tamu dan mencatatnya sebagai evaluasi menunjukkan tanggung jawab profesional.",
            },
            {
              id: "b",
              text: "Hanya mengangguk singkat sambil mengambil kartu tamu.",
              score: 15,
              rating: "Cukup",
              feedback:
                "Tetap tutup interaksi dengan ucapan terima kasih hangat dan salam perpisahan agar kesan akhir positif.",
            },
          ],
        },
      ]),
    },
    {
      order: 4,
      slug: "pimpinan-rapat-dan-mencatat-lpt",
      title: "S4: Pimpinan Rapat & Mencatat LPT",
      subtitle: "Materi 2 — Menerima telepon sesuai 13 langkah prosedur & mengisi Lembar Pesan Telepon",
      scenarioContext:
        "Telepon kantor berdering di meja resepsionis. Ibu Sinta dari PT Mega Karya ingin berbicara dengan Bapak Direktur terkait perubahan jadwal tanda tangan MoU, namun Bapak Direktur sedang memimpin rapat penting hingga pukul 11.30 WIB.",
      customerName: "Ibu Sinta Dewi",
      customerRole: "Sekretaris Direksi — PT Mega Karya",
      difficulty: "Dasar",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s4-step1",
          situation: "Pesawat telepon kantor baru berdering 2 kali. Alat tulis dan formulir LPT tersedia di meja.",
          customerDialog: "(Telepon berdering: kring... kring...)",
          prompt: "Bagaimana cara Anda mengangkat dan membuka percakapan telepon sesuai etiket & prosedur?",
          options: [
            {
              id: "a",
              text: "Mengangkat dengan tangan kiri pada dering ke-2, tersenyum suara, dan mengucapkan: 'Selamat pagi, PT Nusantara Karya Mandiri, dengan Nadia. Ada yang bisa saya bantu?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Mengangkat ≤ 3 dering, menyebut salam, nama instansi, nama petugas, dan menawarkan bantuan sesuai 13 langkah prosedur.",
            },
            {
              id: "b",
              text: "Mengangkat pada dering ke-6 lalu berkata: 'Halo, dengan siapa ini?'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Jangan membiarkan telepon berdering lebih dari 3 kali dan hindari membuka telepon kantor dengan kata 'Halo' saja.",
            },
          ],
        },
        {
          id: "s4-step2",
          situation:
            "Ibu Sinta meminta disambungkan langsung ke Bapak Direktur yang saat ini sedang rapat penting.",
          customerDialog:
            "Selamat pagi Mbak Nadia, saya Sinta dari PT Mega Karya. Bisa tolong sambungkan ke Bapak Direktur?",
          prompt: "Kalimat mana yang paling dianjurkan untuk merespons permintaan Ibu Sinta?",
          options: [
            {
              id: "a",
              text: "'Mohon maaf Ibu Sinta, saat ini Bapak Direktur sedang memimpin rapat hingga pukul 11.30. Apakah ada pesan yang ingin Ibu sampaikan agar segera saya catat pada Lembar Pesan Telepon dan teruskan begitu rapat selesai?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Tepat sekali! Kalimat sopan, informatif, dan langsung menawarkan pencatatan pesan melalui LPT.",
            },
            {
              id: "b",
              text: "'Bapaknya lagi rapat, tidak bisa diganggu. Nanti Ibu telepon lagi saja ya.'",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Kalimat tersebut termasuk kalimat yang dihindari karena terkesan menolak dan tidak membantu penelepon.",
            },
          ],
        },
        {
          id: "s4-step3",
          situation:
            "Ibu Sinta menitipkan pesan bahwa jadwal tanda tangan MoU diundur ke Kamis pukul 10.00 WIB dan meminta konfirmasi ke nomor 021-5544332.",
          customerDialog:
            "Tolong sampaikan jadwal MoU diundur jadi Kamis jam 10 pagi ya Mbak, mohon konfirmasi ke 021-5544332.",
          prompt: "Apa langkah wajib sebelum Anda menutup telepon setelah menulis di LPT?",
          options: [
            {
              id: "a",
              text: "Membacakan ulang seluruh isi LPT (nama penelepon, instansi, nomor 021-5544332, dan jadwal Kamis 10.00 WIB) untuk konfirmasi akurasi, menawarkan bantuan lain, lalu mengucapkan terima kasih & salam penutup.",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Luar biasa! Membaca ulang (repeat-back) mencegah salah catat angka/jadwal, dan menutup setelah penelepon menutup sesuai etiket.",
            },
            {
              id: "b",
              text: "Langsung menjawab 'Oke siap Bu' lalu menutup gagang telepon duluan.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Tanpa membaca ulang isi pesan berisiko salah informasi, dan petugas tidak boleh menutup gagang sebelum penelepon.",
            },
          ],
        },
      ]),
    },
    {
      order: 5,
      slug: "hold-atau-transfer",
      title: "S5: Hold atau Transfer Telepon",
      subtitle: "Materi 2 — Etiket menahan (Hold) dan menyambungkan (Transfer) panggilan ke ekstensi",
      scenarioContext:
        "Bapak Danu dari CV Sejahtera menelepon untuk menanyakan status pembayaran faktur nomor INV-204 kepada Bagian Keuangan (ekstensi 202). Anda perlu menahan panggilan sebentar dan menyambungkannya ke ekstensi 202.",
      customerName: "Bapak Danu Wijaya",
      customerRole: "Bagian Penagihan — CV Sejahtera",
      difficulty: "Menengah",
      estimatedMinutes: 10,
      stepsJson: JSON.stringify([
        {
          id: "s5-step1",
          situation:
            "Setelah Anda menyapa sesuai prosedur, Bapak Danu meminta disambungkan ke Bagian Keuangan mengenai faktur INV-204.",
          customerDialog:
            "Saya Danu dari CV Sejahtera, ingin bicara dengan Bagian Keuangan untuk konfirmasi faktur INV-204.",
          prompt: "Apa yang harus Anda ucapkan sebelum menekan tombol Hold pada telepon kantor?",
          options: [
            {
              id: "a",
              text: "'Baik Bapak Danu dari CV Sejahtera. Mohon izin menunggu sebentar ya Pak, saya cek ketersediaan Bagian Keuangan terlebih dahulu.' — tunggu jawaban 'ya' lalu tekan tombol Hold.",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sangat tepat! Meminta izin dan menunggu persetujuan penelepon sebelum menekan tombol Hold adalah etiket wajib PABX.",
            },
            {
              id: "b",
              text: "Langsung menekan tombol Hold tanpa memberi tahu penelepon.",
              score: 5,
              rating: "Kurang Tepat",
              feedback:
                "Langsung menekan Hold tanpa izin membuat penelepon bingung dan merasa diabaikan.",
            },
          ],
        },
        {
          id: "s5-step2",
          situation:
            "Anda menghubungi ekstensi 202 (Bagian Keuangan), ternyata saluran ekstensi 202 sedang sibuk selama hampir 1 menit.",
          customerDialog: "(Penelepon masih menunggu di jalur Hold selama 45 detik)",
          prompt: "Apa tindakan terbaik yang harus Anda lakukan saat ekstensi tujuan masih sibuk?",
          options: [
            {
              id: "a",
              text: "Segera kembali ke jalur Bapak Danu sebelum 1 menit: 'Terima kasih telah menunggu, Bapak Danu. Mohon maaf, saluran Bagian Keuangan saat ini masih sibuk. Apakah Bapak berkenan tetap menunggu atau ingin menitipkan pesan dan nomor kontak agar segera dihubungi kembali?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Penelepon tidak boleh dibiarkan di jalur Hold terlalu lama tanpa kabar. Memberi pilihan menunggu atau LPT sangat profesional.",
            },
            {
              id: "b",
              text: "Membiarkan Bapak Danu di jalur Hold selama 5 menit sampai ekstensi 202 kosong.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Menahan penelepon lebih dari 1 menit tanpa konfirmasi ulang sangat tidak etis dan membuat penelepon kesal.",
            },
          ],
        },
        {
          id: "s5-step3",
          situation:
            "Bapak Danu memilih menunggu 1 menit lagi, dan kini staf Keuangan (Ibu Rina, ekstensi 202) mengangkat sambungan internal Anda.",
          customerDialog: "(Ibu Rina di ekstensi 202: 'Halo, Keuangan dengan Rina.')",
          prompt: "Bagaimana cara melakukan Transfer yang benar (Warm Transfer)?",
          options: [
            {
              id: "a",
              text: "Menyampaikan identitas penelepon dan keperluannya kepada Ibu Rina ('Bu Rina, ada telepon dari Bapak Danu, CV Sejahtera, menanyakan faktur INV-204. Boleh saya sambungkan?'), baru menekan Transfer setelah Ibu Rina siap.",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Brilian! Warm Transfer memudahkan staf tujuan menyiapkan data sehingga penelepon tidak perlu mengulang cerita dari awal.",
            },
            {
              id: "b",
              text: "Langsung menyambungkan tanpa memberi tahu Ibu Rina siapa yang menelepon.",
              score: 15,
              rating: "Cukup",
              feedback:
                "Blind transfer membuat penelepon harus menjelaskan ulang keperluannya. Biasakan menginformasikan identitas tamu terlebih dahulu.",
            },
          ],
        },
      ]),
    },
    {
      order: 6,
      slug: "menelepon-keluar",
      title: "S6: Menelepon Keluar",
      subtitle: "Materi 2 — Prosedur persiapan, pembukaan, penyampaian pesan, & penutupan panggilan keluar",
      scenarioContext:
        "Pimpinan menugaskan Anda menelepon Bagian Pemasaran PT Cahaya Abadi (021-7788990) untuk mengonfirmasi jadwal pengiriman 50 paket ATK yang dijadwalkan tiba besok pukul 09.00 WIB.",
      customerName: "Resepsionis PT Cahaya Abadi",
      customerRole: "Penerima Telepon Kantor Mitra",
      difficulty: "Menengah",
      estimatedMinutes: 8,
      stepsJson: JSON.stringify([
        {
          id: "s6-step1",
          situation:
            "Anda diminta segera menelepon PT Cahaya Abadi terkait pesanan 50 paket ATK nomor PO-118.",
          customerDialog: "(Sebelum menekan nomor tujuan di telepon kantor)",
          prompt: "Persiapan apa yang wajib Anda lakukan sebelum menekan tombol panggilan?",
          options: [
            {
              id: "a",
              text: "Memastikan nomor telepon benar (021-7788990), menyiapkan dokumen PO-118, mencatat poin pertanyaan (konfirmasi pengiriman 50 paket ATK besok 09.00 WIB), dan menyiapkan alat tulis.",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Tepat sekali! Persiapan nomor, dokumen pendukung, dan pokok pesan membuat panggilan keluar efisien dan profesional.",
            },
            {
              id: "b",
              text: "Langsung menelepon saja lalu mencari nomor PO sambil mengobrol.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Mencari data saat telepon sudah tersambung membuang waktu penerima telepon dan terkesan tidak siap.",
            },
          ],
        },
        {
          id: "s6-step2",
          situation:
            "Telepon tersambung dan diangkat oleh resepsionis PT Cahaya Abadi.",
          customerDialog: "Selamat siang, PT Cahaya Abadi, dengan Dika. Ada yang bisa saya bantu?",
          prompt: "Bagaimana kalimat pembuka yang paling tepat saat menelepon keluar?",
          options: [
            {
              id: "a",
              text: "'Selamat siang Mas Dika. Saya Nadia dari PT Nusantara Karya Mandiri. Boleh saya disambungkan ke Bagian Pemasaran untuk konfirmasi pengiriman pesanan PO-118?'",
              score: 35,
              rating: "Sangat Tepat",
              feedback:
                "Sangat profesional! Anda membalas salam, menyebutkan nama diri, instansi asal, bagian tujuan, dan keperluan secara ringkas.",
            },
            {
              id: "b",
              text: "'Halo, bisa bicara sama bagian pengiriman? Barangnya jadi dikirim besok kan?'",
              score: 15,
              rating: "Kurang Tepat",
              feedback:
                "Saat menelepon keluar, penelepon wajib memperkenalkan nama dan instansi terlebih dahulu.",
            },
          ],
        },
        {
          id: "s6-step3",
          situation:
            "Bagian Pemasaran PT Cahaya Abadi mengonfirmasi 50 paket ATK PO-118 akan dikirim besok pukul 09.00 WIB oleh kurir bernama Pak Andi.",
          customerDialog:
            "Baik Mbak Nadia, pesanan PO-118 sejumlah 50 paket ATK sudah siap dan akan tiba besok jam 9 pagi diantar Pak Andi.",
          prompt: "Bagaimana cara menutup panggilan keluar sesuai etiket?",
          options: [
            {
              id: "a",
              text: "Mencatat detail konfirmasi, mengulang singkat kesepakatan ('Baik, kami tunggu besok pukul 09.00 WIB melalui Pak Andi'), mengucapkan terima kasih & salam penutup, lalu menutup telepon dengan sopan.",
              score: 30,
              rating: "Sangat Tepat",
              feedback:
                "Sempurna! Mengonfirmasi ulang hasil pembicaraan dan menutup dengan santun melengkapi prosedur menelepon keluar.",
            },
            {
              id: "b",
              text: "Langsung berkata 'Oke' dan mematikan sambungan telepon.",
              score: 10,
              rating: "Kurang Tepat",
              feedback:
                "Menutup telepon secara mendadak tanpa ucapan terima kasih dan salam penutup tidak sesuai etiket perkantoran.",
            },
          ],
        },
      ]),
    },
  ];

  const createdSimulations: Record<number, string> = {};
  for (const s of simulationsData) {
    const rec = await prisma.simulation.create({ data: s });
    createdSimulations[s.order] = rec.id;
  }

  // Contoh 1 riwayat simulasi siswa demo
  await prisma.simulationAttempt.create({
    data: {
      userId: student.id,
      simulationId: createdSimulations[1],
      score: 100,
      maxScore: 100,
      responsesJson: JSON.stringify([
        { stepId: "s1-step1", choiceId: "a", score: 35 },
        { stepId: "s1-step2", choiceId: "b", score: 35 },
        { stepId: "s1-step3", choiceId: "b", score: 30 },
      ]),
      reflection:
        "Saya belajar bahwa menyambut tamu dengan 3S, mencatat Buku Tamu, menukar Kartu Tamu, dan mengantar tamu membuat kesan pertama kantor sangat profesional.",
    },
  });

  // 5. 2 KUIS INTERAKTIF (Kuis 1 = Materi 1, Kuis 2 = Materi 2)
  const q1 = await prisma.quiz.create({
    data: {
      materialId: material1.id,
      title: "Kuis 1: Penanganan Tamu Secara Langsung",
      description:
        "Evaluasi Materi 1: peran resepsionis, prinsip 3S, 12 macam tamu, tata cara penerimaan, buku & kartu tamu, serta hambatan layanan.",
      category: "KONSEP",
      timeLimitMinutes: 15,
      passingScore: 75,
      questionsJson: JSON.stringify([
        {
          id: "q1-1",
          type: "MCQ",
          question: "Prinsip dasar 3S yang wajib diterapkan resepsionis saat menyambut tamu yang datang langsung adalah...",
          options: [
            "Siap, Sigap, Santai",
            "Senyum, Salam, Sapa",
            "Sopan, Sabar, Setia",
            "Salam, Siaga, Solusi",
          ],
          correctIndex: 1,
          explanation:
            "Prinsip 3S adalah Senyum (ramah dan tulus), Salam (sesuai waktu), dan Sapa (menawarkan bantuan dengan sopan).",
        },
        {
          id: "q1-2",
          type: "MCQ",
          question:
            "Saat menghadapi tamu yang datang tanpa janji temu sedangkan pimpinan sedang dinas luar, sikap resepsionis yang paling tepat adalah...",
          options: [
            "Menolak langsung karena belum membuat janji sebelumnya",
            "Meminta tamu menunggu sampai pimpinan pulang tanpa kepastian",
            "Menyampaikan ketidakhadiran pimpinan secara santun dan menawarkan penitipan pesan/berkas atau penjadwalan ulang",
            "Membiarkan tamu masuk ke ruangan pimpinan yang kosong",
          ],
          correctIndex: 2,
          explanation:
            "Resepsionis harus tetap ramah, menyampaikan informasi secara diplomatis, dan menawarkan solusi konkret (titip pesan/berkas atau jadwal ulang).",
        },
        {
          id: "q1-3",
          type: "TRUE_FALSE",
          question:
            "Benar atau Salah: Tamu yang sudah dikenal baik atau sering berkunjung ke kantor tidak perlu mengisi Buku Tamu dan tidak perlu memakai Kartu Tamu.",
          options: ["Benar", "Salah"],
          correctIndex: 1,
          explanation:
            "Salah. Setiap tamu (termasuk tamu rutin/rekanan) tetap wajib dicatat di Buku Tamu dan mengenakan Kartu Tamu (Visitor Card) demi keamanan dan tertib administrasi.",
        },
        {
          id: "q1-4",
          type: "MCQ",
          question: "Manakah komponen yang WAJIB tercantum dalam format Buku Tamu kantor?",
          options: [
            "Nomor rekening, nama ibu kandung, dan hobi tamu",
            "Tanggal, jam datang, nama tamu, instansi, pihak dituju, keperluan, nomor kartu tamu, jam keluar, dan tanda tangan",
            "Hanya nama depan dan nomor kendaraan saja",
            "Foto pribadi dan riwayat pendidikan tamu",
          ],
          correctIndex: 1,
          explanation:
            "Buku Tamu berfungsi sebagai arsip kunjungan dan keamanan, sehingga wajib memuat identitas kunjungan, keperluan, nomor kartu tamu, jam datang/keluar, dan tanda tangan.",
        },
        {
          id: "q1-5",
          type: "CASE",
          question:
            "Seorang tamu mengeluh keras di lobi karena sudah menunggu lama akibat kelalaian staf bagian lain. Langkah pertama yang tepat dilakukan resepsionis adalah...",
          options: [
            "Menyalahkan staf bagian lain agar tamu tahu bukan salah resepsionis",
            "Menyuruh tamu diam karena mengganggu tamu lainnya",
            "Tetap tenang, mendengarkan tanpa memotong, meminta maaf tulus, dan segera mengonfirmasi solusi ke bagian terkait",
            "Meninggalkan meja resepsionis untuk menghindari tamu tersebut",
          ],
          correctIndex: 2,
          explanation:
            "Menghadapi tamu mengeluh membutuhkan ketenangan, empati mendengarkan, permohonan maaf tanpa menyalahkan rekan, dan solusi cepat.",
        },
        {
          id: "q1-6",
          type: "TRUE_FALSE",
          question:
            "Benar atau Salah: Mengarahkan tamu menuju ruang rapat dengan telapak tangan terbuka lebih sopan dibandingkan menunjuk dengan satu jari telunjuk.",
          options: ["Benar", "Salah"],
          correctIndex: 0,
          explanation:
            "Benar. Gestur telapak tangan terbuka mencerminkan keramahan, rasa hormat, dan etiket profesional seorang resepsionis.",
        },
      ]),
    },
  });

  await prisma.quiz.create({
    data: {
      materialId: material2.id,
      title: "Kuis 2: Penanganan Tamu Melalui Telepon",
      description:
        "Evaluasi Materi 2: pengenalan telepon kantor (PABX), etiket, 13 langkah prosedur, kalimat dianjurkan/dihindari, situasi khusus, LPT, dan menelepon keluar.",
      category: "ETIKA",
      timeLimitMinutes: 15,
      passingScore: 75,
      questionsJson: JSON.stringify([
        {
          id: "q2-1",
          type: "MCQ",
          question: "Sesuai etiket bertelepon di kantor, gagang telepon masuk sebaiknya diangkat maksimal pada dering ke-...",
          options: ["Dering ke-1 saja", "Dering ke-3", "Dering ke-5", "Dering ke-7"],
          correctIndex: 1,
          explanation:
            "Standar profesional menerima telepon kantor adalah mengangkat maksimal pada dering ke-3 agar penelepon tidak menunggu terlalu lama.",
        },
        {
          id: "q2-2",
          type: "MCQ",
          question: "Tombol pada pesawat telepon kantor (PABX) yang berfungsi menahan panggilan sementara saat petugas mengecek informasi adalah...",
          options: ["Redial", "Transfer", "Hold", "Flash"],
          correctIndex: 2,
          explanation:
            "Tombol Hold menahan sambungan sementara (biasanya memutar nada tunggu) setelah petugas meminta izin terlebih dahulu kepada penelepon.",
        },
        {
          id: "q2-3",
          type: "MCQ",
          question: "Manakah kalimat pembuka menerima telepon kantor yang PALING dianjurkan?",
          options: [
            "Halo, siapa nih?",
            "Ya, kantor di sini, mau bicara sama siapa?",
            "Selamat pagi, PT Nusantara Karya Mandiri, dengan Nadia. Ada yang bisa saya bantu?",
            "Halo, tunggu sebentar ya!",
          ],
          correctIndex: 2,
          explanation:
            "Pembukaan telepon kantor harus mencantumkan salam sesuai waktu, nama instansi, nama petugas, dan penawaran bantuan.",
        },
        {
          id: "q2-4",
          type: "MCQ",
          question: "Fungsi utama dari Lembar Pesan Telepon (LPT) adalah...",
          options: [
            "Mencatat daftar harga barang kantor",
            "Mencatat pesan telepon masuk secara akurat ketika pihak yang dituju sedang tidak dapat menerima panggilan",
            "Menggantikan buku tamu untuk pengunjung tatap muka",
            "Menghitung tagihan bulanan telepon kantor",
          ],
          correctIndex: 1,
          explanation:
            "LPT memastikan pesan dari penelepon (identitas, nomor kontak, isi pesan, dan tindak lanjut) tersampaikan akurat kepada pihak dituju.",
        },
        {
          id: "q2-5",
          type: "TRUE_FALSE",
          question:
            "Benar atau Salah: Saat mengakhiri percakapan telepon masuk, petugas kantor sebaiknya membiarkan penelepon menutup sambungan terlebih dahulu sebelum meletakkan gagang telepon.",
          options: ["Benar", "Salah"],
          correctIndex: 0,
          explanation:
            "Benar. Menunggu penelepon menutup sambungan terlebih dahulu menunjukkan rasa hormat dan menghindari kesan tergesa-gesa atau memutus pembicaraan.",
        },
        {
          id: "q2-6",
          type: "CASE",
          question:
            "Sebelum melakukan panggilan keluar (menelepon keluar) ke instansi mitra, langkah persiapan paling penting adalah...",
          options: [
            "Langsung memutar nomor tanpa catatan agar lebih spontan",
            "Memeriksa kebenaran nomor tujuan, menyiapkan dokumen pendukung, alat tulis, dan pokok pesan yang akan disampaikan",
            "Menyalakan speakerphone dengan volume maksimal",
            "Menanyakan dulu kepada penelepon siapa namanya sebelum memperkenalkan diri",
          ],
          correctIndex: 1,
          explanation:
            "Persiapan nomor, dokumen, dan pokok pesan membuat panggilan keluar berjalan efektif, sopan, dan tidak membuang waktu lawan bicara.",
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
      correctCount: 6,
      totalQuestions: 6,
      answersJson: JSON.stringify({
        "q1-1": 1,
        "q1-2": 2,
        "q1-3": 1,
        "q1-4": 1,
        "q1-5": 2,
        "q1-6": 0,
      }),
    },
  });

  // 6. 2 LKPD + 6 PROYEK PRAKTIK (3 Materi 1 + 3 Materi 2)
  const lkpd1 = await prisma.assignment.create({
    data: {
      type: "LKPD",
      title: "LKPD 1: Studi Kasus Penanganan Tamu Secara Langsung",
      description:
        "Materi 1 — Menganalisis kasus tiga tamu datang bersamaan di meja resepsionis serta menyusun isian Buku Tamu dan Kartu Tamu.",
      instructions:
        "Bacalah studi kasus tiga tamu datang bersamaan di bawah ini dengan teliti. Jawab seluruh pertanyaan analisis dan tuliskan rincian pengisian Buku Tamu / Kartu Tamu secara lengkap (atau lampirkan berkas PDF formulir yang sudah diisi).",
      caseSummary:
        "Pukul 09.30 WIB di lobi PT Nusantara Karya Mandiri, tiga tamu datang bersamaan ke meja resepsionis: (1) Bapak Hendra Wijaya dari Dinas Pendidikan yang sudah memiliki janji temu pukul 09.30 dengan Direktur Utama, (2) Ibu Maya dari CV Sumber Berkah yang datang tanpa janji untuk menitipkan surat penawaran ATK, dan (3) Bapak Doni dari PT Karya Sentosa yang datang dengan wajah kesal mengeluhkan berkas kerja samanya belum mendapat kabar sejak minggu lalu.",
      questionsJson: JSON.stringify([
        "Kelompokkan ketiga tamu tersebut berdasarkan klasifikasi 12 macam tamu, lalu tentukan urutan prioritas penanganannya beserta alasannya!",
        "Tuliskan contoh kalimat penyambutan (prinsip 3S) dan langkah komunikasi yang tepat untuk menangani masing-masing dari ketiga tamu yang datang bersamaan tersebut!",
        "Susunlah rincian pengisian Buku Tamu dan nomor Kartu Tamu (Visitor Card) yang lengkap untuk ketiga tamu tersebut (Tanggal, Jam Datang, Nama, Instansi, Bertemu Dengan, Keperluan, No. Kartu Tamu)!",
        "Identifikasi minimal 3 kesalahan atau hambatan yang berpotensi terjadi dalam situasi tersebut dan bagaimana cara resepsionis mengatasinya!",
      ]),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.assignment.create({
    data: {
      type: "LKPD",
      title: "LKPD 2: Studi Kasus Penanganan Telepon di Kantor",
      description:
        "Materi 2 — Menganalisis kasus tiga panggilan telepon di kantor serta menyusun pengisian Lembar Pesan Telepon (LPT).",
      instructions:
        "Pelajari tiga kasus panggilan telepon perkantoran di bawah ini, lalu jawab setiap pertanyaan berdasarkan 13 langkah prosedur, etiket bertelepon, kalimat yang dianjurkan, serta lengkapi isian Lembar Pesan Telepon (LPT).",
      caseSummary:
        "Dalam satu pagi di meja operator PT Nusantara Karya Mandiri terjadi tiga panggilan telepon: (1) Pukul 09.10, Ibu Ratna dari PT Graha Utama menelepon ingin berbicara dengan Manajer HRD (Ibu Diah), namun Ibu Diah sedang rapat hingga pukul 11.00; Ibu Ratna menitipkan pesan agar jadwal wawancara kandidat diundur ke Jumat pukul 10.00 dan minta dihubungi kembali di 0813-2244-5566. (2) Pukul 09.25, Bapak Fajar dari PT Sinar Jaya menelepon meminta disambungkan ke Bagian Keuangan (ekstensi 202) terkait faktur, tetapi saluran 202 sedang sibuk. (3) Pukul 09.40, seorang pelanggan (Bapak Anton) menelepon dengan nada marah karena pengiriman barangnya terlambat 2 hari.",
      questionsJson: JSON.stringify([
        "Uraikan langkah penanganan yang sesuai dengan 13 langkah prosedur & etiket bertelepon untuk Panggilan 1, Panggilan 2 (proses Hold/Transfer saat sibuk), dan Panggilan 3 (situasi khusus penelepon marah)!",
        "Susunlah isian lengkap Lembar Pesan Telepon (LPT) untuk Panggilan 1 (Untuk, Hari/Tanggal/Jam, Dari, Instansi, Nomor Telepon, Status, Isi Pesan, dan Penerima Pesan)!",
        "Tuliskan minimal 3 contoh kalimat yang HARUS DIHINDARI pada ketiga kasus telepon di atas, lalu ubah menjadi kalimat profesional yang DIANJURKAN!",
        "Jika pada pukul 11.15 Ibu Diah meminta Anda menelepon keluar ke Ibu Ratna (0813-2244-5566) untuk menyetujui jadwal Jumat pukul 10.00, tuliskan dialog singkat prosedur menelepon keluar yang tepat!",
      ]),
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    },
  });

  // 6 PROYEK PRAKTIK (3 Materi 1 + 3 Materi 2)
  await prisma.assignment.createMany({
    data: [
      {
        type: "PROJECT",
        title: "Proyek 1 (Materi 1): Menyusun Bagian SOP Penanganan Tamu Langsung",
        description:
          "Materi 1 — Menyusun dokumen bagian Standar Operasional Prosedur (SOP) penerimaan tamu yang datang langsung ke kantor.",
        instructions:
          "Buat dokumen SOP Penanganan Tamu Secara Langsung (1–2 halaman PDF) yang memuat: Tujuan, Ruang Lingkup, Peralatan (Buku Tamu, Kartu Tamu, telepon internal), serta alur langkah 3S hingga tamu berpamitan. Unggah file PDF hasil karyamu.",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PROJECT",
        title: "Proyek 2 (Materi 1): Video Adegan Resepsionis dan Tamu",
        description:
          "Materi 1 — Membuat video praktik bermain peran (roleplay) adegan resepsionis melayani tamu secara langsung di kantor.",
        instructions:
          "Buat video berpasangan berdurasi 3–5 menit yang menampilkan grooming resepsionis, penerapan 3S, pengisian Buku Tamu & penukaran Kartu Tamu, serta pengantaran tamu. Unggah ke YouTube (Unlisted) atau Google Drive lalu tempel tautannya.",
        dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PROJECT",
        title: "Proyek 3 (Materi 1): Panduan Menghadapi Tamu yang Mengeluh",
        description:
          "Materi 1 — Merancang poster/panduan saku (1 halaman PDF) mengenai langkah profesional menangani tamu yang mengeluh di meja depan.",
        instructions:
          "Susun panduan visual (PDF) berisi sikap menghadapi tamu mengeluh, contoh kalimat empatik vs kalimat yang harus dihindari, serta alur penyelesaian keluhan dan pencatatan evaluasi layanan.",
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PROJECT",
        title: "Proyek 4 (Materi 2): Menyusun Bagian SOP Penanganan Telepon Kantor",
        description:
          "Materi 2 — Menyusun dokumen bagian SOP menerima telepon masuk, proses Hold/Transfer, pengisian LPT, dan menelepon keluar.",
        instructions:
          "Buat dokumen SOP Penanganan Telepon Kantor (1–2 halaman PDF) yang merangkum 13 langkah prosedur menerima telepon, tata cara Hold & Transfer pada PABX, standar pengisian LPT, dan alur menelepon keluar. Unggah dalam format PDF.",
        dueDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PROJECT",
        title: "Proyek 5 (Materi 2): Video Adegan Penerima Telepon dan Penelepon",
        description:
          "Materi 2 — Membuat video roleplay berpasangan antara petugas penerima telepon kantor dan penelepon (termasuk Hold/Transfer atau mencatat LPT).",
        instructions:
          "Rekam adegan berdurasi 3–5 menit yang menunjukkan etiket 3 dering, smiling voice, kalimat yang dianjurkan, pencatatan & pembacaan ulang LPT, atau proses menelepon keluar. Unggah ke YouTube (Unlisted) / Google Drive dan tempel tautannya.",
        dueDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PROJECT",
        title: "Proyek 6 (Materi 2): Panduan Menghadapi Penelepon Marah",
        description:
          "Materi 2 — Merancang panduan praktis (1 halaman PDF) cara menghadapi situasi khusus penelepon yang marah atau menyampaikan komplain lewat telepon.",
        instructions:
          "Buat panduan ringkas (PDF) memuat teknik menjaga ketenangan suara, langkah mendengarkan aktif, kalimat pereda emosi yang dianjurkan vs kalimat yang harus dihindari, serta format tindak lanjut LPT untuk keluhan.",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Contoh 1 pengumpulan LKPD yang sudah dinilai guru untuk siswa demo
  await prisma.submission.create({
    data: {
      userId: student.id,
      assignmentId: lkpd1.id,
      answersJson: JSON.stringify([
        "1) Bapak Hendra = Tamu dengan janji temu & VIP (prioritas 1 untuk segera dikonfirmasi ke Direktur), 2) Bapak Doni = Tamu mengeluh (segera disapa empatik & diarahkan tenang agar tidak mengganggu lobi), 3) Ibu Maya = Tamu tanpa janji/penawaran (disambut ramah dan dibantu penitipan berkas dengan tanda terima).",
        "Memberi kontak mata dan senyum 3S ke semua tamu, menyapa Bapak Hendra untuk mengisi buku tamu dan konfirmasi Direktur, memohon izin sebentar untuk menenangkan Bapak Doni di area duduk terpisah, lalu melayani Ibu Maya dengan sopan.",
        "Buku Tamu memuat tanggal, jam 09.30, nama lengkap, instansi (Dinas Pendidikan / CV Sumber Berkah / PT Karya Sentosa), pihak dituju, keperluan masing-masing, serta penukaran identitas dengan Kartu Tamu No. 01, 02, dan 03.",
        "Kesalahan yang dihindari: membeda-bedakan keramahan, panik/tergesa-gesa tanpa 3S, lupa mencatat buku tamu atau mengembalikan KTP. Solusi: tetap tenang, komunikatif, dan tertib administrasi.",
      ]),
      status: "GRADED",
      score: 92,
      teacherFeedback:
        "Analisis prioritas tiga tamu dan pengisian buku/kartu tamu sudah sangat runtut dan profesional. Pertahankan, Nadia!",
      gradedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // 7. Pengumuman Guru
  await prisma.announcement.createMany({
    data: [
      {
        title: "Selamat Datang di Modul Pelayanan Tamu SMK MPLB!",
        content:
          "Halo siswa XI MPLB 1 & 2! Semester ini kita mempelajari 2 materi utama: Penanganan Tamu Secara Langsung (Materi 1) dan Penanganan Tamu Melalui Telepon (Materi 2), lengkap dengan 6 simulasi digital, 2 LKPD, 2 kuis, dan 6 proyek praktik.",
        category: "INFO",
        isPinned: true,
        authorId: teacher.id,
      },
      {
        title: "Target Minggu Ini: Materi 1, Simulasi S1–S3, & LKPD 1",
        content:
          "Silakan pelajari Materi 1 (Penanganan Tamu Secara Langsung), selesaikan Simulasi S1 sampai S3, lalu kerjakan LKPD 1 (kasus tiga tamu datang bersamaan + buku/kartu tamu).",
        category: "TUGAS",
        isPinned: false,
        authorId: teacher.id,
      },
      {
        title: "Jadwal Praktik Lab Front Office & Telepon PABX",
        content:
          "Hari Kamis pukul 08.00–10.30 WIB seluruh siswa XI MPLB 1 mengenakan seragam praktik lengkap untuk latihan langsung adegan resepsionis, pengisian Buku Tamu, dan praktik telepon kantor (LPT).",
        category: "JADWAL",
        isPinned: false,
        authorId: teacher.id,
      },
    ],
  });

  // 8. Jadwal Pembelajaran
  await prisma.scheduleItem.createMany({
    data: [
      {
        weekLabel: "Minggu 1",
        topic: "Materi 1: Penanganan Tamu Secara Langsung",
        activity: "Baca Materi 1, 3S, 12 Macam Tamu, & Buku/Kartu Tamu",
        dateRange: "Minggu Ini",
        materialOrder: 1,
        isCurrent: true,
      },
      {
        weekLabel: "Minggu 2",
        topic: "Praktik & Evaluasi Materi 1",
        activity: "Simulasi S1–S3, LKPD 1, Kuis 1, & Proyek 1–3",
        dateRange: "Minggu Depan",
        materialOrder: 1,
        isCurrent: false,
      },
      {
        weekLabel: "Minggu 3",
        topic: "Materi 2: Penanganan Tamu Melalui Telepon",
        activity: "Baca Materi 2, Etiket, 13 Langkah Prosedur, & LPT",
        dateRange: "2 Minggu Lagi",
        materialOrder: 2,
        isCurrent: false,
      },
      {
        weekLabel: "Minggu 4",
        topic: "Praktik & Evaluasi Materi 2",
        activity: "Simulasi S4–S6, LKPD 2, Kuis 2, & Proyek 4–6",
        dateRange: "3 Minggu Lagi",
        materialOrder: 2,
        isCurrent: false,
      },
    ],
  });

  // 9. Diskusi Awal
  const p1 = await prisma.discussionPost.create({
    data: {
      title: "Bagaimana jika tamu langsung datang saat resepsionis sedang menerima telepon?",
      content:
        "Bu Guru dan teman-teman, kalau kita sedang menerima telepon masuk dari klien, lalu tiba-tiba ada tamu datang langsung ke meja resepsionis, bagaimana cara menangani keduanya sesuai etiket?",
      category: "STUDI_KASUS",
      authorId: student.id,
    },
  });

  await prisma.discussionReply.createMany({
    data: [
      {
        postId: p1.id,
        authorId: teacher.id,
        content:
          "Pertanyaan bagus sekali, Nadia! Berikan kontak mata, senyum 3S, dan anggukan sopan kepada tamu di meja depan agar beliau tahu kehadirannya disadari. Selesaikan telepon dengan cepat, atau minta izin Hold sebentar kepada penelepon untuk menyapa tamu lalu lanjutkan layanan secara tertib.",
      },
      {
        postId: p1.id,
        authorId: student2.id,
        content:
          "Terima kasih penjelasannya Bu! Jadi keduanya tetap merasa dihargai tanpa ada yang diabaikan ya Bu.",
      },
    ],
  });

  // 10. Badges Gamifikasi (Update label agar sesuai Pelayanan Tamu: 2 Materi & 6 Simulasi)
  const badgesData = [
    {
      code: "FIRST_STEP",
      name: "Langkah Pertama",
      description: "Menyelesaikan materi pertama Pelayanan Tamu.",
      icon: "award",
      criteria: "Selesaikan minimal 1 materi pembelajaran",
    },
    {
      code: "SIMULATION_ROOKIE",
      name: "Duta Sapa 3S",
      description: "Berhasil menyelesaikan Simulasi 1 (Tamu dengan Janji) dengan skor minimal 80.",
      icon: "sparkles",
      criteria: "Skor >= 80 pada Simulasi 1",
    },
    {
      code: "QUIZ_MASTER",
      name: "Bintang Kuis",
      description: "Meraih nilai sempurna (100) pada Kuis Interaktif Pelayanan Tamu.",
      icon: "trophy",
      criteria: "Raih nilai 100 di salah satu kuis",
    },
    {
      code: "EXCELLENCE_CHAMPION",
      name: "Juara Pelayanan Tamu",
      description: "Menyelesaikan seluruh 2 materi dan 6 simulasi pelayanan tamu digital.",
      icon: "crown",
      criteria: "Tuntaskan 2 materi & 6 simulasi",
    },
  ];

  const createdBadges: Record<string, string> = {};
  for (const b of badgesData) {
    const rec = await prisma.badge.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        description: b.description,
        criteria: b.criteria,
      },
      create: b,
    });
    createdBadges[b.code] = rec.id;
  }

  for (const code of ["FIRST_STEP", "SIMULATION_ROOKIE", "QUIZ_MASTER"]) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: student.id, badgeId: createdBadges[code] } },
      update: {},
      create: { userId: student.id, badgeId: createdBadges[code] },
    });
  }

  console.log("Seed kurikulum Pelayanan Tamu selesai! (2 Materi, 6 Simulasi, 2 LKPD, 2 Kuis, 6 Proyek)");
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
