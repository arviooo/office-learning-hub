import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseQuizQuestions } from "@/lib/assessment";

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
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
      { error: "Pengerjaan kuis dan perolehan poin hanya untuk akun Siswa." },
      { status: 403 }
    );
  }

  try {
    const { id: quizId } = await context.params;
    const body = await request.json();
    const parsed = submitQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Format jawaban kuis tidak valid." }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: "Kuis tidak ditemukan." }, { status: 404 });
    }

    // Batas ketat: setiap siswa hanya boleh mengerjakan kuis 1 kali
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: { userId: user.id, quizId },
      select: { id: true },
    });
    if (existingAttempt) {
      return NextResponse.json(
        { error: "Kuis ini hanya dapat dikerjakan 1 kali dan jawabanmu sudah tercatat." },
        { status: 409 }
      );
    }

    const questions = parseQuizQuestions(quiz.questionsJson);
    if (questions.length === 0) {
      return NextResponse.json({ error: "Kuis belum memiliki soal." }, { status: 400 });
    }

    let correctCount = 0;
    for (const q of questions) {
      const selectedIndex = parsed.data.answers[q.id];
      if (selectedIndex === q.correctIndex) {
        correctCount += 1;
      }
    }

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    // Simpan nilai & detail di database untuk rekap Guru dan Export Excel
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId,
        score,
        correctCount,
        totalQuestions,
        answersJson: JSON.stringify(parsed.data.answers),
      },
    });

    const pointsAwarded = passed ? 35 : 20;
    const unlockedBadges: string[] = [];

    await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: pointsAwarded } },
    });

    if (score === 100) {
      const badge = await prisma.badge.findUnique({ where: { code: "QUIZ_MASTER" } });
      if (badge) {
        const exists = await prisma.userBadge.findUnique({
          where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
        });
        if (!exists) {
          await prisma.userBadge.create({
            data: { userId: user.id, badgeId: badge.id },
          });
          unlockedBadges.push(badge.name);
        }
      }
    }

    revalidatePath("/kuis");
    revalidatePath(`/kuis/${quizId}`);
    revalidatePath("/dashboard");
    revalidatePath("/progres");
    revalidatePath("/guru");

    // Tidak mengembalikan angka nilai ke sisi siswa (nilai hanya terlihat di Dashboard Guru & Export Excel)
    return NextResponse.json(
      {
        submitted: true,
        totalQuestions,
        pointsAwarded,
        unlockedBadges,
        message: "Jawaban kuis berhasil dikirim! Hasil penilaian tercatat untuk Guru.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quiz attempt error:", error);
    return NextResponse.json({ error: "Gagal memproses jawaban kuis." }, { status: 500 });
  }
}
