import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mendukung file hingga 15 MB melalui chunked upload (masing-masing chunk <= 3 MB agar aman di Vercel Serverless)
const MAX_TOTAL_PDF_SIZE = 15 * 1024 * 1024;
const MAX_SINGLE_REQUEST_SIZE = 4 * 1024 * 1024;

function isValidPdfBytes(buffer: Buffer): boolean {
  const headerChunk = buffer.subarray(0, Math.min(4096, buffer.length)).toString("latin1");
  return headerChunk.includes("%PDF");
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "documents").replace(/[^a-z0-9_-]/gi, "");
    const safeFolder = folder || "documents";

    const uploadIdRaw = formData.get("uploadId");
    const chunkIndexRaw = formData.get("chunkIndex");
    const totalChunksRaw = formData.get("totalChunks");
    const originalFileNameRaw = formData.get("fileName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan dalam permintaan." }, { status: 400 });
    }

    const totalChunks = totalChunksRaw ? Number(totalChunksRaw) : 1;
    const chunkIndex = chunkIndexRaw ? Number(chunkIndexRaw) : 0;
    const displayFileName = String(originalFileNameRaw || file.name || "dokumen.pdf").slice(0, 180);

    // ===== MODE CHUNKED UPLOAD (untuk PDF > 3 MB hingga 15 MB di Vercel) =====
    if (Number.isInteger(totalChunks) && totalChunks > 1) {
      const uploadId = String(uploadIdRaw || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!uploadId || uploadId.length < 8) {
        return NextResponse.json({ error: "ID unggahan tidak valid." }, { status: 400 });
      }
      if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= totalChunks) {
        return NextResponse.json({ error: "Urutan bagian file tidak valid." }, { status: 400 });
      }
      if (totalChunks > 10) {
        return NextResponse.json({ error: "Ukuran file PDF maksimal 15 MB." }, { status: 400 });
      }
      if (!displayFileName.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Hanya file berformat PDF (.pdf) yang diperbolehkan." },
          { status: 400 }
        );
      }

      const chunkBuf = Buffer.from(await file.arrayBuffer());
      if (chunkBuf.length === 0 || chunkBuf.length > MAX_SINGLE_REQUEST_SIZE) {
        return NextResponse.json({ error: "Ukuran bagian file tidak valid." }, { status: 400 });
      }

      if (chunkIndex === 0 && !isValidPdfBytes(chunkBuf)) {
        return NextResponse.json(
          { error: "File yang diunggah bukan dokumen PDF yang valid." },
          { status: 400 }
        );
      }

      await prisma.uploadedFileChunk.upsert({
        where: { uploadId_chunkIndex: { uploadId, chunkIndex } },
        update: { data: new Uint8Array(chunkBuf) },
        create: { uploadId, chunkIndex, data: new Uint8Array(chunkBuf) },
      });

      // Jika belum chunk terakhir, kembalikan status lanjut
      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({ ok: true, chunkIndex, totalChunks }, { status: 200 });
      }

      // Chunk terakhir: gabungkan seluruh bagian secara berurutan
      const chunks = await prisma.uploadedFileChunk.findMany({
        where: { uploadId },
        orderBy: { chunkIndex: "asc" },
      });

      if (chunks.length !== totalChunks) {
        await prisma.uploadedFileChunk.deleteMany({ where: { uploadId } });
        return NextResponse.json(
          { error: "Sebagian paket upload hilang. Silakan coba unggah ulang PDF." },
          { status: 400 }
        );
      }

      const merged = Buffer.concat(chunks.map((c) => Buffer.from(c.data)));
      await prisma.uploadedFileChunk.deleteMany({ where: { uploadId } });

      if (merged.length > MAX_TOTAL_PDF_SIZE) {
        return NextResponse.json({ error: "Ukuran file PDF maksimal 15 MB." }, { status: 400 });
      }
      if (!isValidPdfBytes(merged)) {
        return NextResponse.json(
          { error: "File yang diunggah bukan dokumen PDF yang valid." },
          { status: 400 }
        );
      }

      const saved = await prisma.uploadedFile.create({
        data: {
          folder: safeFolder,
          fileName: displayFileName,
          mimeType: "application/pdf",
          size: merged.length,
          data: new Uint8Array(merged),
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
    }

    // ===== MODE UPLOAD LANGSUNG (untuk PDF <= 3 MB) =====
    const isPdf =
      file.type === "application/pdf" || displayFileName.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Hanya file berformat PDF (.pdf) yang diperbolehkan." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File PDF kosong (0 byte)." }, { status: 400 });
    }

    if (file.size > MAX_SINGLE_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "File terlalu besar untuk unggahan tunggal. Coba ulangi agar sistem memecah otomatis." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidPdfBytes(buffer)) {
      return NextResponse.json(
        { error: "File yang diunggah bukan dokumen PDF yang valid." },
        { status: 400 }
      );
    }

    const saved = await prisma.uploadedFile.create({
      data: {
        folder: safeFolder,
        fileName: displayFileName,
        mimeType: "application/pdf",
        size: buffer.length,
        data: new Uint8Array(buffer),
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
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          detail.includes("UploadedFile") || detail.includes("does not exist")
            ? "Tabel penyimpanan PDF belum tersinkron di database. Coba redeploy atau jalankan prisma db push."
            : "Gagal mengunggah file PDF ke server. Pastikan ukuran maksimal 15 MB dan koneksi stabil.",
      },
      { status: 500 }
    );
  }
}
