import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIndoDate } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const [students, quizAttempts, submissions, simAttempts] = await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        orderBy: [{ className: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          identityNo: true,
          className: true,
          email: true,
          points: true,
        },
      }),
      prisma.quizAttempt.findMany({
        include: {
          user: { select: { id: true, name: true, identityNo: true, className: true } },
          quiz: { select: { title: true, passingScore: true } },
        },
        orderBy: { completedAt: "desc" },
      }),
      prisma.submission.findMany({
        include: {
          user: { select: { id: true, name: true, identityNo: true, className: true } },
          assignment: { select: { title: true, type: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.simulationAttempt.findMany({
        include: {
          user: { select: { id: true, name: true, identityNo: true, className: true } },
          simulation: { select: { title: true, order: true } },
        },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    // 1. Sheet Rekap Nilai Semua Siswa
    const rekapRows = students.map((s, idx) => {
      const sQuizzes = quizAttempts.filter((q) => q.userId === s.id);
      const sLkpds = submissions.filter(
        (sub) => sub.userId === s.id && sub.assignment.type === "LKPD" && sub.score !== null
      );
      const sProjects = submissions.filter(
        (sub) => sub.userId === s.id && sub.assignment.type === "PROJECT" && sub.score !== null
      );
      const sSims = simAttempts.filter((sim) => sim.userId === s.id && sim.status === "GRADED");

      const avg = (nums: number[]) =>
        nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : "";

      const avgQuiz = avg(sQuizzes.map((q) => q.score));
      const avgLkpd = avg(sLkpds.map((l) => l.score as number));
      const avgProject = avg(sProjects.map((p) => p.score as number));
      const avgSim = avg(
        sSims.map((sim) => Math.round((sim.score / Math.max(1, sim.maxScore)) * 100))
      );

      const allComponents = [avgQuiz, avgLkpd, avgProject, avgSim].filter(
        (v): v is number => typeof v === "number"
      );

      return {
        No: idx + 1,
        "Nama Siswa": s.name,
        NISN: s.identityNo || "-",
        Kelas: s.className || "-",
        Email: s.email,
        "Rata-rata Kuis": avgQuiz,
        "Rata-rata LKPD": avgLkpd,
        "Rata-rata Proyek": avgProject,
        "Rata-rata Skenario": avgSim,
        "Rata-rata Keseluruhan": avg(allComponents),
      };
    });

    // 2. Sheet Nilai Kuis
    const quizRows = quizAttempts.map((q, idx) => ({
      No: idx + 1,
      "Nama Siswa": q.user.name,
      NISN: q.user.identityNo || "-",
      Kelas: q.user.className || "-",
      "Judul Kuis": q.quiz.title,
      "Jawaban Benar": q.correctCount,
      "Total Soal": q.totalQuestions,
      Nilai: q.score,
      Keterangan: q.score >= q.quiz.passingScore ? "Tuntas" : "Belum Tuntas",
      Tanggal: formatIndoDate(q.completedAt),
    }));

    // 3. Sheet Nilai LKPD & Proyek
    const lkpdRows = submissions.map((sub, idx) => ({
      No: idx + 1,
      "Nama Siswa": sub.user.name,
      NISN: sub.user.identityNo || "-",
      Kelas: sub.user.className || "-",
      Jenis: sub.assignment.type,
      "Judul Tugas": sub.assignment.title,
      Status: sub.status === "GRADED" ? "Sudah Dinilai" : "Menunggu Penilaian",
      Nilai: sub.score !== null ? sub.score : "",
      "Umpan Balik Guru": sub.teacherFeedback || "",
      "Lampiran PDF": sub.fileName || "",
      "Tanggal Kumpul": formatIndoDate(sub.submittedAt),
    }));

    // 4. Sheet Nilai Skenario / Simulasi
    const simRows = simAttempts.map((sim, idx) => ({
      No: idx + 1,
      "Nama Siswa": sim.user.name,
      NISN: sim.user.identityNo || "-",
      Kelas: sim.user.className || "-",
      "Judul Skenario": sim.simulation.title,
      Status: sim.status === "GRADED" ? "Sudah Dinilai" : "Menunggu Penilaian",
      Nilai:
        sim.status === "GRADED"
          ? Math.round((sim.score / Math.max(1, sim.maxScore)) * 100)
          : "",
      "File PDF Dialog Siswa": sim.fileName || "-",
      "Umpan Balik Guru": sim.teacherFeedback || "",
      "Tanggal Kumpul": formatIndoDate(sim.completedAt),
    }));

    const wb = XLSX.utils.book_new();

    const makeSheet = (rows: Record<string, unknown>[], emptyHeader: string[]) =>
      rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([emptyHeader]);

    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(rekapRows, [
        "No",
        "Nama Siswa",
        "NISN",
        "Kelas",
        "Email",
        "Rata-rata Kuis",
        "Rata-rata LKPD",
        "Rata-rata Proyek",
        "Rata-rata Skenario",
        "Rata-rata Keseluruhan",
      ]),
      "Rekap Nilai Siswa"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(quizRows, [
        "No",
        "Nama Siswa",
        "NISN",
        "Kelas",
        "Judul Kuis",
        "Jawaban Benar",
        "Total Soal",
        "Nilai",
        "Keterangan",
        "Tanggal",
      ]),
      "Nilai Kuis"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(lkpdRows, [
        "No",
        "Nama Siswa",
        "NISN",
        "Kelas",
        "Jenis",
        "Judul Tugas",
        "Status",
        "Nilai",
        "Umpan Balik Guru",
        "Lampiran PDF",
        "Tanggal Kumpul",
      ]),
      "Nilai LKPD & Proyek"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(simRows, [
        "No",
        "Nama Siswa",
        "NISN",
        "Kelas",
        "Judul Skenario",
        "Status",
        "Nilai",
        "File PDF Dialog Siswa",
        "Umpan Balik Guru",
        "Tanggal Kumpul",
      ]),
      "Nilai Skenario"
    );

    const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Rekap-Nilai-Office-Learning-Hub-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    return NextResponse.json({ error: "Gagal mengekspor nilai ke Excel." }, { status: 500 });
  }
}
