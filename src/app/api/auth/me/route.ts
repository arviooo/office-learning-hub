import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").optional(),
  identityNo: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(300).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter.").optional(),
});

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data profil tidak valid." },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      identityNo?: string | null;
      bio?: string | null;
      passwordHash?: string;
    } = {};

    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.identityNo !== undefined) updateData.identityNo = parsed.data.identityNo || null;
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio || null;

    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Masukkan kata sandi saat ini untuk mengubah kata sandi." },
          { status: 400 }
        );
      }
      const fullUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
      if (!fullUser) {
        return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
      }
      const valid = await bcrypt.compare(parsed.data.currentPassword, fullUser.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Kata sandi saat ini tidak sesuai." }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        identityNo: true,
        className: true,
        bio: true,
        points: true,
      },
    });

    revalidatePath("/sertifikat");
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json({ user: updated, message: "Profil berhasil diperbarui." });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Gagal memperbarui profil." }, { status: 500 });
  }
}
