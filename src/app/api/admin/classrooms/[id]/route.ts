import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchClassroomSchema = z.object({
  name: z.string().trim().min(2, "Nama kelas minimal 2 karakter.").optional(),
  code: z.string().trim().min(3, "Kode kelas minimal 3 karakter.").max(20).optional(),
  academicYear: z.string().trim().min(4).optional(),
  description: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses khusus Administrator." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchClassroomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data kelas tidak valid." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.code) updateData.code = parsed.data.code.toUpperCase().replace(/\s+/g, "");
    if (parsed.data.academicYear) updateData.academicYear = parsed.data.academicYear;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;

    const updated = await prisma.classroom.update({ where: { id }, data: updateData });

    if (parsed.data.name) {
      await prisma.user.updateMany({
        where: { classroomId: id },
        data: { className: updated.name },
      });
    }

    return NextResponse.json({ classroom: updated, message: "Data kelas berhasil diperbarui." });
  } catch (error) {
    console.error("Update classroom error:", error);
    return NextResponse.json({ error: "Gagal memperbarui kelas (pastikan nama/kode unik)." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses khusus Administrator." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await prisma.user.updateMany({
      where: { classroomId: id },
      data: { classroomId: null, className: null },
    });
    await prisma.classroom.delete({ where: { id } });
    return NextResponse.json({ message: "Kelas berhasil dihapus." });
  } catch (error) {
    console.error("Delete classroom error:", error);
    return NextResponse.json({ error: "Gagal menghapus kelas." }, { status: 500 });
  }
}
