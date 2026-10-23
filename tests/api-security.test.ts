import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as authModule from "@/lib/auth";
import { GET as getRecords, POST as createRecord } from "@/app/api/records/route";
import { PUT as updateRecord, DELETE as deleteRecord } from "@/app/api/records/[id]/route";
import { GET as exportExcel } from "@/app/api/excel/export/route";
import { POST as importExcel } from "@/app/api/excel/import/route";
import { prisma } from "@/lib/prisma";

describe("3. API Uç Noktaları Sunucu Tarafı Güvenlik ve Yetkilendirme Testleri", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Giriş yapılmamış (oturumsuz) istekler 401 döndürmeli", async () => {
    vi.spyOn(authModule, "getServerSession").mockResolvedValue(null);

    const reqRecords = new NextRequest("http://localhost:3000/api/records?group=GRUP-1");
    const resRecords = await getRecords(reqRecords);
    expect(resRecords.status).toBe(401);

    const reqExport = new NextRequest("http://localhost:3000/api/excel/export?group=GRUP-1");
    const resExport = await exportExcel(reqExport);
    expect(resExport.status).toBe(401);
  });

  it("NİL PROJE başka grupların (GRUP-1, GRUP-3, GRUP-4) kayıtlarını doğrudan API isteğiyle değiştirememeli (403)", async () => {
    vi.spyOn(authModule, "getServerSession").mockResolvedValue({
      id: 2,
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje Veri Sorumlusu",
      roleCode: "NIL_PROJE",
      roleName: "NİL PROJE",
    });

    const grup1Rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-1" } });
    const grup3Rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-3" } });
    const grup4Rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-4" } });

    for (const rec of [grup1Rec!, grup3Rec!, grup4Rec!]) {
      const req = new NextRequest(`http://localhost:3000/api/records/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hizmetBirimi: rec.hizmetBirimi,
          ilcesi: rec.ilcesi,
          mahalleKoy: rec.mahalleKoy,
          aciklama: "YETKİSİZ DEĞİŞİKLİK DENEMESİ",
          version: rec.version,
        }),
      });
      const res = await updateRecord(req, { params: Promise.resolve({ id: String(rec.id) }) });
      expect(res.status).toBe(403);
    }
  });

  it("NİL PROJE bir kaydın grup bilgisini (groupCode) değiştirerek yetki sınırını aşamamalı (403)", async () => {
    vi.spyOn(authModule, "getServerSession").mockResolvedValue({
      id: 2,
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje Veri Sorumlusu",
      roleCode: "NIL_PROJE",
      roleName: "NİL PROJE",
    });

    const grup2Rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-2" } });
    expect(grup2Rec).not.toBeNull();

    const req = new NextRequest(`http://localhost:3000/api/records/${grup2Rec!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode: "GRUP-1", // Kaydı başka gruba taşıma girişimi
        hizmetBirimi: grup2Rec!.hizmetBirimi,
        ilcesi: grup2Rec!.ilcesi,
        mahalleKoy: grup2Rec!.mahalleKoy,
        version: grup2Rec!.version,
      }),
    });

    const res = await updateRecord(req, {
      params: Promise.resolve({ id: String(grup2Rec!.id) }),
    });
    expect(res.status).toBe(403);
  });

  it("NİL PROJE yalnızca GRUP-2 kaydını düzenleyebilmeli (200), yeni kayıt ekleyememeli (403) ve silememeli (403)", async () => {
    const nilUser = await prisma.user.findUnique({ where: { username: "nilproje" } });
    vi.spyOn(authModule, "getServerSession").mockResolvedValue({
      id: nilUser!.id,
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje Veri Sorumlusu",
      roleCode: "NIL_PROJE",
      roleName: "NİL PROJE",
    });

    const grup2Rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-2" } });
    const prevAciklama = grup2Rec!.aciklama;

    // 1. GRUP-2 düzenleme başarılı olmalı
    const putReq = new NextRequest(`http://localhost:3000/api/records/${grup2Rec!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hizmetBirimi: grup2Rec!.hizmetBirimi,
        ilcesi: grup2Rec!.ilcesi,
        mahalleKoy: grup2Rec!.mahalleKoy,
        biriminToplamParselSayisi: grup2Rec!.biriminToplamParselSayisi,
        iyilestirmeYapilacakParselSayisi: grup2Rec!.iyilestirmeYapilacakParselSayisi,
        sayisallastirmaYapilacakParselSayisi: grup2Rec!.sayisallastirmaYapilacakParselSayisi,
        aciklama: "NİL PROJE YETKİLİ DÜZENLEME TESTİ",
        version: grup2Rec!.version,
      }),
    });
    const putRes = await updateRecord(putReq, {
      params: Promise.resolve({ id: String(grup2Rec!.id) }),
    });
    expect(putRes.status).toBe(200);

    // Eski sürüm numarasıyla tekrar gönderildiğinde çakışma (409) döndürmeli
    const conflictReq = new NextRequest(`http://localhost:3000/api/records/${grup2Rec!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hizmetBirimi: grup2Rec!.hizmetBirimi,
        ilcesi: grup2Rec!.ilcesi,
        mahalleKoy: grup2Rec!.mahalleKoy,
        aciklama: "ESKİ SÜRÜM İLE EZME DENEMESİ",
        version: grup2Rec!.version, // eski version!
      }),
    });
    const conflictRes = await updateRecord(conflictReq, {
      params: Promise.resolve({ id: String(grup2Rec!.id) }),
    });
    expect(conflictRes.status).toBe(409);

    // Orijinal açıklamayı geri yükle
    await prisma.kadastroRecord.update({
      where: { id: grup2Rec!.id },
      data: { aciklama: prevAciklama, isUserModified: false },
    });

    // 2. Yeni kayıt ekleme 403 döndürmeli
    const postReq = new NextRequest("http://localhost:3000/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode: "GRUP-2",
        hizmetBirimi: "TEST",
        ilcesi: "TEST",
        mahalleKoy: "TEST",
      }),
    });
    const postRes = await createRecord(postReq);
    expect(postRes.status).toBe(403);

    // 3. Silme 403 döndürmeli
    const delReq = new NextRequest(`http://localhost:3000/api/records/${grup2Rec!.id}`, {
      method: "DELETE",
    });
    const delRes = await deleteRecord(delReq, {
      params: Promise.resolve({ id: String(grup2Rec!.id) }),
    });
    expect(delRes.status).toBe(403);
  });

  it("TKGM doğrudan API üzerinden hiçbir grupta ekleme, düzenleme, silme veya içe aktarma yapamamalı (403), ancak Excel indirebilmeli (200)", async () => {
    const tkgmUser = await prisma.user.findUnique({ where: { username: "tkgm" } });
    vi.spyOn(authModule, "getServerSession").mockResolvedValue({
      id: tkgmUser!.id,
      username: "tkgm",
      email: "kontrol@tkgm.gov.tr",
      fullName: "TKGM Denetim Uzmanı",
      roleCode: "TKGM",
      roleName: "TKGM",
    });

    const rec = await prisma.kadastroRecord.findFirst({ where: { groupCode: "GRUP-2" } });

    const putReq = new NextRequest(`http://localhost:3000/api/records/${rec!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hizmetBirimi: rec!.hizmetBirimi,
        ilcesi: rec!.ilcesi,
        mahalleKoy: rec!.mahalleKoy,
        aciklama: "TKGM DEĞİŞİKLİK DENEMESİ",
        version: rec!.version,
      }),
    });
    const putRes = await updateRecord(putReq, {
      params: Promise.resolve({ id: String(rec!.id) }),
    });
    expect(putRes.status).toBe(403);

    const importReq = new NextRequest("http://localhost:3000/api/excel/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupCode: "GRUP-1", mode: "SKIP_EXISTING" }),
    });
    const importRes = await importExcel(importReq);
    expect(importRes.status).toBe(403);

    // Excel indirme 200 dönmeli
    const exportReq = new NextRequest("http://localhost:3000/api/excel/export?group=GRUP-1");
    const exportRes = await exportExcel(exportReq);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
  });

  it("Brute-Force (Rate Limit) koruması: 10 başarısız denemeden sonra 429 döndürmeli ve sıfırlandığında tekrar izin vermeli", async () => {
    const { checkRateLimit, resetRateLimit } = await import("@/lib/rate-limit");
    const testKey = "login:127.0.0.1:bruteforce_test";
    resetRateLimit(testKey);

    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(testKey, 10, 60_000);
      expect(res.allowed).toBe(true);
    }

    const blocked = checkRateLimit(testKey, 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    resetRateLimit(testKey);
    const afterReset = checkRateLimit(testKey, 10, 60_000);
    expect(afterReset.allowed).toBe(true);
  });

  it("JWT Token Bütünlüğü: Manipüle edilmiş (imzası bozulmuş) oturum çerezleri reddedilmeli", async () => {
    const { signSessionToken, verifySessionToken } = await import("@/lib/jwt");
    const validToken = await signSessionToken({
      id: 2,
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje",
      roleCode: "NIL_PROJE",
      roleName: "NİL PROJE",
    });

    // Geçerli token doğrulanmalı
    const verified = await verifySessionToken(validToken);
    expect(verified?.roleCode).toBe("NIL_PROJE");

    // Token'ın imza veya payload kısmı değiştirildiğinde null dönmeli
    const parts = validToken.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature12345`;
    const tamperedResult = await verifySessionToken(tamperedToken);
    expect(tamperedResult).toBeNull();
  });

  it("Excel Formül Enjeksiyonu (CSV/Formula Injection) Koruması: =, +, -, @ ile başlayan hücreler etkisizleştirilmeli", async () => {
    const { sanitizeForExcelExport } = await import("@/lib/validation");
    expect(sanitizeForExcelExport("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeForExcelExport("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
    expect(sanitizeForExcelExport("-1+2")).toBe("'-1+2");
    expect(sanitizeForExcelExport("@IMPORTXML()")).toBe("'@IMPORTXML()");
    expect(sanitizeForExcelExport("Normal Açıklama Metni")).toBe("Normal Açıklama Metni");
  });

  it("Kullanıcı Yönetimi (/api/users) uç noktası MTCHARITA dışındaki tüm rollere 403 döndürmeli", async () => {
    const { GET: getUsers, PATCH: patchUsers } = await import("@/app/api/users/route");
    vi.spyOn(authModule, "getServerSession").mockResolvedValue({
      id: 2,
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje",
      roleCode: "NIL_PROJE",
      roleName: "NİL PROJE",
    });

    const getRes = await getUsers();
    expect(getRes.status).toBe(403);

    const patchReq = new NextRequest("http://localhost:3000/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 1, newPassword: "HackedPassword123!" }),
    });
    const patchRes = await patchUsers(patchReq);
    expect(patchRes.status).toBe(403);
  });
});
