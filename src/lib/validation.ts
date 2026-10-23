import { z } from "zod";
import { KADASTRO_COLUMNS, GroupCode, GROUP_CODES } from "./columns";

/**
 * Türkçe ondalık veya tam sayı değerlerini güvenli biçimde ayrıştırır.
 * Boş string veya null geldiğinde null döner.
 */
function parseOptionalInt(val: unknown): number | null | typeof z.NEVER {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    return Number.isInteger(val) ? val : Math.round(val);
  }
  if (typeof val === "string") {
    const cleaned = val.trim().replace(/\./g, "").replace(",", ".");
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) return NaN;
    return Math.round(parsed);
  }
  return NaN;
}

function parseOptionalFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    // Türkçe ondalık virgül desteği (örn: "1.234,56" veya "12,5")
    const normalized =
      trimmed.includes(",") && trimmed.includes(".")
        ? trimmed.replace(/\./g, "").replace(",", ".")
        : trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
}

function parseOptionalText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  // Baştaki sıfırları korumak için her zaman metin olarak işlenir
  const str = String(val).trim();
  return str === "" ? null : str;
}

const optionalNonNegativeInt = z
  .preprocess(
    parseOptionalInt,
    z
      .number({ invalid_type_error: "Geçerli bir tam sayı giriniz." })
      .int("Tam sayı olmalıdır.")
      .min(0, "Negatif değer girilemez.")
      .nullable()
  )
  .optional()
  .transform((v) => (v === undefined ? null : v));

const optionalNonNegativeFloat = z
  .preprocess(
    parseOptionalFloat,
    z
      .number({ invalid_type_error: "Geçerli bir sayısal değer giriniz." })
      .min(0, "Negatif değer girilemez.")
      .nullable()
  )
  .optional()
  .transform((v) => (v === undefined ? null : v));

const optionalText = z
  .preprocess(parseOptionalText, z.string().max(1000, "En fazla 1000 karakter olabilir.").nullable())
  .optional()
  .transform((v) => (v === undefined ? null : v));

export const kadastroRecordPayloadSchema = z.object({
  hizmetBirimi: z
    .string({ required_error: "Hizmet Birimi zorunludur." })
    .trim()
    .min(1, "Hizmet Birimi boş bırakılamaz.")
    .max(200, "Hizmet Birimi çok uzun."),
  ilcesi: z
    .string({ required_error: "İlçesi zorunludur." })
    .trim()
    .min(1, "İlçesi boş bırakılamaz.")
    .max(200, "İlçesi çok uzun."),
  mahalleKoy: z
    .string({ required_error: "Mahalle/Köy zorunludur." })
    .trim()
    .min(1, "Mahalle/Köy boş bırakılamaz.")
    .max(250, "Mahalle/Köy çok uzun."),

  biriminToplamParselSayisi: optionalNonNegativeInt,
  iyilestirmeYapilacakParselSayisi: optionalNonNegativeInt,
  sayisallastirmaYapilacakParselSayisi: optionalNonNegativeInt,
  entegrasyon: optionalNonNegativeInt,
  altlikSayisallastirma: optionalNonNegativeInt,
  araziOlcusu: optionalNonNegativeInt,
  teslimEdilenParselSayisi: optionalNonNegativeInt,

  adaBolumKrokisi: optionalText,
  olcuKrokisi: optionalText,
  alanVeKoordinatCiktisi: optionalText,
  pafta1000: optionalNonNegativeInt,
  pafta2000: optionalNonNegativeInt,
  pafta5000: optionalNonNegativeInt,
  paftaCizimi: optionalText,
  adaRaporu: optionalText,

  iyilestirmeYapilanParselSayisi: optionalNonNegativeInt,
  sayisallastirmaYapilanParselSayisi: optionalNonNegativeInt,
  ormanParselSayisi: optionalNonNegativeInt,
  kesinParselSayisi: optionalNonNegativeInt,
  iyilestirmeYapilanParselAlani: optionalNonNegativeFloat,
  sayisallastirmaYapilanParselAlani: optionalNonNegativeFloat,
  ormanParselAlani: optionalNonNegativeFloat,
  yapilanToplamAlanDonum: optionalNonNegativeFloat,

  ilaninCikisTarihi: optionalText,
  bilgilendirmeIlaniBaslangicTarihi: optionalText,
  bilgilendirmeIlaniBitisTarihi: optionalText,
  komisyondakiParselSayisi: optionalNonNegativeInt,
  kesinAskiTastikTarihi: optionalText,
  kesinAskiBaslangicTarihi: optionalText,
  kesinAskiBitisTarihi: optionalText,
  kesinlesmeTarihi: optionalText,

  yevmiyeVeTarih: optionalText,
  fenKlasoruDuzenlenmesi: optionalText,
  tescilVeDevirIslemi: optionalText,

  kadastroGorevliMuhendisler: optionalText,
  kadastroGorevliTeknisyenler: optionalText,
  tasarrufKontrolMemuru: optionalText,
  kadastroUyesi: optionalText,
  ormanGorevliMuhendisler: optionalText,
  aciklama: optionalText,
});

export type KadastroRecordInput = z.infer<typeof kadastroRecordPayloadSchema>;

export const createRecordRequestSchema = kadastroRecordPayloadSchema.extend({
  groupCode: z.enum(GROUP_CODES as [GroupCode, ...GroupCode[]], {
    errorMap: () => ({ message: "Geçersiz grup kodu." }),
  }),
});

export const updateRecordRequestSchema = kadastroRecordPayloadSchema.extend({
  version: z.number({ required_error: "Kayıt sürüm bilgisi (version) zorunludur." }).int(),
});

/**
 * Excel Formula Injection (CSV/XLSX Injection) Koruması:
 * Kullanıcı tarafından girilen metinlerin `=`, `+`, `-`, `@` veya tab/satırbaşı ile başlayıp
 * Excel'de istenmeyen formül olarak çalışmasını önler.
 */
export function sanitizeForExcelExport(val: string | null | undefined): string {
  if (!val) return "";
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * İki kayıt arasındaki farkları (eski ve yeni değerler) hesaplar.
 */
export function computeRecordDiff(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>
): Record<string, { label: string; old: unknown; new: unknown }> {
  const diff: Record<string, { label: string; old: unknown; new: unknown }> = {};
  for (const col of KADASTRO_COLUMNS) {
    const oldVal = oldRecord[col.key] ?? null;
    const newVal = newRecord[col.key] ?? null;
    if (oldVal !== newVal) {
      diff[col.key] = {
        label: col.label,
        old: oldVal,
        new: newVal,
      };
    }
  }
  return diff;
}
