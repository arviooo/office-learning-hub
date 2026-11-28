import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const questionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["MCQ", "TRUE_FALSE", "CASE"]),
    question: z.string().trim().min(5, "Teks soal minimal 5 karakter."),
    options: z.array(z.string().trim().min(1)).min(2, "Minimal 2 pilihan jawaban."),
    correctIndex: z.number().int().min(0),
    explanation: z.string().trim().min(3, "Pembahasan soal wajib diisi."),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "Kunci jawaban harus sesuai dengan pilihan yang tersedia.",
  });

const createQuizSchema = z.object({
  title: z.string().trim().min(3, "Judul kuis minimal 3 karakter."),
  description: z.string().trim().min(5, "Deskripsi kuis wajib diisi."),
  category: z.enum(["KONSEP", "ETIKA", "STUDI_KASUS", "EVALUASI"]).default("EVALUASI"),
  materialId: z.string().optional().nullable(),
  timeLimitMinutes: z.number().int().min(3).max(120).default(15),
  passingScore: z.number().int().min(50).max(100).default(75),
  shuffleQuestions: z.boolean().default(true),
  questions: z.array(questionSchema).min(1, "Kuis minimal harus memiliki 1 soal."),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createQuizSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data kuis tidak valid." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        materialId: parsed.data.materialId || null,
        timeLimitMinutes: parsed.data.timeLimitMinutes,
        passingScore: parsed.data.passingScore,
        shuffleQuestions: parsed.data.shuffleQuestions,
        questionsJson: JSON.stringify(parsed.data.questions),
        isPublished: true,
      },
    });

    revalidatePath("/kuis");
    revalidatePath("/guru");
    return NextResponse.json({ quiz, message: "Kuis baru berhasil diterbitkan." }, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Gagal membuat kuis." }, { status: 500 });
  }
}
