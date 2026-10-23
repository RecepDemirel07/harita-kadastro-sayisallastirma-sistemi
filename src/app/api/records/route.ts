import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import {
  canViewGroup,
  canCreateRecordInGroup,
  getGroupPermissionSummary,
  isValidGroupCode,
} from "@/lib/permissions";
import { GROUP_CODES, GROUP_DEFAULT_TITLES, GroupCode } from "@/lib/columns";
import { buildRecordWhereClause, buildRecordOrderBy } from "@/lib/record-query";
import { createRecordRequestSchema } from "@/lib/validation";
import { ensureSeedUsersAndData } from "@/lib/seed-helper";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Bu verilere erişmek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    await ensureSeedUsersAndData();

    const { searchParams } = new URL(req.url);
    const groupParam = searchParams.get("group") || "GRUP-1";

    if (!isValidGroupCode(groupParam)) {
      return NextResponse.json({ error: "Geçersiz veri grubu belirtildi." }, { status: 400 });
    }

    if (!canViewGroup(session.roleCode, groupParam)) {
      return NextResponse.json(
        { error: "Bu grubu görüntüleme yetkiniz bulunmuyor." },
        { status: 403 }
      );
    }

    const search = searchParams.get("search") || "";
    const hizmetBirimi = searchParams.get("hizmetBirimi") || "ALL";
    const ilcesi = searchParams.get("ilcesi") || "ALL";
    const statusFilter = searchParams.get("statusFilter") || "all";
    const minParsel = searchParams.get("minParsel") || "";
    const maxParsel = searchParams.get("maxParsel") || "";
    const sortBy = searchParams.get("sortBy") || "rowOrder";
    const sortOrder = (searchParams.get("sortOrder") === "desc" ? "desc" : "asc") as "asc" | "desc";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      250,
      Math.max(10, parseInt(searchParams.get("pageSize") || "50", 10) || 50)
    );

    const where = buildRecordWhereClause({
      groupCode: groupParam,
      search,
      hizmetBirimi,
      ilcesi,
      statusFilter,
      minParsel,
      maxParsel,
    });

    const orderBy = buildRecordOrderBy(sortBy, sortOrder);

    const [
      records,
      filteredCount,
      groupCountsRaw,
      distinctUnits,
      distinctDistricts,
      aggregates,
      metadata,
    ] = await Promise.all([
      prisma.kadastroRecord.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          updatedBy: {
            select: { fullName: true, username: true },
          },
        },
      }),
      prisma.kadastroRecord.count({ where }),
      prisma.kadastroRecord.groupBy({
        by: ["groupCode"],
        _count: { _all: true },
      }),
      prisma.kadastroRecord.findMany({
        where: { groupCode: groupParam },
        select: { hizmetBirimi: true },
        distinct: ["hizmetBirimi"],
        orderBy: { hizmetBirimi: "asc" },
      }),
      prisma.kadastroRecord.findMany({
        where: {
          groupCode: groupParam,
          ...(hizmetBirimi && hizmetBirimi !== "ALL" ? { hizmetBirimi } : {}),
        },
        select: { ilcesi: true },
        distinct: ["ilcesi"],
        orderBy: { ilcesi: "asc" },
      }),
      prisma.kadastroRecord.aggregate({
        where,
        _sum: {
          biriminToplamParselSayisi: true,
          iyilestirmeYapilacakParselSayisi: true,
          sayisallastirmaYapilacakParselSayisi: true,
          entegrasyon: true,
          altlikSayisallastirma: true,
          araziOlcusu: true,
          teslimEdilenParselSayisi: true,
          pafta1000: true,
          pafta2000: true,
          pafta5000: true,
          iyilestirmeYapilanParselSayisi: true,
          sayisallastirmaYapilanParselSayisi: true,
          ormanParselSayisi: true,
          kesinParselSayisi: true,
          iyilestirmeYapilanParselAlani: true,
          sayisallastirmaYapilanParselAlani: true,
          ormanParselAlani: true,
          yapilanToplamAlanDonum: true,
          komisyondakiParselSayisi: true,
        },
      }),
      prisma.groupMetadata.findUnique({
        where: { groupCode: groupParam },
      }),
    ]);

    const groupCounts: Record<GroupCode, number> = {
      "GRUP-1": 0,
      "GRUP-2": 0,
      "GRUP-3": 0,
      "GRUP-4": 0,
    };
    for (const item of groupCountsRaw) {
      if (GROUP_CODES.includes(item.groupCode as GroupCode)) {
        groupCounts[item.groupCode as GroupCode] = item._count._all;
      }
    }

    return NextResponse.json({
      groupCode: groupParam,
      projectTitle: metadata?.projectTitle || GROUP_DEFAULT_TITLES[groupParam],
      lastImportedAt: metadata?.lastImportedAt || null,
      records,
      pagination: {
        page,
        pageSize,
        filteredCount,
        totalPages: Math.max(1, Math.ceil(filteredCount / pageSize)),
        groupTotalCount: groupCounts[groupParam],
      },
      groupCounts,
      filterOptions: {
        hizmetBirimleri: distinctUnits.map((u) => u.hizmetBirimi),
        ilceler: distinctDistricts.map((d) => d.ilcesi),
      },
      aggregates: aggregates._sum,
      permissions: getGroupPermissionSummary(session.roleCode, groupParam),
    });
  } catch (err) {
    console.error("GET /api/records error:", err);
    return NextResponse.json(
      { error: "Kayıtlar yüklenirken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "İşlem yapmak için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
    }

    const parsed = createRecordRequestSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: "Doğrulama hatası: Lütfen form alanlarını kontrol edin.",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const { groupCode, ...recordData } = parsed.data;

    // Sunucu tarafı yetki kontrolü: Yalnızca MTCHARITA yeni kayıt ekleyebilir
    if (!canCreateRecordInGroup(session.roleCode, groupCode)) {
      return NextResponse.json(
        {
          error: `Rolünüz (${session.roleName}) ${groupCode} grubuna yeni kayıt ekleme yetkisine sahip değil.`,
        },
        { status: 403 }
      );
    }

    // Aynı grupta mükerrer (Hizmet Birimi + İlçe + Mahalle/Köy) kontrolü
    const duplicate = await prisma.kadastroRecord.findFirst({
      where: {
        groupCode,
        hizmetBirimi: recordData.hizmetBirimi,
        ilcesi: recordData.ilcesi,
        mahalleKoy: recordData.mahalleKoy,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: `${groupCode} içinde "${recordData.hizmetBirimi} / ${recordData.ilcesi} / ${recordData.mahalleKoy}" kaydı zaten mevcut.`,
        },
        { status: 409 }
      );
    }

    const maxOrderAgg = await prisma.kadastroRecord.aggregate({
      where: { groupCode },
      _max: { rowOrder: true },
    });
    const nextRowOrder = (maxOrderAgg._max.rowOrder ?? 0) + 1;

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.kadastroRecord.create({
        data: {
          groupCode,
          rowOrder: nextRowOrder,
          ...recordData,
          version: 1,
          isUserModified: true,
          updatedById: session.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userName: session.fullName,
          userRole: session.roleName,
          action: "CREATE",
          groupCode,
          recordId: rec.id,
          recordLabel: `${rec.hizmetBirimi} / ${rec.ilcesi} / ${rec.mahalleKoy}`,
          changesJson: JSON.stringify({
            message: "Yeni kayıt oluşturuldu.",
            hizmetBirimi: rec.hizmetBirimi,
            ilcesi: rec.ilcesi,
            mahalleKoy: rec.mahalleKoy,
          }),
        },
      });

      return rec;
    });

    return NextResponse.json(
      {
        record: created,
        message: "Yeni kayıt başarıyla eklendi.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/records error:", err);
    return NextResponse.json(
      { error: "Kayıt oluşturulurken sunucu hatası meydana geldi." },
      { status: 500 }
    );
  }
}
