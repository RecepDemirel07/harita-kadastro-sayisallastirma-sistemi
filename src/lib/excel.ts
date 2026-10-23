import ExcelJS from "exceljs";
import {
  GroupCode,
  GROUP_DEFAULT_TITLES,
  KADASTRO_COLUMNS,
  ColumnDefinition,
} from "./columns";
import { KadastroRecordInput, sanitizeForExcelExport } from "./validation";
import { prisma } from "./prisma";

export type ImportMode = "SKIP_EXISTING" | "UPDATE_UNMODIFIED" | "OVERWRITE_ALL";

export interface ExcelValidationError {
  fileName: string;
  sheetName: string;
  rowNumber: number;
  column: string;
  fieldLabel: string;
  message: string;
}

export interface ParsedExcelResult {
  sheetName: string;
  projectTitle: string;
  rows: { rowNumber: number; data: KadastroRecordInput }[];
  errors: ExcelValidationError[];
  skippedSummaryRows: number;
  skippedEmptyRows: number;
  ignoredSecondarySheets: string[];
}

function extractRawCellValue(cellValue: ExcelJS.CellValue): unknown {
  if (cellValue === null || cellValue === undefined) return null;
  if (typeof cellValue === "object") {
    if (cellValue instanceof Date) {
      const y = cellValue.getUTCFullYear();
      const m = String(cellValue.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cellValue.getUTCDate()).padStart(2, "0");
      return `${d}.${m}.${y}`;
    }
    if ("richText" in cellValue && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((rt) => rt.text).join("");
    }
    if ("formula" in cellValue || "sharedFormula" in cellValue) {
      const fObj = cellValue as ExcelJS.CellFormulaValue;
      return fObj.result !== undefined ? extractRawCellValue(fObj.result as ExcelJS.CellValue) : null;
    }
    if ("text" in cellValue) {
      return String((cellValue as { text: string }).text);
    }
  }
  return cellValue;
}

function normalizeHeader(str: unknown): string {
  if (!str) return "";
  return String(str)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("tr-TR");
}

