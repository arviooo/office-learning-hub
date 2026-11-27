import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);

function mimeFromExt(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/pdf";
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ folder: string; filename: string }> }
) {
  try {
    const { folder, filename } = await context.params;

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFilename = path.basename(filename);
    const ext = path.extname(safeFilename).toLowerCase();

    if (!safeFolder || !safeFilename || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "File tidak valid." }, { status: 400 });
    }

    const fileId = safeFilename.slice(0, -ext.length);
    const stored = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
      select: { data: true, fileName: true, mimeType: true },
    });

    if (stored) {
      const downloadName = stored.fileName.replace(/["\\\r\n]/g, "_");
      return new NextResponse(new Uint8Array(stored.data), {
        status: 200,
        headers: {
          "Content-Type": stored.mimeType || mimeFromExt(ext),
          "Content-Disposition": `inline; filename="${downloadName}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", safeFolder, safeFilename);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeFromExt(ext),
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }
}
