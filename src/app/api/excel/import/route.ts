import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "@/lib/auth";
import { canImportExcel, isValidGroupCode } from "@/lib/permissions";
import { importExcelRecordsToGroup, ImportMode } from "@/lib/excel";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const VALID_MODES: ImportMode[] = ["SKIP_EXISTING", "UPDATE_UNMODIFIED", "OVERWRITE_ALL"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Bu işlemi gerçekleştirmek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    // Excel içe aktarma yalnızca yönetici (MTCHARITA) yetkisindedir
    if (!canImportExcel(session.roleCode)) {
      return NextResponse.json(
        {
          error: `Yetkisiz işlem: Rolünüz (${session.roleName}) Excel içe aktarma yetkisine sahip değil. Bu işlem yalnızca MTCHARİTA yöneticileri tarafından yapılabilir.`,
        },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. Multipart form-data ile yeni .xlsx dosyası yükleme
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const groupParam = String(formData.get("groupCode") || "");
      const modeParam = String(formData.get("mode") || "SKIP_EXISTING") as ImportMode;
      const file = formData.get("file");

      if (!isValidGroupCode(groupParam)) {
        return NextResponse.json({ error: "Geçersiz hedef veri grubu." }, { status: 400 });
      }

      if (!VALID_MODES.includes(modeParam)) {
        return NextResponse.json({ error: "Geçersiz içe aktarma modu." }, { status: 400 });
      }

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "Lütfen yüklenecek bir .xlsx Excel dosyası seçin." },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        return NextResponse.json(
          { error: "Geçersiz dosya türü: Yalnızca .xlsx uzantılı Excel dosyaları kabul edilir." },
          { status: 400 }
        );
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Dosya boyutu çok büyük (En fazla 10 MB yüklenebilir)." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // .xlsx (OpenXML ZIP) dosya imzası (Magic Bytes: PK\x03\x04) doğrulaması
      if (
        fileBuffer.length < 4 ||
        fileBuffer[0] !== 0x50 ||
        fileBuffer[1] !== 0x4b ||
        fileBuffer[2] !== 0x03 ||
        fileBuffer[3] !== 0x04
      ) {
        return NextResponse.json(
          {
            error:
              "Güvenlik doğrulaması başarısız: Yüklenen dosya geçerli bir .xlsx (OpenXML) arşiv yapısına sahip değil.",
          },
          { status: 400 }
        );
      }

      const result = await importExcelRecordsToGroup({
        buffer: fileBuffer,
        fileName: file.name,
        groupCode: groupParam,
        mode: modeParam,
        userId: session.id,
        userName: session.fullName,
        userRole: session.roleName,
      });

      if (result.errors.length > 0) {
        return NextResponse.json(
          {
            error: "Excel dosyasında veri doğrulama hataları tespit edildi. İşlem geri alındı.",
            result,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        message: `${groupParam} grubuna Excel aktarımı tamamlandı.`,
        result,
      });
    }

    // 2. JSON isteği ile sunucudaki başlangıç (seed) Excel dosyasından kontrollü aktarım
    const body = await req.json().catch(() => null);
    const groupParam = String(body?.groupCode || "");
    const modeParam = String(body?.mode || "SKIP_EXISTING") as ImportMode;

    if (!isValidGroupCode(groupParam)) {
      return NextResponse.json({ error: "Geçersiz hedef veri grubu." }, { status: 400 });
    }

    if (!VALID_MODES.includes(modeParam)) {
      return NextResponse.json({ error: "Geçersiz içe aktarma modu." }, { status: 400 });
    }

    const seedFilePath = path.join(process.cwd(), "data", "seed-excels", `${groupParam}.xlsx`);
    if (!fs.existsSync(seedFilePath)) {
      return NextResponse.json(
        { error: `Başlangıç Excel dosyası (${groupParam}.xlsx) sunucuda bulunamadı.` },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(seedFilePath);
    const result = await importExcelRecordsToGroup({
      buffer,
      fileName: `${groupParam}.xlsx`,
      groupCode: groupParam,
      mode: modeParam,
      userId: session.id,
      userName: session.fullName,
      userRole: session.roleName,
    });

    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          error: "Başlangıç Excel dosyasında doğrulama hataları bulundu.",
          result,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      message: `${groupParam} başlangıç Excel dosyasından aktarım tamamlandı.`,
      result,
    });
  } catch (err) {
    console.error("POST /api/excel/import error:", err);
    return NextResponse.json(
      { error: "Excel içe aktarma sırasında sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
