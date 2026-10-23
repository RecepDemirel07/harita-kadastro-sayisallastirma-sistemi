import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import {
  canViewGroup,
  canEditRecordInGroup,
  canCreateRecordInGroup,
  canDeleteRecordInGroup,
  canExportGroup,
  canImportExcel,
} from "@/lib/permissions";
import { GROUP_CODES } from "@/lib/columns";
import {
  parseAndValidateExcelBuffer,
  importExcelRecordsToGroup,
  generateGroupExcelBuffer,
} from "@/lib/excel";
import { sanitizeForExcelExport, updateRecordRequestSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { ensureSeedUsersAndData } from "@/lib/seed-helper";
import { buildRecordWhereClause } from "@/lib/record-query";

describe("1. Merkezi Yetkilendirme Matrisi Kontrolleri", () => {
  it("NİL PROJE dört grubu da görüntüleyebilir ve Excel indirebilir, ancak yalnızca GRUP-2'yi düzenleyebilir", () => {
    for (const g of GROUP_CODES) {
      expect(canViewGroup("NIL_PROJE", g)).toBe(true);
      expect(canExportGroup("NIL_PROJE", g)).toBe(true);
      expect(canCreateRecordInGroup("NIL_PROJE", g)).toBe(false);
      expect(canDeleteRecordInGroup("NIL_PROJE", g)).toBe(false);
    }
    expect(canEditRecordInGroup("NIL_PROJE", "GRUP-1")).toBe(false);
    expect(canEditRecordInGroup("NIL_PROJE", "GRUP-2")).toBe(true);
    expect(canEditRecordInGroup("NIL_PROJE", "GRUP-3")).toBe(false);
    expect(canEditRecordInGroup("NIL_PROJE", "GRUP-4")).toBe(false);
    expect(canImportExcel("NIL_PROJE")).toBe(false);
  });

  it("TKGM dört grubu da görüntüleyebilir ve Excel indirebilir, hiçbir grupta veri değiştiremez", () => {
    for (const g of GROUP_CODES) {
      expect(canViewGroup("TKGM", g)).toBe(true);
      expect(canExportGroup("TKGM", g)).toBe(true);
      expect(canEditRecordInGroup("TKGM", g)).toBe(false);
      expect(canCreateRecordInGroup("TKGM", g)).toBe(false);
      expect(canDeleteRecordInGroup("TKGM", g)).toBe(false);
    }
    expect(canImportExcel("TKGM")).toBe(false);
  });

  it("MTCHARİTA bütün gruplarda tam yetkiye ve Excel içe aktarma yetkisine sahiptir", () => {
    for (const g of GROUP_CODES) {
      expect(canViewGroup("MTCHARITA", g)).toBe(true);
      expect(canExportGroup("MTCHARITA", g)).toBe(true);
      expect(canEditRecordInGroup("MTCHARITA", g)).toBe(true);
      expect(canCreateRecordInGroup("MTCHARITA", g)).toBe(true);
      expect(canDeleteRecordInGroup("MTCHARITA", g)).toBe(true);
    }
    expect(canImportExcel("MTCHARITA")).toBe(true);
  });
});

describe("2. Gerçek Excel Dosyaları Analizi, İçe/Dışa Aktarma ve Veri Bütünlüğü", () => {
  beforeAll(async () => {
    await ensureSeedUsersAndData();
  });

  it("Dört başlangıç Excel dosyası doğru grup kayıt sayılarıyla veritabanına aktarılmış olmalı", async () => {
    const [c1, c2, c3, c4] = await Promise.all([
      prisma.kadastroRecord.count({ where: { groupCode: "GRUP-1" } }),
      prisma.kadastroRecord.count({ where: { groupCode: "GRUP-2" } }),
      prisma.kadastroRecord.count({ where: { groupCode: "GRUP-3" } }),
      prisma.kadastroRecord.count({ where: { groupCode: "GRUP-4" } }),
    ]);

    expect(c1).toBe(79);
    expect(c2).toBe(127);
    expect(c3).toBe(67);
    expect(c4).toBe(195);
  });

  it("Aynı Excel dosyasının tekrar içe aktarılması (SKIP_EXISTING) mükerrer kayıt üretmemeli", async () => {
    const filePath = path.join(process.cwd(), "data", "seed-excels", "GRUP-2.xlsx");
    const buffer = fs.readFileSync(filePath);

    const res = await importExcelRecordsToGroup({
      buffer,
      fileName: "GRUP-2.xlsx",
      groupCode: "GRUP-2",
      mode: "SKIP_EXISTING",
      userName: "Test Yönetici",
      userRole: "MTCHARİTA",
    });

    expect(res.errors.length).toBe(0);
    expect(res.insertedCount).toBe(0);
    expect(res.skippedCount).toBe(127);

    const countAfter = await prisma.kadastroRecord.count({ where: { groupCode: "GRUP-2" } });
    expect(countAfter).toBe(127);
  });

  it("Kullanıcı değişikliği yapılan kayıt, UPDATE_UNMODIFIED modunda yeniden aktarımda ezilmemeli ve Excel çıktısında güncel haliyle yer almalı", async () => {
    // GRUP-2'den bir kayıt al (Örn: ATAŞEHİR / BARBAROS (M))
    const target = await prisma.kadastroRecord.findFirst({
      where: { groupCode: "GRUP-2", ilcesi: "ATAŞEHİR" },
      orderBy: { rowOrder: "asc" },
    });
    expect(target).not.toBeNull();

    const originalYevmiye = target!.yevmiyeVeTarih;
    const originalAciklama = target!.aciklama;

    // Baştaki sıfırlı kod ve Türkçe karakter içeren güncelleme yap
    const updated = await prisma.kadastroRecord.update({
      where: { id: target!.id },
      data: {
        yevmiyeVeTarih: "00048/2026",
        aciklama: "GÜNCEL TEST NOTU - ŞİLE İĞDIR ÇAĞLAYAN",
        isUserModified: true,
        version: { increment: 1 },
      },
    });

    expect(updated.yevmiyeVeTarih).toBe("00048/2026");

    // Şimdi UPDATE_UNMODIFIED ile GRUP-2.xlsx'i tekrar içe aktar
    const filePath = path.join(process.cwd(), "data", "seed-excels", "GRUP-2.xlsx");
    const buffer = fs.readFileSync(filePath);
    const importRes = await importExcelRecordsToGroup({
      buffer,
      fileName: "GRUP-2.xlsx",
      groupCode: "GRUP-2",
      mode: "UPDATE_UNMODIFIED",
      userName: "Test Yönetici",
      userRole: "MTCHARİTA",
    });

    expect(importRes.protectedUserModifiedCount).toBeGreaterThanOrEqual(1);

    // Veritabanında kullanıcı değişikliğinin korunduğunu doğrula
    const afterImport = await prisma.kadastroRecord.findUnique({ where: { id: target!.id } });
    expect(afterImport?.yevmiyeVeTarih).toBe("00048/2026");
    expect(afterImport?.aciklama).toBe("GÜNCEL TEST NOTU - ŞİLE İĞDIR ÇAĞLAYAN");

    // Şimdi tüm GRUP-2 kayıtlarını Excel olarak dışa aktar ve içeriğini doğrula
    const allGroup2Records = await prisma.kadastroRecord.findMany({
      where: { groupCode: "GRUP-2" },
      orderBy: { rowOrder: "asc" },
    });

    const exportedBuffer = await generateGroupExcelBuffer({
      groupCode: "GRUP-2",
      projectTitle: "GRUP-2 TEST BAŞLIK",
      records: allGroup2Records as unknown as Record<string, unknown>[],
    });

    // Dışa aktarılan Excel'i geri oku ve 127 kaydın tamamının + güncellenmiş hücrelerin bulunduğunu doğrula
    const reParsed = await parseAndValidateExcelBuffer(exportedBuffer, "Export.xlsx", "GRUP-2");
    expect(reParsed.errors.length).toBe(0);
    expect(reParsed.rows.length).toBe(127);

    const exportedTargetRow = reParsed.rows.find(
      (r) => r.data.hizmetBirimi === target!.hizmetBirimi && r.data.mahalleKoy === target!.mahalleKoy
    );
    expect(exportedTargetRow).toBeDefined();
    expect(exportedTargetRow?.data.yevmiyeVeTarih).toBe("00048/2026");
    expect(exportedTargetRow?.data.aciklama).toBe("GÜNCEL TEST NOTU - ŞİLE İĞDIR ÇAĞLAYAN");

    // Test sonrası kaydı orijinal haline geri döndür
    await prisma.kadastroRecord.update({
      where: { id: target!.id },
      data: {
        yevmiyeVeTarih: originalYevmiye,
        aciklama: originalAciklama,
        isUserModified: false,
      },
    });
  });

  it("Excel formül enjeksiyonu (CSV/XLSX injection) karakterleri güvenli şekilde etkisizleştirilmeli", () => {
    expect(sanitizeForExcelExport("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeForExcelExport("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeForExcelExport("-100+200")).toBe("'-100+200");
    expect(sanitizeForExcelExport("@IMPORT")).toBe("'@IMPORT");
    expect(sanitizeForExcelExport("001234")).toBe("001234");
    expect(sanitizeForExcelExport("KENARLAŞAN 1 PARSEL İLAVE EDİLDİ")).toBe(
      "KENARLAŞAN 1 PARSEL İLAVE EDİLDİ"
    );
  });

  it("Sunucu tarafı arama ve filtreleme Türkçe karakterlerle doğru çalışmalı", async () => {
    const where = buildRecordWhereClause({
      groupCode: "GRUP-2",
      search: "ataşehir",
      ilcesi: "ATAŞEHİR",
    });

    const matched = await prisma.kadastroRecord.findMany({ where });
    expect(matched.length).toBe(12); // Ataşehir ilçesindeki 12 mahalle
  });

  it("Kayıt güncelleme şeması baştaki sıfırları korumalı ve zorunlu alanları doğrulamalı", () => {
    const valid = updateRecordRequestSchema.safeParse({
      hizmetBirimi: "ATAŞEHİR",
      ilcesi: "ÜSKÜDAR",
      mahalleKoy: "KANDİLLİ",
      biriminToplamParselSayisi: "503",
      yevmiyeVeTarih: "00099",
      version: 1,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.yevmiyeVeTarih).toBe("00099");
      expect(valid.data.biriminToplamParselSayisi).toBe(503);
    }

    const invalid = updateRecordRequestSchema.safeParse({
      hizmetBirimi: "",
      ilcesi: "ÜSKÜDAR",
      mahalleKoy: "KANDİLLİ",
      version: 1,
    });
    expect(invalid.success).toBe(false);
  });
});
