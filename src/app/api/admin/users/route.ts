import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter."),
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter.").default("smkmplb123"),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
  identityNo: z.string().trim().optional().nullable(),
  classroomId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses khusus Administrator." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pengguna tidak valid." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    let className: string | null = null;
    let classroomId: string | null = null;

    if (parsed.data.classroomId) {
      const cls = await prisma.classroom.findUnique({ where: { id: parsed.data.classroomId } });
      if (cls) {
        classroomId = cls.id;
        className = cls.name;
      }
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: parsed.data.role,
        identityNo: parsed.data.identityNo || null,
        classroomId,
        className,
        avatarColor:
          parsed.data.role === "ADMIN"
            ? "#1e293b"
            : parsed.data.role === "TEACHER"
            ? "#0f766e"
            : "#0f4c81",
      },
      select: { id: true, name: true, email: true, role: true, className: true },
    });

    return NextResponse.json({ user, message: "Akun pengguna berhasil ditambahkan." }, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Gagal menambahkan akun pengguna." }, { status: 500 });
  }
}
