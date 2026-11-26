import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMaxScore, parseSimulationSteps } from "@/lib/simulation";

const attemptSchema = z.object({
  responses: z
    .array(
      z.object({
        stepId: z.string().min(1),
        choiceId: z.string().min(1),
        customResponse: z.string().max(1000).optional(),
      })
    )
    .min(1, "Minimal satu langkah harus dijawab."),
  reflection: z.string().trim().max(2000, "Refleksi maksimal 2000 karakter.").optional(),
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
      { error: "Pengerjaan simulasi dan poin XP hanya untuk akun Siswa." },
      { status: 403 }
    );
  }

  try {
    const { id: simulationId } = await context.params;
    const body = await request.json();
    const parsed = attemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data simulasi tidak valid." },
        { status: 400 }
      );
    }

    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
    if (!simulation) {
      return NextResponse.json({ error: "Simulasi tidak ditemukan." }, { status: 404 });
    }

    const steps = parseSimulationSteps(simulation.stepsJson);
    const maxScore = computeMaxScore(steps);

    let totalScore = 0;
    const evaluatedResponses = steps.map((step) => {
      const submitted = parsed.data.responses.find((r) => r.stepId === step.id);
      const chosen = step.options.find((o) => o.id === submitted?.choiceId);
      const stepScore = chosen ? chosen.score : 0;
      totalScore += stepScore;
      return {
        stepId: step.id,
        choiceId: chosen?.id ?? null,
        choiceText: chosen?.text ?? "",
        rating: chosen?.rating ?? "Tidak Dijawab",
        score: stepScore,
        feedback: chosen?.feedback ?? "",
        customResponse: submitted?.customResponse?.trim() || undefined,
      };
    });

    const previousAttempts = await prisma.simulationAttempt.findMany({
      where: { userId: user.id, simulationId },
      select: { score: true },
    });

    const isFirstCompletion = previousAttempts.length === 0;
    const prevBest = previousAttempts.reduce((m, a) => Math.max(m, a.score), 0);
    const improvedBest = !isFirstCompletion && totalScore > prevBest;

    const attempt = await prisma.simulationAttempt.create({
      data: {
        userId: user.id,
        simulationId,
        score: totalScore,
        maxScore,
        responsesJson: JSON.stringify(evaluatedResponses),
        reflection: parsed.data.reflection || null,
      },
    });

    let pointsAwarded = 0;
    const unlockedBadges: string[] = [];

    if (user.role === "STUDENT") {
      if (isFirstCompletion) {
        pointsAwarded = 40;
      } else if (improvedBest) {
        pointsAwarded = 15;
      }

      if (pointsAwarded > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: pointsAwarded } },
        });
      }

      const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      // Cek badge SIMULATION_ROOKIE (Simulasi 1 skor >= 80%)
      if (simulation.order === 1 && percent >= 80) {
        const rookieBadge = await prisma.badge.findUnique({
          where: { code: "SIMULATION_ROOKIE" },
        });
        if (rookieBadge) {
          const exists = await prisma.userBadge.findUnique({
            where: { userId_badgeId: { userId: user.id, badgeId: rookieBadge.id } },
          });
          if (!exists) {
            await prisma.userBadge.create({
              data: { userId: user.id, badgeId: rookieBadge.id },
            });
            unlockedBadges.push(rookieBadge.name);
          }
        }
      }

      // Cek badge EXCELLENCE_CHAMPION (7 materi & 5 simulasi selesai)
      const [totalMat, completedMat, totalSim, distinctSimAttempts] = await Promise.all([
        prisma.material.count({ where: { isPublished: true } }),
        prisma.materialProgress.count({ where: { userId: user.id, status: "COMPLETED" } }),
        prisma.simulation.count({ where: { isPublished: true } }),
        prisma.simulationAttempt.findMany({
          where: { userId: user.id },
          distinct: ["simulationId"],
          select: { simulationId: true },
        }),
      ]);

      if (
        totalMat > 0 &&
        completedMat >= totalMat &&
        totalSim > 0 &&
        distinctSimAttempts.length >= totalSim
      ) {
        const champBadge = await prisma.badge.findUnique({
          where: { code: "EXCELLENCE_CHAMPION" },
        });
        if (champBadge) {
          const exists = await prisma.userBadge.findUnique({
            where: { userId_badgeId: { userId: user.id, badgeId: champBadge.id } },
          });
          if (!exists) {
            await prisma.userBadge.create({
              data: { userId: user.id, badgeId: champBadge.id },
            });
            unlockedBadges.push(champBadge.name);
          }
        }
      }
    }

    return NextResponse.json(
      {
        attempt,
        score: totalScore,
        maxScore,
        percent: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        pointsAwarded,
        unlockedBadges,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Simulation attempt error:", error);
    return NextResponse.json({ error: "Gagal menyimpan hasil simulasi." }, { status: 500 });
  }
}
