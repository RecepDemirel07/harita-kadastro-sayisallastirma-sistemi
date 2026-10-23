import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { isValidGroupCode } from "@/lib/permissions";
import { GROUP_CODES } from "@/lib/columns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "İşlem geçmişini görüntülemek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const groupParam = searchParams.get("group");
    const recordIdParam = searchParams.get("recordId");
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10) || 50));

    const where: Record<string, unknown> = {};
    if (groupParam && isValidGroupCode(groupParam)) {
      where.groupCode = groupParam;
    } else if (session.roleCode !== "MTCHARITA") {
      // Yönetici olmayan kullanıcılar SİSTEM (şifre sıfırlama vb.) kayıtlarını göremez
      where.groupCode = { in: GROUP_CODES };
    }

    if (recordIdParam) {
      const parsedId = parseInt(recordIdParam, 10);
      if (!Number.isNaN(parsedId)) {
        where.recordId = parsedId;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET /api/audit error:", err);
    return NextResponse.json(
      { error: "İşlem geçmişi alınırken hata oluştu." },
      { status: 500 }
    );
  }
}