export async function parseAndValidateExcelBuffer(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  groupCode: GroupCode
): Promise<ParsedExcelResult> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  await workbook.xlsx.load(nodeBuffer as unknown as ExcelJS.Buffer);

  if (workbook.worksheets.length === 0) {
    return {
      sheetName: "-",
      projectTitle: GROUP_DEFAULT_TITLES[groupCode],
      rows: [],
      errors: [
        {
          fileName,
          sheetName: "-",
          rowNumber: 1,
          column: "A",
          fieldLabel: "Çalışma Sayfası",
          message: "Excel dosyasında hiçbir çalışma sayfası bulunamadı.",
        },
      ],
      skippedSummaryRows: 0,
      skippedEmptyRows: 0,
      ignoredSecondarySheets: [],
    };
  }

  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name;
  const ignoredSecondarySheets = workbook.worksheets.slice(1).map((ws) => ws.name);

  const errors: ExcelValidationError[] = [];
  const rows: { rowNumber: number; data: KadastroRecordInput }[] = [];
  let skippedSummaryRows = 0;
  let skippedEmptyRows = 0;

  // Satır 2: Proje Başlığı (B2 veya A2)
  const rawTitleB2 = extractRawCellValue(worksheet.getRow(2).getCell(2).value);
  const rawTitleA2 = extractRawCellValue(worksheet.getRow(2).getCell(1).value);
  const projectTitle =
    String(rawTitleB2 || rawTitleA2 || "").trim() || GROUP_DEFAULT_TITLES[groupCode];

  // Satır 3: Başlık doğrulaması (A3=HİZMET BİRİMİ, B3=İLÇESİ, C3=MAHALLE/KÖY)
  const headerRow3 = worksheet.getRow(3);
  const colAHeader = normalizeHeader(extractRawCellValue(headerRow3.getCell(1).value));
  const colBHeader = normalizeHeader(extractRawCellValue(headerRow3.getCell(2).value));
  const colCHeader = normalizeHeader(extractRawCellValue(headerRow3.getCell(3).value));

  if (
    !colAHeader.includes("HİZMET") ||
    !colBHeader.includes("İLÇE") ||
    !colCHeader.includes("MAHALLE")
  ) {
    errors.push({
      fileName,
      sheetName,
      rowNumber: 3,
      column: "A-C",
      fieldLabel: "Tablo Başlık Satırı",
      message: `Beklenen başlık yapısı (HİZMET BİRİMİ / İLÇESİ / MAHALLE/KÖY) 3. satırda bulunamadı. Bulunan: "${colAHeader}", "${colBHeader}", "${colCHeader}".`,
    });
    return {
      sheetName,
      projectTitle,
      rows,
      errors,
      skippedSummaryRows,
      skippedEmptyRows,
      ignoredSecondarySheets,
    };
  }

  const totalRows = worksheet.rowCount;

  for (let r = 5; r <= totalRows; r++) {
    const row = worksheet.getRow(r);

    // Tüm 43 sütunun ham değerlerini oku
    const rawValues: Record<string, unknown> = {};
    let hasAnyValue = false;
    let hasFormulaInRow = false;

    for (const colDef of KADASTRO_COLUMNS) {
      const cell = row.getCell(colDef.colIndex);
      if (cell.value && typeof cell.value === "object" && "formula" in cell.value) {
        hasFormulaInRow = true;
      }
      const val = extractRawCellValue(cell.value);
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        hasAnyValue = true;
      }
      rawValues[colDef.key] = val;
    }

    if (!hasAnyValue) {
      skippedEmptyRows++;
      continue;
    }

    const aStr = rawValues.hizmetBirimi ? String(rawValues.hizmetBirimi).trim() : "";
    const bStr = rawValues.ilcesi ? String(rawValues.ilcesi).trim() : "";
    const cStr = rawValues.mahalleKoy ? String(rawValues.mahalleKoy).trim() : "";

    // Dip toplam satırı, ihale analiz özet tablosu veya tekrar eden başlık kontrolü:
    const normA = normalizeHeader(aStr);
    const normB = normalizeHeader(bStr);
    const normC = normalizeHeader(cStr);
    const combinedSummaryCheck = `${normA} ${normB} ${normC}`;

    if (
      (aStr === "" && bStr === "" && cStr === "") ||
      normA === "TOPLAM" ||
      normC === "TOPLAM" ||
      (normA.includes("HİZMET BİRİMİ") && normB.includes("İLÇESİ")) ||
      normA.startsWith("GRUP") ||
      combinedSummaryCheck.includes("İHALE PARSEL") ||
      combinedSummaryCheck.includes("KOORDİNATLANDIRILAN") ||
      combinedSummaryCheck.includes("İYİLEŞTİRME YAPILAN") ||
      combinedSummaryCheck.includes("İYİLEŞMİŞTİRME YAPILAN") ||
      combinedSummaryCheck.includes("İHALE TAMAMLANMA")
    ) {
      skippedSummaryRows++;
      continue;
    }

    // Zorunlu alan kontrolü (A, B, C sütunlarından biri eksikse hata raporla)
    if (!aStr || !bStr || !cStr) {
      errors.push({
        fileName,
        sheetName,
        rowNumber: r,
        column: !aStr ? "A" : !bStr ? "B" : "C",
        fieldLabel: !aStr ? "Hizmet Birimi" : !bStr ? "İlçesi" : "Mahalle / Köy",
        message: "Hizmet Birimi, İlçesi ve Mahalle/Köy alanları zorunludur.",
      });
      continue;
    }

    // Alan bazlı tip dönüşümü ve doğrulama
    const parsedRecord: Record<string, unknown> = {
      hizmetBirimi: aStr,
      ilcesi: bStr,
      mahalleKoy: cStr,
    };

    let rowHasError = false;

    for (const colDef of KADASTRO_COLUMNS.slice(3)) {
      const raw = rawValues[colDef.key];
      if (raw === null || raw === undefined || String(raw).trim() === "") {
        parsedRecord[colDef.key] = null;
        continue;
      }

      if (colDef.type === "int") {
        const strVal = String(raw).trim().replace(",", ".");
        const num = Number(strVal);
        if (Number.isNaN(num)) {
          errors.push({
            fileName,
            sheetName,
            rowNumber: r,
            column: colDef.excelCol,
            fieldLabel: colDef.label,
            message: `"${raw}" değeri geçerli bir tam sayı değil.`,
          });
          rowHasError = true;
        } else {
          parsedRecord[colDef.key] = Math.round(num);
        }
      } else if (colDef.type === "float") {
        const strVal = String(raw).trim().replace(",", ".");
        const num = Number(strVal);
        if (Number.isNaN(num)) {
          errors.push({
            fileName,
            sheetName,
            rowNumber: r,
            column: colDef.excelCol,
            fieldLabel: colDef.label,
            message: `"${raw}" değeri geçerli bir ondalık sayı değil.`,
          });
          rowHasError = true;
        } else {
          parsedRecord[colDef.key] = num;
        }
      } else {
        // String, date_text, code_text -> Baştaki sıfırlar ve Türkçe karakterler birebir korunur
        parsedRecord[colDef.key] = String(raw).trim();
      }
    }

    if (!rowHasError) {
      rows.push({
        rowNumber: r,
        data: parsedRecord as KadastroRecordInput,
      });
    }
  }

  return {
    sheetName,
    projectTitle,
    rows,
    errors,
    skippedSummaryRows,
    skippedEmptyRows,
    ignoredSecondarySheets,
  };
}

