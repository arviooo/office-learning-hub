import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(3),
  score: z.number().int().min(0).max(100),
  rating: z.string().trim().min(2),
  feedback: z.string().trim().min(3),
});

const stepSchema = z.object({
  id: z.string().min(1),
  situation: z.string().trim().min(5),
  customerDialog: z.string().trim().min(3),
  prompt: z.string().trim().min(5),
  options: z.array(optionSchema).min(2),
});

const updateSimSchema = z.object({
  title: z.string().trim().min(3).optional(),
  subtitle: z.string().trim().min(3).optional(),
  scenarioContext: z.string().trim().min(10).optional(),
  customerName: z.string().trim().min(2).optional(),
  customerRole: z.string().trim().min(2).optional(),
  difficulty: z.enum(["Dasar", "Menengah", "Lanjut"]).optional(),
  estimatedMinutes: z.number().int().min(3).max(60).optional(),
  steps: z.array(stepSchema).min(1).optional(),
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
        { error: parsed.error.issues[0]?.message || "Data simulasi tidak valid." },
        { status: 400 }
      );
    }

    const { steps, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (steps !== undefined) {
      updateData.stepsJson = JSON.stringify(steps);
    }

    const simulation = await prisma.simulation.update({ where: { id }, data: updateData });
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
    return NextResponse.json({ message: "Skenario simulasi berhasil dihapus." });
  } catch (error) {
    console.error("Delete simulation error:", error);
    return NextResponse.json({ error: "Gagal menghapus simulasi." }, { status: 500 });
  }
}
