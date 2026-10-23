"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
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
  Eye,
  Lock,
  History,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
  FileSpreadsheet,
  Info,
  Compass,
  Map,
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

  // Sunucu Verileri
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
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
      setProjectTitle(data.projectTitle || "");
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

  const handleLogout = async () => {
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
          scope === "filtered" ? `${pagination.filteredCount} filtrelenen` : `${pagination.groupTotalCount} tüm`
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
          className="text-left group inline-flex items-center gap-1 max-w-[220px] hover:text-blue-900 cursor-pointer"
        >
          <span className="truncate">{str}</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-blue-800 font-semibold shrink-0">
            Tamamı
          </span>
        </button>
      );
    }
    return str;
  };

  const getTabPermissionHint = (g: GroupCode) => {
    if (user.roleCode === "MTCHARITA") return "Tam Yetki";
    if (user.roleCode === "NIL_PROJE" && g === "GRUP-2") return "Düzenleme";
    return "Görüntüleme";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
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

      {/* Üst Kurumsal Bar (Header) */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
              Harita ve Kadastro Sayısallaştırma Sistemi
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Yönetici / Denetim Araçları */}
            {permissions.canViewAudit && (
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                title="İşlem Geçmişi (Audit Log)"
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">İşlem Geçmişi</span>
              </button>
            )}

            {user.roleCode === "MTCHARITA" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Excel İçe Aktar"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Excel İçe Aktar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Kullanıcı ve Rol Yönetimi"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline">Kullanıcılar</span>
                </button>
              </>
            )}

            <div className="h-5 w-px bg-slate-700 mx-0.5 hidden sm:block" />

            {/* Kullanıcı ve Rol Bilgisi */}
            <div className="flex items-center gap-2.5 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="text-right">
                <span className="block text-xs font-semibold text-white leading-none">
                  {user.fullName}
                </span>
                <span className="inline-block mt-1 text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.2 rounded bg-blue-900 text-blue-200 border border-blue-700">
                  {user.roleName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Çıkış Yap"
                title="Oturumu Kapat"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-red-900/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Üst Başlık ve Grup Sekmeleri */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Harita Görselli Üst Şerit */}
          <div className="relative px-4 sm:px-5 py-4 bg-slate-900 text-white border-b border-slate-800 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
              style={{ backgroundImage: "url('/images/cadastre-hero.jpg')" }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-blue-950/75 pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold shadow-xs">
                    <Map className="w-3.5 h-3.5" />
                    {activeGroup}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Kadastro Pafta ve Parsel Sayısallaştırma Envanteri
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Kadastro Hizmet Birimleri, Pafta Üretimleri, Arazi Ölçümleri ve Tescil Takip Envanteri
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 pt-4">

          {/* Dört Grup Sekmesi */}
          <div
            role="tablist"
            aria-label="Veri Grupları"
            className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 overflow-x-auto"
          >
            {GROUP_CODES.map((g) => {
              const isSelected = activeGroup === g;
              const count = groupCounts[g] ?? 0;
              const hint = getTabPermissionHint(g);

              return (
                <button
                  key={g}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleGroupChange(g)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-blue-900 text-white border-blue-900 shadow-sm ring-2 ring-blue-900/20"
                      : "bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold tracking-tight">{g}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          isSelected
                            ? "bg-blue-800 text-blue-100"
                            : hint === "Görüntüleme"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {hint}
                      </span>
                    </div>
                    <span
                      className={`block text-[11px] mt-0.5 ${
                        isSelected ? "text-blue-200" : "text-slate-500"
                      }`}
                    >
                      Mahalle / Birim Verileri
                    </span>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                      isSelected ? "bg-white text-blue-950" : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    {count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Salt Okunur Bilgilendirme Şeridi */}
          {!permissions.canEdit && (
            <div className="mt-3.5 px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                <strong>Bilgi:</strong> Rolünüz (<strong>{user.roleName}</strong>) kapsamında{" "}
                <strong>{activeGroup}</strong> üzerinde yalnızca görüntüleme ve Excel indirme
                yetkiniz bulunmaktadır.
                {user.roleCode === "NIL_PROJE" && (
                  <span className="ml-1 text-blue-900 font-semibold">
                    Düzenleme yapmak için GRUP-2 sekmesine geçebilirsiniz.
                  </span>
                )}
              </span>
            </div>
          )}
          </div>
        </div>

        {/* Özet Veri Kartları (KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Listelenen Birim / Mahalle
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">
                {pagination.filteredCount.toLocaleString("tr-TR")}
              </span>
              {hasActiveFilters && (
                <span className="text-xs text-slate-500">
                  / {pagination.groupTotalCount.toLocaleString("tr-TR")}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Birimin Toplam Parsel Sayısı
            </span>
            <div className="mt-1 text-xl font-bold text-blue-900">
              {(aggregates.biriminToplamParselSayisi ?? 0).toLocaleString("tr-TR")}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              İyileştirme Yapılacak Parsel
            </span>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {(aggregates.iyilestirmeYapilacakParselSayisi ?? 0).toLocaleString("tr-TR")}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Sayısallaştırma Yapılacak Parsel
            </span>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {(aggregates.sayisallastirmaYapilacakParselSayisi ?? 0).toLocaleString("tr-TR")}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              İhale Parsel Sayısı (Hedef)
            </span>
            <div className="mt-1 text-xl font-bold text-emerald-800">
              {(
                (aggregates.iyilestirmeYapilacakParselSayisi ?? 0) +
                (aggregates.sayisallastirmaYapilacakParselSayisi ?? 0)
              ).toLocaleString("tr-TR")}
            </div>
          </div>
        </div>

        {/* İhale Parsel ve Yüzdelik Tamamlanma Pasta Grafik Analiz Paneli */}
        <GroupAnalyticsPanel
          groupCode={activeGroup}
          aggregates={aggregates}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Arama, Filtreleme ve Aksiyon Çubuğu */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Arama Kutusu */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Tabloda ara"
                placeholder={`${activeGroup} içinde mahalle/köy, ilçe, hizmet birimi, görevli veya açıklama ara...`}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Temizle
                </button>
              )}
            </div>

            {/* Sağ Aksiyon Butonları (Excel İndir + Yeni Kayıt Ekle) */}
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Filtreleri Temizle</span>
                </button>
              )}

              {/* Excel İndir Butonu (Filtre varsa Tümünü veya Filtrelenenleri seçme imkanı sunar) */}
              <div className="relative">
                {hasActiveFilters ? (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setShowExportMenu((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Excel İndir (.xlsx)</span>
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
                              Tüm Grup Kayıtlarını İndir
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {activeGroup} içindeki tüm kayıtlar
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold font-mono">
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Hazırlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Excel İndir ({pagination.groupTotalCount} Kayıt)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Yeni Kayıt Ekle (Yalnızca MTCHARITA) */}
              {permissions.canCreate && (
                <button
                  type="button"
                  onClick={() =>
                    setRecordModal({ isOpen: true, mode: "create", record: null })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Kayıt Ekle</span>
                </button>
              )}
            </div>
          </div>

          {/* Alt Filtre Satırı */}
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
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
              >
                <option value="ALL">Tüm Hizmet Birimleri ({filterOptions.hizmetBirimleri.length})</option>
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
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
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
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
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
                  className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
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
                  className="w-1/2 px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-800" />
                <span>Tablo Sütun Görünümü</span>
              </label>
              <select
                value={columnView}
                onChange={(e) => setColumnView(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-blue-50/60 border border-blue-200 rounded-lg text-blue-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-800"
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
        </div>

        {/* Veri Tablosu Alanı */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          {fetchError ? (
            <div className="p-12 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-900">{fetchError}</div>
              <button
                type="button"
                onClick={fetchGroupData}
                className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold cursor-pointer"
              >
                Tekrar Dene
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-2.5 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-blue-800" />
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
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold cursor-pointer"
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
                  <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
                    <tr>
                      <th className="py-3 px-2.5 text-center font-semibold border-r border-slate-700 w-12 sticky left-0 z-30 bg-slate-900">
                        #
                      </th>

                      {(permissions.canEdit || permissions.canDelete) && (
                        <th className="py-3 px-3 text-center font-semibold border-r border-slate-700 w-24 sticky left-12 z-30 bg-slate-900">
                          İşlem
                        </th>
                      )}

                      {visibleColumns.map((col) => {
                        const isSorted = sortBy === col.key;
                        return (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="py-2.5 px-3 text-left font-semibold border-r border-slate-800 whitespace-nowrap select-none hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div>
                                <span className="text-[10px] font-mono text-blue-300 mr-1">
                                  [{col.excelCol}]
                                </span>
                                <span>{col.shortLabel || col.label}</span>
                              </div>
                              {isSorted ? (
                                sortOrder === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-500 shrink-0 opacity-60" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {records.map((rec, idx) => {
                      const rowNum = (pagination.page - 1) * pagination.pageSize + idx + 1;
                      const isModified = Boolean(rec.isUserModified);

                      return (
                        <tr
                          key={String(rec.id)}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            isModified ? "bg-amber-50/25" : idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                          }`}
                        >
                          <td className="py-2 px-2.5 text-center font-mono text-[11px] text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-inherit">
                            {rowNum}
                          </td>

                          {(permissions.canEdit || permissions.canDelete) && (
                            <td className="py-1.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap sticky left-12 z-10 bg-inherit">
                              <div className="inline-flex items-center gap-1">
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
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                                    title="Kaydı Düzenle"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Düzenle</span>
                                  </button>
                                )}
                                {permissions.canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(rec)}
                                    className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
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
                            return (
                              <td
                                key={col.key}
                                className={`py-2 px-3 border-r border-slate-100 whitespace-nowrap ${
                                  isNumeric
                                    ? "text-right font-mono text-slate-800"
                                    : isKeyCol
                                    ? "font-semibold text-slate-900"
                                    : "text-slate-700"
                                }`}
                              >
                                {formatCellValue(col, rec[col.key])}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Dip Toplam Satırı (Filtrelenen veri kümesinin tamamı üzerinden) */}
                  <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 shadow-xs">
                    <tr>
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-300 sticky left-0 bg-slate-100">
                        Σ
                      </td>
                      {(permissions.canEdit || permissions.canDelete) && (
                        <td className="py-2.5 px-2.5 text-center border-r border-slate-300 sticky left-12 bg-slate-100 text-[11px] text-slate-600">
                          TOPLAM
                        </td>
                      )}
                      {visibleColumns.map((col) => {
                        if (col.key === "mahalleKoy") {
                          return (
                            <td
                              key={col.key}
                              className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-800"
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
                              className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-blue-950"
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
                        return <td key={col.key} className="py-2.5 px-3 border-r border-slate-200" />;
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Sayfalama (Pagination) Çubuğu */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span>
                    Toplam <strong>{pagination.filteredCount}</strong> kayıttan{" "}
                    <strong>{(pagination.page - 1) * pagination.pageSize + 1}</strong> -{" "}
                    <strong>
                      {Math.min(pagination.page * pagination.pageSize, pagination.filteredCount)}
                    </strong>{" "}
                    arası gösteriliyor
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Sayfa boyutu:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                    >
                      {[25, 50, 100, 250].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Önceki</span>
                  </button>
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800">
                    Sayfa {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 cursor-pointer"
                  >
                    <span>Sonraki</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Kayıt Ekleme / Düzenleme Yan Paneli */}
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
