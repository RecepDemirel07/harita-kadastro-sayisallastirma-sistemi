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
  Building2,
  Info,
} from "lucide-react";

/**
 * Sol üst köşe özel çift parsel poligonu vektörel amblemi (Görsel 1 ile birebir)
 */
function ParcelBrandLogo() {
  return (
    <svg
      viewBox="0 0 64 52"
      className="w-12 h-10 sm:w-14 sm:h-11 shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoParcelFill1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="logoParcelFill2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      {/* Sol Parsel Poligonu */}
      <polygon
        points="6,32 18,8 36,10 30,40"
        fill="url(#logoParcelFill1)"
        stroke="#3b82f6"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Sağ Alt Komşu Parsel Poligonu */}
      <polygon
        points="33,20 56,24 50,46 30,40"
        fill="url(#logoParcelFill2)"
        stroke="#60a5fa"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Poligon Köşe Noktaları (Nirengi / Poligon Düğümleri) */}
      {[
        [6, 32],
        [18, 8],
        [36, 10],
        [30, 40],
        [33, 20],
        [56, 24],
        [50, 46],
      ].map(([cx, cy], idx) => (
        <g key={idx}>
          <circle cx={cx} cy={cy} r="3.2" fill="#3b82f6" fillOpacity="0.35" />
          <circle cx={cx} cy={cy} r="1.7" fill="#e0f2fe" />
        </g>
      ))}
    </svg>
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#040d21] text-white overflow-hidden select-none">
      {/* Arka Plan 3B Şehir ve Parsel Harita Görseli */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/images/login-aerial-bg.jpg')" }}
        aria-hidden="true"
      />

      {/* Okunabilirlik İçin Yumuşak Lacivert Katman Gradyanları */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#040d21]/90 via-[#040d21]/35 to-[#040d21]/75 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#040d21]/65 via-transparent to-[#040d21]/65 pointer-events-none"
        aria-hidden="true"
      />

      {/* Üst Kurumsal Başlık Şeridi */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-12 pt-7 sm:pt-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-5">
          <ParcelBrandLogo />
          <div className="h-11 w-px bg-blue-400/25 hidden xs:block" />
          <div>
            <h1 className="text-lg sm:text-[22px] font-bold tracking-tight text-white leading-[1.18]">
              Harita ve Kadastro
              <span className="block">Sayısallaştırma Sistemi</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-blue-200/70 mt-1 font-normal">
              Pafta, Parsel ve Harita Veri Yönetim Platformu
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase text-blue-200/80">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span>KURUMSAL ERİŞİM</span>
        </div>
      </header>

      {/* Orta Ana İçerik: Sol Slogan + Sağ Beyaz Giriş Kartı */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-12 py-8 flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-16">
        {/* Sol Slogan Alanı */}
        <div className="max-w-2xl pt-2 lg:pt-0 lg:self-start lg:mt-14 select-text">
          <h2 className="text-4xl sm:text-5xl xl:text-[62px] font-extrabold tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            Her parselde netlik.
            <span className="block mt-1">
              Her adımda <span className="text-[#38bdf8]">kontrol.</span>
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-xl text-blue-100/85 font-normal tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Pafta, parsel ve proje verileriniz ortak bir çalışma alanında.
          </p>
        </div>

        {/* Sağ Yüzen Kurumsal Giriş Kartı */}
        <div className="w-full max-w-[430px] lg:mr-4 self-center lg:self-auto select-text">
          <div className="rounded-[28px] bg-white/95 backdrop-blur-xl text-slate-900 p-7 sm:p-10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.75)] border border-white/80">
            {viewMode === "login" ? (
              <>
                {/* Mavi Kilit İkonu Kutusu */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg shadow-blue-600/30 flex items-center justify-center text-white">
                  <Lock className="w-6 h-6 stroke-[2.2]" />
                </div>

                <h3 className="mt-6 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                  Kurumsal giriş
                </h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  Çalışma alanınıza güvenle bağlanın.
                </p>

                {isExpired && !error && (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
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
                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Giriş Başarısız</span>
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  <div>
                    <label
                      htmlFor="identifier"
                      className="block text-xs font-bold text-slate-800 mb-2"
                    >
                      Kullanıcı adı veya e-posta
                    </label>
                    <div className="relative group">
                      <User className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="identifier"
                        name="identifier"
                        type="text"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="kullanici_adi veya ad@kurum.gov.tr"
                        className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="password"
                        className="block text-xs font-bold text-slate-800"
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
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Şifremi unuttum?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••••"
                        className="w-full pl-11 pr-11 py-3 text-sm bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-[#1e3a8a] text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Doğrulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <span>Giriş yap</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Alt Destek Bilgisi */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Hesap desteği için yöneticinizle iletişime geçin.</span>
                </div>
              </>
            ) : (
              /* ŞİFREMİ UNUTTUM GÖRÜNÜMÜ */
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("login");
                    setResetError(null);
                    setResetSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Giriş Ekranına Dön</span>
                </button>

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600" />
                    <span>Şifre Sıfırlama Talebi</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Kurumsal güvenlik politikası gereği şifre sıfırlama işlemleri{" "}
                    <strong>MTCHARİTA Sistem Yöneticisi</strong> onayıyla gerçekleştirilir.
                  </p>
                </div>

                {resetError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{resetError}</div>
                  </div>
                )}

                {resetSuccessMsg ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-950 space-y-1">
                        <span className="font-bold block text-sm">Talebiniz Kaydedildi</span>
                        <p>{resetSuccessMsg}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode("login")}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Giriş Ekranına Dön
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5" noValidate>
                    <div>
                      <label
                        htmlFor="resetIdentifier"
                        className="block text-xs font-bold text-slate-800 mb-1.5"
                      >
                        Kullanıcı Adınız veya Kurumsal E-posta Adresiniz
                      </label>
                      <input
                        id="resetIdentifier"
                        type="text"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="Örn: nilproje veya kullanici@tkgm.gov.tr"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="resetNote"
                        className="block text-xs font-bold text-slate-800 mb-1.5"
                      >
                        Yöneticiye İletilecek Not / İletişim Bilgisi (İsteğe Bağlı)
                      </label>
                      <textarea
                        id="resetNote"
                        rows={2}
                        value={resetNote}
                        onChange={(e) => setResetNote(e.target.value)}
                        placeholder="Örn: Dahili tel: 1245 — Yeni geçici şifremi bekliyorum."
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full py-3 px-4 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isResetLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Talep İletiliyor...</span>
                        </>
                      ) : (
                        <span>Yöneticiye Sıfırlama Talebi Gönder</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sol Alt Kurumsal Rol / Hızlı Erişim Şeridi (Görsel 1 ile birebir konumda) */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-12 pb-6 sm:pb-8 flex items-center justify-between text-xs font-semibold tracking-[0.14em] text-blue-100/75">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => fillDemoAccount("mtcharita", "Mtc2026!")}
            title="MTCHARİTA demo hesabını doldur"
            className="hover:text-white transition-colors cursor-pointer"
          >
            MTCHARİTA
          </button>
          <span className="text-blue-300/35">|</span>
          <button
            type="button"
            onClick={() => fillDemoAccount("nilproje", "Nil2026!")}
            title="NİL PROJE demo hesabını doldur"
            className="hover:text-white transition-colors cursor-pointer"
          >
            NİL PROJE
          </button>
          <span className="text-blue-300/35">|</span>
          <button
            type="button"
            onClick={() => fillDemoAccount("tkgm", "Tkgm2026!")}
            title="TKGM demo hesabını doldur"
            className="hover:text-white transition-colors cursor-pointer"
          >
            TKGM
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#040d21] text-white text-sm">
          Yükleniyor...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
