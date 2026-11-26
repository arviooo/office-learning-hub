import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const gradeSchema = z.object({
  score: z.number().int().min(0, "Nilai minimal 0.").max(100, "Nilai maksimal 100."),
  teacherFeedback: z.string().trim().max(2000).optional().nullable(),
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
    const parsed = gradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data penilaian tidak valid." },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        score: parsed.data.score,
        teacherFeedback: parsed.data.teacherFeedback || null,
        status: "GRADED",
        gradedAt: new Date(),
      },
    });

    return NextResponse.json({
      submission,
      message: "Nilai dan umpan balik berhasil disimpan.",
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    return NextResponse.json({ error: "Gagal menyimpan penilaian." }, { status: 500 });
  }
}
