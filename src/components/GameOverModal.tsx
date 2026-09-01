import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RefreshCw,
  Home,
  Flame,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  Sparkles,
  Award,
  Zap,
  Globe,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PlayerState, AnswerHistoryPoint, ActionType, GameDuration } from '../types';
import { audio } from '../utils/audio';
import { BoxerCanvas } from './BoxerCanvas';
import { EmoteBar } from './EmoteBar';
import { getRankProgress } from '../utils/ranks';
import { calculateMatchScore, MatchScoreBreakdown } from '../utils/scoreCalculator';

interface GameOverModalProps {
  p1: PlayerState;
  p2: PlayerState;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  highestCombo: number;
  duration?: GameDuration;
  finishReason?: "ko_win" | "ko_loss" | "time_up";
  answerHistory?: AnswerHistoryPoint[];
  isMultiplayer?: boolean;
  rematchStatus?: 'idle' | 'requested_by_me' | 'requested_by_opponent';
  opponentLeft?: boolean;
  lifetimeScore?: number;
  scoreBreakdown?: MatchScoreBreakdown;
  onRematch: () => void;
  onExit: () => void;
  onOpenLeaderboard?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  p1,
  p2,
  totalAnswered,
  correctCount,
  wrongCount,
  highestCombo,
  duration,
  finishReason = "time_up",
  answerHistory = [],
  isMultiplayer = false,
  rematchStatus = 'idle',
  opponentLeft = false,
  lifetimeScore = 0,
  scoreBreakdown,
  onRematch,
  onExit,
  onOpenLeaderboard,
}) => {
  const isP1Winner = finishReason === "ko_win" ? true : finishReason === "ko_loss" ? false : p1.score > p2.score;
  const isDraw = finishReason === "time_up" && p1.score === p2.score;
  const isKnockout = finishReason === "ko_win" || finishReason === "ko_loss";

  // Hitung rincian perolehan poin pertandingan
  const breakdown: MatchScoreBreakdown = useMemo(() => {
    if (scoreBreakdown) return scoreBreakdown;
    return calculateMatchScore({
      p1Score: p1.score,
      p2Score: p2.score,
      finishReason,
      highestCombo,
      correctCount,
      totalAnswered,
      prevLifetimeScore: Math.max(0, lifetimeScore - p1.score),
    });
  }, [scoreBreakdown, p1.score, p2.score, finishReason, highestCombo, correctCount, totalAnswered, lifetimeScore]);

  const displayLifetime = lifetimeScore > 0 ? lifetimeScore : breakdown.newLifetimeScore;
  const rankProgress = useMemo(() => {
    return getRankProgress(displayLifetime);
  }, [displayLifetime]);
  const currentTier = rankProgress.currentTier;

  const [victoryEmote, setVictoryEmote] = useState<ActionType>(
    isP1Winner ? 'taunt_crown' : 'idle'
  );

  useEffect(() => {
    audio.playVictory();
    if (isP1Winner) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isP1Winner]);

  const handleTriggerEmote = (emote: 'taunt_crown' | 'taunt_flex' | 'taunt_dance' | 'taunt_shuffle') => {
    audio.playEmoteSound(emote);
    setVictoryEmote(emote);
    if (isP1Winner) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  // Format chart data
  const chartData = useMemo(() => {
    if (!answerHistory || answerHistory.length === 0) {
      return [
        { name: 'Q0', accuracy: 100, correct: 0, wrong: 0, score: 0 },
        { name: 'Q1', accuracy: correctCount > 0 ? 100 : 0, correct: correctCount, wrong: wrongCount, score: p1.score },
      ];
    }

    const baseline = [{ name: 'Awal', accuracy: 100, correct: 0, wrong: 0, score: 0 }];

    const points = answerHistory.map((item) => ({
      name: `Q${item.questionNumber}`,
      accuracy: item.accuracy,
      correct: item.correct,
      wrong: item.wrong,
      score: item.score,
    }));

    return [...baseline, ...points];
  }, [answerHistory, correctCount, wrongCount, p1.score]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg text-center shadow-2xl relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        {/* Glow Background */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl -z-10 ${
          isP1Winner ? 'bg-amber-500/20' : 'bg-rose-500/20'
        }`} />

        {/* Top Header Result */}
        <div className="my-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-500/40 text-amber-400 mb-2 shadow-lg">
            <Trophy className="w-7 h-7" />
          </div>

          <h2 className="font-arcade text-2xl sm:text-3xl text-amber-400 tracking-wider flex items-center justify-center gap-2">
            {isKnockout ? (
              <span className="text-red-400 animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
                💥 KNOCKOUT (K.O.)!
              </span>
            ) : (
              <span>⏱️ TIME UP!</span>
            )}
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 mb-1">
            {isKnockout && (
              <div className="px-2.5 py-0.5 bg-red-950/90 border border-red-500/50 rounded-full text-[10px] font-bold text-red-300 font-mono">
                ⚡ Selesai Lebih Cepat (K.O.)
              </div>
            )}
            {duration && (
              <div className="px-2.5 py-0.5 bg-slate-950/80 border border-amber-500/30 rounded-full text-[10px] font-bold text-amber-300 font-mono">
                ⏱️ Target: {duration === 60 ? "1 Min" : duration === 300 ? "5 Min" : "10 Min"}
              </div>
            )}
          </div>

          <div className="mt-1 font-arcade text-lg sm:text-xl text-slate-100">
            {isDraw ? (
              <span className="text-yellow-400">PERTANDINGAN SERI!</span>
            ) : isP1Winner ? (
              <span className="text-emerald-400">
                {isKnockout ? "🏆 MENANG DENGAN KNOCKOUT (K.O.)!" : "🏆 KAMU MENANG ANGKA!"}
              </span>
            ) : (
              <span className="text-rose-400">
                {isKnockout ? "💀 TERKENA KNOCKOUT (K.O.)!" : "💀 LAWAN MENANG ANGKA!"}
              </span>
            )}
          </div>
        </div>

        {/* Victory Ring Boxer Canvas & Interactive Emote Controls */}
        <div className="my-3 space-y-2">
          <div className="rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl max-h-[200px]">
            <BoxerCanvas
              p1={{ ...p1, currentAction: isP1Winner ? victoryEmote : 'knockdown' }}
              p2={{ ...p2, currentAction: isP1Winner ? 'knockdown' : victoryEmote }}
            />
          </div>

          <EmoteBar
            onTriggerEmote={handleTriggerEmote}
            currentAction={victoryEmote}
          />
        </div>

        {/* 📊 RINCIAN PERHITUNGAN SKOR & POIN KLASEMEN (SCORE BREAKDOWN) */}
        <div className="my-3 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-3.5 text-left shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-arcade text-xs text-amber-300 font-bold uppercase tracking-wide">
                PERHITUNGAN SKOR AKHIR & KLASEMEN
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              +{breakdown.totalPointsEarned} PTS MASUK KLASEMEN
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Base score */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>🥊</span> Poin Jawaban Soal:
              </span>
              <span className="font-mono font-bold text-slate-100">+{breakdown.baseScore} PTS</span>
            </div>

            {/* Result bonus */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>{breakdown.isKnockout ? "💥" : breakdown.isWin ? "🏆" : "🥊"}</span> {breakdown.resultLabel}:
              </span>
              <span className="font-mono font-bold text-amber-400">+{breakdown.resultBonus} PTS</span>
            </div>

            {/* Combo bonus */}
            {breakdown.comboBonus > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>🔥</span> Bonus Max Combo ({highestCombo}x):
                </span>
                <span className="font-mono font-bold text-amber-400">+{breakdown.comboBonus} PTS</span>
              </div>
            )}

            {/* Accuracy bonus */}
            {breakdown.accuracyBonus > 0 && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>🎯</span> Bonus Akurasi ({breakdown.accuracyPercent}%):
                </span>
                <span className="font-mono font-bold text-emerald-400">+{breakdown.accuracyBonus} PTS</span>
              </div>
            )}

            {/* Total Highlight */}
            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> TOTAL POIN DIDAPAT:
              </span>
              <span className="font-arcade text-base text-amber-300 font-bold font-mono">
                +{breakdown.totalPointsEarned} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Player Rank Progression Summary */}
        <div className="my-3 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950 border border-amber-500/40 rounded-2xl p-3 text-left">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentTier.icon}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-arcade text-xs font-bold text-amber-400 uppercase">
                    {currentTier.name}
                  </span>
                  <span className="text-[9px] bg-amber-950 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-600">
                    LVL {currentTier.level}/9
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-mono">
                  Total Karir Klasemen: <strong className="text-amber-400">{displayLifetime.toLocaleString("id-ID")} PTS</strong>
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${currentTier.badgeBg} ${currentTier.badgeBorder} ${currentTier.badgeText}`}>
              {currentTier.shortName}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>
                {rankProgress.nextTier ? (
                  <>
                    Menuju: <strong className="text-slate-200">{rankProgress.nextTier.icon} {rankProgress.nextTier.name}</strong> (sisa <span className="text-amber-400 font-bold font-mono">{rankProgress.pointsNeeded.toLocaleString("id-ID")} PTS</span>)
                  </>
                ) : (
                  <span className="text-yellow-300 font-bold">⭐ Pangkat Tertinggi: Profesor Matematika (100.000+ PTS)</span>
                )}
              </span>
              <span className="text-amber-400 font-mono font-bold">{rankProgress.percentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${rankProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Breakdown Grid */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 my-3 text-xs text-slate-300 grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center">
            <span className="text-slate-400 font-medium text-[10px]">SOAL</span>
            <span className="font-arcade text-sm sm:text-base text-slate-100 flex items-center gap-1">
              {totalAnswered}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 font-medium text-[10px]">BENAR</span>
            <span className="font-arcade text-sm sm:text-base text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {correctCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 font-medium text-[10px]">SALAH</span>
            <span className="font-arcade text-sm sm:text-base text-rose-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {wrongCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 font-medium text-[10px]">MAX COMBO</span>
            <span className="font-arcade text-sm sm:text-base text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {highestCombo}x
            </span>
          </div>
        </div>

        {/* Recharts Accuracy & Performance Trend Section */}
        <div className="my-3 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              GRAFIK TREN AKURASI & JAWABAN
            </div>
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> Recharts Realtime
            </span>
          </div>

          <div className="w-full h-40 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'accuracy') return [`${value}%`, 'Akurasi'];
                    if (name === 'correct') return [value, 'Benar (Kumulatif)'];
                    if (name === 'wrong') return [value, 'Salah (Kumulatif)'];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  formatter={(value) => {
                    if (value === 'accuracy') return <span className="text-emerald-400 font-semibold">Akurasi (%)</span>;
                    if (value === 'correct') return <span className="text-blue-400 font-semibold">Benar</span>;
                    if (value === 'wrong') return <span className="text-rose-400 font-semibold">Salah</span>;
                    return value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#accuracyGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="correct"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="wrong"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multiplayer Status Banner */}
        {isMultiplayer && (
          <div className="my-2">
            {opponentLeft ? (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Lawan telah meninggalkan match dan kembali ke Menu Utama.</span>
              </div>
            ) : rematchStatus === 'requested_by_opponent' ? (
              <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center justify-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="font-semibold">⚔️ Lawan mengajak Rematch! Klik &quot;Terima Rematch&quot; untuk bertarung lagi!</span>
              </div>
            ) : rematchStatus === 'requested_by_me' ? (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-amber-400" />
                <span>Menunggu persetujuan lawan untuk rematch...</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Control Action Buttons */}
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audio.playClick();
                onExit();
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              MENU UTAMA
            </button>

            <button
              onClick={() => {
                if (opponentLeft) return;
                audio.playClick();
                onRematch();
              }}
              disabled={opponentLeft}
              className={`flex-1 py-3 font-arcade rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-1.5 ${
                opponentLeft
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : rematchStatus === 'requested_by_opponent'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 glow-gold animate-bounce ring-2 ring-emerald-300'
                  : rematchStatus === 'requested_by_me'
                  ? 'bg-amber-500/80 hover:bg-amber-500 text-slate-950 glow-gold'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 glow-gold'
              }`}
            >
              {rematchStatus === 'requested_by_me' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  MENUNGGU LAWAN...
                </>
              ) : rematchStatus === 'requested_by_opponent' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  TERIMA REMATCH
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  REMATCH
                </>
              )}
            </button>
          </div>

          {onOpenLeaderboard && (
            <button
              onClick={() => {
                audio.playClick();
                onOpenLeaderboard();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 hover:from-amber-900/60 hover:to-amber-900/60 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition active:scale-98 shadow"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span>LIHAT PERINGKAT SAYA DI KLASEMEN GLOBAL</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
