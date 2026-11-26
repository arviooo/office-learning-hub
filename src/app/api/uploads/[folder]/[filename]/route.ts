import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ folder: string; filename: string }> }
) {
  try {
    const { folder, filename } = await context.params;

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFilename = path.basename(filename);

    if (!safeFolder || !safeFilename || !safeFilename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File tidak valid." }, { status: 400 });
    }

    // 1. Cari PDF di tabel PostgreSQL UploadedFile (untuk produksi Vercel + Neon)
    const fileId = safeFilename.replace(/\.pdf$/i, "");
    const stored = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
      select: { data: true, fileName: true, mimeType: true },
    });

    if (stored) {
      const downloadName = stored.fileName.replace(/["\\\r\n]/g, "_");
      return new NextResponse(new Uint8Array(stored.data), {
        status: 200,
        headers: {
          "Content-Type": stored.mimeType || "application/pdf",
          "Content-Disposition": `inline; filename="${downloadName}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Fallback untuk file lokal lawas di public/uploads (jika ada)
    const filePath = path.join(process.cwd(), "public", "uploads", safeFolder, safeFilename);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File PDF tidak ditemukan." }, { status: 404 });
  }
}
