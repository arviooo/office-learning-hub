import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeLkpdCases } from "@/lib/assessment";

const lkpdCaseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim(),
  description: z.string().trim().default(""),
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().trim(),
      })
    )
    .default([]),
});

const createAssignmentSchema = z.object({
  type: z.enum(["LKPD", "PROJECT"]),
  title: z.string().trim().min(3, "Judul tugas minimal 3 karakter."),
  description: z.string().trim().min(5, "Deskripsi tugas wajib diisi."),
  instructions: z.string().trim().min(5, "Petunjuk pengerjaan wajib diisi."),
  caseSummary: z.string().trim().optional().nullable(),
  cases: z.array(lkpdCaseSchema).optional(),
  questions: z.array(z.string().trim()).optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  maxScore: z.number().int().min(10).max(100).default(100),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data tugas tidak valid." },
        { status: 400 }
      );
    }

    let questionsJson: string | null = null;
    let caseSummary: string | null = parsed.data.caseSummary || null;

    if (parsed.data.type === "LKPD" && parsed.data.cases !== undefined) {
      questionsJson = serializeLkpdCases(
        parsed.data.cases.map((c, cIdx) => ({
          id: c.id || `case-${cIdx + 1}`,
          title: c.title,
          description: c.description,
          questions: c.questions.map((q, qIdx) => ({
            id: q.id || `c${cIdx + 1}-q${qIdx + 1}`,
            text: q.text,
          })),
        }))
      );
      caseSummary = null;
    } else {
      const cleanQuestions = (parsed.data.questions || []).filter((q) => q.length > 0);
      questionsJson = cleanQuestions.length > 0 ? JSON.stringify(cleanQuestions) : null;
    }

    const assignment = await prisma.assignment.create({
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        instructions: parsed.data.instructions,
        caseSummary,
        questionsJson,
        pdfUrl: parsed.data.pdfUrl || null,
        pdfName: parsed.data.pdfName || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        maxScore: parsed.data.maxScore,
        isPublished: true,
      },
    });

    revalidatePath("/lkpd");
    revalidatePath("/proyek");
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        assignment,
        message: `${parsed.data.type === "LKPD" ? "LKPD" : "Proyek"} baru berhasil dibuat.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json({ error: "Gagal membuat LKPD/Proyek." }, { status: 500 });
  }
}
