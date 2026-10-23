"use client";

import React, { useState } from "react";
import { PieChart, ChevronDown, ChevronUp, Sliders, RotateCcw } from "lucide-react";
import { GroupCode } from "@/lib/columns";

interface GroupAnalyticsPanelProps {
  groupCode: GroupCode;
  aggregates: Record<string, number | null>;
  hasActiveFilters: boolean;
}

interface SliceData {
  label: string;
  value: number;
  color: string;
  darkColor: string;
}

/**
 * 3B görünümlü SVG Pasta Grafiği (Excel 3D Pie Chart stilinde)
 */
function ExcelStyle3DPieChart({
  title,
  slices,
}: {
  title: string;
  slices: SliceData[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const safeTotal = total > 0 ? total : 1;

  // Elips parametreleri (Excel 3B pasta grafik perspektifi)
  const cx = 190;
  const cy = 115;
  const rx = 125;
  const ry = 68;
  const depth = 18;

  // Başlangıç açısı: üst orta (-90 derece = -PI/2)
  let currentAngle = -Math.PI / 2;

  const computedSlices = slices.map((slice, index) => {
    const val = Math.max(0, slice.value);
    const ratio = val / safeTotal;
    const sweepAngle = ratio * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    currentAngle = endAngle;

    return {
      ...slice,
      index,
      ratio,
      startAngle,
      endAngle,
      midAngle,
      sweepAngle,
    };
  });

  const polarToElliptical = (angle: number, centerX: number, centerY: number) => ({
    x: centerX + rx * Math.cos(angle),
    y: centerY + ry * Math.sin(angle),
  });

  const buildTopSlicePath = (
    startAngle: number,
    endAngle: number,
    sweepAngle: number,
    offsetX = 0,
    offsetY = 0
  ) => {
    if (sweepAngle <= 0.0001) return "";
    // Tam daire (tek dilim %100 ise)
    if (sweepAngle >= Math.PI * 2 - 0.001) {
      const cX = cx + offsetX;
      const cY = cy + offsetY;
      return `M ${cX - rx} ${cY} A ${rx} ${ry} 0 1 1 ${cX + rx} ${cY} A ${rx} ${ry} 0 1 1 ${
        cX - rx
      } ${cY} Z`;
    }

    const cX = cx + offsetX;
    const cY = cy + offsetY;
    const start = polarToElliptical(startAngle, cX, cY);
    const end = polarToElliptical(endAngle, cX, cY);
    const largeArc = sweepAngle > Math.PI ? 1 : 0;

    return [
      `M ${cX} ${cY}`,
      `L ${start.x} ${start.y}`,
      `A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  };

  /**
   * 3B ön yan duvar (yalnızca alt yarıda, yani 0 .. PI açıları arasında kalan görünür yay için)
   */
  const build3DSideWallPaths = (
    startAngle: number,
    endAngle: number,
    sweepAngle: number,
    offsetX = 0,
    offsetY = 0
  ) => {
    if (sweepAngle <= 0.0001) return [];
    const cX = cx + offsetX;
    const cY = cy + offsetY;

    // Tam daire ise tüm ön duvarı (0 -> PI) çiz
    if (sweepAngle >= Math.PI * 2 - 0.001) {
      const leftX = cX - rx;
      const rightX = cX + rx;
      return [
        [
          `M ${rightX} ${cY}`,
          `A ${rx} ${ry} 0 0 1 ${leftX} ${cY}`,
          `L ${leftX} ${cY + depth}`,
          `A ${rx} ${ry} 0 0 0 ${rightX} ${cY + depth}`,
          "Z",
        ].join(" "),
      ];
    }

    // Açıyı [-PI/2, 3*PI/2] aralığında normalize ederek [0, PI] (ön görünür yay) ile kesişimini bul
    const segments: [number, number][] = [];
    for (const shift of [0, Math.PI * 2]) {
      const s = Math.max(0, startAngle + shift);
      const e = Math.min(Math.PI, endAngle + shift);
      if (e > s + 0.001) {
        segments.push([s, e]);
      }
    }

    return segments.map(([s, e]) => {
      const p1 = polarToElliptical(s, cX, cY);
      const p2 = polarToElliptical(e, cX, cY);
      const largeArc = e - s > Math.PI ? 1 : 0;
      return [
        `M ${p1.x} ${p1.y}`,
        `A ${rx} ${ry} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
        `L ${p2.x} ${p2.y + depth}`,
        `A ${rx} ${ry} 0 ${largeArc} 0 ${p1.x} ${p1.y + depth}`,
        "Z",
      ].join(" ");
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-300 p-4 flex flex-col items-center justify-between shadow-2xs">
      {/* Grafik Başlığı */}
      <h4 className="text-base font-semibold text-slate-700 tracking-wide mb-1">
        {title.replace("-", " ")}
      </h4>

      {/* 3B SVG Pasta Grafiği */}
      <div className="relative w-full max-w-[380px] flex items-center justify-center">
        <svg
          viewBox="0 0 380 235"
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={`${title} İhale Tamamlanma Pasta Grafiği`}
        >
          {/* Önce 3B Derinlik (Yan Duvarlar) */}
          {computedSlices.map((s) => {
            const isHovered = hoveredIdx === s.index;
            const offsetX = isHovered && s.sweepAngle < Math.PI * 1.9 ? Math.cos(s.midAngle) * 5 : 0;
            const offsetY = isHovered && s.sweepAngle < Math.PI * 1.9 ? Math.sin(s.midAngle) * 3 : 0;
            const wallPaths = build3DSideWallPaths(
              s.startAngle,
              s.endAngle,
              s.sweepAngle,
              offsetX,
              offsetY
            );
            return wallPaths.map((d, wIdx) => (
              <path
                key={`wall-${s.index}-${wIdx}`}
                d={d}
                fill={s.darkColor}
                stroke="#ffffff"
                strokeWidth="0.6"
              />
            ));
          })}

          {/* Üst Dilim Yüzeyleri */}
          {computedSlices.map((s) => {
            if (s.sweepAngle <= 0.0001) return null;
            const isHovered = hoveredIdx === s.index;
            const offsetX = isHovered && s.sweepAngle < Math.PI * 1.9 ? Math.cos(s.midAngle) * 5 : 0;
            const offsetY = isHovered && s.sweepAngle < Math.PI * 1.9 ? Math.sin(s.midAngle) * 3 : 0;
            const topPath = buildTopSlicePath(
              s.startAngle,
              s.endAngle,
              s.sweepAngle,
              offsetX,
              offsetY
            );
            return (
              <path
                key={`top-${s.index}`}
                d={topPath}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth="1.2"
                onMouseEnter={() => setHoveredIdx(s.index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="transition-transform duration-150 cursor-pointer"
              >
                <title>
                  {s.label}: {s.value.toLocaleString("tr-TR")} (%
                  {(s.ratio * 100).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </title>
              </path>
            );
          })}
        </svg>
      </div>

      {/* Alt Lejant (Excel Grafiğindeki Gibi 2 Sütunlu Etiketler) */}
      <div className="w-full pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-600 px-2">
        {slices.map((s, idx) => (
          <div
            key={s.label}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="flex items-center gap-2 cursor-default"
          >
            <span
              className="w-2.5 h-2.5 rounded-[2px] shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-semibold text-slate-700 truncate">{s.label}</span>
            <span className="ml-auto font-mono text-slate-900 font-bold">
              {s.value.toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupAnalyticsPanel({
  groupCode,
  aggregates,
  hasActiveFilters,
}: GroupAnalyticsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Simülasyon / Önizleme durumu (Kullanıcı veritabanını değiştirmeden grafik üzerinde test değerleri deneyebilir)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simKesinKoordinat, setSimKesinKoordinat] = useState<string>("5000");
  const [simIyilestirmeYapilan, setSimIyilestirmeYapilan] = useState<string>("2000");

  // Veritabanından gelen gerçek toplamlar:
  // İHALE PARSEL SAYISI = İyileştirme Dönüşüm Yapılacak Parsel Sayısı (E) + Sayısallaştırma Yapılacak Parsel Sayısı (F)
  const hedefIyilestirme = aggregates.iyilestirmeYapilacakParselSayisi ?? 0;
  const hedefSayisallastirma = aggregates.sayisallastirmaYapilacakParselSayisi ?? 0;
  const ihaleParselSayisi = hedefIyilestirme + hedefSayisallastirma;

  // Grafik ve Özet Tablo Parsel Sayıları:
  // KESİN KOORDİNATLANDIRILAN PARSEL SAYISI = Sayısallaştırma Yapılacak Parsel Sayısı (F)
  // İYİLEŞTİRME YAPILAN PARSEL SAYISI = İyileştirme Dönüşüm Yapılan Parsel Sayısı (S)
  const dbKesinKoordinat = aggregates.sayisallastirmaYapilacakParselSayisi ?? 0;
  const dbIyilestirmeYapilan = aggregates.iyilestirmeYapilanParselSayisi ?? 0;

  const activeKesinKoordinat = isSimulating
    ? Math.max(0, parseInt(simKesinKoordinat || "0", 10) || 0)
    : dbKesinKoordinat;

  const activeIyilestirmeYapilan = isSimulating
    ? Math.max(0, parseInt(simIyilestirmeYapilan || "0", 10) || 0)
    : dbIyilestirmeYapilan;

  const toplamTamamlanan = activeKesinKoordinat + activeIyilestirmeYapilan;

  // İHALE TAMAMLANMA ORANI = (Kesin Koordinatlandırılan + İyileştirme Yapılan) / İhale Parsel Sayısı * 100
  const tamamlanmaOrani =
    ihaleParselSayisi > 0 ? (toplamTamamlanan / ihaleParselSayisi) * 100 : 0;

  const slices: SliceData[] = [
    {
      label: "İHALE PARSEL SAYISI",
      value: ihaleParselSayisi,
      color: "#4472C4", // Excel Kurumsal Mavi
      darkColor: "#2F5597",
    },
    {
      label: "KESİN KOORDİNATLANDIRILAN PARSEL SAYISI",
      value: activeKesinKoordinat,
      color: "#C0504D", // Excel Kiremit Kırmızı
      darkColor: "#8C3836",
    },
    {
      label: "İYİLEŞTİRME YAPILAN PARSEL SAYISI",
      value: activeIyilestirmeYapilan,
      color: "#9BBB59", // Excel Yeşil
      darkColor: "#71893F",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Üst Başlık Çubuğu */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-900" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
            {groupCode.replace("-", " ")} — İhale Parsel ve Tamamlanma Yüzdelik Analizi
          </h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-900">
              Filtrelenen Kayıtlara Göre
            </span>
          )}
          {isSimulating && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300">
              Önizleme / Simülasyon Modu Aktif
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimulating((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isSimulating
                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
            title="Veritabanını değiştirmeden örnek tamamlanma değerleriyle grafiği test edin"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isSimulating ? "Gerçek Veriye Dön" : "Grafik Simülasyonu"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <span>{isCollapsed ? "Grafiği Göster" : "Gizle"}</span>
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Sol Bölüm: Excel Formatında İhale Tamamlanma Tablosu ve İlerleme Çubukları */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 tracking-wide">
                  {groupCode.replace("-", " ")} İHALE ÖZET TABLOSU
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  İhale Hedefi = İyileştirme ({hedefIyilestirme.toLocaleString("tr-TR")}) + Sayısallaştırma (
                  {hedefSayisallastirma.toLocaleString("tr-TR")})
                </span>
              </div>

              <table className="w-full text-xs border-collapse">
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: "#4472C4" }}
                      />
                      <span>İHALE PARSEL SAYISI</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm w-44">
                      {ihaleParselSayisi.toLocaleString("tr-TR")}
                    </td>
                  </tr>

                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: "#C0504D" }}
                      />
                      <div>
                        <span>KESİN KOORDİNATLANDIRILAN PARSEL SAYISI</span>
                        <span className="block text-[10px] font-normal text-slate-500">
                          Tablo Sütunu: [F] Sayısallaştırma Yapılacak Parsel Sayısı
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {isSimulating ? (
                        <input
                          type="number"
                          min={0}
                          value={simKesinKoordinat}
                          onChange={(e) => setSimKesinKoordinat(e.target.value)}
                          className="w-32 px-2 py-1 text-right text-sm font-mono font-bold bg-amber-50 border border-amber-400 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      ) : (
                        activeKesinKoordinat.toLocaleString("tr-TR")
                      )}
                    </td>
                  </tr>

                  <tr className="bg-white hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: "#9BBB59" }}
                      />
                      <div>
                        <span>İYİLEŞTİRME YAPILAN PARSEL SAYISI</span>
                        <span className="block text-[10px] font-normal text-slate-500">
                          Tablo Sütunu: [S] İyileştirme Dönüşüm Yapılan Parsel Sayısı
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {isSimulating ? (
                        <input
                          type="number"
                          min={0}
                          value={simIyilestirmeYapilan}
                          onChange={(e) => setSimIyilestirmeYapilan(e.target.value)}
                          className="w-32 px-2 py-1 text-right text-sm font-mono font-bold bg-amber-50 border border-amber-400 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      ) : (
                        activeIyilestirmeYapilan.toLocaleString("tr-TR")
                      )}
                    </td>
                  </tr>

                  <tr className="bg-blue-50/70 font-bold">
                    <td className="py-3 px-4 text-blue-950 border-r border-slate-200">
                      İHALE TAMAMLANMA ORANI
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base text-blue-900">
                      %{tamamlanmaOrani.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Yüzdelik İlerleme Çubuğu ve Alt Kırılımlar */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Toplam Tamamlanan:{" "}
                  <strong className="text-slate-900 font-mono">
                    {toplamTamamlanan.toLocaleString("tr-TR")}
                  </strong>{" "}
                  / {ihaleParselSayisi.toLocaleString("tr-TR")} Parsel
                </span>
                <span className="font-mono font-bold text-blue-900">
                  %{tamamlanmaOrani.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      ihaleParselSayisi > 0 ? (activeKesinKoordinat / ihaleParselSayisi) * 100 : 0
                    )}%`,
                    backgroundColor: "#C0504D",
                  }}
                  title={`Kesin Koordinatlandırılan: ${activeKesinKoordinat.toLocaleString("tr-TR")}`}
                  className="h-full transition-all duration-300"
                />
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      ihaleParselSayisi > 0
                        ? (activeIyilestirmeYapilan / ihaleParselSayisi) * 100
                        : 0
                    )}%`,
                    backgroundColor: "#9BBB59",
                  }}
                  title={`İyileştirme Yapılan: ${activeIyilestirmeYapilan.toLocaleString("tr-TR")}`}
                  className="h-full transition-all duration-300"
                />
              </div>

              {isSimulating && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-amber-900">
                  <span>
                    Not: Simülasyon kutularındaki değerler yalnızca grafik önizlemesi içindir. Kalıcı değişiklik için tablodaki satırları düzenleyin.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSimKesinKoordinat("5000");
                      setSimIyilestirmeYapilan("2000");
                    }}
                    className="inline-flex items-center gap-1 font-semibold underline ml-2 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Örnek Değere Sıfırla</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sağ Bölüm: Excel Stilinde 3B Pasta Grafik */}
          <div className="lg:col-span-5">
            <ExcelStyle3DPieChart title={groupCode} slices={slices} />
          </div>
        </div>
      )}
    </div>
  );
}
