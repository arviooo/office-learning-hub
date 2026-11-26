import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const post = await prisma.discussionPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Topik diskusi tidak ditemukan." }, { status: 404 });
    }

    const canDelete =
      user.role === "ADMIN" || user.role === "TEACHER" || post.authorId === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: "Anda tidak memiliki izin menghapus topik ini." }, { status: 403 });
    }

    await prisma.discussionPost.delete({ where: { id } });
    return NextResponse.json({ message: "Topik diskusi berhasil dihapus." });
  } catch (error) {
    console.error("Delete discussion error:", error);
    return NextResponse.json({ error: "Gagal menghapus topik diskusi." }, { status: 500 });
  }
}
