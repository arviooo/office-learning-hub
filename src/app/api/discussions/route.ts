import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createPostSchema = z.object({
  title: z.string().trim().min(5, "Judul topik minimal 5 karakter.").max(160),
  content: z.string().trim().min(10, "Isi pertanyaan atau diskusi minimal 10 karakter.").max(3000),
  category: z.enum(["MATERI", "STUDI_KASUS", "UMUM"]).default("MATERI"),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data diskusi tidak valid." },
        { status: 400 }
      );
    }

    const post = await prisma.discussionPost.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
        authorId: user.id,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    if (user.role === "STUDENT") {
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: 10 } },
      });
    }

    revalidatePath("/diskusi");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        post,
        message:
          user.role === "STUDENT"
            ? "Topik diskusi berhasil diterbitkan! +10 XP ditambahkan."
            : "Topik diskusi berhasil diterbitkan.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create discussion error:", error);
    return NextResponse.json({ error: "Gagal menerbitkan diskusi." }, { status: 500 });
  }
}
