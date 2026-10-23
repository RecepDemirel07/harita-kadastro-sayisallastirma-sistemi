"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Search,
  Download,
  Upload,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Lock,
  History,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
  Info,
  Home,
  Crown,
  Layers,
  Target,
  GitCommitHorizontal,
  FileText,
  Filter,
  Table2,
  MapPin,
} from "lucide-react";
import {
  GROUP_CODES,
  GroupCode,
  KADASTRO_COLUMNS,
  FIELD_CATEGORIES,
  ColumnDefinition,
} from "@/lib/columns";
import { SessionUser } from "@/lib/auth";
import { GroupPermission } from "@/lib/permissions";
import RecordFormModal from "./RecordFormModal";
import ExcelImportModal from "./ExcelImportModal";
import AuditHistoryModal from "./AuditHistoryModal";
import UserManagementModal from "./UserManagementModal";
import GroupAnalyticsPanel from "./GroupAnalyticsPanel";

interface DashboardClientProps {
  initialUser: SessionUser;
}

/**
 * Sol Menü Üstü 3B Perspektif Kadastro Parsel Poligon Amblemi (Görsel 2 ile uyumlu)
 */
function SidebarCadastralBadge() {
  return (
    <div className="relative w-16 h-12 rounded-xl bg-[#0c1d3d] border border-blue-500/30 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
      <svg viewBox="0 0 68 48" className="w-full h-full" aria-hidden="true">
        {/* Arka ızgara */}
        <line x1="0" y1="14" x2="68" y2="14" stroke="#1e3a8a" strokeWidth="0.6" />
        <line x1="0" y1="34" x2="68" y2="34" stroke="#1e3a8a" strokeWidth="0.6" />
        <line x1="22" y1="0" x2="22" y2="48" stroke="#1e3a8a" strokeWidth="0.6" />
        <line x1="46" y1="0" x2="46" y2="48" stroke="#1e3a8a" strokeWidth="0.6" />
        {/* Parsel poligonu */}
        <polygon
          points="10,36 18,10 48,8 58,34 32,40"
          fill="rgba(37,99,235,0.28)"
          stroke="#3b82f6"
          strokeWidth="1.6"
        />
        {/* İç parsel bölme hatları */}
        <line x1="18" y1="10" x2="32" y2="40" stroke="#60a5fa" strokeWidth="1.1" strokeDasharray="2 1.5" />
        <line x1="14" y1="23" x2="53" y2="21" stroke="#60a5fa" strokeWidth="1.1" strokeDasharray="2 1.5" />
        {/* Köşe nirengi noktaları */}
        {[
          [10, 36],
          [18, 10],
          [48, 8],
          [58, 34],
          [32, 40],
          [34, 22],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="#e0f2fe" stroke="#2563eb" strokeWidth="0.8" />
        ))}
      </svg>
    </div>
  );
}

/**
 * Grup Kartları İçin Renkli Mini Pafta/Parsel İkonu (Görsel 2'deki 4 grup kartı ikonu)
 */
