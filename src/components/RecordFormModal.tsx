"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  KADASTRO_COLUMNS,
  FIELD_CATEGORIES,
  FieldCategory,
  GroupCode,
} from "@/lib/columns";

interface RecordFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  groupCode: GroupCode;
  initialRecord?: Record<string, unknown> | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function RecordFormModal({
  isOpen,
  mode,
  groupCode,
  initialRecord,
  onClose,
  onSuccess,
}: RecordFormModalProps) {
  const [activeCategory, setActiveCategory] = useState<FieldCategory>("konum");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [initialSnapshot, setInitialSnapshot] = useState<Record<string, string>>({});
  const [version, setVersion] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [conflictRecord, setConflictRecord] = useState<Record<string, unknown> | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveCategory("konum");
    setError(null);
    setFieldErrors({});
    setConflictRecord(null);
    setShowUnsavedPrompt(false);

    const nextValues: Record<string, string> = {};
    for (const col of KADASTRO_COLUMNS) {
      const raw = mode === "edit" && initialRecord ? initialRecord[col.key] : "";
      nextValues[col.key] = raw === null || raw === undefined ? "" : String(raw);
    }
    setFormValues(nextValues);
    setInitialSnapshot(nextValues);
    setVersion(
      mode === "edit" && initialRecord && typeof initialRecord.version === "number"
        ? initialRecord.version
        : 1
    );
  }, [isOpen, mode, initialRecord]);

  if (!isOpen) return null;

  const isDirty = KADASTRO_COLUMNS.some(
    (col) => (formValues[col.key] ?? "") !== (initialSnapshot[col.key] ?? "")
  );

  const handleRequestClose = () => {
    if (isSubmitting) return;
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleLoadConflictVersion = () => {
    if (!conflictRecord) return;
    const updatedValues: Record<string, string> = {};
    for (const col of KADASTRO_COLUMNS) {
      const raw = conflictRecord[col.key];
      updatedValues[col.key] = raw === null || raw === undefined ? "" : String(raw);
    }
    setFormValues(updatedValues);
    setInitialSnapshot(updatedValues);
    setVersion(typeof conflictRecord.version === "number" ? conflictRecord.version : version + 1);
    setConflictRecord(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setFieldErrors({});

    // İstemci tarafı zorunlu alan doğrulaması
    const clientFieldErrors: Record<string, string[]> = {};
    for (const col of KADASTRO_COLUMNS) {
      if (col.required && !(formValues[col.key] || "").trim()) {
        clientFieldErrors[col.key] = [`${col.label} alanı zorunludur.`];
      }
    }

    if (Object.keys(clientFieldErrors).length > 0) {
      setFieldErrors(clientFieldErrors);
      setActiveCategory("konum");
      setError("Lütfen zorunlu alanları (Hizmet Birimi, İlçesi, Mahalle/Köy) eksiksiz doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/records"
          : `/api/records/${initialRecord?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload =
        mode === "create"
          ? { ...formValues, groupCode }
          : { ...formValues, version };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409 && data.code === "VERSION_CONFLICT" && data.currentRecord) {
          setConflictRecord(data.currentRecord);
        }
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setError(data.error || "İşlem kaydedilirken bir hata oluştu.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess(
        data.message ||
          (mode === "create" ? "Kayıt başarıyla eklendi." : "Kayıt başarıyla güncellendi.")
      );
    } catch {
      setError("Sunucu bağlantı hatası oluştu. Girdiğiniz bilgiler korundu, tekrar deneyebilirsiniz.");
      setIsSubmitting(false);
    }
  };

  const columnsInCategory = KADASTRO_COLUMNS.filter(
    (col) => col.category === activeCategory
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Üst Başlık */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-700 text-white">
                {groupCode}
              </span>
              <h2 id="record-modal-title" className="text-base font-semibold">
                {mode === "create"
                  ? "Yeni Kadastro Birim Kaydı Ekle"
                  : `Kayıt Düzenle: ${initialRecord?.ilcesi || ""} / ${initialRecord?.mahalleKoy || ""}`}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {mode === "create"
                ? `${groupCode} veri grubuna yeni bir mahalle/köy satırı ekliyorsunuz.`
                : `Kayıt No: #${initialRecord?.id} • Sürüm: v${version}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Paneli kapat"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kaydedilmemiş Değişiklik Uyarısı */}
        {showUnsavedPrompt && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Kaydedilmemiş değişiklikleriniz var.</strong> Paneli kapatırsanız yaptığınız
                düzenlemeler kaybolacaktır.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedPrompt(false)}
                className="px-3 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Düzenlemeye Devam Et
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Değişiklikleri Yok Say ve Kapat
              </button>
            </div>
          </div>
        )}

        {/* Çakışma (Optimistic Lock) Uyarısı */}
        {conflictRecord && (
          <div className="px-6 py-3.5 bg-red-50 border-b border-red-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-red-900 max-w-xl">
              <span className="font-bold block">Sürüm Çakışması Tespit Edildi!</span>
              Bu kayıt siz düzenlerken başka bir kullanıcı tarafından güncellenmiş (Yeni Sürüm: v
              {String(conflictRecord.version)}). Verilerin üzerine sessizce yazılması engellendi.
            </div>
            <button
              type="button"
              onClick={handleLoadConflictVersion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Güncel Verileri Forma Yükle</span>
            </button>
          </div>
        )}

        {/* Hata Mesajı */}
        {error && !conflictRecord && (
          <div
            role="alert"
            className="px-6 py-3 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Kategori Sekmeleri */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0">
          {FIELD_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const hasCategoryError = KADASTRO_COLUMNS.some(
              (c) => c.category === cat.id && fieldErrors[c.key]
            );
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-t border-x transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-900 border-slate-200 -mb-px pb-2.5"
                    : "bg-slate-100/70 text-slate-600 border-transparent hover:bg-slate-200/60 hover:text-slate-900"
                }`}
              >
                <span>{cat.label}</span>
                {hasCategoryError && (
                  <span className="w-2 h-2 rounded-full bg-red-600" title="Bu bölümde hata var" />
                )}
              </button>
            );
          })}
        </div>

        {/* Form Alanları */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                {FIELD_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h3>
              <p className="text-xs text-slate-500">
                {FIELD_CATEGORIES.find((c) => c.id === activeCategory)?.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {columnsInCategory.map((col) => {
                const val = formValues[col.key] ?? "";
                const errList = fieldErrors[col.key];
                const isWide = col.key === "aciklama" || col.key === "mahalleKoy";

                return (
                  <div
                    key={col.key}
                    className={isWide ? "sm:col-span-2" : "col-span-1"}
                  >
                    <label
                      htmlFor={`field-${col.key}`}
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      <span className="text-slate-400 font-mono mr-1">[{col.excelCol}]</span>
                      {col.label}
                      {col.required && <span className="text-red-600 ml-1">*</span>}
                    </label>

                    {col.key === "aciklama" ? (
                      <textarea
                        id={`field-${col.key}`}
                        rows={3}
                        value={val}
                        disabled={isSubmitting}
                        onChange={(e) => handleChange(col.key, e.target.value)}
                        placeholder="Varsa parsel veya birim açıklaması girin..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    ) : (
                      <input
                        id={`field-${col.key}`}
                        type={col.type === "int" || col.type === "float" ? "number" : "text"}
                        step={col.type === "float" ? "0.01" : "1"}
                        min={col.type === "int" || col.type === "float" ? "0" : undefined}
                        value={val}
                        disabled={isSubmitting}
                        onChange={(e) => handleChange(col.key, e.target.value)}
                        placeholder={
                          col.type === "int"
                            ? "0"
                            : col.type === "float"
                            ? "0.00"
                            : col.type === "date_text"
                            ? "Örn: 18.10.2026 veya 2026-10-18"
                            : col.type === "code_text"
                            ? "Örn: T veya 00125 (Baştaki sıfırlar korunur)"
                            : ""
                        }
                        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 ${
                          errList ? "border-red-500 bg-red-50/20" : "border-slate-300"
                        }`}
                      />
                    )}

                    {errList && errList.length > 0 && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errList[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alt Aksiyon Çubuğu */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              {isDirty ? (
                <span className="text-amber-700 font-medium">
                  • Kaydedilmemiş değişiklikler mevcut
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tüm alanlar güncel
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRequestClose}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{mode === "create" ? "Kaydı Oluştur" : "Değişiklikleri Kaydet"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
