import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Batas aman 4 MB untuk body request Vercel Serverless Function (maks 4.5 MB)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "documents").replace(/[^a-z0-9_-]/gi, "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Hanya file berformat PDF (.pdf) yang diperbolehkan." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File PDF kosong (0 byte)." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file PDF maksimal 4 MB (kompres PDF terlebih dahulu bila lebih besar)." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Menurut spesifikasi PDF, marker %PDF boleh berada di dalam 1024 byte pertama
    const headerChunk = buffer.subarray(0, 1024).toString("latin1");
    if (!headerChunk.includes("%PDF")) {
      return NextResponse.json(
        { error: "File yang diunggah bukan dokumen PDF yang valid." },
        { status: 400 }
      );
    }

    const safeFolder = folder || "documents";
    const saved = await prisma.uploadedFile.create({
      data: {
        folder: safeFolder,
        fileName: file.name.slice(0, 180),
        mimeType: "application/pdf",
        size: buffer.length,
        data: buffer,
      },
      select: { id: true, fileName: true, size: true },
    });

    return NextResponse.json(
      {
        fileUrl: `/api/uploads/${safeFolder}/${saved.id}.pdf`,
        fileName: saved.fileName,
        size: saved.size,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload PDF error:", error);
    return NextResponse.json({ error: "Gagal mengunggah file PDF ke database." }, { status: 500 });
  }
}
