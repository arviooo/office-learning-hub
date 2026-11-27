/**
 * Helper upload PDF sisi klien yang mendukung unggahan langsung (<= 3 MB)
 * maupun unggahan bertahap / chunked (3 MB - 15 MB) agar bebas error 413 di Vercel Serverless.
 */

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB
const SINGLE_UPLOAD_THRESHOLD = 3 * 1024 * 1024; // 3 MB
const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB per chunk (aman di bawah batas 4.5 MB Vercel)

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 413) {
      return { error: "Ukuran paket file melebihi batas server (413). Silakan kompres PDF atau coba ulang." };
    }
    return { error: text.slice(0, 140) || `Server mengembalikan status ${res.status}.` };
  }
}

export async function uploadPdfClient(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<{ fileUrl: string; fileName: string }> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Hanya file berformat PDF (.pdf) yang diperbolehkan.");
  }
  if (file.size === 0) {
    throw new Error("File PDF kosong (0 byte).");
  }
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ukuran PDF (${mb} MB) melebihi batas maksimal 15 MB. Silakan kompres PDF terlebih dahulu.`);
  }

  // Mode 1: File <= 3 MB -> 1 kali request cepat
  if (file.size <= SINGLE_UPLOAD_THRESHOLD) {
    onProgress?.(35);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("fileName", file.name);

    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(String(data.error || "Gagal mengunggah file PDF."));
    }
    onProgress?.(100);
    return {
      fileUrl: String(data.fileUrl),
      fileName: String(data.fileName || file.name),
    };
  }

  // Mode 2: File 3 MB - 15 MB -> otomatis dipecah menjadi potongan 2.5 MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const slice = file.slice(start, end, "application/pdf");

    const fd = new FormData();
    fd.append("file", slice, file.name);
    fd.append("folder", folder);
    fd.append("fileName", file.name);
    fd.append("uploadId", uploadId);
    fd.append("chunkIndex", String(chunkIndex));
    fd.append("totalChunks", String(totalChunks));

    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(String(data.error || `Gagal mengunggah bagian ${chunkIndex + 1}/${totalChunks}.`));
    }

    onProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));

    if (chunkIndex === totalChunks - 1) {
      return {
        fileUrl: String(data.fileUrl),
        fileName: String(data.fileName || file.name),
      };
    }
  }

  throw new Error("Proses upload PDF tidak lengkap. Silakan coba lagi.");
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export async function uploadImageClient(
  file: File,
  folder = "simulasi"
): Promise<{ fileUrl: string; fileName: string }> {
  const validExt = /\.(png|jpe?g|webp)$/i.test(file.name);
  const validMime = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (!validExt && !validMime) {
    throw new Error("Format gambar harus PNG, JPG/JPEG, atau WEBP.");
  }
  if (file.size === 0) {
    throw new Error("File gambar kosong (0 byte).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ukuran gambar (${mb} MB) melebihi batas maksimal 4 MB.`);
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", "image");
  fd.append("folder", folder);
  fd.append("fileName", file.name);

  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(String(data.error || "Gagal mengunggah gambar."));
  }
  return {
    fileUrl: String(data.fileUrl),
    fileName: String(data.fileName || file.name),
  };
}
