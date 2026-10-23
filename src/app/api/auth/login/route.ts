import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSessionToken, getSessionCookieOptions } from "@/lib/auth";
import { ensureSeedUsersAndData } from "@/lib/seed-helper";
import { RoleCode } from "@/lib/permissions";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // İlk kurulumda varsayılan roller, kullanıcılar ve Excel verilerinin yüklü olduğundan emin ol
    await ensureSeedUsersAndData();

    const body = await req.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().slice(0, 120) : "";
    const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Kullanıcı adı (veya e-posta) ve şifre alanları zorunludur." },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local";
    const rateKey = `login:${clientIp}:${identifier.toLowerCase()}`;
    const rateStatus = checkRateLimit(rateKey, 10, 5 * 60 * 1000);

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla başarısız giriş denemesi yapıldı. Lütfen ${rateStatus.retryAfterSeconds} saniye sonra tekrar deneyin.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase() },
          { username: identifier },
          { email: identifier.toLowerCase() },
          { email: identifier },
        ],
      },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı adı/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Bu kullanıcı hesabı pasif durumdadır. Sistem yöneticisi ile iletişime geçin." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Kullanıcı adı/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin." },
        { status: 401 }
      );
    }

    // Başarılı girişte sayacı sıfırla
    resetRateLimit(rateKey);

    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roleCode: user.role.code as RoleCode,
      roleName: user.role.name,
    };

    const token = await signSessionToken(sessionUser);
    const cookieOpts = getSessionCookieOptions();

    const response = NextResponse.json({
      user: sessionUser,
      message: "Giriş başarılı.",
    });

    response.cookies.set(cookieOpts.name, token, cookieOpts);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Giriş işlemi sırasında beklenmeyen bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
