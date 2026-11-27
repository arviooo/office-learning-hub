import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const submitRoleplaySchema = z.object({
  fileUrl: z.string().trim().min(5, "Unggah file PDF hasil dialog roleplay terlebih dahulu."),
  fileName: z.string().trim().min(1, "Nama file PDF wajib ada.").max(180),
  reflection: z.string().trim().max(2000).optional().nullable(),
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
      { error: "Pengumpulan tugas simulasi roleplay hanya untuk akun Siswa." },
      { status: 403 }
    );
  }

  try {
    const { id: simulationId } = await context.params;
    const body = await request.json();
    const parsed = submitRoleplaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pengumpulan simulasi tidak valid." },
        { status: 400 }
      );
    }

    const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
    if (!simulation) {
      return NextResponse.json({ error: "Skenario simulasi tidak ditemukan." }, { status: 404 });
    }

    const existing = await prisma.simulationAttempt.findFirst({
      where: { userId: user.id, simulationId },
      orderBy: { completedAt: "desc" },
    });

    const isFirstSubmit = !existing;

    const attempt = existing
      ? await prisma.simulationAttempt.update({
          where: { id: existing.id },
          data: {
            fileUrl: parsed.data.fileUrl,
            fileName: parsed.data.fileName,
            reflection: parsed.data.reflection || null,
            status: existing.status === "GRADED" ? "GRADED" : "SUBMITTED",
            completedAt: new Date(),
          },
        })
      : await prisma.simulationAttempt.create({
          data: {
            userId: user.id,
            simulationId,
            score: 0,
            maxScore: 100,
            status: "SUBMITTED",
            fileUrl: parsed.data.fileUrl,
            fileName: parsed.data.fileName,
            responsesJson: "[]",
            reflection: parsed.data.reflection || null,
          },
        });

    let pointsAwarded = 0;
    const unlockedBadges: string[] = [];

    if (isFirstSubmit) {
      pointsAwarded = 40;
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: pointsAwarded } },
      });

      if (simulation.order === 1) {
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

    revalidatePath("/simulasi");
    revalidatePath(`/simulasi/${simulation.slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/progres");
    revalidatePath("/guru");
    revalidatePath("/sertifikat");

    return NextResponse.json(
      {
        attempt: {
          id: attempt.id,
          status: attempt.status,
          fileUrl: attempt.fileUrl,
          fileName: attempt.fileName,
        },
        pointsAwarded,
        unlockedBadges,
        message: isFirstSubmit
          ? `PDF dialog roleplay berhasil dikumpulkan! +${pointsAwarded} XP ditambahkan.`
          : "File PDF dialog roleplay berhasil diperbarui.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Simulation submission error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim hasil dialog roleplay." },
      { status: 500 }
    );
  }
}
