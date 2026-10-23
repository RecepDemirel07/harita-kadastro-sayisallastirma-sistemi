"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Clock,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

/**
 * Haritalama, Pafta ve Parsel Poligon Katmanı Görsel Başlığı (Simge yerine özel CBS harita grafiği)
 */
function CadastralMapHeaderGraphic() {
  return (
    <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50/95 to-indigo-100/90 border-b border-blue-200/80 select-none">
      {/* Üst Vurgu Şeridi — Koyu Lacivert Arka Plandan Keskin Ayrım */}
      <div
        className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 z-20"
        aria-hidden="true"
      />

      {/* İnce Pafta Kağıdı Koordinat Ağı Dokusu */}
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #93c5fd 1px, transparent 1px), linear-gradient(to bottom, #93c5fd 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      {/* Yumuşak Harita Işıltısı */}
      <div
        className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-sky-300/30 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Özel Vektörel Kadastro Parsel Poligonları ve Jeodezik Nirengi Ağı (SVG) */}
      <svg
        viewBox="0 0 500 180"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="parcelStrokeLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#2563eb" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="parcelFillPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="parcelFillEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Pafta Kesişim ve Eksen Çizgileri */}
        <line x1="0" y1="42" x2="500" y2="42" stroke="#0284c7" strokeOpacity="0.22" strokeDasharray="4 4" />
        <line x1="0" y1="102" x2="500" y2="102" stroke="#0284c7" strokeOpacity="0.18" strokeDasharray="4 4" />
        <line x1="215" y1="0" x2="215" y2="180" stroke="#0284c7" strokeOpacity="0.18" strokeDasharray="4 4" />
        <line x1="395" y1="0" x2="395" y2="180" stroke="#0284c7" strokeOpacity="0.22" strokeDasharray="4 4" />

        {/* Kadastro Ada / Parsel Poligon Katmanı */}
        <polygon
          points="325,20 422,16 446,66 360,86 308,56"
          fill="url(#parcelFillPrimary)"
          stroke="url(#parcelStrokeLight)"
          strokeWidth="1.75"
        />
        <polygon
          points="360,86 446,66 476,116 382,132"
          fill="url(#parcelFillEmerald)"
          stroke="url(#parcelStrokeLight)"
          strokeWidth="1.6"
        />
        <polygon
          points="238,42 308,56 360,86 288,114 222,86"
          fill="url(#parcelFillPrimary)"
          stroke="url(#parcelStrokeLight)"
          strokeWidth="1.6"
        />
        <polyline
          points="35,98 110,64 178,84 222,86 288,114"
          fill="none"
          stroke="#0284c7"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />

        {/* Poligon Köşe (Poligon Noktası / Nirengi) Düğümleri */}
        {[
          [325, 20],
          [422, 16],
          [446, 66],
          [360, 86],
          [308, 56],
          [382, 132],
          [238, 42],
          [288, 114],
          [110, 64],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#0284c7" fillOpacity="0.2" />
            <circle cx={x} cy={y} r="2.5" fill="#0369a1" stroke="#ffffff" strokeWidth="1" />
          </g>
        ))}

        {/* Parsel Numarası Etiketleri (Açık Pafta Üzerinde Koyu Kontrast) */}
        <text x="364" y="55" fill="#0c4a6e" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.9">
          104/12
        </text>
        <text x="402" y="103" fill="#065f46" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.9">
          104/13
        </text>
        <text x="272" y="83" fill="#1e3a8a" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.85">
          104/8
        </text>
      </svg>

      {/* Alt Başlık Okunabilirlik Geçişi (Açık Tonlu) */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/95 via-white/75 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Üst Harita Ölçek ve Koordinat Şeridi */}
      <div className="relative z-10 px-6 pt-4 flex items-center justify-between text-[10px] font-mono tracking-wider">
        <span className="px-2.5 py-1 rounded-full bg-blue-700 text-white shadow-sm font-semibold">
          CBS • PAFTA & PARSEL SİSTEMİ
        </span>
        <span className="px-2.5 py-0.5 rounded-md bg-white/90 border border-blue-200 text-blue-900 font-semibold shadow-xs">
          1/1000 • 1/5000
        </span>
      </div>

      {/* Alt Başlık Katmanı */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-7 pb-4">
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-snug">
          Harita ve Kadastro Sayısallaştırma Sistemi
        </h1>
        <p className="text-xs font-medium text-slate-600 mt-0.5">
          Pafta, Parsel ve Harita Veri Yönetim Platformu
        </p>
      </div>
    </div>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  const [viewMode, setViewMode] = useState<"login" | "forgot">("login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Şifremi Unuttum Durumu
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetNote, setResetNote] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Lütfen kullanıcı adı/e-posta ve şifre alanlarını doldurun.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.");
        setIsLoading(false);
        return;
      }

      window.location.replace("/");
    } catch {
      setError("Sunucu ile bağlantı kurulamadı. Lütfen ağ bağlantınızı kontrol edin.");
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMsg(null);

    if (!resetIdentifier.trim()) {
      setResetError("Lütfen kullanıcı adınızı veya kurumsal e-posta adresinizi girin.");
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          note: resetNote.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.error || "Talep gönderilemedi.");
        setIsResetLoading(false);
        return;
      }

      setResetSuccessMsg(
        data.message ||
          "Şifre sıfırlama talebiniz sistem yöneticisine (MTCHARİTA) başarıyla iletildi."
      );
      setIsResetLoading(false);
    } catch {
      setResetError("Sunucu ile bağlantı kurulamadı.");
      setIsResetLoading(false);
    }
  };

  const fillDemoAccount = (user: string, pass: string) => {
    setViewMode("login");
    setIdentifier(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-8 overflow-hidden">
      {/* Tam Ekran Harita Arka Plan Görseli */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35 scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/cadastre-hero.jpg')" }}
        aria-hidden="true"
      />
      {/* Modern Radyal ve Doğrusal CBS Katman Gradyanı */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12)_0%,rgba(2,6,23,0.92)_75%)] pointer-events-none"
        aria-hidden="true"
      />
      {/* İnce Harita Koordinat Ağı */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden="true"
      />

      {/* Sayfa Ortasında Tek Parça Modern Giriş Kartı */}
      <div className="relative z-10 w-full max-w-[460px] rounded-3xl bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75)] border border-white/90 ring-4 ring-sky-400/15 overflow-hidden">
        {/* Kart Üstü Özel Harita & Parsel Poligon Başlığı (Simge Kutusu Yok) */}
        <CadastralMapHeaderGraphic />

        {/* Kart Gövdesi */}
        <div className="p-6 sm:p-8">
          {viewMode === "login" ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Kurumsal Oturum Açma
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Yetkili kurum hesabınızla veri gruplarına bağlanın
                  </p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" title="Sistem Aktif" />
              </div>

              {isExpired && !error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900"
                >
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Oturum Süreniz Doldu</span>
                    Güvenliğiniz için oturumunuz sonlandırıldı. Devam etmek için tekrar giriş yapın.
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-900"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Giriş Başarısız</span>
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kullanıcı Adı veya Kurumsal E-posta
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-slate-400 group-focus-within:text-blue-700 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      disabled={isLoading}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="kullanici_adi veya ad@kurum.gov.tr"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("forgot");
                        setResetIdentifier(identifier);
                        setResetError(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-700 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 hover:from-blue-950 hover:to-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-950/15 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Harita Portalı Açılıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Sisteme Giriş Yap</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Kompakt Hızlı Rol Seçici (Tek Tıkla Test) */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">
                    Hızlı Kurum Hesabı Seçimi
                  </span>
                  <span>Tek tıkla doldur</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("mtcharita", "Mtc2026!")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      identifier === "mtcharita"
                        ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <span className="block text-xs font-bold">MTCHARİTA</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Tam Yetki</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount("nilproje", "Nil2026!")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      identifier === "nilproje"
                        ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <span className="block text-xs font-bold">NİL PROJE</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Grup-2 Yetki</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount("tkgm", "Tkgm2026!")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      identifier === "tkgm"
                        ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <span className="block text-xs font-bold">TKGM</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Salt Okunur</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Şifremi Unuttum / Şifre Sıfırlama Talebi Görünümü */
            <div>
              <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Şifre Sıfırlama Talebi</h2>
                    <p className="text-[11px] text-slate-500">
                      Sistem yöneticisine şifre yenileme bildirimi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
              </div>

              {resetError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccessMsg ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block text-sm">Talebiniz Kaydedildi</span>
                      <p>{resetSuccessMsg}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("login")}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Giriş Ekranına Dön
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                    Kullanıcı adınızı veya e-posta adresinizi girerek{" "}
                    <strong>MTCHARİTA Sistem Yöneticisine</strong> anında şifre yenileme bildirimi
                    gönderebilirsiniz.
                  </div>

                  <div>
                    <label
                      htmlFor="reset-identifier"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Kullanıcı Adınız veya Kurumsal E-posta Adresiniz *
                    </label>
                    <input
                      id="reset-identifier"
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Örn: nilproje veya uzman@nilproje.com.tr"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reset-note"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Yöneticiye Not / İletişim Bilgisi (İsteğe Bağlı)
                    </label>
                    <input
                      id="reset-note"
                      type="text"
                      value={resetNote}
                      onChange={(e) => setResetNote(e.target.value)}
                      placeholder="Örn: Dahili tel veya talep açıklaması..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {isResetLoading ? "İletiliyor..." : "Şifre Yenileme Talebi Gönder"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm">
          Harita ve Kadastro Sistemi Yükleniyor...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
