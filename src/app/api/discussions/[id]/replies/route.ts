import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  content: z.string().trim().min(3, "Tanggapan minimal 3 karakter.").max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const { id: postId } = await context.params;
    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Tanggapan tidak valid." },
        { status: 400 }
      );
    }

    const post = await prisma.discussionPost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Topik diskusi tidak ditemukan." }, { status: 404 });
    }

    const reply = await prisma.discussionReply.create({
      data: {
        postId,
        authorId: user.id,
        content: parsed.data.content,
      },
    });

    if (user.role === "STUDENT") {
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: 5 } },
      });
    }

    return NextResponse.json(
      { reply, message: "Tanggapan berhasil dikirim." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create reply error:", error);
    return NextResponse.json({ error: "Gagal mengirim tanggapan." }, { status: 500 });
  }
}
