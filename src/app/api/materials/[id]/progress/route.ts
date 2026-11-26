import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const progressSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  notes: z.string().max(4000, "Catatan maksimal 4000 karakter.").optional(),
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
      { error: "Progres belajar dan poin XP hanya berlaku untuk akun Siswa." },
      { status: 403 }
    );
  }

  try {
    const { id: materialId } = await context.params;
    const body = await request.json();
    const parsed = progressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data progres tidak valid." },
        { status: 400 }
      );
    }

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      return NextResponse.json({ error: "Materi tidak ditemukan." }, { status: 404 });
    }

    const existing = await prisma.materialProgress.findUnique({
      where: { userId_materialId: { userId: user.id, materialId } },
    });

    const nextStatus = parsed.data.status ?? existing?.status ?? "IN_PROGRESS";
    const wasAlreadyCompleted = existing?.status === "COMPLETED";
    const newlyCompleted = nextStatus === "COMPLETED" && !wasAlreadyCompleted;

    const progress = await prisma.materialProgress.upsert({
      where: { userId_materialId: { userId: user.id, materialId } },
      update: {
        status: nextStatus,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        ...(newlyCompleted ? { completedAt: new Date() } : {}),
      },
      create: {
        userId: user.id,
        materialId,
        status: nextStatus,
        notes: parsed.data.notes ?? null,
        completedAt: nextStatus === "COMPLETED" ? new Date() : null,
      },
    });

    let pointsAwarded = 0;
    let newBadgeName: string | null = null;

    if (newlyCompleted && user.role === "STUDENT") {
      pointsAwarded = 30;
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: pointsAwarded } },
      });

      // Cek badge FIRST_STEP
      const firstBadge = await prisma.badge.findUnique({ where: { code: "FIRST_STEP" } });
      if (firstBadge) {
        const hasBadge = await prisma.userBadge.findUnique({
          where: { userId_badgeId: { userId: user.id, badgeId: firstBadge.id } },
        });
        if (!hasBadge) {
          await prisma.userBadge.create({
            data: { userId: user.id, badgeId: firstBadge.id },
          });
          newBadgeName = firstBadge.name;
        }
      }
    }

    return NextResponse.json({
      progress,
      pointsAwarded,
      newBadgeName,
      message: newlyCompleted
        ? "Materi ditandai selesai! +30 XP ditambahkan."
        : "Progres dan catatan belajar berhasil disimpan.",
    });
  } catch (error) {
    console.error("Material progress error:", error);
    return NextResponse.json({ error: "Gagal menyimpan progres materi." }, { status: 500 });
  }
}
