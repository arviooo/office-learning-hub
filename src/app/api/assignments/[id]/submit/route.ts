import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const submitAssignmentSchema = z.object({
  answers: z.array(z.string()).optional(),
  fileUrl: z.string().trim().optional().nullable(),
  fileName: z.string().trim().optional().nullable(),
  videoLink: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(4000, "Catatan maksimal 4000 karakter.").optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Pengumpulan LKPD/Proyek hanya untuk akun Siswa." },
      { status: 403 }
    );
  }

  try {
    const { id: assignmentId } = await context.params;
    const body = await request.json();
    const parsed = submitAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pengumpulan tidak valid." },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    }

    // Validasi tautan video jika diisi
    if (parsed.data.videoLink && parsed.data.videoLink.length > 0) {
      try {
        const url = new URL(parsed.data.videoLink);
        if (!["http:", "https:"].includes(url.protocol)) {
          return NextResponse.json(
            { error: "Tautan harus diawali dengan http:// atau https://." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Format tautan video/dokumen tidak valid. Sertakan https://..." },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.submission.findUnique({
      where: { userId_assignmentId: { userId: user.id, assignmentId } },
    });

    const isFirstSubmit = !existing;

    const submission = await prisma.submission.upsert({
      where: { userId_assignmentId: { userId: user.id, assignmentId } },
      update: {
        answersJson: parsed.data.answers ? JSON.stringify(parsed.data.answers) : existing?.answersJson ?? null,
        fileUrl: parsed.data.fileUrl !== undefined ? parsed.data.fileUrl : existing?.fileUrl ?? null,
        fileName: parsed.data.fileName !== undefined ? parsed.data.fileName : existing?.fileName ?? null,
        videoLink: parsed.data.videoLink !== undefined ? parsed.data.videoLink : existing?.videoLink ?? null,
        notes: parsed.data.notes !== undefined ? parsed.data.notes : existing?.notes ?? null,
        status: existing?.status === "GRADED" ? "GRADED" : "SUBMITTED",
        submittedAt: new Date(),
      },
      create: {
        userId: user.id,
        assignmentId,
        answersJson: parsed.data.answers ? JSON.stringify(parsed.data.answers) : null,
        fileUrl: parsed.data.fileUrl || null,
        fileName: parsed.data.fileName || null,
        videoLink: parsed.data.videoLink || null,
        notes: parsed.data.notes || null,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    let pointsAwarded = 0;
    if (isFirstSubmit && user.role === "STUDENT") {
      pointsAwarded = assignment.type === "PROJECT" ? 50 : 35;
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: pointsAwarded } },
      });
    }

    return NextResponse.json({
      submission,
      pointsAwarded,
      message: isFirstSubmit
        ? `${assignment.type === "PROJECT" ? "Proyek" : "LKPD"} berhasil dikirim! +${pointsAwarded} XP ditambahkan.`
        : "Perubahan pengumpulan berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Assignment submission error:", error);
    return NextResponse.json({ error: "Gagal mengirim tugas." }, { status: 500 });
  }
}
