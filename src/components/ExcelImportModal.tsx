"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
} from "lucide-react";
import { GROUP_CODES, GroupCode } from "@/lib/columns";
import { ImportMode, ImportExecutionResult } from "@/lib/excel";

interface ExcelImportModalProps {
  isOpen: boolean;
  defaultGroup: GroupCode;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ExcelImportModal({
  isOpen,
  defaultGroup,
  onClose,
  onImportComplete,
}: ExcelImportModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupCode>(defaultGroup);
  const [sourceType, setSourceType] = useState<"upload" | "seed">("upload");
  const [mode, setMode] = useState<ImportMode>("SKIP_EXISTING");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);

  if (!isOpen) return null;

  const handleRunImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setResult(null);

    if (sourceType === "upload" && !selectedFile) {
      setError("Lütfen bilgisayardan yüklenecek bir .xlsx dosyası seçin.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res: Response;
      if (sourceType === "upload" && selectedFile) {
        const fd = new FormData();
        fd.append("groupCode", selectedGroup);
        fd.append("mode", mode);
        fd.append("file", selectedFile);
        res = await fetch("/api/excel/import", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/excel/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupCode: selectedGroup, mode }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "İçe aktarma sırasında hata oluştu.");
        if (data.result) setResult(data.result);
        setIsSubmitting(false);
        return;
      }

      setResult(data.result);
      setIsSubmitting(false);
      onImportComplete();
    } catch {
      setError("Sunucu ile bağlantı kurulamadı.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <div>
              <h2 id="import-modal-title" className="text-base font-semibold">
                Excel Veri İçe Aktarma Yönetimi
              </h2>
              <p className="text-xs text-slate-300">
                Yönetici (MTCHARİTA) kontrollü ve atomik Excel içe aktarma aracı
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRunImport} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Hedef Grup Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1. Hedef Veri Grubu Seçin
            </label>
            <div className="grid grid-cols-4 gap-2">
              {GROUP_CODES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGroup(g)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    selectedGroup === g
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Kaynak Türü */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              2. Veri Kaynağı
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSourceType("upload")}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 cursor-pointer ${
                  sourceType === "upload"
                    ? "border-blue-800 bg-blue-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Upload className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Bilgisayardan .xlsx Dosyası Yükle
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Yeni bir Excel dosyasını doğrula ve seçili gruba aktar
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("seed")}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 cursor-pointer ${
                  sourceType === "seed"
                    ? "border-blue-800 bg-blue-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Database className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Sunucu Başlangıç Dosyasından ({selectedGroup}.xlsx)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    data/seed-excels/{selectedGroup}.xlsx dosyasını yeniden işle
                  </span>
                </div>
              </button>
            </div>
          </div>

          {sourceType === "upload" && (
            <div>
              <label
                htmlFor="excel-file-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Excel Dosyası (.xlsx, Maks. 10 MB)
              </label>
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-white hover:file:bg-blue-800 border border-slate-300 rounded-lg p-1.5"
              />
            </div>
          )}

          {/* Tekrar İçe Aktarma / Çakışma Davranışı */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              3. Mevcut Kayıtlar ve Kullanıcı Değişiklikleri İçin Davranış
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === "SKIP_EXISTING"}
                  onChange={() => setMode("SKIP_EXISTING")}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Mevcut Kayıtları Koru — Yalnızca Yeni Kayıtları Ekle (Önerilen)
                  </span>
                  <span className="text-slate-500">
                    Veritabanında zaten bulunan mahalle/köy kayıtlarına dokunulmaz, mükerrer kayıt üretilmez.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === "UPDATE_UNMODIFIED"}
                  onChange={() => setMode("UPDATE_UNMODIFIED")}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Kullanıcı Değişikliklerini Koru — Yalnızca Değiştirilmemiş Kayıtları Güncelle
                  </span>
                  <span className="text-slate-500">
                    Web arayüzünden düzenlenmiş kayıtlara dokunulmaz; yalnızca hiç düzenlenmemiş kayıtlar güncellenir.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 hover:bg-amber-50 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === "OVERWRITE_ALL"}
                  onChange={() => setMode("OVERWRITE_ALL")}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-amber-950 block">
                    Tüm Eşleşen Kayıtları Excel Dosyasındaki Değerlerle Ez (Dikkat)
                  </span>
                  <span className="text-amber-800">
                    Kullanıcıların yaptığı değişiklikler dahil eşleşen tüm mahalle/köy satırları Excel verisiyle güncellenir.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Aktarım Raporu: {result.fileName} (Sayfa: {result.sheetName})
                </span>
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                  {result.groupCode}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Yeni Eklenen</span>
                  <span className="text-base font-bold text-emerald-700">
                    {result.insertedCount}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Güncellenen</span>
                  <span className="text-base font-bold text-blue-800">
                    {result.updatedCount}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Korunan / Atlanan</span>
                  <span className="text-base font-bold text-slate-700">
                    {result.skippedCount}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Dip Toplam (Atlandı)</span>
                  <span className="text-base font-bold text-slate-600">
                    {result.skippedSummaryRows}
                  </span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-2">
                  <span className="font-semibold text-red-700 block mb-1">
                    Doğrulama Hataları ({result.errors.length}):
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-red-200 rounded bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-red-50 text-red-900">
                        <tr>
                          <th className="p-1.5">Sayfa</th>
                          <th className="p-1.5">Satır</th>
                          <th className="p-1.5">Sütun / Alan</th>
                          <th className="p-1.5">Hata Açıklaması</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {result.errors.map((errItem, i) => (
                          <tr key={i}>
                            <td className="p-1.5 font-mono">{errItem.sheetName}</td>
                            <td className="p-1.5 font-mono">{errItem.rowNumber}</td>
                            <td className="p-1.5">
                              [{errItem.column}] {errItem.fieldLabel}
                            </td>
                            <td className="p-1.5 text-red-700">{errItem.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aktarılıyor...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>İçe Aktarmayı Başlat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
