import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const feedbackSchema = z.object({
  teacherFeedback: z.string().trim().min(3, "Umpan balik minimal 3 karakter.").max(2000),
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
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Umpan balik tidak valid." },
        { status: 400 }
      );
    }

    const attempt = await prisma.simulationAttempt.update({
      where: { id },
      data: { teacherFeedback: parsed.data.teacherFeedback },
    });

    return NextResponse.json({
      attempt,
      message: "Umpan balik simulasi berhasil dikirim ke siswa.",
    });
  } catch (error) {
    console.error("Simulation feedback error:", error);
    return NextResponse.json({ error: "Gagal menyimpan umpan balik simulasi." }, { status: 500 });
  }
}
