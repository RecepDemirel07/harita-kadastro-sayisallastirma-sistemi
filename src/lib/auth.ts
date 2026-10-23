import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { RoleCode } from "./permissions";
import {
  SESSION_COOKIE_NAME,
  SessionUser,
  signSessionToken,
  verifySessionToken,
  getSessionCookieOptions,
} from "./jwt";

export {
  SESSION_COOKIE_NAME,
  type SessionUser,
  signSessionToken,
  verifySessionToken,
  getSessionCookieOptions,
};

/**
 * Sunucu tarafında aktif kullanıcı oturumunu doğrular.
 * İstemcinin gönderdiği rol bilgisine güvenmez; veritabanından güncel kullanıcı ve rol kaydını kontrol eder.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = await verifySessionToken(token);
  if (!decoded) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { role: true },
  });

  if (!dbUser || !dbUser.isActive) {
    return null;
  }

  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    fullName: dbUser.fullName,
    roleCode: dbUser.role.code as RoleCode,
    roleName: dbUser.role.name,
  };
}
