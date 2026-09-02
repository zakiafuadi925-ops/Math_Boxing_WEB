import React, { useState } from "react";
import {
  LogIn,
  LogOut,
  ShieldCheck,
  Trophy,
  Sparkles,
  User,
  X,
  Check,
  Flame,
  Mail,
  Lock,
  UserPlus,
  Copy,
  CheckCircle2,
  Edit2,
  Save,
  Swords,
  Medal,
} from "lucide-react";
import {
  PlayerProfile,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutPlayer,
  updatePlayerProfile,
} from "../lib/supabase";
import { audio } from "../utils/audio";
import { getRankTierByScore } from "../utils/ranks";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfile | null;
  onUserLogin: (user: PlayerProfile) => void;
  onUserLogout: () => void;
}

type AuthMode = "google" | "email_login" | "email_signup";

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserLogin,
  onUserLogout,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Edit profile state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      audio.playClick();
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google login error:", err);
      setErrorMessage(err.message || "Gagal masuk dengan Google. Pastikan popup tidak diblokir.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password minimal 6 karakter.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      audio.playClick();

      if (authMode === "email_signup") {
        const user = await signUpWithEmail(email, password, displayName);
        if (user) {
          onUserLogin(user);
          setSuccessMessage("Pendaftaran berhasil! Akun Anda telah siap.");
        } else {
          setSuccessMessage("Pendaftaran terkirim! Silakan cek email jika verifikasi diaktifkan.");
        }
      } else {
        const user = await signInWithEmail(email, password);
        if (user) {
          onUserLogin(user);
          onClose();
        }
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      setErrorMessage(err.message || "Autentikasi gagal. Periksa kembali email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      audio.playClick();
      await signOutPlayer();
      onUserLogout();
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  const handleSaveProfileName = async () => {
    if (!currentUser || !editNameValue.trim()) return;
    try {
      setLoading(true);
      const cleanName = editNameValue.trim().substring(0, 30);
      await updatePlayerProfile(currentUser.id, { name: cleanName });
      onUserLogin({
        ...currentUser,
        name: cleanName,
        displayName: cleanName,
      });
      setIsEditingName(false);
      audio.playBell();
    } catch (e: any) {
      setErrorMessage(e?.message || "Gagal memperbarui nama.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!currentUser?.id) return;
    navigator.clipboard?.writeText(currentUser.id);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const rankTier = currentUser ? getRankTierByScore(currentUser.total_score || currentUser.high_score || 0) : null;
  const matches = currentUser?.matches_played || 0;
  const wins = currentUser?.wins || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(59,130,246,0.3)] text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            audio.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* ========================================================================= */
          /* LOGGED IN / PLAYER PROFILE VIEW                                           */
          /* ========================================================================= */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-400 shadow-md">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="font-arcade text-xl sm:text-2xl font-bold text-white tracking-wide">
                PROFIL RESMI PETINJU
              </h2>
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/50">
                TERAUTENTIKASI CLOUD
              </span>
            </div>

            {/* Profile Card */}
            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-4">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name || "User Avatar"}
                    className="w-16 h-16 rounded-2xl border-2 border-amber-400 object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl border-2 border-amber-400 bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-8 h-8 text-amber-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        placeholder="Nama petinju baru"
                        maxLength={30}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-amber-400 rounded-lg text-sm text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfileName}
                        disabled={loading}
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white truncate">
                        {currentUser.name || "Petinju"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameValue(currentUser.name || "");
                          setIsEditingName(true);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-400 transition"
                        title="Ubah nama"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 truncate">
                    {currentUser.email || "Akun Terverifikasi"}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] font-arcade font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      {currentUser.total_score || currentUser.high_score || 0} PTS
                    </span>
                    {rankTier && (
                      <span className="text-[11px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5" />
                        {rankTier.shortName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Player UUID Display */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="truncate font-mono text-[11px] text-slate-500">
                  UUID: <span className="text-slate-300">{currentUser.id}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold shrink-0 transition"
                >
                  {copiedUuid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Salin ID
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  MENANG
                </span>
                <span className="text-lg font-arcade font-bold text-emerald-400">
                  {wins}
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  TOTAL MATCH
                </span>
                <span className="text-lg font-arcade font-bold text-sky-400">
                  {matches}
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  WIN RATE
                </span>
                <span className="text-lg font-arcade font-bold text-amber-400">
                  {winRate}%
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/50 rounded-xl text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Check className="w-4 h-4 shrink-0" /> Sinkronisasi 4 Tabel Aktif
              </div>
              <p className="text-slate-400 leading-snug">
                Data profil, riwayat pertarungan, papan peringkat global, dan kamar pertandingan Anda otomatis tersimpan di Cloud Database.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              Keluar Akun
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* AUTHENTICATION TABS & FORMS                                               */
          /* ========================================================================= */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 bg-blue-500/20 border border-blue-400/40 rounded-2xl text-blue-400 shadow-md">
                <LogIn className="w-8 h-8" />
              </div>
              <h2 className="font-arcade text-xl sm:text-2xl font-bold text-white tracking-wide">
                AUTENTIKASI PLAYER
              </h2>
              <p className="text-xs text-slate-400">
                Masuk untuk menyimpan rekor pertandingan dan peringkat ke Cloud Database
              </p>
            </div>

            {/* Auth Navigation Tabs */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("google");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === "google"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Google
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("email_login");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === "email_login"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Masuk Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("email_signup");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === "email_signup"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftar Baru
              </button>
            </div>

            {/* Error / Success feedback */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            {/* Google Login Tab */}
            {authMode === "google" && (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center gap-3 transition active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.25 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.2.0 10.05.0 12s.46 3.8 1.28 5.42l4-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="text-sm font-bold">
                    {loading ? "Menghubungkan..." : "Masuk dengan Google (1-Klik)"}
                  </span>
                </button>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-2 text-xs">
                  <span className="text-amber-400 font-bold uppercase tracking-wider block">
                    KEUNTUNGAN TERAUTENTIKASI:
                  </span>
                  <ul className="space-y-1.5 text-slate-300">
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>Nama & foto profil otomatis tersambung ke 4 tabel database</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Skor, win rate, & skin tersimpan permanen di cloud</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>Tercatat resmi di Leaderboard Online Global</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Email Form (Login & Register) */}
            {(authMode === "email_login" || authMode === "email_signup") && (
              <form onSubmit={handleEmailAuth} className="space-y-3.5 text-left">
                {authMode === "email_signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Petinju (Username)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Contoh: JuaraMatematika"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    "Memproses..."
                  ) : authMode === "email_signup" ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Daftar Akun Petinju
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Masuk dengan Email
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

