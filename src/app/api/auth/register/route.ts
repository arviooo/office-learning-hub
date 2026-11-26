import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getHomePathForRole, setSessionCookie, type UserRole } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
  identityNo: z.string().trim().optional(),
  classCode: z.string().trim().optional(),
});

const AVATAR_COLORS = ["#0f4c81", "#0f766e", "#1d4ed8", "#0369a1", "#4338ca"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk menggunakan akun tersebut." },
        { status: 409 }
      );
    }

    let classroomId: string | undefined;
    let className: string | undefined;

    if (parsed.data.role === "STUDENT") {
      const code = (parsed.data.classCode || "MPLB11A").toUpperCase();
      const classroom = await prisma.classroom.findUnique({
        where: { code },
      });
      if (!classroom) {
        return NextResponse.json(
          { error: `Kode kelas "${code}" tidak ditemukan. Gunakan kode kelas dari guru (contoh: MPLB11A).` },
          { status: 400 }
        );
      }
      classroomId = classroom.id;
      className = classroom.name;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: parsed.data.role,
        identityNo: parsed.data.identityNo || null,
        className: className || null,
        classroomId: classroomId || null,
        avatarColor,
        points: parsed.data.role === "STUDENT" ? 20 : 0,
      },
    });

    await setSessionCookie(user.id, user.role as UserRole);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          className: user.className,
        },
        redirectTo: getHomePathForRole(user.role),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Gagal membuat akun baru. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
