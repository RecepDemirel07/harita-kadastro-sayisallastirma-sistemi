import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import {
  canEditRecordInGroup,
  canDeleteRecordInGroup,
} from "@/lib/permissions";
import { GroupCode } from "@/lib/columns";
import { updateRecordRequestSchema, computeRecordDiff } from "@/lib/validation";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Bu işlemi gerçekleştirmek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const recordId = parseInt(id, 10);
    if (Number.isNaN(recordId)) {
      return NextResponse.json({ error: "Geçersiz kayıt kimliği (ID)." }, { status: 400 });
    }

    // 1. Veritabanındaki gerçek kaydı ve gerçek grubunu bul
    const existingRecord = await prisma.kadastroRecord.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    }

    const actualGroup = existingRecord.groupCode as GroupCode;

    // 2. Kullanıcının gönderdiği grup bilgisine ASLA güvenme;
    // اگر istemci farklı bir groupCode göndererek kaydı başka gruba taşımaya çalışırsa reddet!
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Geçersiz istek verisi." }, { status: 400 });
    }

    if (body.groupCode && body.groupCode !== actualGroup) {
      return NextResponse.json(
        {
          error: "Güvenlik ihlali: Bir kaydın ait olduğu veri grubu değiştirilemez.",
        },
        { status: 403 }
      );
    }

    // 3. Kaydın veritabanındaki gerçek grubu üzerinde düzenleme yetkisini doğrula
    if (!canEditRecordInGroup(session.roleCode, actualGroup)) {
      return NextResponse.json(
        {
          error: `Yetkisiz işlem: Rolünüz (${session.roleName}) ${actualGroup} grubundaki kayıtları düzenleme yetkisine sahip değil.`,
        },
        { status: 403 }
      );
    }

    // 4. İstek verisini doğrula
    const parsed = updateRecordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Doğrulama hatası: Lütfen girdiğiniz alanları kontrol edin.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { version, ...updateData } = parsed.data;

    // 5. Çakışma (Optimistic Concurrency) Kontrolü
    if (version !== existingRecord.version) {
      return NextResponse.json(
        {
          error:
            "Çakışma tespit edildi: Bu kayıt siz düzenlerken başka bir kullanıcı tarafından değiştirilmiş. Lütfen güncel verileri yükleyip tekrar deneyin.",
          code: "VERSION_CONFLICT",
          currentRecord: existingRecord,
        },
        { status: 409 }
      );
    }

    // 6. Aynı grupta başka bir kayıtla (Hizmet Birimi + İlçe + Mahalle/Köy) çakışıyor mu kontrol et
    if (
      updateData.hizmetBirimi !== existingRecord.hizmetBirimi ||
      updateData.ilcesi !== existingRecord.ilcesi ||
      updateData.mahalleKoy !== existingRecord.mahalleKoy
    ) {
      const duplicate = await prisma.kadastroRecord.findFirst({
        where: {
          groupCode: actualGroup,
          hizmetBirimi: updateData.hizmetBirimi,
          ilcesi: updateData.ilcesi,
          mahalleKoy: updateData.mahalleKoy,
          id: { not: recordId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: `${actualGroup} içinde "${updateData.hizmetBirimi} / ${updateData.ilcesi} / ${updateData.mahalleKoy}" adına sahip başka bir kayıt zaten mevcut.`,
          },
          { status: 409 }
        );
      }
    }

    const diff = computeRecordDiff(
      existingRecord as unknown as Record<string, unknown>,
      updateData as unknown as Record<string, unknown>
    );

    if (Object.keys(diff).length === 0) {
      return NextResponse.json({
        record: existingRecord,
        message: "Herhangi bir değişiklik yapılmadı.",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.kadastroRecord.update({
        where: { id: recordId },
        data: {
          ...updateData,
          // groupCode asla değiştirilmez
          version: { increment: 1 },
          isUserModified: true,
          updatedById: session.id,
        },
        include: {
          updatedBy: {
            select: { fullName: true, username: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userName: session.fullName,
          userRole: session.roleName,
          action: "UPDATE",
          groupCode: actualGroup,
          recordId: rec.id,
          recordLabel: `${rec.hizmetBirimi} / ${rec.ilcesi} / ${rec.mahalleKoy}`,
          changesJson: JSON.stringify(diff),
        },
      });

      return rec;
    });

    return NextResponse.json({
      record: updated,
      changedFieldsCount: Object.keys(diff).length,
      message: "Kayıt başarıyla güncellendi.",
    });
  } catch (err) {
    console.error("PUT /api/records/[id] error:", err);
    return NextResponse.json(
      { error: "Kayıt güncellenirken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Bu işlemi gerçekleştirmek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const recordId = parseInt(id, 10);
    if (Number.isNaN(recordId)) {
      return NextResponse.json({ error: "Geçersiz kayıt kimliği (ID)." }, { status: 400 });
    }

    const existingRecord = await prisma.kadastroRecord.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Silinecek kayıt bulunamadı." }, { status: 404 });
    }

    const actualGroup = existingRecord.groupCode as GroupCode;

    if (!canDeleteRecordInGroup(session.roleCode, actualGroup)) {
      return NextResponse.json(
        {
          error: `Yetkisiz işlem: Rolünüz (${session.roleName}) kayıt silme yetkisine sahip değil.`,
        },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.kadastroRecord.delete({
        where: { id: recordId },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          userName: session.fullName,
          userRole: session.roleName,
          action: "DELETE",
          groupCode: actualGroup,
          recordId,
          recordLabel: `${existingRecord.hizmetBirimi} / ${existingRecord.ilcesi} / ${existingRecord.mahalleKoy}`,
          changesJson: JSON.stringify({
            deletedRecord: {
              hizmetBirimi: existingRecord.hizmetBirimi,
              ilcesi: existingRecord.ilcesi,
              mahalleKoy: existingRecord.mahalleKoy,
              biriminToplamParselSayisi: existingRecord.biriminToplamParselSayisi,
            },
          }),
        },
      });
    });

    return NextResponse.json({
      message: `"${existingRecord.mahalleKoy}" kaydı başarıyla silindi.`,
    });
  } catch (err) {
    console.error("DELETE /api/records/[id] error:", err);
    return NextResponse.json(
      { error: "Kayıt silinirken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
