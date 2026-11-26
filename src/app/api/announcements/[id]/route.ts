import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchAnnSchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  content: z.string().trim().min(10).max(3000).optional(),
  category: z.enum(["INFO", "TUGAS", "JADWAL"]).optional(),
  isPinned: z.boolean().optional(),
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
    const parsed = patchAnnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data pengumuman tidak valid." }, { status: 400 });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ announcement, message: "Pengumuman berhasil diperbarui." });
  } catch (error) {
    console.error("Patch announcement error:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengumuman." }, { status: 500 });
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
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ message: "Pengumuman berhasil dihapus." });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json({ error: "Gagal menghapus pengumuman." }, { status: 500 });
  }
}
