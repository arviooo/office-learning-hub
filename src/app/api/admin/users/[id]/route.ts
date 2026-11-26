import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").optional(),
  email: z.string().trim().email("Format email tidak valid.").optional(),
  identityNo: z.string().trim().max(30).nullable().optional(),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
  classroomId: z.string().nullable().optional(),
  resetPassword: z.boolean().optional(),
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
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pembaruan pengguna tidak valid." },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.identityNo !== undefined) data.identityNo = parsed.data.identityNo || null;

    if (parsed.data.email) {
      const normalized = parsed.data.email.toLowerCase();
      const conflict = await prisma.user.findFirst({
        where: { email: normalized, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json({ error: "Email tersebut sudah dipakai akun lain." }, { status: 409 });
      }
      data.email = normalized;
    }

    if (parsed.data.role) {
      if (id === session.id && parsed.data.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Anda tidak dapat menurunkan peran akun Admin yang sedang aktif." },
          { status: 400 }
        );
      }
      data.role = parsed.data.role;
    }

    if (parsed.data.classroomId !== undefined) {
      if (!parsed.data.classroomId) {
        data.classroomId = null;
        data.className = null;
      } else {
        const cls = await prisma.classroom.findUnique({ where: { id: parsed.data.classroomId } });
        if (cls) {
          data.classroomId = cls.id;
          data.className = cls.name;
        }
      }
    }

    if (parsed.data.resetPassword) {
      data.passwordHash = await bcrypt.hash("smkmplb123", 10);
    }

    await prisma.user.update({ where: { id }, data });

    return NextResponse.json({
      message: parsed.data.resetPassword
        ? "Kata sandi berhasil direset ke 'smkmplb123'."
        : "Data akun pengguna berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Admin patch user error:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengguna." }, { status: 500 });
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
    if (id === session.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun Administrator yang sedang digunakan." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "Akun pengguna berhasil dihapus." });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Gagal menghapus akun pengguna." }, { status: 500 });
  }
}
