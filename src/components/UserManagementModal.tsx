"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  BellRing,
} from "lucide-react";

interface UserItem {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  role: { id: number; code: string; name: string };
}

interface RoleItem {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface ResetRequestItem {
  id: number;
  recordId: number | null;
  userName: string;
  userRole: string;
  recordLabel: string | null;
  changesJson: string;
  createdAt: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("NIL_PROJE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Şifre Yenileme Alanı
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = () => {
    setIsLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setRoles(d.roles || []);
        setResetRequests(d.resetRequests || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setResetTargetUser(null);
      setNewPassword("");
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, fullName, password, roleCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kullanıcı oluşturulamadı.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message || "Kullanıcı başarıyla eklendi.");
      setUsername("");
      setEmail("");
      setFullName("");
      setPassword("");
      setIsSubmitting(false);
      fetchUsers();
    } catch {
      setError("Sunucu hatası oluştu.");
      setIsSubmitting(false);
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setError(null);
    setSuccessMsg(null);
    setIsResetting(true);

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetTargetUser.id,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Şifre sıfırlanamadı.");
        setIsResetting(false);
        return;
      }

      setSuccessMsg(data.message || "Kullanıcı şifresi başarıyla yenilendi.");
      setResetTargetUser(null);
      setNewPassword("");
      setIsResetting(false);
      fetchUsers();
    } catch {
      setError("Sunucu hatası oluştu.");
      setIsResetting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="users-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <h2 id="users-modal-title" className="text-base font-semibold">
                Kurumsal Kullanıcı, Rol ve Şifre Yönetimi
              </h2>
              <p className="text-xs text-slate-300">
                Kullanıcı hesapları tanımlama ve unutulan kullanıcı şifrelerini yenileme paneli
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Durum Bildirimleri */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Bekleyen Şifre Sıfırlama Talepleri Varsa Göster */}
          {resetRequests.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <BellRing className="w-4 h-4 text-amber-700" />
                <span>Bekleyen Şifre Sıfırlama Talepleri ({resetRequests.length})</span>
              </div>
              <div className="space-y-2">
                {resetRequests.map((reqItem) => {
                  const matchedUser = users.find((u) => u.id === reqItem.recordId);
                  return (
                    <div
                      key={reqItem.id}
                      className="p-2.5 rounded-lg bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {reqItem.userName} ({reqItem.userRole})
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {reqItem.recordLabel} •{" "}
                          {new Date(reqItem.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {matchedUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUser(matchedUser);
                            setNewPassword("");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Şifreyi Şimdi Yenile</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seçili Kullanıcı İçin Şifre Yenileme Kutusu */}
          {resetTargetUser && (
            <form
              onSubmit={handleResetUserPassword}
              className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                  <KeyRound className="w-4 h-4 text-blue-800" />
                  <span>
                    Şifre Yenile: {resetTargetUser.fullName} ({resetTargetUser.username})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifreyi girin (En az 6 karakter)"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isResetting ? "Güncelleniyor..." : "Yeni Şifreyi Kaydet"}
                </button>
              </div>
            </form>
          )}

          {/* Yeni Kullanıcı Ekleme Formu */}
          <form
            onSubmit={handleCreateUser}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <UserPlus className="w-4 h-4 text-blue-800" />
              <span>Role Bağlı Yeni Kullanıcı Hesabı Tanımla</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Örn: ayilmaz"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  E-posta *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ayilmaz@kurum.gov.tr"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kurum Rolü *
                </label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                  {roles.length === 0 && (
                    <>
                      <option value="NIL_PROJE">NİL PROJE</option>
                      <option value="MTCHARITA">MTCHARİTA</option>
                      <option value="TKGM">TKGM</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Başlangıç Şifresi (En az 6 kr.) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? "Oluşturuluyor..." : "Kullanıcı Hesabı Ekle"}
                </button>
              </div>
            </div>
          </form>

          {/* Mevcut Kullanıcılar Tablosu */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-600" />
              <span>Kayıtlı Kullanıcı Hesapları ({users.length})</span>
            </h3>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2.5">Ad Soyad</th>
                      <th className="p-2.5">Kullanıcı Adı</th>
                      <th className="p-2.5">E-posta</th>
                      <th className="p-2.5">Atanan Kurum Rolü</th>
                      <th className="p-2.5 text-right">Şifre İşlemi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="p-2.5 font-mono text-slate-700">{u.username}</td>
                        <td className="p-2.5 text-slate-600">{u.email}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-semibold text-[11px]">
                            {u.role.name}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPassword("");
                              setError(null);
                              setSuccessMsg(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Şifre Yenile</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
