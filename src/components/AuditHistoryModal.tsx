"use client";

import React, { useEffect, useState } from "react";
import { X, History, Loader2, ArrowRight } from "lucide-react";
import { GroupCode } from "@/lib/columns";

interface AuditLogEntry {
  id: number;
  userName: string;
  userRole: string;
  action: string;
  groupCode: string;
  recordId: number | null;
  recordLabel: string | null;
  changesJson: string;
  createdAt: string;
}

interface AuditHistoryModalProps {
  isOpen: boolean;
  groupCode?: GroupCode;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, { text: string; cls: string }> = {
  CREATE: { text: "Yeni Kayıt", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  UPDATE: { text: "Düzenleme", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  DELETE: { text: "Silme", cls: "bg-red-100 text-red-800 border-red-200" },
  IMPORT: { text: "Excel İçe Aktarma", cls: "bg-purple-100 text-purple-800 border-purple-200" },
  EXPORT: { text: "Excel İndirme", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  PASSWORD_RESET_REQUEST: {
    text: "Şifre Sıfırlama Talebi",
    cls: "bg-amber-100 text-amber-900 border-amber-200",
  },
  PASSWORD_RESET: {
    text: "Şifre Yenileme",
    cls: "bg-sky-100 text-sky-900 border-sky-200",
  },
};

export default function AuditHistoryModal({
  isOpen,
  groupCode,
  onClose,
}: AuditHistoryModalProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>(groupCode || "ALL");

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const query =
      filterGroup && filterGroup !== "ALL"
        ? `?group=${encodeURIComponent(filterGroup)}&limit=60`
        : "?limit=60";

    fetch(`/api/audit${query}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isOpen, filterGroup]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-blue-400" />
            <div>
              <h2 id="audit-modal-title" className="text-base font-semibold">
                İşlem Geçmişi ve Denetim Kayıtları (Audit Log)
              </h2>
              <p className="text-xs text-slate-300">
                Kullanıcı bazlı oluşturma, güncelleme, silme ve Excel aktarım geçmişi
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

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Grup Filtresi:</span>
            {["ALL", "GRUP-1", "GRUP-2", "GRUP-3", "GRUP-4"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGroup(g)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  filterGroup === g
                    ? "bg-blue-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {g === "ALL" ? "Tümü" : g}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">Son {logs.length} işlem gösteriliyor</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>İşlem geçmişi yükleniyor...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Henüz kayıtlı bir işlem geçmişi bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const badge = ACTION_LABELS[log.action] || {
                  text: log.action,
                  cls: "bg-slate-100 text-slate-800 border-slate-200",
                };
                let parsedChanges: Record<string, unknown> = {};
                try {
                  parsedChanges = JSON.parse(log.changesJson);
                } catch {
                  parsedChanges = {};
                }

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold text-[11px]">
                          {log.groupCode}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {log.recordLabel || (log.recordId ? `Kayıt #${log.recordId}` : "")}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        <strong className="text-slate-800">{log.userName}</strong> ({log.userRole}) •{" "}
                        {new Date(log.createdAt).toLocaleString("tr-TR")}
                      </div>
                    </div>

                    {log.action === "UPDATE" && (
                      <div className="mt-2 bg-slate-50 rounded p-2.5 border border-slate-100 space-y-1">
                        {Object.entries(parsedChanges).map(([fieldKey, val]) => {
                          const item = val as { label?: string; old?: unknown; new?: unknown };
                          return (
                            <div
                              key={fieldKey}
                              className="flex flex-wrap items-center gap-1.5 text-[11px]"
                            >
                              <span className="font-semibold text-slate-700">
                                {item.label || fieldKey}:
                              </span>
                              <span className="line-through text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                {item.old === null || item.old === "" ? "(Boş)" : String(item.old)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {item.new === null || item.new === "" ? "(Boş)" : String(item.new)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