export interface ImportExecutionResult {
  groupCode: GroupCode;
  fileName: string;
  sheetName: string;
  mode: ImportMode;
  totalParsed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  protectedUserModifiedCount: number;
  skippedSummaryRows: number;
  ignoredSecondarySheets: string[];
  errors: ExcelValidationError[];
}

/**
 * Ayrıştırılan Excel verilerini atomik transaction içinde veritabanına aktarır.
 * Tekrarlanan aktarımlarda mükerrer kayıt oluşturmaz ve kullanıcı değişikliklerini sessizce ezmez.
 */
export async function importExcelRecordsToGroup(params: {
  buffer: Buffer | ArrayBuffer;
  fileName: string;
  groupCode: GroupCode;
  mode: ImportMode;
  userId?: number;
  userName: string;
  userRole: string;
}): Promise<ImportExecutionResult> {
  const { buffer, fileName, groupCode, mode, userId, userName, userRole } = params;
  const parsed = await parseAndValidateExcelBuffer(buffer, fileName, groupCode);

  if (parsed.errors.length > 0) {
    return {
      groupCode,
      fileName,
      sheetName: parsed.sheetName,
      mode,
      totalParsed: parsed.rows.length,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      protectedUserModifiedCount: 0,
      skippedSummaryRows: parsed.skippedSummaryRows,
      ignoredSecondarySheets: parsed.ignoredSecondarySheets,
      errors: parsed.errors,
    };
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let protectedUserModifiedCount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.groupMetadata.upsert({
      where: { groupCode },
      create: {
        groupCode,
        displayName: groupCode,
        projectTitle: parsed.projectTitle,
        sourceFileName: fileName,
        lastImportedAt: new Date(),
      },
      update: {
        projectTitle: parsed.projectTitle,
        sourceFileName: fileName,
        lastImportedAt: new Date(),
      },
    });

    const existingRecords = await tx.kadastroRecord.findMany({
      where: { groupCode },
    });

    const existingMap = new Map(
      existingRecords.map((rec) => [
        `${rec.hizmetBirimi.toLocaleUpperCase("tr-TR")}|${rec.ilcesi.toLocaleUpperCase("tr-TR")}|${rec.mahalleKoy.toLocaleUpperCase("tr-TR")}`,
        rec,
      ])
    );

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const item = parsed.rows[idx];
      const key = `${item.data.hizmetBirimi.toLocaleUpperCase("tr-TR")}|${item.data.ilcesi.toLocaleUpperCase("tr-TR")}|${item.data.mahalleKoy.toLocaleUpperCase("tr-TR")}`;
      const existing = existingMap.get(key);

      if (!existing) {
        await tx.kadastroRecord.create({
          data: {
            groupCode,
            rowOrder: idx + 1,
            ...item.data,
            version: 1,
            isUserModified: false,
            updatedById: userId ?? null,
          },
        });
        insertedCount++;
      } else {
        if (mode === "SKIP_EXISTING") {
          skippedCount++;
          continue;
        }
        if (mode === "UPDATE_UNMODIFIED" && existing.isUserModified) {
          protectedUserModifiedCount++;
          skippedCount++;
          continue;
        }
        // UPDATE_UNMODIFIED (değiştirilmemiş) veya OVERWRITE_ALL
        await tx.kadastroRecord.update({
          where: { id: existing.id },
          data: {
            rowOrder: idx + 1,
            ...item.data,
            version: { increment: 1 },
            isUserModified: mode === "OVERWRITE_ALL" ? false : existing.isUserModified,
            updatedById: userId ?? null,
          },
        });
        updatedCount++;
      }
    }

    await tx.auditLog.create({
      data: {
        userId: userId ?? null,
        userName,
        userRole,
        action: "IMPORT",
        groupCode,
        recordId: null,
        recordLabel: `${fileName} (${parsed.sheetName})`,
        changesJson: JSON.stringify({
          mode,
          totalParsed: parsed.rows.length,
          insertedCount,
          updatedCount,
          skippedCount,
          protectedUserModifiedCount,
        }),
      },
    });
  });

  return {
    groupCode,
    fileName,
    sheetName: parsed.sheetName,
    mode,
    totalParsed: parsed.rows.length,
    insertedCount,
    updatedCount,
    skippedCount,
    protectedUserModifiedCount,
    skippedSummaryRows: parsed.skippedSummaryRows,
    ignoredSecondarySheets: parsed.ignoredSecondarySheets,
    errors: [],
  };
}

