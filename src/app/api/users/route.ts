import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    if (session.roleCode !== "MTCHARITA") {
      return NextResponse.json(
        { error: "Kullanıcı yönetimi yalnızca MTCHARİTA yöneticilerine açıktır." },
        { status: 403 }
      );
    }

    const [users, roles, resetRequests] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          role: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { id: "asc" },
      }),
      prisma.role.findMany({ orderBy: { id: "asc" } }),
      prisma.auditLog.findMany({
        where: { action: "PASSWORD_RESET_REQUEST" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({ users, roles, resetRequests });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: "Kullanıcı listesi alınamadı." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    if (session.roleCode !== "MTCHARITA") {
      return NextResponse.json(
        { error: "Yeni kullanıcı oluşturma yetkisi yalnızca MTCHARİTA yöneticilerine aittir." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const username = String(body?.username || "").trim().toLowerCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = String(body?.fullName || "").trim();
    const password = String(body?.password || "");
    const roleCode = String(body?.roleCode || "");

    if (!username || !email || !fullName || password.length < 6 || !roleCode) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı adı, e-posta, ad soyad, rol ve en az 6 karakterli şifre alanları zorunludur.",
        },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      return NextResponse.json({ error: "Geçersiz kurum/rol seçimi." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Bu kullanıcı adı veya e-posta adresi zaten kullanımda." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(
      { user: created, message: "Yeni kullanıcı hesabı başarıyla oluşturuldu." },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/users error:", err);
    return NextResponse.json(
      { error: "Kullanıcı oluşturulurken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    if (session.roleCode !== "MTCHARITA") {
      return NextResponse.json(
        { error: "Kullanıcı şifresi sıfırlama yetkisi yalnızca MTCHARİTA yöneticilerine aittir." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const userId = Number(body?.userId);
    const newPassword = String(body?.newPassword || "");

    if (!userId || Number.isNaN(userId) || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Geçerli bir kullanıcı ve en az 6 karakterli yeni şifre belirtilmelidir." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Bu kullanıcının bekleyen şifre sıfırlama taleplerini temizle ve denetim kaydı oluştur
      await tx.auditLog.deleteMany({
        where: {
          action: "PASSWORD_RESET_REQUEST",
          recordId: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userName: session.fullName,
          userRole: session.roleName,
          action: "PASSWORD_RESET",
          groupCode: "SİSTEM",
          recordId: targetUser.id,
          recordLabel: `Şifre Yenilendi: ${targetUser.username} (${targetUser.role.name})`,
          changesJson: JSON.stringify({
            resetBy: session.username,
            targetUser: targetUser.username,
          }),
        },
      });
    });

    return NextResponse.json({
      message: `"${targetUser.fullName}" (${targetUser.username}) kullanıcısının şifresi başarıyla güncellendi.`,
    });
  } catch (err) {
    console.error("PATCH /api/users error:", err);
    return NextResponse.json(
      { error: "Şifre güncellenirken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
