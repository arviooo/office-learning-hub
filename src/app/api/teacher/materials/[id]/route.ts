import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toEmbedVideoUrl } from "@/lib/video";

const updateMaterialSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").optional(),
  subtitle: z.string().trim().min(3, "Subjudul minimal 3 karakter.").optional(),
  summary: z.string().trim().min(5, "Ringkasan minimal 5 karakter.").optional(),
  content: z.string().trim().min(5, "Isi materi minimal 5 karakter.").optional(),
  videoUrl: z.string().trim().optional().nullable(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  durationMinutes: z.number().int().min(5).max(180).optional(),
  objectives: z.array(z.string().trim()).optional(),
  keyPoints: z.array(z.string().trim()).optional(),
  activityPrompt: z.string().trim().optional().nullable(),
  isPublished: z.boolean().optional(),
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
    const parsed = updateMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data pembaruan materi tidak valid." },
        { status: 400 }
      );
    }

    const { objectives, keyPoints, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (rest.videoUrl !== undefined) {
      updateData.videoUrl = toEmbedVideoUrl(rest.videoUrl);
    }
    if (objectives !== undefined) {
      updateData.objectivesJson = JSON.stringify(objectives.filter((s) => s.length > 0));
    }
    if (keyPoints !== undefined) {
      updateData.keyPointsJson = JSON.stringify(keyPoints.filter((s) => s.length > 0));
    }

    const material = await prisma.material.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/materi");
    revalidatePath(`/materi/${material.slug}`);
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json({ material, message: "Materi berhasil diperbarui." });
  } catch (error) {
    console.error("Update material error:", error);
    return NextResponse.json({ error: "Gagal memperbarui materi." }, { status: 500 });
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
    await prisma.material.delete({ where: { id } });
    revalidatePath("/materi");
    revalidatePath("/guru");
    revalidatePath("/dashboard");
    return NextResponse.json({ message: "Materi berhasil dihapus." });
  } catch (error) {
    console.error("Delete material error:", error);
    return NextResponse.json({ error: "Gagal menghapus materi." }, { status: 500 });
  }
}
