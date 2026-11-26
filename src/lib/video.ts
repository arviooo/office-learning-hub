/**
 * Mengubah berbagai format tautan video (YouTube watch/youtu.be/shorts/live,
 * Google Drive, Vimeo) menjadi URL embed yang aman untuk <iframe>.
 */

function parseYouTubeStartSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const sec = Number(trimmed);
    return sec > 0 ? sec : null;
  }
  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function parseUrlSafely(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    // Izinkan guru menempel tautan tanpa https:// seperti "youtu.be/xxxx"
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function extractYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return segments[0] || null;
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }
    if (
      segments.length >= 2 &&
      (segments[0] === "embed" ||
        segments[0] === "shorts" ||
        segments[0] === "live" ||
        segments[0] === "v")
    ) {
      return segments[1] || null;
    }
  }

  return null;
}

export function toEmbedVideoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;

  const parsed = parseUrlSafely(rawUrl);
  if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
    return null;
  }

  // 1. YouTube (watch, youtu.be, shorts, live, embed)
  const ytId = extractYouTubeVideoId(parsed);
  if (ytId) {
    const cleanId = ytId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) return null;
    const startSec =
      parseYouTubeStartSeconds(parsed.searchParams.get("t")) ??
      parseYouTubeStartSeconds(parsed.searchParams.get("start"));
    const params = new URLSearchParams({ rel: "0" });
    if (startSec) params.set("start", String(startSec));
    return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
  }

  // 2. Google Drive video/file preview
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "drive.google.com") {
    const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)/);
    const driveId = fileMatch?.[1] || parsed.searchParams.get("id");
    if (driveId) {
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }
  }

  // 3. Vimeo
  if (host === "vimeo.com") {
    const vimeoMatch = parsed.pathname.match(/^\/(\d+)/);
    if (vimeoMatch?.[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
  }

  return parsed.toString();
}

export function toExternalVideoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;

  const parsed = parseUrlSafely(rawUrl);
  if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
    return null;
  }

  const ytId = extractYouTubeVideoId(parsed);
  if (ytId) {
    const cleanId = ytId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanId) {
      return `https://www.youtube.com/watch?v=${cleanId}`;
    }
  }

  return parsed.toString();
}
