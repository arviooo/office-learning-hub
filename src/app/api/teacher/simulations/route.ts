import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(3, "Teks pilihan tindakan wajib diisi."),
  score: z.number().int().min(0).max(100),
  rating: z.string().trim().min(2),
  feedback: z.string().trim().min(3, "Umpan balik pilihan wajib diisi."),
});

const stepSchema = z.object({
  id: z.string().min(1),
  situation: z.string().trim().min(5, "Situasi langkah wajib diisi."),
  customerDialog: z.string().trim().min(3, "Dialog tamu wajib diisi."),
  prompt: z.string().trim().min(5, "Pertanyaan langkah wajib diisi."),
  options: z.array(optionSchema).min(2, "Minimal 2 pilihan tindakan per langkah."),
});

const createSimSchema = z.object({
  title: z.string().trim().min(3, "Judul simulasi minimal 3 karakter."),
  subtitle: z.string().trim().min(3, "Subjudul wajib diisi."),
  scenarioContext: z.string().trim().min(10, "Konteks skenario minimal 10 karakter."),
  customerName: z.string().trim().min(2, "Nama tamu wajib diisi."),
  customerRole: z.string().trim().min(2, "Peran/instansi tamu wajib diisi."),
  difficulty: z.enum(["Dasar", "Menengah", "Lanjut"]).default("Dasar"),
  estimatedMinutes: z.number().int().min(3).max(60).default(10),
  steps: z.array(stepSchema).min(1, "Simulasi minimal memiliki 1 langkah dialog."),
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
        { error: parsed.error.issues[0]?.message || "Data simulasi tidak valid." },
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
        customerName: parsed.data.customerName,
        customerRole: parsed.data.customerRole,
        difficulty: parsed.data.difficulty,
        estimatedMinutes: parsed.data.estimatedMinutes,
        stepsJson: JSON.stringify(parsed.data.steps),
        isPublished: true,
      },
    });

    return NextResponse.json(
      { simulation, message: "Skenario simulasi baru berhasil ditambahkan." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create simulation error:", error);
    return NextResponse.json({ error: "Gagal menambah skenario simulasi." }, { status: 500 });
  }
}
