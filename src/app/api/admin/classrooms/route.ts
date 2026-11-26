import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createClassroomSchema = z.object({
  name: z.string().trim().min(2, "Nama kelas minimal 2 karakter."),
  code: z.string().trim().min(3, "Kode kelas minimal 3 karakter.").max(20),
  academicYear: z.string().trim().min(4).default("2026/2027"),
  description: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses khusus Administrator." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createClassroomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data kelas tidak valid." },
        { status: 400 }
      );
    }

    const code = parsed.data.code.toUpperCase().replace(/\s+/g, "");
    const existing = await prisma.classroom.findFirst({
      where: { OR: [{ code }, { name: parsed.data.name }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Nama kelas atau kode kelas sudah terdaftar." },
        { status: 409 }
      );
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: parsed.data.name,
        code,
        academicYear: parsed.data.academicYear,
        description: parsed.data.description || null,
      },
    });

    revalidatePath("/admin");
    return NextResponse.json(
      { classroom, message: `Kelas ${classroom.name} (${classroom.code}) berhasil dibuat.` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create classroom error:", error);
    return NextResponse.json({ error: "Gagal membuat kelas baru." }, { status: 500 });
  }
}