/**
 * Veritabanındaki güncel kayıtlardan kurumsal .xlsx dosyası üretir.
 * Kaynak Excel'in başlık yapısını, birleştirilmiş PAFTA (1000/2000/5000) hücrelerini
 * ve alt toplam satırını korur.
 */
export async function generateGroupExcelBuffer(params: {
  groupCode: GroupCode;
  projectTitle: string;
  records: Record<string, unknown>[];
}): Promise<Buffer> {
  const { groupCode, projectTitle, records } = params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Proje Veri Yönetimi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(groupCode, {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4 }],
  });

  // Sütun genişlikleri
  sheet.columns = KADASTRO_COLUMNS.map((col: ColumnDefinition) => ({
    key: col.key,
    width: col.width ?? 16,
  }));

  // Satır 1: Boşluk
  sheet.getRow(1).height = 14;

  // Satır 2: Proje Üst Başlığı (B2:AQ2 birleştirilmiş)
  const row2 = sheet.getRow(2);
  row2.height = 48;
  sheet.mergeCells("B2:AQ2");
  const titleCell = row2.getCell(2);
  titleCell.value = projectTitle;
  titleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  // Satır 3 ve Satır 4: Tablo Sütun Başlıkları
  const row3 = sheet.getRow(3);
  const row4 = sheet.getRow(4);
  row3.height = 36;
  row4.height = 22;

  for (const col of KADASTRO_COLUMNS) {
    const c3 = row3.getCell(col.colIndex);
    const c4 = row4.getCell(col.colIndex);

    if (col.excelCol === "N") {
      c3.value = "PAFTA";
      c4.value = 1000;
      sheet.mergeCells("N3:P3");
    } else if (col.excelCol === "O") {
      c4.value = 2000;
    } else if (col.excelCol === "P") {
      c4.value = 5000;
    } else {
      c3.value = col.excelHeaderRow3;
      sheet.mergeCells(3, col.colIndex, 4, col.colIndex);
    }

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } },
      alignment: { vertical: "middle", horizontal: "center", wrapText: true },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Kurumsal Lacivert
      },
      border: {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      },
    };

    Object.assign(c3, headerStyle);
    Object.assign(c4, headerStyle);
  }

  // Veri Satırları (Satır 5 .. 5 + records.length - 1)
  const sums: Record<string, number> = {};
  for (const col of KADASTRO_COLUMNS) {
    if (col.isSummable) sums[col.key] = 0;
  }

  records.forEach((rec, index) => {
    const rowNumber = 5 + index;
    const row = sheet.getRow(rowNumber);
    row.height = 20;

    for (const col of KADASTRO_COLUMNS) {
      const cell = row.getCell(col.colIndex);
      const rawVal = rec[col.key];

      if (rawVal === null || rawVal === undefined || rawVal === "") {
        cell.value = null;
      } else if (col.type === "int") {
        const num = Number(rawVal);
        cell.value = Number.isNaN(num) ? null : Math.round(num);
        cell.numFmt = "#,##0";
        if (!Number.isNaN(num) && col.isSummable) {
          sums[col.key] += Math.round(num);
        }
      } else if (col.type === "float") {
        const num = Number(rawVal);
        cell.value = Number.isNaN(num) ? null : num;
        cell.numFmt = "#,##0.00";
        if (!Number.isNaN(num) && col.isSummable) {
          sums[col.key] += num;
        }
      } else {
        // Metin, kod veya tarih: başında sıfır korunur ve formül enjeksiyonu engellenir
        const safeText = sanitizeForExcelExport(String(rawVal));
        cell.value = safeText;
        cell.numFmt = "@";
      }

      cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.type === "int" || col.type === "float" ? "right" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }
  });

  // Dip Toplam Satırı (Kaynak Excel'deki gibi 1 boş satır bırakarak eklenir)
  const lastDataRow = Math.max(5, 4 + records.length);
  const totalRowNumber = lastDataRow + 2;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.height = 24;

  const totalLabelCell = totalRow.getCell(3);
  totalLabelCell.value = "TOPLAM";
  totalLabelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  totalLabelCell.alignment = { vertical: "middle", horizontal: "right" };

  for (const col of KADASTRO_COLUMNS) {
    const cell = totalRow.getCell(col.colIndex);
    if (col.isSummable) {
      const sumResult = sums[col.key] ?? 0;
      if (records.length > 0) {
        cell.value = {
          formula: `SUM(${col.excelCol}5:${col.excelCol}${lastDataRow})`,
          result: sumResult,
        };
      } else {
        cell.value = 0;
      }
      cell.numFmt = col.type === "float" ? "#,##0.00" : "#,##0";
      cell.alignment = { vertical: "middle", horizontal: "right" };
    }
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "double", color: { argb: "FF475569" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  }

  // Alt İhale Tamamlanma Analiz Tablosu (Müşteri ekran görüntüsündeki yapı)
  const ihaleParselVal =
    (sums["iyilestirmeYapilacakParselSayisi"] ?? 0) +
    (sums["sayisallastirmaYapilacakParselSayisi"] ?? 0);
  const kesinKoordinatVal = sums["sayisallastirmaYapilanParselSayisi"] ?? 0;
  const iyilestirmeYapilanVal = sums["iyilestirmeYapilanParselSayisi"] ?? 0;
  const tamamlanmaOraniVal =
    ihaleParselVal > 0 ? (kesinKoordinatVal + iyilestirmeYapilanVal) / ihaleParselVal : 0;

  const summaryStartRow = totalRowNumber + 3;
  const groupHeaderRow = sheet.getRow(summaryStartRow);
  groupHeaderRow.getCell(1).value = groupCode.replace("-", " ");
  groupHeaderRow.getCell(1).font = { name: "Calibri", size: 10, bold: true };

  const ihaleRowNum = summaryStartRow + 1;
  const kesinRowNum = summaryStartRow + 2;
  const iyilestirmeRowNum = summaryStartRow + 3;
  const oranRowNum = summaryStartRow + 4;

  const summaryRowsConfig = [
    {
      rowNum: ihaleRowNum,
      label: "İHALE PARSEL SAYISI",
      formula: `E${totalRowNumber}+F${totalRowNumber}`,
      result: ihaleParselVal,
      numFmt: "#,##0",
    },
    {
      rowNum: kesinRowNum,
      label: "KESİN KOORDİNATLANDIRILAN PARSEL SAYISI",
      formula: `T${totalRowNumber}`,
      result: kesinKoordinatVal,
      numFmt: "#,##0",
    },
    {
      rowNum: iyilestirmeRowNum,
      label: "İYİLEŞTİRME YAPILAN PARSEL SAYISI",
      formula: `S${totalRowNumber}`,
      result: iyilestirmeYapilanVal,
      numFmt: "#,##0",
    },
    {
      rowNum: oranRowNum,
      label: "İHALE TAMAMLANMA ORANI",
      formula: `IF(D${ihaleRowNum}>0,(D${kesinRowNum}+D${iyilestirmeRowNum})/D${ihaleRowNum},0)`,
      result: tamamlanmaOraniVal,
      numFmt: "0.00%",
    },
  ];

  for (const item of summaryRowsConfig) {
    const r = sheet.getRow(item.rowNum);
    r.height = 20;
    sheet.mergeCells(item.rowNum, 1, item.rowNum, 3);
    const lblCell = r.getCell(1);
    lblCell.value = item.label;
    lblCell.font = { name: "Calibri", size: 10, bold: item.rowNum === oranRowNum };
    lblCell.alignment = { vertical: "middle", horizontal: "center" };
    lblCell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    const valCell = r.getCell(4);
    valCell.value = { formula: item.formula, result: item.result };
    valCell.numFmt = item.numFmt;
    valCell.font = { name: "Calibri", size: 10, bold: true };
    valCell.alignment = { vertical: "middle", horizontal: "center" };
    valCell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}
