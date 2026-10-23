import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { GROUP_CODES, GroupCode } from "./columns";
import { importExcelRecordsToGroup, ImportMode } from "./excel";

const globalForSeed = globalThis as unknown as {
  __kadastroSeedVerified?: boolean;
  __kadastroSeedPromise?: Promise<unknown>;
};

export async function ensureSeedUsersAndData(options?: {
  forceExcelImportMode?: ImportMode;
  targetGroups?: GroupCode[];
}) {
  // Normal isteklerde başlangıç kontrolü bir kez tamamlandıysa tekrar veritabanı yazma/sayma sorguları çalıştırma
  if (!options?.forceExcelImportMode && !options?.targetGroups && globalForSeed.__kadastroSeedVerified) {
    return [];
  }

  // Eşzamanlı gelen isteklerin aynı anda SQLite üzerinde upsert kilidi oluşturmasını engelle
  if (!options?.forceExcelImportMode && !options?.targetGroups && globalForSeed.__kadastroSeedPromise) {
    return globalForSeed.__kadastroSeedPromise;
  }

  const runSeed = async () => {
    // 1. Rolleri oluştur veya güncelle
  const rolesData = [
    {
      code: "MTCHARITA",
      name: "MTCHARİTA",
      description:
        "Sistemin tam yetkili yönetici rolü. Bütün grupları görüntüleyebilir, düzenleyebilir, kayıt ekleyip silebilir ve Excel içe/dışa aktarma işlemlerini yürütebilir.",
    },
    {
      code: "NIL_PROJE",
      name: "NİL PROJE",
      description:
        "Bütün grupları görüntüleyebilir ve Excel indirebilir; yalnızca GRUP-2 içindeki mevcut kayıtları düzenleyebilir.",
    },
    {
      code: "TKGM",
      name: "TKGM",
      description:
        "Bütün grupları görüntüleyebilir ve Excel olarak indirebilir. Hiçbir grupta veri değişikliği yapamaz.",
    },
  ];

  const roleMap: Record<string, number> = {};
  for (const r of rolesData) {
    const saved = await prisma.role.upsert({
      where: { code: r.code },
      create: r,
      update: { name: r.name, description: r.description },
    });
    roleMap[r.code] = saved.id;
  }

  // 2. Varsayılan kullanıcı hesaplarını oluştur (mevcutsa şifresini koru)
  const mtcPassword = process.env.SEED_MTCHARITA_PASSWORD || "Mtc2026!";
  const nilPassword = process.env.SEED_NILPROJE_PASSWORD || "Nil2026!";
  const tkgmPassword = process.env.SEED_TKGM_PASSWORD || "Tkgm2026!";

  const defaultUsers = [
    {
      username: "mtcharita",
      email: "yonetim@mtcharita.com.tr",
      fullName: "MTC Harita Yönetici",
      password: mtcPassword,
      roleId: roleMap["MTCHARITA"],
    },
    {
      username: "nilproje",
      email: "uzman@nilproje.com.tr",
      fullName: "Nil Proje Veri Sorumlusu",
      password: nilPassword,
      roleId: roleMap["NIL_PROJE"],
    },
    {
      username: "tkgm",
      email: "kontrol@tkgm.gov.tr",
      fullName: "TKGM Denetim Uzmanı",
      password: tkgmPassword,
      roleId: roleMap["TKGM"],
    },
  ];

  let adminUserId: number | undefined;
  for (const u of defaultUsers) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const created = await prisma.user.create({
        data: {
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          passwordHash,
          roleId: u.roleId,
          isActive: true,
        },
      });
      if (u.username === "mtcharita") adminUserId = created.id;
    } else {
      if (u.username === "mtcharita") adminUserId = existing.id;
    }
  }

  // 3. Başlangıç Excel dosyalarını kontrol et ve aktar
  const seedDir = path.join(process.cwd(), "data", "seed-excels");
  const groupsToProcess = options?.targetGroups ?? GROUP_CODES;
  const results = [];

  for (const groupCode of groupsToProcess) {
    const existingCount = await prisma.kadastroRecord.count({ where: { groupCode } });

    // İlk veri aktarımının her başlangıçta yeniden çalışmasını önle:
    // Eğer grupta zaten kayıt varsa ve açıkça forceExcelImportMode belirtilmemişse atla
    if (existingCount > 0 && !options?.forceExcelImportMode) {
      continue;
    }

    const filePath = path.join(seedDir, `${groupCode}.xlsx`);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const mode: ImportMode = options?.forceExcelImportMode ?? "SKIP_EXISTING";

    const importRes = await importExcelRecordsToGroup({
      buffer,
      fileName: `${groupCode}.xlsx`,
      groupCode,
      mode,
      userId: adminUserId,
      userName: "Sistem Başlangıç Aktarımı",
      userRole: "MTCHARITA",
    });

    results.push(importRes);
  }

    if (!options?.forceExcelImportMode && !options?.targetGroups) {
      globalForSeed.__kadastroSeedVerified = true;
    }

    return results;
  };

  if (!options?.forceExcelImportMode && !options?.targetGroups) {
    globalForSeed.__kadastroSeedPromise = runSeed().finally(() => {
      globalForSeed.__kadastroSeedPromise = undefined;
    });
    return globalForSeed.__kadastroSeedPromise;
  }

  return runSeed();
}
