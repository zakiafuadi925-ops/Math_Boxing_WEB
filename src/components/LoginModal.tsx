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
} from "lucide-react";
import {
  PlayerProfile,
  signInWithGoogle,
  signOutPlayer,
} from "../lib/supabase";
import { audio } from "../utils/audio";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfile | null;
  onUserLogin: (user: PlayerProfile) => void;
  onUserLogout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserLogin,
  onUserLogout,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      audio.playClick();

      // Jalankan OAuth Google (akan mengarahkan halaman ke browser login)
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMessage(err.message || "Gagal masuk dengan Google. Coba lagi.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.3)] text-white overflow-hidden">
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
          /* LOGGED IN VIEW */
          <div className="text-center space-y-5">
            <div className="inline-flex p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-400 shadow-md">
              <ShieldCheck className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-600/50">
                TERVERIFIKASI GOOGLE
              </span>
              <h2 className="font-arcade text-xl sm:text-2xl font-bold text-white mt-2">
                PROFIL PLAYER
              </h2>
            </div>

            {/* Profile Card */}
            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center gap-4 text-left">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name || "User Avatar"}
                  className="w-14 h-14 rounded-full border-2 border-amber-400 object-cover shadow-md shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-amber-400 bg-slate-800 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-amber-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-white truncate">
                  {currentUser.name || "Player"}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {currentUser.email}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-arcade font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {currentUser.high_score || 0} PTS
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-300 text-left space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Check className="w-4 h-4" /> Server Mengenali Akun Anda
              </div>
              <p className="text-slate-400 leading-snug">
                Poin & skin Anda otomatis tersimpan di cloud database sehingga
                dapat diakses di device mana pun!
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
          /* NOT LOGGED IN VIEW */
          <div className="space-y-5 text-center">
            <div className="inline-flex p-3 bg-blue-500/20 border border-blue-400/40 rounded-2xl text-blue-400 shadow-md">
              <LogIn className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h2 className="font-arcade text-xl sm:text-2xl font-bold text-white">
                LOGIN GOOGLE
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Akses profil player resmi agar server mengenali akun Anda
              </p>
            </div>

            {/* Google Login Button */}
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
                {loading ? "Menghubungkan..." : "Masuk dengan Google"}
              </span>
            </button>

            {errorMessage && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Benefits list */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-2 text-xs">
              <span className="text-amber-400 font-bold uppercase tracking-wider block">
                KEUNTUNGAN LOGIN GOOGLE:
              </span>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>Server mengenali nama & foto profil Anda</span>
                </li>
                <li className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Skor & skin otomatis tersimpan permanen</span>
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Tercatat resmi di Leaderboard Online Global</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
