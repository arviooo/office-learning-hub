import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "olh_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "office-learning-hub-smk-mplb-dev-secret-2026";
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.userId || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, role: UserRole) {
  const token = signSessionToken({ userId, role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  // Query ringan tanpa JOIN yang tidak dipakai agar setiap halaman cepat dimuat
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      identityNo: true,
      className: true,
      avatarColor: true,
      bio: true,
      points: true,
      classroomId: true,
    },
  });

  return user;
});

export function getHomePathForRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/guru";
    case "ADMIN":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export function getStudentLevel(points: number) {
  if (points >= 800) return { level: 5, title: "Duta Pelayanan Tamu", nextTarget: 1000 };
  if (points >= 550) return { level: 4, title: "Resepsionis Profesional", nextTarget: 800 };
  if (points >= 300) return { level: 3, title: "Praktisi 3S & Telepon Kantor", nextTarget: 550 };
  if (points >= 120) return { level: 2, title: "Staf Front Office Muda", nextTarget: 300 };
  return { level: 1, title: "Pembelajar Pelayanan Tamu", nextTarget: 120 };
}
