import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["MCQ", "TRUE_FALSE", "CASE"]),
  question: z.string().trim().min(5, "Teks soal minimal 5 karakter."),
  options: z.array(z.string().trim().min(1)).min(2, "Minimal 2 pilihan jawaban."),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().min(3, "Pembahasan soal wajib diisi."),
});

const updateQuizSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(5).optional(),
  category: z.enum(["KONSEP", "ETIKA", "STUDI_KASUS", "EVALUASI"]).optional(),
  timeLimitMinutes: z.number().int().min(3).max(120).optional(),
  passingScore: z.number().int().min(50).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  questions: z.array(questionSchema).min(1).optional(),
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
    const parsed = updateQuizSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data kuis tidak valid." },
        { status: 400 }
      );
    }

    const { questions, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (questions !== undefined) {
      updateData.questionsJson = JSON.stringify(questions);
    }

    const quiz = await prisma.quiz.update({ where: { id }, data: updateData });
    revalidatePath("/kuis");
    revalidatePath(`/kuis/${id}`);
    revalidatePath("/guru");
    return NextResponse.json({ quiz, message: "Kuis berhasil diperbarui." });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Gagal memperbarui kuis." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ message: "Kuis berhasil dihapus." });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Gagal menghapus kuis." }, { status: 500 });
  }
}
