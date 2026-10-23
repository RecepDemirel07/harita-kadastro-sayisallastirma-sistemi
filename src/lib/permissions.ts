import { GroupCode, GROUP_CODES } from "./columns";

export type RoleCode = "MTCHARITA" | "NIL_PROJE" | "TKGM";

export interface GroupPermission {
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canViewAudit: boolean;
  badgeText: string;
}

/**
 * Merkezi Yetki Matrisi:
 * - MTCHARİTA: Tüm gruplarda tam yetki (Görüntüleme, Düzenleme, Ekleme, Silme, İçe/Dışa Aktarma, İşlem Geçmişi).
 * - NİL PROJE: Tüm gruplarda görüntüleme ve Excel indirme; yalnızca GRUP-2'de mevcut kayıtları düzenleme. Kayıt ekleyemez/silemez.
 * - TKGM: Tüm gruplarda yalnızca görüntüleme ve Excel indirme. Hiçbir değişiklik yapamaz.
 */
export function isValidGroupCode(group: string): group is GroupCode {
  return GROUP_CODES.includes(group as GroupCode);
}

export function canViewGroup(role: RoleCode, group: GroupCode): boolean {
  if (!isValidGroupCode(group)) return false;
  return role === "MTCHARITA" || role === "NIL_PROJE" || role === "TKGM";
}

export function canEditRecordInGroup(role: RoleCode, group: GroupCode): boolean {
  if (!isValidGroupCode(group)) return false;
  if (role === "MTCHARITA") return true;
  if (role === "NIL_PROJE" && group === "GRUP-2") return true;
  return false;
}

export function canCreateRecordInGroup(role: RoleCode, group: GroupCode): boolean {
  if (!isValidGroupCode(group)) return false;
  return role === "MTCHARITA";
}

export function canDeleteRecordInGroup(role: RoleCode, group: GroupCode): boolean {
  if (!isValidGroupCode(group)) return false;
  return role === "MTCHARITA";
}

export function canExportGroup(role: RoleCode, group: GroupCode): boolean {
  if (!isValidGroupCode(group)) return false;
  return role === "MTCHARITA" || role === "NIL_PROJE" || role === "TKGM";
}

export function canImportExcel(role: RoleCode): boolean {
  return role === "MTCHARITA";
}

export function canViewAuditLogs(role: RoleCode): boolean {
  return role === "MTCHARITA" || role === "NIL_PROJE";
}

export function getGroupPermissionSummary(role: RoleCode, group: GroupCode): GroupPermission {
  const canEdit = canEditRecordInGroup(role, group);
  const canCreate = canCreateRecordInGroup(role, group);
  const canDelete = canDeleteRecordInGroup(role, group);

  let badgeText = "Yalnızca Görüntüleme";
  if (canCreate && canEdit && canDelete) {
    badgeText = "Tam Yetki (Ekleme / Düzenleme / Silme)";
  } else if (canEdit) {
    badgeText = "Düzenleme Yetkisi";
  }

  return {
    canView: canViewGroup(role, group),
    canEdit,
    canCreate,
    canDelete,
    canExport: canExportGroup(role, group),
    canImport: canImportExcel(role),
    canViewAudit: canViewAuditLogs(role),
    badgeText,
  };
}
