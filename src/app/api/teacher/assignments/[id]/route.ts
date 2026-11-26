import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAssignmentSchema = z.object({
  type: z.enum(["LKPD", "PROJECT"]).optional(),
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").optional(),
  description: z.string().trim().min(5, "Deskripsi wajib diisi.").optional(),
  instructions: z.string().trim().min(5, "Petunjuk pengerjaan wajib diisi.").optional(),
  caseSummary: z.string().trim().optional().nullable(),
  questions: z.array(z.string().trim()).optional(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  maxScore: z.number().int().min(10).max(100).optional(),
  isPublished: z.boolean().optional(),
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
    const parsed = updateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data tugas tidak valid." },
        { status: 400 }
      );
    }

    const { questions, dueDate, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (questions !== undefined) {
      const clean = questions.filter((q) => q.length > 0);
      updateData.questionsJson = clean.length > 0 ? JSON.stringify(clean) : null;
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/lkpd");
    revalidatePath(`/lkpd/${assignment.id}`);
    revalidatePath("/proyek");
    revalidatePath(`/proyek/${assignment.id}`);
    revalidatePath("/guru");

    return NextResponse.json({ assignment, message: "Data LKPD/Proyek berhasil diperbarui." });
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json({ error: "Gagal memperbarui tugas." }, { status: 500 });
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
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ message: "Tugas berhasil dihapus." });
  } catch (error) {
    console.error("Delete assignment error:", error);
    return NextResponse.json({ error: "Gagal menghapus tugas." }, { status: 500 });
  }
}
