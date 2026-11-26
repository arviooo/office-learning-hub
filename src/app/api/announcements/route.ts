import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const announcementSchema = z.object({
  title: z.string().trim().min(5, "Judul pengumuman minimal 5 karakter.").max(160),
  content: z.string().trim().min(10, "Isi pengumuman minimal 10 karakter.").max(3000),
  category: z.enum(["INFO", "TUGAS", "JADWAL"]).default("INFO"),
  isPinned: z.boolean().default(false),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Hanya Guru atau Admin yang dapat membuat pengumuman." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pengumuman tidak valid." },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
        isPinned: parsed.data.isPinned,
        authorId: user.id,
      },
      include: {
        author: { select: { name: true } },
      },
    });

    revalidatePath("/diskusi");
    revalidatePath("/dashboard");

    return NextResponse.json(
      { announcement, message: "Pengumuman berhasil diterbitkan." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Gagal menerbitkan pengumuman." }, { status: 500 });
  }
}
