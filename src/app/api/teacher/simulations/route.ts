import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSimSchema = z.object({
  title: z.string().trim().min(3, "Judul skenario minimal 3 karakter."),
  subtitle: z.string().trim().min(3, "Subjudul wajib diisi."),
  scenarioContext: z.string().trim().min(10, "Teks soal / skenario minimal 10 karakter."),
  instructions: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  imageName: z.string().trim().optional().nullable(),
  pdfUrl: z.string().trim().optional().nullable(),
  pdfName: z.string().trim().optional().nullable(),
  customerName: z.string().trim().min(2, "Nama tamu wajib diisi."),
  customerRole: z.string().trim().min(2, "Peran/instansi tamu wajib diisi."),
  difficulty: z.enum(["Dasar", "Menengah", "Lanjut"]).default("Dasar"),
  estimatedMinutes: z.number().int().min(3).max(120).default(15),
  steps: z.array(z.unknown()).optional(),
});

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 55) +
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
    const parsed = createSimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data skenario tidak valid." },
        { status: 400 }
      );
    }

    const last = await prisma.simulation.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    const simulation = await prisma.simulation.create({
      data: {
        order: nextOrder,
        slug: slugify(parsed.data.title),
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        scenarioContext: parsed.data.scenarioContext,
        instructions: parsed.data.instructions || null,
        imageUrl: parsed.data.imageUrl || null,
        imageName: parsed.data.imageName || null,
        pdfUrl: parsed.data.pdfUrl || null,
        pdfName: parsed.data.pdfName || null,
        customerName: parsed.data.customerName,
        customerRole: parsed.data.customerRole,
        difficulty: parsed.data.difficulty,
        estimatedMinutes: parsed.data.estimatedMinutes,
        stepsJson: JSON.stringify(parsed.data.steps || []),
        isPublished: true,
      },
    });

    revalidatePath("/simulasi");
    revalidatePath("/guru");
    revalidatePath("/dashboard");

    return NextResponse.json(
      { simulation, message: "Skenario simulasi baru berhasil ditambahkan." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create simulation error:", error);
    return NextResponse.json({ error: "Gagal menambah skenario simulasi." }, { status: 500 });
  }
}
