import React, { useState, useEffect, useMemo } from "react";
import {
  Swords,
  Bot,
  Users,
  Volume2,
  VolumeX,
  BookOpen,
  Trophy,
  ShieldAlert,
  Sparkles,
  Lock,
  CheckCircle2,
  Shirt,
  History,
  XCircle,
  MinusCircle,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Activity,
  Crown,
  Medal,
  Globe,
  RefreshCw,
  LogOut,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { GameMode, QuestionCategory, MatchRecord } from "../types";
import { audio } from "../utils/audio";
import { BOXER_SKINS, BoxerSkin } from "../utils/skins";
import { DailyChallengeModal } from "./DailyChallengeModal";
import {
  loadDailyChallengeState,
  DailyChallengeState,
} from "../utils/dailyChallenges";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

interface MainMenuProps {
  onStartGame: (
    mode: GameMode,
    category: QuestionCategory,
    aiDiff?: "easy" | "normal" | "hard",
    roomCode?: string,
  ) => void;
  selectedCategory: QuestionCategory;
  onSelectCategory: (cat: QuestionCategory) => void;
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onAddLifetimePoints?: (points: number) => void;
}

interface LeaderboardEntry {
  id: string;
  rank?: number;
  name: string;
  avatar: string;
  score: number;
  winRate: number;
  badge: string;
  isCurrentUser?: boolean;
  status: "online" | "in_match" | "offline";
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedCategory,
  onSelectCategory,
  selectedSkinId,
  onSelectSkin,
  onAddLifetimePoints,
}) => {
  // Integration Supabase Auth Hook
  const {
    user,
    profile,
    loading: authLoading,
    signOut,
    refreshProfile,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "arena" | "stats" | "leaderboard" | "skins"
  >("arena");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyState, setDailyState] = useState<DailyChallengeState>(() =>
    loadDailyChallengeState(),
  );

  const [dbLeaderboard, setDbLeaderboard] = useState<UserProfile[]>([]);
  const [isRefreshingLeaderboard, setIsRefreshingLeaderboard] = useState(false);

  const [roomInput, setRoomInput] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "normal" | "hard">(
    "normal",
  );
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("mb_sound_enabled");
      if (saved !== null) {
        const enabled = JSON.parse(saved);
        audio.soundEnabled = enabled;
        return enabled;
      }
    } catch (e) {
      console.error("Failed to load sound preference:", e);
    }
    return true;
  });

  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [fullMatchHistory, setFullMatchHistory] = useState<MatchRecord[]>([]);

  // Fetch Leaderboard Asli dari Supabase
  const fetchGlobalLeaderboard = async () => {
    setIsRefreshingLeaderboard(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, total_score, wins, matches_played")
      .order("total_score", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Gagal memuat leaderboard:", error.message);
    } else if (data) {
      setDbLeaderboard(data);
    }
    setIsRefreshingLeaderboard(false);
  };

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [activeTab]);

  useEffect(() => {
    setDailyState(loadDailyChallengeState());
  }, [activeTab, showDailyModal]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mb_match_history");
      if (raw) {
        const parsed: MatchRecord[] = JSON.parse(raw);
        setFullMatchHistory(parsed);
        setMatchHistory(parsed.slice(0, 5));
      }
    } catch (e) {
      console.error("Failed to parse match history:", e);
    }
  }, []);

  const dailyCompletedCount = dailyState.challenges.filter(
    (c) => c.isCompleted,
  ).length;
  const dailyTotalCount = dailyState.challenges.length;
  const hasUnclaimedDaily = dailyState.challenges.some(
    (c) => c.isCompleted && !c.isClaimed,
  );

  // Login via Supabase Google OAuth
  const handleGoogleLogin = async () => {
    audio.playClick();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  // Skor user saat ini dari profil Supabase
  const currentLifetimeScore = profile?.total_score ?? 0;
  const currentUserName =
    profile?.username ?? (user?.user_metadata?.full_name || "Guest Boxer");
  const currentUserAvatar =
    profile?.avatar_url ?? user?.user_metadata?.avatar_url;

  // Format data leaderboard untuk UI
  const computedLeaderboard = useMemo(() => {
    return dbLeaderboard.map((item, idx) => {
      const winRate =
        item.matches_played > 0
          ? Math.round((item.wins / item.matches_played) * 100)
          : 0;
      const badge =
        item.total_score >= 450
          ? "Grandmaster"
          : item.total_score >= 350
            ? "Master"
            : item.total_score >= 250
              ? "Diamond"
              : item.total_score >= 150
                ? "Platinum"
                : item.total_score >= 50
                  ? "Gold"
                  : "Pemula";

      return {
        id: item.id,
        rank: idx + 1,
        name: item.username || "Petinju Anonim",
        avatar: item.avatar_url ? "🥊" : "⭐",
        score: item.total_score,
        winRate,
        badge,
        isCurrentUser: user?.id === item.id,
        status: "online" as const,
      };
    });
  }, [dbLeaderboard, user]);

  const currentUserRank =
    computedLeaderboard.find((e) => e.isCurrentUser)?.rank || "-";

  // Compute Lifetime Statistics & Accuracy Trend
  const statsSummary = useMemo(() => {
    if (!fullMatchHistory || fullMatchHistory.length === 0) {
      return {
        totalGames: 0,
        totalWins: 0,
        winRate: 0,
        avgAccuracy: 0,
        totalScore: 0,
        trendData: [],
        categoryData: [],
        improvementMessage:
          "Belum ada data pertandingan. Selesaikan match pertamamu di Arena!",
      };
    }

    const totalGames = fullMatchHistory.length;
    const totalWins = fullMatchHistory.filter((m) => m.result === "win").length;
    const winRate = Math.round((totalWins / totalGames) * 100);

    const chronological = [...fullMatchHistory].reverse();
    let totalAccSum = 0;

    const trendData = chronological.map((item, index) => {
      const acc =
        item.accuracy !== undefined
          ? item.accuracy
          : item.totalAnswered && item.totalAnswered > 0
            ? Math.round((item.correctCount! / item.totalAnswered!) * 100)
            : item.p1Score > 0
              ? 75
              : 0;

      totalAccSum += acc;
      return {
        matchName: `M${index + 1}`,
        accuracy: acc,
        runningAvg: Math.round(totalAccSum / (index + 1)),
        score: item.p1Score,
        opponent: item.opponentName,
        result:
          item.result === "win"
            ? "Menang"
            : item.result === "draw"
              ? "Seri"
              : "Kalah",
        date: new Date(item.timestamp).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        }),
      };
    });

    const avgAccuracy = Math.round(totalAccSum / totalGames);

    return {
      totalGames,
      totalWins,
      winRate,
      avgAccuracy,
      totalScore: currentLifetimeScore,
      trendData,
      improvementMessage: `⚡ Konsistensi sangat baik! Rata-rata akurasi berada di level ${avgAccuracy}%.`,
    };
  }, [fullMatchHistory, currentLifetimeScore]);

  const toggleSound = () => {
    const nextSound = !soundOn;
    audio.soundEnabled = nextSound;
    setSoundOn(nextSound);
    try {
      localStorage.setItem("mb_sound_enabled", JSON.stringify(nextSound));
    } catch (e) {
      console.error("Failed to save sound preference:", e);
    }
    if (nextSound) audio.playClick();
  };

  const categories: { id: QuestionCategory; label: string; icon: string }[] = [
    { id: "all", label: "SEMUA MATERI", icon: "🌟" },
    { id: "arithmetic", label: "ARITMATIKA (+, -, ×, ÷)", icon: "➕" },
    { id: "counting", label: "COUNTING (Hitung Buah)", icon: "🍎" },
    { id: "algebra", label: "ALJABAR (Nilai X)", icon: "📐" },
    { id: "roots", label: "AKAR PANGKAT (√ & ∛)", icon: "⚡" },
    { id: "physics", label: "FISIKA DASAR (s, v, t)", icon: "🏎️" },
    { id: "geometry", label: "GEOMETRI (Volume & Luas)", icon: "📦" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between mb-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={currentUserName}
              className="w-8 h-8 rounded-full border-2 border-amber-400 object-cover shadow"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-amber-400 flex items-center justify-center font-arcade font-bold text-white text-xs shadow border border-blue-400/50">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-slate-100 truncate max-w-[110px]">
                {currentUserName}
              </span>
              {user ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : null}
            </div>
            <span className="block text-[10px] text-emerald-400 font-medium">
              {user ? "● Supabase Google Active" : "● Guest Mode"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => {
                audio.playClick();
                signOut();
              }}
              className="p-2 bg-slate-800 hover:bg-rose-950/80 text-rose-400 rounded-xl border border-rose-800/50 transition flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <LogIn className="w-3.5 h-3.5" /> LOGIN GOOGLE
            </button>
          )}

          <button
            onClick={() => {
              audio.playClick();
              setShowDailyModal(true);
            }}
            className="relative p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-amber-500/40 text-amber-400 transition flex items-center gap-1.5"
            title="Tantangan Harian"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline text-xs font-bold font-arcade">
              DAILY
            </span>
            {hasUnclaimedDaily ? (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
            ) : dailyCompletedCount < dailyTotalCount ? (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900" />
            ) : null}
          </button>

          <button
            onClick={toggleSound}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-amber-400 transition"
          >
            {soundOn ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-amber-400 transition"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Logo & Title Banner */}
      <div className="text-center my-2 relative">
        <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-2xl -z-10"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 font-semibold text-xs mb-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          SD KIDS EDITION • 60 SECONDS SUDDEN DEATH
        </div>
        <h1 className="font-arcade text-3xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 tracking-wider drop-shadow-[0_4px_12px_rgba(245,158,11,0.4)]">
          MATH BOXING
        </h1>
        <span className="font-arcade text-base sm:text-lg text-slate-300 tracking-widest block mt-0.5">
          ONLINE ARENA
        </span>
      </div>

      {/* Main Navigation Tab Switcher */}
      <div className="flex items-center justify-center gap-1.5 my-3 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full">
        <button
          onClick={() => {
            audio.playClick();
            setActiveTab("arena");
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "arena"
              ? "bg-amber-500 text-slate-950 font-black shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Swords className="w-4 h-4" /> ARENA
        </button>
        <button
          onClick={() => {
            audio.playClick();
            setActiveTab("stats");
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "stats"
              ? "bg-amber-500 text-slate-950 font-black shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> STATISTIK
        </button>
        <button
          onClick={() => {
            audio.playClick();
            setActiveTab("leaderboard");
          }}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "leaderboard"
              ? "bg-amber-500 text-slate-950 font-black shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-950 fill-amber-950/20" />{" "}
          LEADERBOARD
        </button>
        <button
          onClick={() => {
            audio.playClick();
            setActiveTab("skins");
          }}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "skins"
              ? "bg-amber-500 text-slate-950 font-black shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Shirt className="w-4 h-4" /> KOSTUM
        </button>
      </div>

      {/* TAB 1: ARENA BERMAIN */}
      {activeTab === "arena" && (
        <div className="w-full space-y-3">
          {/* Quick Match Online */}
          <button
            onClick={() => {
              audio.playClick();
              onStartGame("quick_match", selectedCategory);
            }}
            className="w-full p-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] border-b-4 border-amber-700 rounded-2xl text-slate-950 flex items-center justify-between shadow-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-950/20 rounded-xl">
                <Swords className="w-7 h-7 text-slate-950 group-hover:scale-110 transition" />
              </div>
              <div className="text-left">
                <span className="font-arcade text-xl font-black block">
                  QUICK MATCH ONLINE
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Cari lawan cepat & adu speed math 1v1!
                </span>
              </div>
            </div>
            <span className="font-arcade text-sm px-3 py-1 bg-slate-950 text-amber-400 rounded-lg">
              PLAY
            </span>
          </button>

          {/* Practice vs AI */}
          <div className="w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Bot className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <span className="font-arcade text-lg text-slate-100 block">
                    LATIHAN VS AI BOT
                  </span>
                  <span className="text-xs text-slate-400">
                    Asah refleks hitung tanpa koneksi lawan
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  onStartGame("practice", selectedCategory, aiDifficulty);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-arcade rounded-xl text-sm transition"
              >
                START
              </button>
            </div>

            {/* AI Difficulty Pills */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400">
                Kesulitan Bot:
              </span>
              {(["easy", "normal", "hard"] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                    aiDifficulty === diff
                      ? "bg-blue-500 text-slate-950 font-black"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Private Room */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // Safely play audio tanpa memblokir execution utama
              try {
                audio.playClick();
              } catch (err) {
                console.warn("Audio error:", err);
              }

              setShowPrivateModal(true);
            }}
            className="w-full p-4 bg-slate-900 border-2 border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition shadow-xl cursor-pointer relative z-10 active:scale-98"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <span className="font-arcade text-lg text-slate-100 block">
                  PRIVATE ROOM
                </span>
                <span className="text-xs text-slate-400">
                  Main bareng teman via Kode Kamar
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800 pointer-events-none">
              CODE ROOM
            </span>
          </button>

          {/* Question Category Filter Picker */}
          <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 my-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              PILIH KATEGORI SOAL MATEMATIKA:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    audio.playClick();
                    onSelectCategory(cat.id);
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition flex flex-col gap-1 ${
                    selectedCategory === cat.id
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATISTIK */}
      {activeTab === "stats" && (
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                AKURASI
              </span>
              <span className="font-arcade text-2xl text-emerald-400 block mt-1">
                {statsSummary.avgAccuracy}%
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                MATCHES
              </span>
              <span className="font-arcade text-2xl text-amber-400 block mt-1">
                {statsSummary.totalGames}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                WIN RATE
              </span>
              <span className="font-arcade text-2xl text-blue-400 block mt-1">
                {statsSummary.winRate}%
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL SKOR
              </span>
              <span className="font-arcade text-2xl text-purple-400 block mt-1">
                {currentLifetimeScore}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD REALTIME */}
      {activeTab === "leaderboard" && (
        <div className="w-full space-y-3">
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  KLASEMEN GLOBAL SUPABASE
                </h3>
              </div>
              <button
                onClick={fetchGlobalLeaderboard}
                disabled={isRefreshingLeaderboard}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg text-[11px] font-bold text-amber-400 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshingLeaderboard ? "animate-spin text-amber-300" : ""}`}
                />
                {isRefreshingLeaderboard ? "Syncing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 shadow-xl max-h-80 overflow-y-auto">
            {computedLeaderboard.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border mb-1.5 transition ${
                  entry.isCurrentUser
                    ? "bg-amber-500/10 border-amber-400/80 shadow-md"
                    : "bg-slate-950/60 border-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-arcade font-bold text-xs text-amber-400">
                    #{entry.rank}
                  </span>
                  <div>
                    <span className="font-bold text-xs text-slate-200 block">
                      {entry.name} {entry.isCurrentUser && "(YOU)"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {entry.badge}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-arcade text-sm font-bold text-amber-400 block">
                    {entry.score}
                  </span>
                  <span className="text-[9px] text-slate-500 block">PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SKINS */}
      {activeTab === "skins" && (
        <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BOXER_SKINS.map((skin: BoxerSkin) => {
              const isUnlocked = currentLifetimeScore >= skin.minLifetimeScore;
              const isSelected = selectedSkinId === skin.id;

              return (
                <button
                  key={skin.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      audio.playClick();
                      onSelectSkin(skin.id);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400"
                      : isUnlocked
                        ? "bg-slate-950 border-slate-800"
                        : "bg-slate-950/50 border-slate-900 opacity-60"
                  }`}
                >
                  <span className="text-xl">{skin.icon}</span>
                  <span className="font-arcade text-xs font-bold text-slate-100 block mt-2">
                    {skin.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Challenge Modal */}
      <DailyChallengeModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onStartChallenge={() => setActiveTab("arena")}
        onAddLifetimePoints={(pts) =>
          onAddLifetimePoints && onAddLifetimePoints(pts)
        }
      />
    </div>
  );
};
