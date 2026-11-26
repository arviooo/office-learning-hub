import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toEmbedVideoUrl } from "@/lib/video";

const createMaterialSchema = z.object({
  title: z.string().trim().min(3, "Judul materi minimal 3 karakter."),
  subtitle: z.string().trim().min(3, "Subjudul materi wajib diisi."),
  summary: z.string().trim().min(10, "Ringkasan materi minimal 10 karakter."),
  content: z.string().trim().min(10, "Isi materi minimal 10 karakter."),
  videoUrl: z.string().trim().optional().nullable(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  durationMinutes: z.number().int().min(5).max(180).default(20),
  objectives: z.array(z.string().trim()).optional(),
  keyPoints: z.array(z.string().trim()).optional(),
  activityPrompt: z.string().trim().optional().nullable(),
});

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) +
    "-" +
    Date.now().toString(36).slice(-4)
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Akses khusus Guru atau Admin." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data materi tidak valid." },
        { status: 400 }
      );
    }

    const last = await prisma.material.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    const material = await prisma.material.create({
      data: {
        order: nextOrder,
        slug: slugify(parsed.data.title),
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        summary: parsed.data.summary,
        content: parsed.data.content,
        videoUrl: toEmbedVideoUrl(parsed.data.videoUrl),
        pdfUrl: parsed.data.pdfUrl || null,
        pdfName: parsed.data.pdfName || null,
        durationMinutes: parsed.data.durationMinutes,
        objectivesJson: JSON.stringify(
          (parsed.data.objectives || []).filter((s) => s.length > 0)
        ),
        keyPointsJson: JSON.stringify(
          (parsed.data.keyPoints || []).filter((s) => s.length > 0)
        ),
        activityPrompt: parsed.data.activityPrompt || null,
        isPublished: true,
      },
    });

    revalidatePath("/materi");
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json({ material, message: "Materi baru berhasil ditambahkan." }, { status: 201 });
  } catch (error) {
    console.error("Create material error:", error);
    return NextResponse.json({ error: "Gagal menambahkan materi." }, { status: 500 });
  }
}
