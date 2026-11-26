import { NextResponse } from "next/server";
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

    const questions = parseQuizQuestions(quiz.questionsJson);
    if (questions.length === 0) {
      return NextResponse.json({ error: "Kuis belum memiliki soal." }, { status: 400 });
    }

    let correctCount = 0;
    const review = questions.map((q) => {
      const selectedIndex = parsed.data.answers[q.id];
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        selectedIndex: selectedIndex ?? null,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    const prevAttempts = await prisma.quizAttempt.findMany({
      where: { userId: user.id, quizId },
      select: { score: true },
    });
    const isFirst = prevAttempts.length === 0;
    const prevBest = prevAttempts.reduce((m, a) => Math.max(m, a.score), 0);

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId,
        score,
        correctCount,
        totalQuestions,
        answersJson: JSON.stringify(parsed.data.answers),
      },
    });

    let pointsAwarded = 0;
    const unlockedBadges: string[] = [];

    if (user.role === "STUDENT") {
      if (isFirst) {
        pointsAwarded = passed ? 35 : 15;
      } else if (score > prevBest) {
        pointsAwarded = 15;
      }

      if (pointsAwarded > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: pointsAwarded } },
        });
      }

      // Badge QUIZ_MASTER jika nilai 100
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
    }

    return NextResponse.json(
      {
        attempt,
        score,
        correctCount,
        totalQuestions,
        passingScore: quiz.passingScore,
        passed,
        pointsAwarded,
        unlockedBadges,
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quiz attempt error:", error);
    return NextResponse.json({ error: "Gagal memproses hasil kuis." }, { status: 500 });
  }
}
