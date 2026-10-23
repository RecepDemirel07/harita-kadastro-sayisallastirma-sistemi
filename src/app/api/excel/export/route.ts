import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { canExportGroup, isValidGroupCode } from "@/lib/permissions";
import { GROUP_DEFAULT_TITLES } from "@/lib/columns";
import { buildRecordWhereClause, buildRecordOrderBy } from "@/lib/record-query";
import { generateGroupExcelBuffer } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Excel dışa aktarma işlemi için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const groupParam = searchParams.get("group") || "GRUP-1";
    const scope = searchParams.get("scope") === "filtered" ? "filtered" : "all";

    if (!isValidGroupCode(groupParam)) {
      return NextResponse.json({ error: "Geçersiz veri grubu." }, { status: 400 });
    }

    if (!canExportGroup(session.roleCode, groupParam)) {
      return NextResponse.json(
        { error: "Bu grubun Excel çıktısını indirme yetkiniz bulunmuyor." },
        { status: 403 }
      );
    }

    const sortBy = searchParams.get("sortBy") || "rowOrder";
    const sortOrder = (searchParams.get("sortOrder") === "desc" ? "desc" : "asc") as "asc" | "desc";

    const where =
      scope === "filtered"
        ? buildRecordWhereClause({
            groupCode: groupParam,
            search: searchParams.get("search") || "",
            hizmetBirimi: searchParams.get("hizmetBirimi") || "ALL",
            ilcesi: searchParams.get("ilcesi") || "ALL",
            statusFilter: searchParams.get("statusFilter") || "all",
            minParsel: searchParams.get("minParsel") || "",
            maxParsel: searchParams.get("maxParsel") || "",
          })
        : { groupCode: groupParam };

    const orderBy = buildRecordOrderBy(sortBy, sortOrder);

    const [records, metadata] = await Promise.all([
      prisma.kadastroRecord.findMany({
        where,
        orderBy,
      }),
      prisma.groupMetadata.findUnique({
        where: { groupCode: groupParam },
      }),
    ]);

    const projectTitle = metadata?.projectTitle || GROUP_DEFAULT_TITLES[groupParam];

    const buffer = await generateGroupExcelBuffer({
      groupCode: groupParam,
      projectTitle,
      records: records as unknown as Record<string, unknown>[],
    });

    // İşlem geçmişine dışa aktarma kaydı düş
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userName: session.fullName,
        userRole: session.roleName,
        action: "EXPORT",
        groupCode: groupParam,
        recordId: null,
        recordLabel: `${groupParam} (${scope === "filtered" ? "Filtrelenen Kayıtlar" : "Tüm Kayıtlar"}: ${records.length} satır)`,
        changesJson: JSON.stringify({
          scope,
          exportedRowCount: records.length,
        }),
      },
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const suffix = scope === "filtered" ? "_Filtreli" : "";
    const fileName = `${groupParam}${suffix}_${todayStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/excel/export error:", err);
    return NextResponse.json(
      { error: "Excel dosyası oluşturulurken sunucu hatası meydana geldi." },
      { status: 500 }
    );
  }
}