function GroupMiniMapThumb({
  groupCode,
  isSelected,
}: {
  groupCode: GroupCode;
  isSelected: boolean;
}) {
  const palette: Record<
    GroupCode,
    { bg: string; border: string; stroke: string; fill: string }
  > = {
    "GRUP-1": {
      bg: isSelected ? "bg-blue-700/70" : "bg-blue-50",
      border: isSelected ? "border-blue-300/50" : "border-blue-200",
      stroke: isSelected ? "#e0f2fe" : "#2563eb",
      fill: isSelected ? "rgba(255,255,255,0.16)" : "rgba(37,99,235,0.12)",
    },
    "GRUP-2": {
      bg: isSelected ? "bg-blue-700/70" : "bg-teal-50",
      border: isSelected ? "border-blue-300/50" : "border-teal-200",
      stroke: isSelected ? "#e0f2fe" : "#0d9488",
      fill: isSelected ? "rgba(255,255,255,0.16)" : "rgba(13,148,136,0.14)",
    },
    "GRUP-3": {
      bg: isSelected ? "bg-blue-700/70" : "bg-amber-50",
      border: isSelected ? "border-blue-300/50" : "border-amber-200",
      stroke: isSelected ? "#e0f2fe" : "#d97706",
      fill: isSelected ? "rgba(255,255,255,0.16)" : "rgba(217,119,6,0.12)",
    },
    "GRUP-4": {
      bg: isSelected ? "bg-blue-700/70" : "bg-indigo-50",
      border: isSelected ? "border-blue-300/50" : "border-indigo-200",
      stroke: isSelected ? "#e0f2fe" : "#4f46e5",
      fill: isSelected ? "rgba(255,255,255,0.16)" : "rgba(79,70,229,0.12)",
    },
  };

  const theme = palette[groupCode];

  return (
    <div
      className={`w-11 h-11 rounded-xl border ${theme.bg} ${theme.border} flex items-center justify-center shrink-0 overflow-hidden`}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
        <line x1="0" y1="12" x2="40" y2="28" stroke={theme.stroke} strokeWidth="1" strokeOpacity="0.45" />
        <line x1="14" y1="0" x2="28" y2="40" stroke={theme.stroke} strokeWidth="1" strokeOpacity="0.45" />
        <polygon
          points="8,28 14,10 31,12 28,31"
          fill={theme.fill}
          stroke={theme.stroke}
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}

/**
 * Tablo Satırlarındaki Küçük Parsel Harita İkonu
 */
function RowParcelIcon({ index }: { index: number }) {
  const isTeal = index % 3 === 2;
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 mr-2.5 ${
        isTeal
          ? "bg-teal-50/80 border-teal-200 text-teal-600"
          : "bg-blue-50/80 border-blue-200 text-blue-600"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polygon points="4,18 7,6 19,5 17,19" fill="currentColor" fillOpacity="0.12" />
        <line x1="7" y1="6" x2="12" y2="18.5" strokeOpacity="0.7" />
      </svg>
    </span>
  );
}

export default function DashboardClient({ initialUser }: DashboardClientProps) {
  const router = useRouter();
  const [user] = useState<SessionUser>(initialUser);
  const [activeGroup, setActiveGroup] = useState<GroupCode>("GRUP-1");

  // Filtre ve Sayfalama Durumları
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hizmetBirimi, setHizmetBirimi] = useState("ALL");
  const [ilcesi, setIlcesi] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minParsel, setMinParsel] = useState("");
  const [maxParsel, setMaxParsel] = useState("");
  const [sortBy, setSortBy] = useState("rowOrder");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Sütun görünüm filtresi ("all" veya kategori id)
  const [columnView, setColumnView] = useState<string>("all");
  // Filtre çekmecesi görünürlüğü
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Sunucu Verileri
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<GroupCode, number>>({
    "GRUP-1": 0,
    "GRUP-2": 0,
    "GRUP-3": 0,
    "GRUP-4": 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    filteredCount: 0,
    totalPages: 1,
    groupTotalCount: 0,
  });
  const [filterOptions, setFilterOptions] = useState<{
    hizmetBirimleri: string[];
    ilceler: string[];
  }>({ hizmetBirimleri: [], ilceler: [] });
  const [aggregates, setAggregates] = useState<Record<string, number | null>>({});
  const [permissions, setPermissions] = useState<GroupPermission>({
    canView: true,
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canExport: true,
    canImport: false,
    canViewAudit: false,
    badgeText: "Yalnızca Görüntüleme",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Bildirim (Toast)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modallar
  const [recordModal, setRecordModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    record: Record<string, unknown> | null;
  }>({ isOpen: false, mode: "edit", record: null });

  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [textDetailModal, setTextDetailModal] = useState<{
    title: string;
    subtitle: string;
    content: string;
  } | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Excel İndirme Durumu
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // Arama metni gecikmesi (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    hizmetBirimi !== "ALL" ||
    ilcesi !== "ALL" ||
    statusFilter !== "all" ||
    minParsel.trim() !== "" ||
    maxParsel.trim() !== "";

  const fetchGroupData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        group: activeGroup,
        search: debouncedSearch,
        hizmetBirimi,
        ilcesi,
        statusFilter,
        minParsel,
        maxParsel,
        sortBy,
        sortOrder,
        page: String(page),
        pageSize: String(pageSize),
      });

      const res = await fetch(`/api/records?${params.toString()}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace("/login?expired=1");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFetchError(data.error || "Veriler yüklenirken hata oluştu.");
        setIsLoading(false);
        return;
      }

      setRecords(data.records || []);
      setPagination(data.pagination);
      setGroupCounts(data.groupCounts);
      setFilterOptions(data.filterOptions);
      setAggregates(data.aggregates || {});
      setPermissions(data.permissions);
      setIsLoading(false);
    } catch {
      setFetchError("Sunucu ile bağlantı kurulamadı. Lütfen sayfayı yenileyin.");
      setIsLoading(false);
    }
  }, [
    activeGroup,
    debouncedSearch,
    hizmetBirimi,
    ilcesi,
    statusFilter,
    minParsel,
    maxParsel,
    sortBy,
    sortOrder,
    page,
    pageSize,
    router,
  ]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleGroupChange = (newGroup: GroupCode) => {
    if (newGroup === activeGroup) return;
    setActiveGroup(newGroup);
    setSearchInput("");
    setDebouncedSearch("");
    setHizmetBirimi("ALL");
    setIlcesi("ALL");
    setStatusFilter("all");
    setMinParsel("");
    setMaxParsel("");
    setSortBy("rowOrder");
    setSortOrder("asc");
    setPage(1);
    setShowExportMenu(false);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setHizmetBirimi("ALL");
    setIlcesi("ALL");
    setStatusFilter("all");
    setMinParsel("");
    setMaxParsel("");
    setSortBy("rowOrder");
    setSortOrder("asc");
    setPage(1);
  };

  const handleSort = (colKey: string) => {
    if (sortBy === colKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colKey);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.replace("/login");
    }
  };

  const handleExportExcel = async (scope: "all" | "filtered") => {
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        group: activeGroup,
        scope,
        search: debouncedSearch,
        hizmetBirimi,
        ilcesi,
        statusFilter,
        minParsel,
        maxParsel,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/excel/export?${params.toString()}`);
      if (res.status === 401) {
        router.replace("/login?expired=1");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast("error", errData.error || "Excel dosyası indirilemedi.");
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const today = new Date().toISOString().slice(0, 10);
      const downloadName = match ? match[1] : `${activeGroup}_${today}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(
        "success",
        `${downloadName} başarıyla oluşturuldu ve indirildi (${
          scope === "filtered"
            ? `${pagination.filteredCount} filtrelenen`
            : `${pagination.groupTotalCount} tüm`
        } kayıt).`
      );
    } catch {
      showToast("error", "Excel indirme işlemi sırasında ağ hatası oluştu.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data.error || "Kayıt silinemedi.");
        setIsDeleting(false);
        return;
      }

      showToast("success", data.message || "Kayıt başarıyla silindi.");
      setDeleteTarget(null);
      setIsDeleting(false);
      fetchGroupData();
    } catch {
      showToast("error", "Silme işlemi sırasında sunucu hatası oluştu.");
      setIsDeleting(false);
    }
  };

  // Görünür sütunları hesapla (Konum sütunları A, B, C her zaman görünür kalır)
  const visibleColumns: ColumnDefinition[] = KADASTRO_COLUMNS.filter((col) => {
    if (col.category === "konum") return true;
    if (columnView === "all") return true;
    return col.category === columnView;
  });

  const formatCellValue = (col: ColumnDefinition, rawVal: unknown) => {
    if (rawVal === null || rawVal === undefined || rawVal === "") {
      return <span className="text-slate-300 select-none">—</span>;
    }
    if (col.type === "int") {
      const num = Number(rawVal);
      return Number.isNaN(num) ? String(rawVal) : num.toLocaleString("tr-TR");
    }
    if (col.type === "float") {
      const num = Number(rawVal);
      return Number.isNaN(num)
        ? String(rawVal)
        : num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const str = String(rawVal);
    if (str.length > 36) {
      return (
        <button
          type="button"
          onClick={() =>
            setTextDetailModal({
              title: col.label,
              subtitle: `Tam Metin Görünümü`,
              content: str,
            })
          }
          title={str}
          className="text-left group inline-flex items-center gap-1 max-w-[220px] hover:text-blue-700 cursor-pointer"
        >
          <span className="truncate">{str}</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-blue-700 font-semibold shrink-0">
            Tamamı
          </span>
        </button>
      );
    }
    return str;
  };

  // Özet Metrik Hesaplamaları (KPIs & İhale İlerlemesi)
  const toplamParsel = aggregates.biriminToplamParselSayisi ?? 0;
  const hedefIyilestirme = aggregates.iyilestirmeYapilacakParselSayisi ?? 0;
  const hedefSayisallastirma = aggregates.sayisallastirmaYapilacakParselSayisi ?? 0;
  const ihaleHedefi = hedefIyilestirme + hedefSayisallastirma;

  const tamamlananKesinKoordinat = aggregates.sayisallastirmaYapilacakParselSayisi ?? 0;
  const tamamlananIyilestirme = aggregates.iyilestirmeYapilanParselSayisi ?? 0;
  const toplamTamamlanan = tamamlananKesinKoordinat + tamamlananIyilestirme;
  const ihaleIlerlemeYuzdesi =
    ihaleHedefi > 0 ? (toplamTamamlanan / ihaleHedefi) * 100 : 0;

  // Sayfalama numaraları dizisi
  const getPageNumbers = () => {
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) return [1, 2, 3, "...", total];
    if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
    return [1, "...", current, "...", total];
  };

  return (
    <div className="min-h-screen flex bg-[#061126] text-slate-900">
      {/* Bildirim (Toast) */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 text-white border-emerald-800"
              : "bg-red-950 text-white border-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* SOL KOYU LACİVERT KURUMSAL MENÜ (SIDEBAR - Görsel 2 ile Birebir) */}
      <aside className="w-60 shrink-0 bg-[#061126] text-white flex flex-col justify-between relative overflow-hidden select-none border-r border-slate-800/60">
        {/* Alt Topografik Kontur Çizgileri Süslemesi */}
        <svg
          viewBox="0 0 240 320"
          className="absolute bottom-0 inset-x-0 w-full h-72 opacity-15 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-20 120 C 40 90, 120 150, 260 100"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <path
            d="M-20 155 C 50 120, 130 185, 260 135"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <path
            d="M-20 190 C 60 155, 140 220, 260 170"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <path
            d="M-20 225 C 70 190, 150 255, 260 205"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <path
            d="M-20 260 C 80 225, 160 290, 260 240"
            stroke="#38bdf8"
            strokeWidth="1"
          />
        </svg>

        {/* Üst Marka ve Navigasyon */}
        <div className="relative z-10 p-5 space-y-7">
          {/* 3B Parsel Amblemi ve Başlık */}
          <div className="space-y-3.5 pt-1">
            <SidebarCadastralBadge />
            <h1 className="text-[17px] font-extrabold tracking-tight text-white leading-[1.22]">
              Harita ve
              <span className="block">Kadastro</span>
              <span className="block">Sayısallaştırma</span>
              <span className="block">Sistemi</span>
            </h1>
          </div>

          <div className="h-px bg-slate-800/90" />

          {/* Çalışma Alanı Menüsü */}
          <div className="space-y-2">
            <span className="px-3 text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400 block">
              ÇALIŞMA ALANI
            </span>

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold shadow-md shadow-blue-600/25 cursor-pointer transition-all"
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Genel görünüm</span>
              </button>

              {permissions.canViewAudit && (
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 text-xs font-medium cursor-pointer transition-colors"
                >
                  <History className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>İşlem geçmişi</span>
                </button>
              )}

              {user.roleCode === "MTCHARITA" && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Excel içe aktar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(true)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Kullanıcılar</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Alt Kullanıcı Profili ve Çıkış */}
        <div className="relative z-10 p-4 border-t border-slate-800/80 space-y-3 bg-[#061126]/90 backdrop-blur-xs">
          <div className="flex items-center gap-3 px-1">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#1d4ed8] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-[#061126]" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate">
                {user.fullName}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {user.roleCode === "MTCHARITA" ? "Yönetici" : user.roleName}
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-800/80" />

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-red-950/50 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                <span>Çıkış yapılıyor...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Çıkış yap</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* SAĞ ANA ÇALIŞMA ALANI (Görsel 2 ile Birebir + Grafik Analizi) */}
      <div className="flex-1 min-w-0 bg-[#f4f7fb] lg:rounded-l-[28px] overflow-hidden flex flex-col">
        {/* Üst Gezinti (Breadcrumb) ve Aksiyon Çubuğu */}
        <header className="px-5 sm:px-8 pt-5 pb-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Home className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-300">&gt;</span>
            <span>Çalışma alanı</span>
            <span className="text-slate-300">/</span>
            <strong className="text-slate-900 font-bold">{activeGroup}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Yetki Rozeti */}
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                permissions.canEdit
                  ? "bg-blue-50/90 text-blue-700 border-blue-200/80"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {permissions.canEdit ? (
                <Crown className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{permissions.canEdit ? "Tam yetki" : "Salt okunur"}</span>
            </span>

            {/* Excel İndir Butonu */}
            <div className="relative">
              {hasActiveFilters ? (
                <>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setShowExportMenu((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Excel indir</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40">
                      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                        Filtre aktif — İndirme kapsamını seçin:
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportExcel("filtered")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-xs flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-blue-900 block">
                            Filtrelenen Kayıtları İndir
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Arama ve filtreye uyan kayıtlar
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold font-mono">
                          {pagination.filteredCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportExcel("all")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-xs flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-900 block">
                            Tüm Grubu İndir ({activeGroup})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Filtresiz tam grup verisi
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">
                          {pagination.groupTotalCount}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportExcel("all")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Excel indir</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Ana İçerik Akışı */}
        <main className="flex-1 px-5 sm:px-8 pb-8 space-y-4 max-w-[1600px] w-full mx-auto">
          {/* 1. ÜST KART: Kadastro Proje Takibi Başlığı + Sağ Harita Çizimi + 4 Grup Sekmesi */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Harita İllüstrasyonlu Başlık Alanı */}
            <div className="relative px-6 py-6 flex items-center justify-between overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">
                  Kadastro Proje Takibi
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Pafta, parsel ve sayısallaştırma çalışmalarına genel bakış.
                </p>
              </div>

              {/* Sağ Taraf Vektörel Pafta & Konum İğnesi Grafiği (Görsel 2 ile birebir) */}
              <div
                className="hidden md:block absolute right-0 top-0 bottom-0 w-[460px] pointer-events-none select-none"
                aria-hidden="true"
              >
                <svg viewBox="0 0 460 130" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="bannerFadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="35%" stopColor="#ffffff" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Arka plan sokak/pafta çizgileri */}
                  <g stroke="#cbd5e1" strokeWidth="1.2" opacity="0.65">
                    <line x1="40" y1="0" x2="140" y2="130" />
                    <line x1="150" y1="0" x2="90" y2="130" />
                    <line x1="240" y1="0" x2="195" y2="130" />
                    <line x1="340" y1="0" x2="290" y2="130" />
                    <line x1="420" y1="0" x2="380" y2="130" />
                    <line x1="20" y1="30" x2="460" y2="95" />
                    <line x1="60" y1="105" x2="460" y2="20" />
                    <line x1="180" y1="0" x2="410" y2="130" />
                  </g>
                  {/* Vurgulanan mavi parsel poligonu */}
                  <polygon
                    points="245,78 318,22 395,112"
                    fill="rgba(59,130,246,0.18)"
                    stroke="#3b82f6"
                    strokeWidth="1.8"
                  />
                  {/* Sol yumuşak geçiş */}
                  <rect x="0" y="0" width="460" height="130" fill="url(#bannerFadeLeft)" />
                </svg>
                <div className="absolute right-28 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600 fill-blue-600/20" />
                </div>
              </div>
            </div>

            {/* 4 Grup Sekmesi (Görsel 2'deki Kart Tasarımı) */}
            <div
              role="tablist"
              aria-label="Veri Grupları"
              className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
            >
              {GROUP_CODES.map((g) => {
                const isSelected = activeGroup === g;
                const count = groupCounts[g] ?? 0;

                return (
                  <button
                    key={g}
                    role="tab"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleGroupChange(g)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-lg shadow-blue-600/20"
                        : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200/90"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GroupMiniMapThumb groupCode={g} isSelected={isSelected} />
                      <div className="min-w-0">
                        <span className="block text-sm font-extrabold tracking-tight">
                          {g}
                        </span>
                        <span
                          className={`block text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          Mahalle / Birim Verileri
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 text-blue-200" />
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono ${
                          isSelected
                            ? "bg-white text-[#1d4ed8]"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Salt Okunur Bilgilendirme Şeridi */}
            {!permissions.canEdit && (
              <div className="mx-6 mb-5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  <strong>Bilgi:</strong> Rolünüz (<strong>{user.roleName}</strong>) kapsamında{" "}
                  <strong>{activeGroup}</strong> üzerinde yalnızca görüntüleme ve Excel indirme
                  yetkiniz bulunmaktadır.
                  {user.roleCode === "NIL_PROJE" && (
                    <span className="ml-1 text-blue-700 font-semibold">
                      Düzenleme yapmak için GRUP-2 sekmesine geçebilirsiniz.
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* 2. DÖRTLÜ KPI METRİK ŞERİDİ KARTI (Görsel 2 ile Birebir) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-0 lg:divide-x lg:divide-slate-200/80">
            <div className="flex items-center gap-4 lg:px-5 first:lg:pl-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  Toplam parsel
                </span>
                <span className="block text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {toplamParsel.toLocaleString("tr-TR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:px-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  İyileştirme hedefi
                </span>
                <span className="block text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {hedefIyilestirme.toLocaleString("tr-TR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:px-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <GitCommitHorizontal className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  Sayısallaştırma hedefi
                </span>
                <span className="block text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {hedefSayisallastirma.toLocaleString("tr-TR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:px-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  İhale hedefi
                </span>
                <span className="block text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {ihaleHedefi.toLocaleString("tr-TR")}
                </span>
              </div>
            </div>
          </div>

          {/* 3. İHALE İLERLEMESİ ÖZET ÇUBUĞU KARTI (Görsel 2 ile Birebir) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center justify-between lg:justify-start gap-6 sm:gap-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    İhale ilerlemesi
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tamamlanan / Hedef parsel sayısı
                  </p>
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold text-[#1d4ed8] tracking-tight">
                %{ihaleIlerlemeYuzdesi.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="flex-1 max-w-2xl space-y-2">
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1d4ed8] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, ihaleIlerlemeYuzdesi))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Tamamlanan:{" "}
                  <strong className="text-slate-900 font-bold">
                    {toplamTamamlanan.toLocaleString("tr-TR")}
                  </strong>
                </span>
                <span>
                  Hedef:{" "}
                  <strong className="text-slate-900 font-bold">
                    {ihaleHedefi.toLocaleString("tr-TR")}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 4. İHALE PARSEL VE YÜZDELİK TAMAMLANMA 3B PASTA GRAFİK ANALİZ PANELİ */}
          <GroupAnalyticsPanel
            groupCode={activeGroup}
            aggregates={aggregates}
            hasActiveFilters={hasActiveFilters}
          />

          {/* 5. BİRİM VE MAHALLE KAYITLARI TABLO KARTI (Görsel 2 ile Birebir Başlık + Tam Tablo İşlevselliği) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            {/* Tablo Üst Başlık ve Arama/Filtre Çubuğu */}
            <div className="px-5 py-4 border-b border-slate-200/80 space-y-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Sol: Başlık ve Kayıt Sayısı Rozeti */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Table2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Birim ve mahalle kayıtları
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {pagination.filteredCount.toLocaleString("tr-TR")} kayıt
                  </span>
                </div>

                {/* Sağ: Arama, Filtrele ve + Yeni Kayıt */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      aria-label="Tabloda ara"
                      placeholder="Mahalle, ilçe veya birim ara..."
                      className="w-full pl-9 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFiltersPanel((prev) => !prev)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      showFiltersPanel || hasActiveFilters
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtrele</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showFiltersPanel ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Temizle</span>
                    </button>
                  )}

                  {permissions.canCreate && (
                    <button
                      type="button"
                      onClick={() =>
                        setRecordModal({
                          isOpen: true,
                          mode: "create",
                          record: null,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni kayıt</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Açılır Gelişmiş Filtre ve Sütun Görünüm Çubuğu */}
              {(showFiltersPanel || hasActiveFilters || columnView !== "all") && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hizmet Birimi
                    </label>
                    <select
                      value={hizmetBirimi}
                      onChange={(e) => {
                        setHizmetBirimi(e.target.value);
                        setIlcesi("ALL");
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="ALL">
                        Tüm Hizmet Birimleri ({filterOptions.hizmetBirimleri.length})
                      </option>
                      {filterOptions.hizmetBirimleri.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      İlçesi
                    </label>
                    <select
                      value={ilcesi}
                      onChange={(e) => {
                        setIlcesi(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="ALL">Tüm İlçeler ({filterOptions.ilceler.length})</option>
                      {filterOptions.ilceler.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kayıt Durumu / Filtre
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="all">Tüm Kayıtlar</option>
                      <option value="modified">Kullanıcı Tarafından Düzenlenenler</option>
                      <option value="with_aciklama">Açıklama Notu Bulunanlar</option>
                      <option value="with_kesin_parsel">Kesin Parsel Sayısı Girilenler</option>
                      <option value="with_tescil">Tescil ve Devir İşlemi Olanlar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Toplam Parsel Aralığı (Min - Maks)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={minParsel}
                        onChange={(e) => {
                          setMinParsel(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Min"
                        className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                      <input
                        type="number"
                        min={0}
                        value={maxParsel}
                        onChange={(e) => {
                          setMaxParsel(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Maks"
                        className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                      <span>Tablo Sütun Görünümü</span>
                    </label>
                    <select
                      value={columnView}
                      onChange={(e) => setColumnView(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-blue-50/70 border border-blue-200 rounded-lg text-blue-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="all">Tüm Sütunlar (43 Sütun - Tam Tablo)</option>
                      {FIELD_CATEGORIES.filter((c) => c.id !== "konum").map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          Odak: {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Tablo Gövdesi */}
            {fetchError ? (
              <div className="p-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-900">{fetchError}</div>
                <button
                  type="button"
                  onClick={fetchGroupData}
                  className="px-4 py-2 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold cursor-pointer"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-2.5 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">
                  {activeGroup} verileri veritabanından yükleniyor...
                </span>
              </div>
            ) : records.length === 0 ? (
              <div className="p-14 text-center space-y-2.5">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-800">
                  {hasActiveFilters
                    ? "Arama ve filtre kriterlerinize uygun kayıt bulunamadı."
                    : "Bu veri grubunda henüz kayıt bulunmuyor."}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {hasActiveFilters
                    ? "Farklı bir anahtar kelime deneyebilir veya filtreleri temizleyerek tüm kayıtları görüntüleyebilirsiniz."
                    : "Yönetici hesabıyla Excel içe aktarma aracını kullanarak başlangıç verilerini yükleyebilirsiniz."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Filtreleri Temizle</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto relative">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-2.5 text-center font-semibold border-r border-slate-200/70 w-11 sticky left-0 z-30 bg-slate-50">
                          #
                        </th>

                        {(permissions.canEdit || permissions.canDelete) && (
                          <th className="py-3 px-3 text-center font-semibold border-r border-slate-200/70 w-24 sticky left-11 z-30 bg-slate-50">
                            İşlemler
                          </th>
                        )}

                        {visibleColumns.map((col) => {
                          const isSorted = sortBy === col.key;
                          return (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="py-3 px-3.5 text-left font-semibold border-r border-slate-200/60 whitespace-nowrap select-none hover:bg-slate-100/80 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div>
                                  <span className="text-[10px] font-mono text-blue-600 mr-1">
                                    [{col.excelCol}]
                                  </span>
                                  <span className="text-slate-700">
                                    {col.shortLabel || col.label}
                                  </span>
                                </div>
                                {isSorted ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0 opacity-70" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200/70">
                      {records.map((rec, idx) => {
                        const rowNum = (pagination.page - 1) * pagination.pageSize + idx + 1;
                        const isModified = Boolean(rec.isUserModified);

                        return (
                          <tr
                            key={String(rec.id)}
                            className={`hover:bg-blue-50/40 transition-colors ${
                              isModified ? "bg-amber-50/25" : "bg-white"
                            }`}
                          >
                            <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 sticky left-0 z-10 bg-inherit">
                              {rowNum}
                            </td>

                            {(permissions.canEdit || permissions.canDelete) && (
                              <td className="py-2 px-2.5 text-center border-r border-slate-100 whitespace-nowrap sticky left-11 z-10 bg-inherit">
                                <div className="inline-flex items-center gap-1.5">
                                  {permissions.canEdit && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRecordModal({
                                          isOpen: true,
                                          mode: "edit",
                                          record: rec,
                                        })
                                      }
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 transition-colors cursor-pointer"
                                      title="Kaydı Düzenle"
                                      aria-label="Kaydı Düzenle"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {permissions.canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget(rec)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200/80 transition-colors cursor-pointer"
                                      title="Kaydı Sil"
                                      aria-label="Kaydı Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}

                            {visibleColumns.map((col) => {
                              const isNumeric = col.type === "int" || col.type === "float";
                              const isKeyCol = col.category === "konum";
                              const isFirstCol = col.key === "hizmetBirimi";
                              return (
                                <td
                                  key={col.key}
                                  className={`py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap ${
                                    isNumeric
                                      ? "text-right font-mono font-semibold text-slate-800"
                                      : isKeyCol
                                      ? "font-semibold text-slate-900"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {isFirstCol ? (
                                    <div className="inline-flex items-center">
                                      <RowParcelIcon index={idx} />
                                      <span>{formatCellValue(col, rec[col.key])}</span>
                                    </div>
                                  ) : (
                                    formatCellValue(col, rec[col.key])
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Dip Toplam Satırı */}
                    <tfoot className="sticky bottom-0 z-20 bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-2.5 text-center border-r border-slate-200 sticky left-0 bg-slate-50">
                          Σ
                        </td>
                        {(permissions.canEdit || permissions.canDelete) && (
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-200 sticky left-11 bg-slate-50 text-[11px] text-slate-600">
                            TOPLAM
                          </td>
                        )}
                        {visibleColumns.map((col) => {
                          if (col.key === "mahalleKoy") {
                            return (
                              <td
                                key={col.key}
                                className="py-2.5 px-3.5 border-r border-slate-200 text-right text-slate-800"
                              >
                                TOPLAM ({pagination.filteredCount} Birim):
                              </td>
                            );
                          }
                          if (col.isSummable) {
                            const totalVal = aggregates[col.key] ?? 0;
                            return (
                              <td
                                key={col.key}
                                className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono text-blue-950"
                              >
                                {col.type === "float"
                                  ? Number(totalVal).toLocaleString("tr-TR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                                  : Number(totalVal).toLocaleString("tr-TR")}
                              </td>
                            );
                          }
                          return (
                            <td key={col.key} className="py-2.5 px-3.5 border-r border-slate-200" />
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Alt Sayfalama Çubuğu (Görsel 2'deki Numaralı Buton Tasarımı) */}
                <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Toplam <strong className="text-slate-800">{pagination.filteredCount}</strong>{" "}
                        kayıttan{" "}
                        <strong className="text-slate-800">
                          {(pagination.page - 1) * pagination.pageSize + 1}
                        </strong>{" "}
                        -{" "}
                        <strong className="text-slate-800">
                          {Math.min(
                            pagination.page * pagination.pageSize,
                            pagination.filteredCount
                          )}
                        </strong>{" "}
                        arası gösteriliyor
                      </span>
                    </span>
                    <div className="hidden md:flex items-center gap-1.5">
                      <span>Sayfa boyutu:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
                      >
                        {[25, 50, 100, 250].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Numaralı Sayfalama Butonları */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center text-slate-600 cursor-pointer"
                      aria-label="Önceki Sayfa"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPageNumbers().map((item, idx) =>
                      item === "..." ? (
                        <span key={`dots-${idx}`} className="px-1.5 text-slate-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${item}`}
                          type="button"
                          onClick={() => setPage(Number(item))}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            pagination.page === item
                              ? "bg-[#1d4ed8] text-white shadow-xs"
                              : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center text-slate-600 cursor-pointer"
                      aria-label="Sonraki Sayfa"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Kayıt Ekleme / Düzenleme Modalı */}
      <RecordFormModal
        isOpen={recordModal.isOpen}
        mode={recordModal.mode}
        groupCode={activeGroup}
        initialRecord={recordModal.record}
        onClose={() => setRecordModal({ isOpen: false, mode: "edit", record: null })}
        onSuccess={(msg) => {
          setRecordModal({ isOpen: false, mode: "edit", record: null });
          showToast("success", msg);
          fetchGroupData();
        }}
      />

      {/* Silme Onay Modalı */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Kaydı Silmeyi Onayla</h3>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>{activeGroup}</strong> grubundaki{" "}
                  <strong>
                    {String(deleteTarget.hizmetBirimi)} / {String(deleteTarget.ilcesi)} /{" "}
                    {String(deleteTarget.mahalleKoy)}
                  </strong>{" "}
                  kaydını kalıcı olarak silmek istediğinize emin misiniz?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? "Siliniyor..." : "Evet, Kaydı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uzun Hücre Metni Görüntüleme Modalı */}
      {textDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{textDetailModal.title}</h3>
                <p className="text-[11px] text-slate-500">{textDetailModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setTextDetailModal(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Kapat
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {textDetailModal.content}
            </div>
          </div>
        </div>
      )}

      {/* Yönetici Excel İçe Aktarma Modalı */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        defaultGroup={activeGroup}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          showToast("success", "Excel veri aktarımı başarıyla tamamlandı.");
          fetchGroupData();
        }}
      />

      {/* İşlem Geçmişi Modalı */}
      <AuditHistoryModal
        isOpen={isAuditModalOpen}
        groupCode={activeGroup}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Kullanıcı ve Rol Yönetimi Modalı */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </div>
  );
}
