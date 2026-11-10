import React from "react";
import {
  Trophy,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  Award,
  CheckCircle2,
  Lock,
  Flame,
  Star,
  Zap,
} from "lucide-react";
import {
  RANK_TIERS,
  RankTier,
  getRankProgress,
  getRankTierByScore,
} from "../utils/ranks";
import { audio } from "../utils/audio";

interface RankRoadmapModalProps {
  isOpen?: boolean;
  lifetimeScore: number;
  playerName: string;
  onClose: () => void;
}

export const RankRoadmapModal: React.FC<RankRoadmapModalProps> = ({
  isOpen = true,
  lifetimeScore,
  playerName,
  onClose,
}) => {
  if (!isOpen) return null;

  const progressInfo = getRankProgress(lifetimeScore);
  const currentTier = progressInfo.currentTier;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-6 w-full max-w-2xl text-center shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-arcade text-lg sm:text-xl text-amber-400 flex items-center gap-2">
                JENJANG PANGKAT PETINJU
              </h2>
              <p className="text-xs text-slate-400">
                Dari Pemula hingga Mahaguru Profesor Matematika
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Player Status Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-2xl mb-4 text-left shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 ${currentTier.badgeBorder} ${currentTier.badgeBg} shadow-lg`}
              >
                {currentTier.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Tier {currentTier.level} of 9
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentTier.belt}
                  </span>
                </div>
                <h3 className="font-arcade text-base sm:text-lg font-black text-amber-300">
                  {currentTier.name}
                </h3>
                <span className="text-xs text-slate-300">
                  Pemain: <strong className="text-white">{playerName}</strong> •{" "}
                  <strong className="text-amber-400 font-mono">
                    {lifetimeScore.toLocaleString("id-ID")} PTS
                  </strong>
                </span>
              </div>
            </div>

            {/* Next Milestone */}
            {progressInfo.nextTier ? (
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 sm:min-w-[180px] text-left sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  Pangkat Berikutnya:
                </span>
                <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <span className="text-sm">{progressInfo.nextTier.icon}</span>
                  <span className="font-arcade text-xs font-bold text-slate-200">
                    {progressInfo.nextTier.name}
                  </span>
                </div>
                <span className="text-[11px] text-amber-400 font-bold block mt-0.5 font-mono">
                  Kurang {progressInfo.pointsNeeded.toLocaleString("id-ID")} PTS lagi
                </span>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/50 rounded-xl p-2.5 text-center">
                <span className="text-xs font-bold text-yellow-300 flex items-center gap-1 justify-center">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                  PANGKAT TERTINGGI!
                </span>
                <span className="text-[10px] text-slate-300">
                  Profesor Matematika Abadi (100.000+ PTS)
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar to Next Tier */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span>Progress Menuju Pangkat Berikutnya</span>
              <span className="text-amber-400 font-bold font-mono">
                {progressInfo.percentage}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressInfo.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* List of 9 Rank Tiers */}
        <div className="text-left mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            9 TINGKATAN PANGKAT & BONUSNYA
          </span>
          <span className="text-[10px] text-slate-500">
            Kumpulkan poin dari Quick Match, Latihan & Daily Quest
          </span>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 max-h-96">
          {RANK_TIERS.map((tier: RankTier) => {
            const isUnlocked = lifetimeScore >= tier.minScore;
            const isCurrent = currentTier.id === tier.id;

            return (
              <div
                key={tier.id}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative ${
                  isCurrent
                    ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40"
                    : isUnlocked
                    ? "bg-slate-950/80 border-slate-800 text-slate-300"
                    : "bg-slate-950/40 border-slate-900/60 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border flex-shrink-0 ${tier.badgeBorder} ${tier.badgeBg}`}
                  >
                    {tier.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-arcade text-xs font-bold text-slate-400">
                        LEVEL {tier.level}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                        {tier.belt}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-arcade font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 animate-pulse">
                          PANGKAT KAMU
                        </span>
                      )}
                    </div>
                    <h4
                      className={`font-arcade text-sm font-bold ${
                        isCurrent
                          ? "text-amber-300"
                          : isUnlocked
                          ? "text-slate-100"
                          : "text-slate-500"
                      }`}
                    >
                      {tier.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tier.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{tier.perk}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0 gap-1 flex-shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">
                      Syarat Poin:
                    </span>
                    <span className="font-arcade text-xs font-bold text-amber-400 font-mono">
                      {tier.maxScore
                        ? `${tier.minScore.toLocaleString("id-ID")} - ${tier.maxScore.toLocaleString("id-ID")} PTS`
                        : `${tier.minScore.toLocaleString("id-ID")}+ PTS`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isCurrent ? (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700">
                        <Flame className="w-3 h-3 text-amber-400" /> AKTIF
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{" "}
                        TERBUKA
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> TERKUNCI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade font-black text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            TUTUP & LANJUTKAN TANDING
          </button>
        </div>
      </div>
    </div>
  );
};
