import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local";
    const rateStatus = checkRateLimit(`forgot-pwd:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla şifre sıfırlama talebi gönderildi. Lütfen ${rateStatus.retryAfterSeconds} saniye sonra tekrar deneyin.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().slice(0, 120) : "";
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";

    if (!identifier) {
      return NextResponse.json(
        { error: "Lütfen kullanıcı adınızı veya kurumsal e-posta adresinizi girin." },
        { status: 400 }
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

    if (user) {
      // Aynı kullanıcı için zaten bekleyen talep varsa mükerrer spam kaydı oluşturmak yerine mevcut talebi güncelle
      await prisma.auditLog.deleteMany({
        where: {
          action: "PASSWORD_RESET_REQUEST",
          recordId: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.fullName,
          userRole: user.role.name,
          action: "PASSWORD_RESET_REQUEST",
          groupCode: "SİSTEM",
          recordId: user.id,
          recordLabel: `Şifre Sıfırlama Talebi: ${user.username} (${user.email})`,
          changesJson: JSON.stringify({
            username: user.username,
            email: user.email,
            note: note || "Kullanıcı giriş ekranından şifre sıfırlama talebi gönderdi.",
          }),
        },
      });
    }

    return NextResponse.json({
      message:
        "Şifre sıfırlama talebiniz sistem yöneticisine (MTCHARİTA) iletildi ve denetim kayıtlarına işlendi. Yöneticiniz 'Kullanıcılar' panelinden şifrenizi yenileyebilir.",
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password error:", err);
    return NextResponse.json(
      { error: "Talep iletilirken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
