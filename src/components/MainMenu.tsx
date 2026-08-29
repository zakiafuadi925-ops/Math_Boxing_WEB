import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Maximize2,
  Minimize2,
  ChevronRight,
  Flame,
  Award,
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
import { GameMode, QuestionCategory, MatchRecord, GameDuration } from "../types";
import { audio } from "../utils/audio";
import { BOXER_SKINS, BoxerSkin } from "../utils/skins";
import { DailyChallengeModal } from "./DailyChallengeModal";
import {
  loadDailyChallengeState,
  DailyChallengeState,
} from "../utils/dailyChallenges";
import { LoginModal } from "./LoginModal";
import { RankRoadmapModal } from "./RankRoadmapModal";
import {
  getRankProgress,
  getRankTierByScore,
  RANK_TIERS,
  RankTier,
} from "../utils/ranks";
import {
  PlayerProfile,
  LeaderboardEntry,
  fetchGlobalLeaderboard,
} from "../lib/supabase";
import { User, LogIn, ShieldCheck, Timer } from "lucide-react";

interface MainMenuProps {
  onStartGame: (
    mode: GameMode,
    category: QuestionCategory,
    aiDiff?: "easy" | "normal" | "hard",
    roomCode?: string,
    duration?: GameDuration,
  ) => void;
  selectedCategory: QuestionCategory;
  onSelectCategory: (cat: QuestionCategory) => void;
  selectedDuration: GameDuration;
  onSelectDuration: (duration: GameDuration) => void;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  lifetimeScore: number;
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onAddLifetimePoints?: (points: number) => void;
  currentUser: PlayerProfile | null;
  onUserLogin: (user: PlayerProfile) => void;
  onUserLogout: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedCategory,
  onSelectCategory,
  selectedDuration,
  onSelectDuration,
  playerName,
  onUpdatePlayerName,
  lifetimeScore,
  selectedSkinId,
  onSelectSkin,
  onAddLifetimePoints,
  currentUser,
  onUserLogin,
  onUserLogout,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [activeTab, setActiveTab] = useState<
    "arena" | "stats" | "leaderboard" | "skins"
  >("arena");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRankRoadmap, setShowRankRoadmap] = useState(false);
  const [selectedLeaderboardTier, setSelectedLeaderboardTier] = useState<string>("all");

  const rankProgress = useMemo(() => {
    return getRankProgress(lifetimeScore);
  }, [lifetimeScore]);

  const currentTier = rankProgress.currentTier;

  const [dailyState, setDailyState] = useState<DailyChallengeState>(() =>
    loadDailyChallengeState(),
  );

  useEffect(() => {
    setDailyState(loadDailyChallengeState());
  }, [activeTab, showDailyModal]);

  const dailyCompletedCount = dailyState.challenges.filter(
    (c) => c.isCompleted,
  ).length;
  const dailyTotalCount = dailyState.challenges.length;
  const hasUnclaimedDaily = dailyState.challenges.some(
    (c) => c.isCompleted && !c.isClaimed,
  );
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
  const [isRefreshingLeaderboard, setIsRefreshingLeaderboard] = useState(false);
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>([]);
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);

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

  // Fetch / Sync Global Leaderboard
  const loadLeaderboardData = useCallback(async () => {
    setIsRefreshingLeaderboard(true);
    const activeName =
      currentUser?.displayName || currentUser?.name || playerName || "Pemain Kamu";
    const res = await fetchGlobalLeaderboard(activeName, lifetimeScore);
    setLeaderboardList(res.entries);
    setIsLiveDatabase(res.isLiveDb);
    setIsRefreshingLeaderboard(false);
  }, [currentUser, playerName, lifetimeScore]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData, activeTab]);

  const computedLeaderboard = useMemo(() => {
    return leaderboardList;
  }, [leaderboardList]);

  const currentUserRank =
    computedLeaderboard.find((e) => e.isCurrentUser)?.rank || "-";

  const handleRefreshLeaderboard = async () => {
    audio.playClick();
    await loadLeaderboardData();
  };

  // Helper untuk merender avatar (Emoji atau URL Foto Profil Google)
  const renderAvatarContent = (
    avatar?: string,
    fallback: string = "🥊",
    imgClass: string = "w-full h-full object-cover rounded-lg",
  ) => {
    const val = avatar?.trim();
    if (
      val &&
      (val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("data:"))
    ) {
      return (
        <img
          src={val}
          alt="Avatar"
          className={imgClass}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    return <span>{val || fallback}</span>;
  };

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
          "Belum ada data pertandingan. Selesaikan match pertamamu di Arena untuk mencatat tren statistik!",
      };
    }

    const totalGames = fullMatchHistory.length;
    const totalWins = fullMatchHistory.filter((m) => m.result === "win").length;
    const winRate = Math.round((totalWins / totalGames) * 100);

    // Chronological order (oldest -> newest) for trend chart
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
      const runningAvg = Math.round(totalAccSum / (index + 1));

      return {
        matchName: `M${index + 1}`,
        accuracy: acc,
        runningAvg,
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
    const totalScore = fullMatchHistory.reduce(
      (sum, m) => sum + (m.p1Score || 0),
      0,
    );

    // Category accuracy breakdown
    const categoryStats: Record<
      string,
      { totalAcc: number; count: number; label: string }
    > = {
      all: { totalAcc: 0, count: 0, label: "Semua" },
      arithmetic: { totalAcc: 0, count: 0, label: "Aritmatika" },
      counting: { totalAcc: 0, count: 0, label: "Counting" },
      algebra: { totalAcc: 0, count: 0, label: "Aljabar" },
      roots: { totalAcc: 0, count: 0, label: "Akar" },
      physics: { totalAcc: 0, count: 0, label: "Fisika" },
      geometry: { totalAcc: 0, count: 0, label: "Geometri" },
    };

    chronological.forEach((m) => {
      const acc =
        m.accuracy !== undefined
          ? m.accuracy
          : m.totalAnswered && m.totalAnswered > 0
            ? Math.round((m.correctCount! / m.totalAnswered!) * 100)
            : m.p1Score > 0
              ? 75
              : 0;

      const catKey = m.category || "all";
      if (!categoryStats[catKey]) {
        categoryStats[catKey] = { totalAcc: 0, count: 0, label: catKey };
      }
      categoryStats[catKey].totalAcc += acc;
      categoryStats[catKey].count += 1;
    });

    const categoryData = Object.keys(categoryStats)
      .filter((key) => categoryStats[key].count > 0)
      .map((key) => ({
        category: categoryStats[key].label,
        accuracy: Math.round(
          categoryStats[key].totalAcc / categoryStats[key].count,
        ),
        games: categoryStats[key].count,
      }));

    // Insight message
    let improvementMessage = "Akurasi stabil. Pertahankan performa!";
    if (trendData.length >= 3) {
      const recent3 = trendData.slice(-3);
      const earlier = trendData.slice(0, Math.max(1, trendData.length - 3));
      const recentAvg = Math.round(
        recent3.reduce((s, i) => s + i.accuracy, 0) / recent3.length,
      );
      const earlierAvg = Math.round(
        earlier.reduce((s, i) => s + i.accuracy, 0) / earlier.length,
      );
      const diff = recentAvg - earlierAvg;

      if (diff > 5) {
        improvementMessage = `🚀 Luar biasa! Akurasi meningkat +${diff}% dibanding match awal!`;
      } else if (diff < -5) {
        improvementMessage = `💡 Tips: Jawab lebih teliti untuk menjaga combo streak pemicu skor!`;
      } else {
        improvementMessage = `⚡ Konsistensi sangat baik! Rata-rata akurasi berada di level ${avgAccuracy}%.`;
      }
    }

    return {
      totalGames,
      totalWins,
      winRate,
      avgAccuracy,
      totalScore,
      trendData,
      categoryData,
      improvementMessage,
    };
  }, [fullMatchHistory]);

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
        <button
          type="button"
          onClick={() => {
            audio.playClick();
            setShowLoginModal(true);
          }}
          className="flex items-center gap-2.5 p-1 px-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-blue-500/50 rounded-2xl transition text-left active:scale-95 group"
          title="Klik untuk Pengaturan Akun & Login Google"
        >
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-full border-2 border-amber-400 object-cover shadow"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-amber-400 flex items-center justify-center font-arcade font-bold text-white text-xs shadow border border-blue-400/50">
              {(
                currentUser?.displayName ||
                currentUser?.name ||
                currentUser?.email ||
                "G"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-slate-100 truncate max-w-[110px]">
                {currentUser
                  ? currentUser.displayName
                  : playerName || "Guest Player"}
              </span>
              {currentUser ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <span className="text-[9px] bg-blue-950 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-500 group-hover:bg-blue-900 transition">
                  LOGIN
                </span>
              )}
            </div>
            <span className="block text-[10px] text-emerald-400 font-medium">
              {currentUser
                ? "● Terverifikasi Google"
                : "● Masuk Google (Simpan Score)"}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Rank Badge Button */}
          <button
            onClick={() => {
              audio.playClick();
              setShowRankRoadmap(true);
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border flex items-center gap-1.5 transition active:scale-95 shadow-sm group ${currentTier.badgeBg} ${currentTier.badgeBorder}`}
            title="Klik untuk Lihat Jenjang Pangkat & Syarat Skor"
          >
            <span className="text-base sm:text-lg group-hover:scale-110 transition shrink-0">
              {currentTier.icon}
            </span>
            <div className="text-left hidden sm:block">
              <span className={`font-arcade text-[10px] font-bold block leading-none ${currentTier.badgeText}`}>
                {currentTier.shortName}
              </span>
              <span className="text-[9px] text-slate-400 font-mono leading-none">
                {lifetimeScore.toLocaleString("id-ID")} PTS
              </span>
            </div>
          </button>

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
            title="Toggle Audio"
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
            title="Cara Bermain"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-amber-400 transition"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Mobile Friendly)"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          )}
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
          {/* Rank Progression Banner (Road to Professor) */}
          <div className="w-full p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 ${currentTier.badgeBorder} ${currentTier.badgeBg} shadow-md shrink-0`}
                >
                  {currentTier.icon}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-arcade text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {currentTier.name}
                    </span>
                    <span className="text-[9px] bg-amber-950 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-600">
                      LVL {currentTier.level}/9
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium block">
                    {currentTier.belt} •{" "}
                    <strong className="text-amber-400 font-mono">
                      {lifetimeScore.toLocaleString("id-ID")} PTS
                    </strong>
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  setShowRankRoadmap(true);
                }}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-400 hover:text-amber-300 font-arcade font-bold text-[11px] rounded-xl shadow transition active:scale-95 shrink-0 flex items-center gap-1"
                title="Buka Daftar 9 Pangkat & Bonus"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>ROADMAP</span>
              </button>
            </div>

            {/* Progress Bar towards next tier */}
            <div className="w-full bg-slate-950/80 rounded-xl p-2 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span className="text-slate-400">
                  {rankProgress.nextTier ? (
                    <>
                      Menuju:{" "}
                      <strong className="text-slate-200">
                        {rankProgress.nextTier.icon} {rankProgress.nextTier.name}
                      </strong>{" "}
                      (Sisa{" "}
                      <span className="text-amber-400 font-bold font-mono">
                        {rankProgress.pointsNeeded.toLocaleString("id-ID")} PTS
                      </span>
                      )
                    </>
                  ) : (
                    <span className="text-yellow-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-400 animate-spin" />
                      Pangkat Tertinggi Tercapai! (Profesor Matematika 100.000+ PTS)
                    </span>
                  )}
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  {rankProgress.percentage}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${rankProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Challenge Card Banner */}
          <div className="w-full p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                <Trophy className="w-6 h-6 animate-bounce" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-arcade text-sm font-bold text-amber-400 uppercase tracking-wide">
                    TANTANGAN HARIAN
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-600">
                    DAILY
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  {dailyCompletedCount} / {dailyTotalCount} Selesai • Klaim +100
                  - +200 PTS!
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playClick();
                setShowDailyModal(true);
              }}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade font-black text-xs rounded-xl shadow-md transition active:scale-95 shrink-0 flex items-center gap-1"
            >
              LIHAT
            </button>
          </div>

          {/* GLOBAL RANKINGS (TOP 5 PLAYERS BY MATH TITLE & TOTAL SCORE) */}
          <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-4 shadow-2xl relative overflow-hidden text-left">
            {/* Ambient Lighting */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl text-slate-950 shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-arcade text-base font-black text-amber-400 uppercase tracking-wide">
                      GLOBAL RANKINGS
                    </h3>
                    <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-sm">
                      TOP 5 DUNIA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                    <span>Peringkat Petinju berdasarkan Gelar & Total Poin</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> Target: Profesor (100.000+ PTS)
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTab("leaderboard");
                }}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-arcade text-xs font-bold rounded-xl transition flex items-center gap-1 shadow group shrink-0"
                title="Buka Papan Peringkat Lengkap"
              >
                <span>LIHAT SEMUA</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            {/* Top 5 Players List */}
            <div className="space-y-2">
              {computedLeaderboard.slice(0, 5).map((player, idx) => {
                const playerTier = getRankTierByScore(player.score);
                const isChampion = idx === 0;
                const isTop3 = idx < 3;
                const isUser = player.isCurrentUser;

                return (
                  <div
                    key={player.id || `global-top-${idx}`}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                      isChampion
                        ? "bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border-yellow-400/80 shadow-lg shadow-yellow-500/10 ring-1 ring-yellow-400/40"
                        : isUser
                          ? "bg-gradient-to-r from-blue-950/60 via-slate-900 to-amber-950/30 border-amber-400/70 ring-1 ring-amber-400/40"
                          : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Left: Rank & Avatar & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Position Chip */}
                      <div className="flex items-center justify-center w-7 shrink-0">
                        {idx === 0 ? (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 font-arcade font-black text-xs shadow-md">
                            <Crown className="w-4 h-4 text-slate-950 fill-slate-950" />
                          </div>
                        ) : idx === 1 ? (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-slate-950 font-arcade font-black text-xs shadow-md">
                            <Medal className="w-4 h-4 text-slate-950" />
                          </div>
                        ) : idx === 2 ? (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-200 font-arcade font-black text-xs shadow-md">
                            <Medal className="w-4 h-4 text-amber-200" />
                          </div>
                        ) : (
                          <span className="font-arcade text-xs font-bold text-slate-400 bg-slate-900 px-1.5 py-1 rounded border border-slate-800">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 overflow-hidden ${playerTier.badgeBorder} ${playerTier.badgeBg} shadow`}
                        >
                          {renderAvatarContent(player.avatar, playerTier.icon, "w-full h-full object-cover")}
                        </div>
                        {isChampion && (
                          <span className="absolute -top-1 -right-1 text-xs">👑</span>
                        )}
                      </div>

                      {/* Name & Title */}
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-slate-100 truncate block">
                            {player.name}
                          </span>
                          {isUser && (
                            <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded font-arcade shrink-0">
                              KAMU
                            </span>
                          )}
                        </div>

                        {/* Math Title & Belt Badge */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${playerTier.badgeBg} ${playerTier.badgeBorder} ${playerTier.badgeText}`}
                          >
                            <span>{playerTier.icon}</span>
                            <span className="truncate max-w-[120px] sm:max-w-[170px]">
                              {playerTier.name}
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
                            (Lv.{playerTier.level}/9)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score & Status */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={`font-arcade text-xs sm:text-sm font-black font-mono ${
                            isChampion
                              ? "text-yellow-300"
                              : isTop3
                                ? "text-amber-400"
                                : "text-slate-200"
                          }`}
                        >
                          {player.score.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">PTS</span>
                      </div>

                      {/* Status / Winrate */}
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-slate-400">
                        <span className="text-emerald-400 font-semibold">
                          {player.winRate}% Win
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          {player.totalGames || 0} Match
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Player Rank Callout (if outside top 5) */}
            {currentUserRank !== "-" && Number(currentUserRank) > 5 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-arcade font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60 shrink-0">
                    POSISI KAMU: #{currentUserRank}
                  </span>
                  <span className="text-slate-300 font-medium truncate">
                    {currentTier.icon} {currentTier.name} •{" "}
                    <strong className="text-amber-400 font-mono">
                      {lifetimeScore.toLocaleString("id-ID")} PTS
                    </strong>
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {100000 - lifetimeScore > 0 ? (
                    <>
                      Sisa{" "}
                      <strong className="text-amber-300">
                        {(100000 - lifetimeScore).toLocaleString("id-ID")} PTS
                      </strong>{" "}
                      menuju 🎓 Profesor
                    </>
                  ) : (
                    <span className="text-yellow-300 font-bold">🎓 Profesor Matematika</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Quick Match Online */}
          <button
            onClick={() => {
              audio.playClick();
              onStartGame("quick_match", selectedCategory, undefined, undefined, selectedDuration);
            }}
            className="w-full p-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] border-b-4 border-amber-700 rounded-2xl text-slate-950 flex items-center justify-between shadow-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-950/20 rounded-xl">
                <Swords className="w-7 h-7 text-slate-950 group-hover:scale-110 transition" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-arcade text-xl font-black block">
                    QUICK MATCH ONLINE
                  </span>
                  <span className="text-[10px] font-bold bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                    {selectedDuration === 60 ? "1 Menit" : selectedDuration === 300 ? "5 Menit" : "10 Menit"}
                  </span>
                </div>
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
                  <div className="flex items-center gap-2">
                    <span className="font-arcade text-lg text-slate-100 block">
                      LATIHAN VS AI BOT
                    </span>
                    <span className="text-[10px] font-bold bg-slate-950 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                      {selectedDuration === 60 ? "1 Min" : selectedDuration === 300 ? "5 Min" : "10 Min"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Asah refleks hitung tanpa koneksi lawan
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  onStartGame("practice", selectedCategory, aiDifficulty, undefined, selectedDuration);
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
            onClick={() => {
              audio.playClick();
              setShowPrivateModal(true);
            }}
            className="w-full p-4 bg-slate-900 border-2 border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition shadow-xl"
          >
            <div className="flex items-center gap-3">
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
            <span className="text-xs font-bold text-purple-400 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800">
              CODE ROOM
            </span>
          </button>

          {/* Duration Selector Card */}
          <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 my-2 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                PILIH WAKTU PERTANDINGAN:
              </h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                {selectedDuration === 60
                  ? "1 Menit"
                  : selectedDuration === 300
                    ? "5 Menit (Rekomendasi Anak)"
                    : "10 Menit (Santai)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 60 as GameDuration,
                  title: "1 Menit",
                  sub: "⚡ Mode Kilat",
                  badge: "Refleks Cepat",
                  detail: "Uji kecepatan respon kilat",
                  color: "from-amber-500/20 to-yellow-500/10",
                  activeBorder: "border-amber-500 text-amber-300",
                },
                {
                  id: 300 as GameDuration,
                  title: "5 Menit",
                  sub: "⭐ Standar Anak",
                  badge: "Paling Pas",
                  detail: "Waktu tenang & ramah otak anak",
                  color: "from-emerald-500/20 to-teal-500/10",
                  activeBorder: "border-emerald-500 text-emerald-300",
                },
                {
                  id: 600 as GameDuration,
                  title: "10 Menit",
                  sub: "🏆 Marathon Fokus",
                  badge: "Santai",
                  detail: "Sesi belajar tanpa buru-buru",
                  color: "from-blue-500/20 to-indigo-500/10",
                  activeBorder: "border-blue-500 text-blue-300",
                },
              ].map((item) => {
                const isSelected = selectedDuration === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      onSelectDuration(item.id);
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition relative flex flex-col justify-between overflow-hidden group ${
                      isSelected
                        ? `bg-gradient-to-br ${item.color} ${item.activeBorder} shadow-md scale-[1.02]`
                        : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-arcade text-base font-black">
                        {item.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-slate-950/90 text-amber-300 border border-amber-500/40"
                            : "bg-slate-900 text-slate-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-xs font-bold block mb-0.5">
                      {item.sub}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {item.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* Recent Match History Widget */}
          <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 my-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                RIWAYAT PERTANDINGAN TERAKHIR
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                5 Match Terakhir
              </span>
            </div>

            {matchHistory.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">
                  Belum ada riwayat pertandingan. Mulai bertanding untuk
                  mencatat skor!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchHistory.map((item) => {
                  const isWin = item.result === "win";
                  const isDraw = item.result === "draw";

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        {isWin ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : isDraw ? (
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                            <MinusCircle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-arcade text-xs ${
                                isWin
                                  ? "text-emerald-400"
                                  : isDraw
                                    ? "text-yellow-400"
                                    : "text-rose-400"
                              }`}
                            >
                              {isWin
                                ? "MENANG (KO)"
                                : isDraw
                                  ? "SERI"
                                  : "KALAH"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              VS {item.opponentName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block capitalize">
                            Mode:{" "}
                            {item.mode === "practice"
                              ? "Latihan AI"
                              : item.mode === "quick_match"
                                ? "Quick Online"
                                : "Private Room"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-arcade text-base text-slate-100 font-bold block">
                          {item.p1Score}{" "}
                          <span className="text-slate-500 text-xs">-</span>{" "}
                          {item.p2Score}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STATISTIK & TREN AKURASI (RECHARTS) */}
      {activeTab === "stats" && (
        <div className="w-full space-y-3">
          {/* KPI Statistics Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                AKURASI SEPANJANG WAKTU
              </span>
              <span className="font-arcade text-2xl text-emerald-400 block mt-1">
                {statsSummary.avgAccuracy}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Rata-Rata Total
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL MATCH
              </span>
              <span className="font-arcade text-2xl text-amber-400 block mt-1">
                {statsSummary.totalGames}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Selesai Bertanding
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                WIN RATE
              </span>
              <span className="font-arcade text-2xl text-blue-400 block mt-1">
                {statsSummary.winRate}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {statsSummary.totalWins} Kemenangan
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL SKOR
              </span>
              <span className="font-arcade text-2xl text-purple-400 block mt-1">
                {lifetimeScore}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Akumulasi Poin
              </span>
            </div>
          </div>

          {/* Insight Improvement Banner */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                ANALISIS PERFORMA KAMU:
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                {statsSummary.improvementMessage}
              </p>
            </div>
          </div>

          {/* Lifetime Accuracy Trend Chart */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  TREN AKURASI SEPANJANG WAKTU (%)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> Recharts
                Chronological
              </span>
            </div>

            {statsSummary.trendData.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center my-2">
                <p className="text-xs text-slate-400">
                  Belum ada grafik statistik. Mainkan beberapa pertandingan di
                  Arena untuk melihat grafik tren perkembanganmu!
                </p>
              </div>
            ) : (
              <div className="w-full h-52 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={statsSummary.trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="lifetimeGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="matchName"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      domain={[0, 100]}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#f8fafc",
                      }}
                      itemStyle={{ padding: "2px 0" }}
                      formatter={(value: any, name: any) => {
                        if (name === "accuracy")
                          return [`${value}%`, "Akurasi Match"];
                        if (name === "runningAvg")
                          return [`${value}%`, "Rata-Rata Kumulatif"];
                        return [value, name];
                      }}
                      labelFormatter={(label, items) => {
                        if (items && items.length > 0 && items[0].payload) {
                          const p = items[0].payload;
                          return `${label} (${p.date}) • VS ${p.opponent} [${p.result}]`;
                        }
                        return label;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#lifetimeGrad)"
                      name="accuracy"
                    />
                    <Area
                      type="monotone"
                      dataKey="runningAvg"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#avgGrad)"
                      name="runningAvg"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Accuracy Breakdown */}
          {statsSummary.categoryData.length > 0 && (
            <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  AKURASI BERDASARKAN KATEGORI SOAL (%)
                </h3>
              </div>

              <div className="w-full h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statsSummary.categoryData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="category"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      domain={[0, 100]}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#f8fafc",
                      }}
                      formatter={(value: any) => [
                        `${value}%`,
                        "Akurasi Rata-Rata",
                      ]}
                    />
                    <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                      {statsSummary.categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? "#f59e0b" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MOCK GLOBAL LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="w-full space-y-3">
          {/* Header Banner & Live Server Sync Status */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                  KLASEMEN GLOBAL MATH BOXER
                </h3>
              </div>
              <button
                onClick={handleRefreshLeaderboard}
                disabled={isRefreshingLeaderboard}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg text-[11px] font-bold text-amber-400 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshingLeaderboard ? "animate-spin text-amber-300" : ""}`}
                />
                {isRefreshingLeaderboard ? "Syncing..." : "Refresh"}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {isLiveDatabase
                  ? "Database Supabase Cloud Terhubung"
                  : "Database Real-time Tersinkron (Auto-Save Active)"}
              </span>
              <span className="text-slate-500 font-arcade text-[10px]">
                60S SUDDEN DEATH ARENA
              </span>
            </div>
          </div>

          {/* User Current Live Rank Highlight Card */}
          <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-arcade font-black text-slate-950 text-xl shadow-md border border-amber-300 shrink-0">
                #{currentUserRank}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-100">
                    {playerName || "Pemain Kamu"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-arcade font-black text-[9px] uppercase tracking-wide">
                    KAMU
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                  <span className="text-amber-400 font-bold font-mono">
                    {lifetimeScore.toLocaleString("id-ID")} PTS
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-[11px] flex items-center gap-1">
                    <span>{currentTier.icon}</span>
                    <span>{currentTier.name}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => {
                  audio.playClick();
                  setShowRankRoadmap(true);
                }}
                className={`px-2.5 py-1 rounded-lg border font-arcade text-[10px] font-bold block transition hover:scale-105 active:scale-95 ${currentTier.badgeBg} ${currentTier.badgeBorder} ${currentTier.badgeText}`}
              >
                {currentTier.icon} {currentTier.shortName.toUpperCase()}
              </button>
              <span className="text-[10px] text-slate-400 block mt-1">
                Peringkat #{currentUserRank} dari {computedLeaderboard.length} Pemain
              </span>
            </div>
          </div>

          {/* Rank Tier Roadmap Info Button */}
          <button
            onClick={() => {
              audio.playClick();
              setShowRankRoadmap(true);
            }}
            className="w-full p-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-850 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-300 font-medium transition active:scale-[0.99] group shadow"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              <span>
                <strong>Road to Profesor Matematika (100.000+ PTS):</strong> Lihat 9 Jenjang Pangkat & Syarat Skor
              </span>
            </div>
            <span className="font-arcade text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
              BUKA
            </span>
          </button>

          {/* Division Filter Pills */}
          <div className="w-full overflow-x-auto pb-1 flex items-center gap-1.5 no-scrollbar">
            <button
              onClick={() => {
                audio.playClick();
                setSelectedLeaderboardTier("all");
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedLeaderboardTier === "all"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Semua Divisi ({computedLeaderboard.length})
            </button>
            {RANK_TIERS.map((tier) => {
              const count = computedLeaderboard.filter(
                (e) => getRankTierByScore(e.score).id === tier.id
              ).length;
              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    audio.playClick();
                    setSelectedLeaderboardTier(tier.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    selectedLeaderboardTier === tier.id
                      ? `${tier.badgeBg} ${tier.badgeBorder} ${tier.badgeText} border ring-1 ring-amber-400/40`
                      : "bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <span>{tier.icon}</span>
                  <span>{tier.shortName}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Rank 2 - Silver */}
            {computedLeaderboard[1] && (
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5 text-center flex flex-col items-center justify-between relative shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Medal className="w-6 h-6 text-slate-300 drop-shadow" />
                </div>
                <div className="mt-2 text-2xl w-10 h-10 flex items-center justify-center overflow-hidden rounded-full">
                  {renderAvatarContent(computedLeaderboard[1].avatar, "🥈", "w-full h-full object-cover rounded-full")}
                </div>
                <div className="mt-1 w-full truncate">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    {computedLeaderboard[1].name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold block font-mono">
                    {computedLeaderboard[1].score.toLocaleString("id-ID")} PTS
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {getRankTierByScore(computedLeaderboard[1].score).shortName}
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold Champion */}
            {computedLeaderboard[0] && (
              <div className="bg-gradient-to-b from-amber-950/90 to-slate-900 border-2 border-yellow-400 rounded-xl p-2.5 text-center flex flex-col items-center justify-between relative shadow-xl scale-105 z-10">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Crown className="w-7 h-7 text-yellow-300 fill-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.8)]" />
                </div>
                <div className="mt-2 text-3xl w-12 h-12 flex items-center justify-center overflow-hidden rounded-full border-2 border-yellow-400">
                  {renderAvatarContent(computedLeaderboard[0].avatar, "👑", "w-full h-full object-cover rounded-full")}
                </div>
                <div className="mt-1 w-full truncate">
                  <span className="font-arcade text-xs font-black text-amber-300 block truncate">
                    {computedLeaderboard[0].name}
                  </span>
                  <span className="text-xs text-yellow-300 font-black block mt-0.5 font-mono">
                    {computedLeaderboard[0].score.toLocaleString("id-ID")} PTS
                  </span>
                  <span className="text-[9px] text-yellow-300 font-semibold block truncate">
                    {getRankTierByScore(computedLeaderboard[0].score).name}
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {computedLeaderboard[2] && (
              <div className="bg-slate-900/80 border border-amber-900/60 rounded-xl p-2.5 text-center flex flex-col items-center justify-between relative shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Medal className="w-6 h-6 text-amber-600 drop-shadow" />
                </div>
                <div className="mt-2 text-2xl w-10 h-10 flex items-center justify-center overflow-hidden rounded-full">
                  {renderAvatarContent(computedLeaderboard[2].avatar, "🥉", "w-full h-full object-cover rounded-full")}
                </div>
                <div className="mt-1 w-full truncate">
                  <span className="font-bold text-xs text-slate-200 block truncate">
                    {computedLeaderboard[2].name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold block font-mono">
                    {computedLeaderboard[2].score.toLocaleString("id-ID")} PTS
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {getRankTierByScore(computedLeaderboard[2].score).shortName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Full Leaderboard Ranking Table */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 shadow-xl">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800 mb-1">
              <div className="flex items-center gap-4">
                <span>RANK</span>
                <span>PETINJU</span>
              </div>
              <div className="flex items-center gap-6">
                <span>DIVISI PANGKAT</span>
                <span>TOTAL SKOR</span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {computedLeaderboard
                .filter((entry) => {
                  if (selectedLeaderboardTier === "all") return true;
                  return (
                    getRankTierByScore(entry.score).id ===
                    selectedLeaderboardTier
                  );
                })
                .map((entry) => {
                  const entryTier = getRankTierByScore(entry.score);
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        entry.isCurrentUser
                          ? "bg-amber-500/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/30"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-arcade font-bold text-xs flex-shrink-0 ${
                            entry.rank === 1
                              ? "bg-yellow-400 text-slate-950 shadow-md font-black"
                              : entry.rank === 2
                                ? "bg-slate-300 text-slate-950 font-black"
                                : entry.rank === 3
                                  ? "bg-amber-700 text-white font-black"
                                  : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0">
                          {renderAvatarContent(entry.avatar, "🥊", "w-full h-full object-cover")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`font-bold text-xs truncate ${
                                entry.isCurrentUser
                                  ? "text-amber-300 font-black"
                                  : "text-slate-200"
                              }`}
                            >
                              {entry.name}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-arcade text-[8px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  entry.status === "online"
                                    ? "bg-emerald-400"
                                    : entry.status === "in_match"
                                      ? "bg-amber-400 animate-pulse"
                                      : "bg-slate-600"
                                }`}
                              />
                              {entry.status === "online"
                                ? "Online"
                                : entry.status === "in_match"
                                  ? "Bertarung"
                                  : "Offline"}
                            </span>
                            <span>•</span>
                            <span>{entry.winRate}% Win</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border hidden sm:inline-flex items-center gap-1 ${entryTier.badgeBg} ${entryTier.badgeBorder} ${entryTier.badgeText}`}
                        >
                          <span>{entryTier.icon}</span>
                          <span>{entryTier.shortName}</span>
                        </span>
                        <div className="min-w-[64px]">
                          <span className="font-arcade text-xs font-bold text-amber-400 block font-mono">
                            {entry.score.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[9px] text-slate-500 block">
                            PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {activeTab === "skins" && (
        <div className="w-full bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-amber-400" />
              KOSTUM & WARNA PETINJU
            </h3>
            <span className="text-xs font-arcade text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> TOTAL: {lifetimeScore} PTS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BOXER_SKINS.map((skin: BoxerSkin) => {
              const isUnlocked = lifetimeScore >= skin.minLifetimeScore;
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
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[90px] ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg"
                      : isUnlocked
                        ? "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"
                        : "bg-slate-950/50 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{skin.icon}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-700 inline-block shadow-inner"
                        style={{ backgroundColor: skin.trunksColor }}
                        title="Warna Celana"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-700 inline-block shadow-inner"
                        style={{ backgroundColor: skin.glovesColor }}
                        title="Warna Sarung Tinju"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-arcade text-xs font-bold text-slate-100 block">
                        {skin.name}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      ) : !isUnlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      ) : null}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isUnlocked
                        ? isSelected
                          ? "Dipakai Saat Ini"
                          : "Klik Untuk Pakai"
                        : skin.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Private Room Modal */}
      {showPrivateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
            <div>
              <h3 className="font-arcade text-xl text-amber-400 mb-1">
                KODE KAMAR PERTANDINGAN
              </h3>
              <p className="text-xs text-slate-400">
                Buat kode baru atau masukkan kode temanmu
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="CONTOH: BOX-123"
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-xl p-3 text-center font-arcade text-xl text-amber-300 outline-none uppercase tracking-wider"
              />
            </div>

            {/* Quick Random Room Code Generator Button */}
            <button
              type="button"
              onClick={() => {
                audio.playClick();
                const randomNum = Math.floor(100 + Math.random() * 900);
                const prefixes = ["BOX", "RING", "KO", "MATH", "STRIKE"];
                const prefix =
                  prefixes[Math.floor(Math.random() * prefixes.length)];
                setRoomInput(`${prefix}-${randomNum}`);
              }}
              className="w-full py-1.5 px-3 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/50 rounded-xl text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              🎲 Buat Kode Otomatis (Acak)
            </button>

            {/* Duration Selector in Private Room */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                <Timer className="w-3 h-3 text-amber-400" /> DURASI PERTANDINGAN:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([60, 300, 600] as GameDuration[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      onSelectDuration(d);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold transition text-center ${
                      selectedDuration === d
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {d === 60 ? "1 Min" : d === 300 ? "5 Min" : "10 Min"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowPrivateModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
              >
                BATAL
              </button>
              <button
                onClick={() => {
                  const cleanedCode = roomInput.trim().replace(/\s+/g, "-").toUpperCase();
                  if (cleanedCode) {
                    audio.playClick();
                    setShowPrivateModal(false);
                    onStartGame(
                      "private_room",
                      selectedCategory,
                      undefined,
                      cleanedCode,
                      selectedDuration,
                    );
                  }
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade rounded-xl text-xs font-bold transition shadow-md"
              >
                MASUK RING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-arcade text-xl text-amber-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> CARA BERMAIN
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-arcade text-amber-400">1.</span>
                <span>
                  <b>Pilihan Waktu (1, 5, atau 10 Menit):</b> Pilih durasi waktu yang nyaman untukmu (1 menit kilat, 5 menit santai ramah anak, atau 10 menit marathon fokus).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-arcade text-amber-400">2.</span>
                <span>
                  <b>Jawab Cepat:</b> Ketik angka jawaban pada numpad statis
                  lalu tekan <b>ENTER</b>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-arcade text-amber-400">3.</span>
                <span>
                  <b>Pukul Opponent:</b> Setiap jawaban benar membuat petinjumu
                  memukul lawan (+2 s/d +10 poin)!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-arcade text-amber-400">4.</span>
                <span>
                  <b>Penalti Salah:</b> Jika jawaban salah, Numpad akan terkunci
                  selama 1 detik.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-arcade text-amber-400">5.</span>
                <span>
                  <b>Pemenang:</b> Pemain dengan akumulasi skor tertinggi saat
                  timer habis memenangkan pertandingan!
                </span>
              </li>
            </ul>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade rounded-xl text-sm"
            >
              MENGERTI, SIAP BERTARUNG!
            </button>
          </div>
        </div>
      )}

      {/* Daily Challenge Modal */}
      <DailyChallengeModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onStartChallenge={() => {
          setActiveTab("arena");
        }}
        onAddLifetimePoints={(pts) => {
          if (onAddLifetimePoints) {
            onAddLifetimePoints(pts);
          }
        }}
      />

      {/* Google Login & User Account Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        currentUser={currentUser}
        onUserLogin={(user) => {
          onUserLogin(user);
          setShowLoginModal(false);
        }}
        onUserLogout={() => {
          onUserLogout();
          setShowLoginModal(false);
        }}
      />

      {/* Rank Progression Roadmap Modal */}
      <RankRoadmapModal
        isOpen={showRankRoadmap}
        onClose={() => setShowRankRoadmap(false)}
        lifetimeScore={lifetimeScore}
        playerName={currentUser?.displayName || currentUser?.name || playerName || "Pemain Kamu"}
      />
    </div>
  );
};
