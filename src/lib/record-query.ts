import { Prisma } from "@prisma/client";
import { GroupCode, COLUMN_BY_KEY } from "./columns";

export interface RecordFilterParams {
  groupCode: GroupCode;
  search?: string;
  hizmetBirimi?: string;
  ilcesi?: string;
  statusFilter?: string; // "all" | "with_aciklama" | "with_kesin_parsel" | "with_tescil" | "modified"
  minParsel?: string;
  maxParsel?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function buildRecordWhereClause(params: RecordFilterParams): Prisma.KadastroRecordWhereInput {
  const andConditions: Prisma.KadastroRecordWhereInput[] = [{ groupCode: params.groupCode }];

  if (params.hizmetBirimi && params.hizmetBirimi !== "ALL") {
    andConditions.push({ hizmetBirimi: params.hizmetBirimi });
  }

  if (params.ilcesi && params.ilcesi !== "ALL") {
    andConditions.push({ ilcesi: params.ilcesi });
  }

  if (params.minParsel && params.minParsel.trim() !== "") {
    const minVal = Number(params.minParsel);
    if (!Number.isNaN(minVal)) {
      andConditions.push({ biriminToplamParselSayisi: { gte: Math.round(minVal) } });
    }
  }

  if (params.maxParsel && params.maxParsel.trim() !== "") {
    const maxVal = Number(params.maxParsel);
    if (!Number.isNaN(maxVal)) {
      andConditions.push({ biriminToplamParselSayisi: { lte: Math.round(maxVal) } });
    }
  }

  if (params.statusFilter && params.statusFilter !== "all") {
    if (params.statusFilter === "with_aciklama") {
      andConditions.push({
        AND: [{ aciklama: { not: null } }, { aciklama: { not: "" } }],
      });
    } else if (params.statusFilter === "with_kesin_parsel") {
      andConditions.push({
        kesinParselSayisi: { gt: 0 },
      });
    } else if (params.statusFilter === "with_tescil") {
      andConditions.push({
        AND: [{ tescilVeDevirIslemi: { not: null } }, { tescilVeDevirIslemi: { not: "" } }],
      });
    } else if (params.statusFilter === "modified") {
      andConditions.push({
        isUserModified: true,
      });
    }
  }

  if (params.search && params.search.trim() !== "") {
    const raw = params.search.trim();
    const variants = Array.from(
      new Set([raw, raw.toLocaleUpperCase("tr-TR"), raw.toLocaleLowerCase("tr-TR")])
    );

    const searchFields = [
      "hizmetBirimi",
      "ilcesi",
      "mahalleKoy",
      "aciklama",
      "yevmiyeVeTarih",
      "kadastroGorevliMuhendisler",
      "kadastroGorevliTeknisyenler",
      "tasarrufKontrolMemuru",
      "kadastroUyesi",
      "ormanGorevliMuhendisler",
    ] as const;

    const orClauses: Prisma.KadastroRecordWhereInput[] = [];
    for (const v of variants) {
      for (const field of searchFields) {
        orClauses.push({ [field]: { contains: v } });
      }
    }

    andConditions.push({ OR: orClauses });
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
}

export function buildRecordOrderBy(
  sortBy?: string,
  sortOrder?: "asc" | "desc"
): Prisma.KadastroRecordOrderByWithRelationInput[] {
  const direction: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";
  if (sortBy && (sortBy === "rowOrder" || sortBy === "updatedAt" || COLUMN_BY_KEY[sortBy])) {
    return [{ [sortBy]: direction }, { rowOrder: "asc" }, { id: "asc" }];
  }
  return [{ rowOrder: "asc" }, { id: "asc" }];
}
