import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const gradeSimSchema = z.object({
  score: z.number().int().min(0, "Nilai minimal 0.").max(100, "Nilai maksimal 100."),
  teacherFeedback: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = gradeSimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data penilaian skenario tidak valid." },
        { status: 400 }
      );
    }

    const attempt = await prisma.simulationAttempt.update({
      where: { id },
      data: {
        score: parsed.data.score,
        maxScore: 100,
        status: "GRADED",
        teacherFeedback: parsed.data.teacherFeedback || null,
      },
    });

    revalidatePath("/guru");
    revalidatePath("/progres");
    revalidatePath("/simulasi");

    return NextResponse.json({
      attempt,
      message: "Nilai & umpan balik skenario berhasil disimpan.",
    });
  } catch (error) {
    console.error("Simulation grade error:", error);
    return NextResponse.json({ error: "Gagal menyimpan penilaian skenario." }, { status: 500 });
  }
}
