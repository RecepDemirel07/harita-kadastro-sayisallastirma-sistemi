import { ensureSeedUsersAndData } from "../src/lib/seed-helper";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Veritabanı başlangıç kurulumu ve Excel veri aktarımı başlatılıyor...");
  const results = await ensureSeedUsersAndData();

  if (results.length === 0) {
    console.log("Veritabanında başlangıç verileri zaten mevcut. Mevcut kayıtlar korundu.");
  } else {
    for (const r of results) {
      console.log(
        `[${r.groupCode}] ${r.fileName} (${r.sheetName}): ${r.insertedCount} yeni kayıt eklendi, ${r.skippedCount} kayıt atlandı, ${r.skippedSummaryRows} dip toplam satırı yok sayıldı.`
      );
      if (r.ignoredSecondarySheets.length > 0) {
        console.log(
          `  -> Yok sayılan ikincil şablon sayfaları: ${r.ignoredSecondarySheets.join(", ")}`
        );
      }
      if (r.errors.length > 0) {
        console.error(`  -> Hatalar:`, r.errors);
      }
    }
  }

  const counts = await Promise.all([
    prisma.kadastroRecord.count({ where: { groupCode: "GRUP-1" } }),
    prisma.kadastroRecord.count({ where: { groupCode: "GRUP-2" } }),
    prisma.kadastroRecord.count({ where: { groupCode: "GRUP-3" } }),
    prisma.kadastroRecord.count({ where: { groupCode: "GRUP-4" } }),
  ]);

  console.log(
    `Güncel Kayıt Sayıları -> GRUP-1: ${counts[0]}, GRUP-2: ${counts[1]}, GRUP-3: ${counts[2]}, GRUP-4: ${counts[3]} (Toplam: ${counts.reduce((a, b) => a + b, 0)})`
  );
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
