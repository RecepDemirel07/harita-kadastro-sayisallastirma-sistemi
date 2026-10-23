import { SignJWT, jwtVerify } from "jose";
import { RoleCode } from "./permissions";

export const SESSION_COOKIE_NAME = "pvy_session_token";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 saat

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleCode: RoleCode;
  roleName: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET ortam değişkeni üretim ortamı için zorunludur.");
    }
    return new TextEncoder().encode("dev-fallback-secret-key-do-not-use-in-prod-2026");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload || typeof payload.id !== "number" || typeof payload.roleCode !== "string") {
      return null;
    }
    return {
      id: payload.id,
      username: String(payload.username),
      email: String(payload.email),
      fullName: String(payload.fullName),
      roleCode: payload.roleCode as RoleCode,
      roleName: String(payload.roleName),
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
