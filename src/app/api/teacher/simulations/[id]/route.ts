import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSimSchema = z.object({
  title: z.string().trim().min(3).optional(),
  subtitle: z.string().trim().min(3).optional(),
  scenarioContext: z.string().trim().min(10).optional(),
  instructions: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  imageName: z.string().trim().optional().nullable(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  customerName: z.string().trim().min(2).optional(),
  customerRole: z.string().trim().min(2).optional(),
  difficulty: z.enum(["Dasar", "Menengah", "Lanjut"]).optional(),
  estimatedMinutes: z.number().int().min(3).max(120).optional(),
  steps: z.array(z.unknown()).optional(),
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
    const parsed = updateSimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data skenario tidak valid." },
        { status: 400 }
      );
    }

    const { steps, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (steps !== undefined) {
      updateData.stepsJson = JSON.stringify(steps);
    }

    const simulation = await prisma.simulation.update({ where: { id }, data: updateData });
    revalidatePath("/simulasi");
    revalidatePath(`/simulasi/${simulation.slug}`);
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json({ simulation, message: "Skenario simulasi berhasil diperbarui." });
  } catch (error) {
    console.error("Update simulation error:", error);
    return NextResponse.json({ error: "Gagal memperbarui simulasi." }, { status: 500 });
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
    await prisma.simulation.delete({ where: { id } });
    revalidatePath("/simulasi");
    revalidatePath("/guru");
    revalidatePath("/dashboard");
    return NextResponse.json({ message: "Skenario simulasi berhasil dihapus." });
  } catch (error) {
    console.error("Delete simulation error:", error);
    return NextResponse.json({ error: "Gagal menghapus simulasi." }, { status: 500 });
  }
}
