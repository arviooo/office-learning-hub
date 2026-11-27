import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TOTAL_PDF_SIZE = 15 * 1024 * 1024; // 15 MB (chunked)
const MAX_SINGLE_REQUEST_SIZE = 4 * 1024 * 1024; // 4 MB per request (aman di Vercel Serverless)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB untuk gambar

function isValidPdfBytes(buffer: Buffer): boolean {
  const headerChunk = buffer.subarray(0, Math.min(4096, buffer.length)).toString("latin1");
  return headerChunk.includes("%PDF");
}

function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "pdf").toLowerCase();
    const folder = String(formData.get("folder") || "documents").replace(/[^a-z0-9_-]/gi, "");
    const safeFolder = folder || "documents";

    const uploadIdRaw = formData.get("uploadId");
    const chunkIndexRaw = formData.get("chunkIndex");
    const totalChunksRaw = formData.get("totalChunks");
    const originalFileNameRaw = formData.get("fileName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan dalam permintaan." }, { status: 400 });
    }

    const displayFileName = String(originalFileNameRaw || file.name || "dokumen.pdf").slice(0, 180);

    // ===== MODE UPLOAD GAMBAR (PNG / JPG / WEBP, khusus Guru/Admin untuk Simulasi) =====
    if (kind === "image") {
      if (user.role !== "TEACHER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unggah gambar khusus Guru atau Admin." }, { status: 403 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "File gambar kosong (0 byte)." }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Ukuran gambar maksimal 4 MB. Silakan kompres gambar terlebih dahulu." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const detected = detectImageType(buffer);
      if (!detected) {
        return NextResponse.json(
          { error: "Format gambar harus PNG, JPG/JPEG, atau WEBP yang valid." },
          { status: 400 }
        );
      }

      const saved = await prisma.uploadedFile.create({
        data: {
          folder: safeFolder,
          fileName: displayFileName,
          mimeType: detected.mime,
          size: buffer.length,
          data: new Uint8Array(buffer),
        },
        select: { id: true, fileName: true, size: true },
      });

      return NextResponse.json(
        {
          fileUrl: `/api/uploads/${safeFolder}/${saved.id}.${detected.ext}`,
          fileName: saved.fileName,
          size: saved.size,
        },
        { status: 201 }
      );
    }

    // ===== MODE CHUNKED UPLOAD PDF (3 MB - 15 MB) =====
    const totalChunks = totalChunksRaw ? Number(totalChunksRaw) : 1;
    const chunkIndex = chunkIndexRaw ? Number(chunkIndexRaw) : 0;

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

      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({ ok: true, chunkIndex, totalChunks }, { status: 200 });
      }

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

    // ===== MODE UPLOAD LANGSUNG PDF (<= 3 MB) =====
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

    const buffer = Buffer.from(await file.arrayBuffer());
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
    console.error("Upload file error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file ke server. Periksa format dan koneksi internet Anda." },
      { status: 500 }
    );
  }
}
