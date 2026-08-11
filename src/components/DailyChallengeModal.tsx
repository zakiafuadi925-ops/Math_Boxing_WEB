import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, Zap, Clock, Award, Gift, Flame, Play, X, Sparkles } from 'lucide-react';
import {
  DailyChallenge,
  DailyChallengeState,
  loadDailyChallengeState,
  claimChallengeReward,
  getTimeUntilNextReset,
} from '../utils/dailyChallenges';
import { audio } from '../utils/audio';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChallenge?: () => void;
  onAddLifetimePoints: (amount: number) => void;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartChallenge,
  onAddLifetimePoints,
}) => {
  const [challengeState, setChallengeState] = useState<DailyChallengeState>(() => loadDailyChallengeState());
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('');
  const [claimedNotice, setClaimedNotice] = useState<string | null>(null);

  // Sync state on open & tick reset countdown
  useEffect(() => {
    if (isOpen) {
      setChallengeState(loadDailyChallengeState());
    }
  }, [isOpen]);

  useEffect(() => {
    const updateTime = () => setTimeRemainingStr(getTimeUntilNextReset());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const completedCount = challengeState.challenges.filter((c) => c.isCompleted).length;
  const totalCount = challengeState.challenges.length;
  const allClaimed = challengeState.challenges.every((c) => c.isClaimed);

  const handleClaim = (ch: DailyChallenge) => {
    audio.playBell();
    const { newState, rewardPoints } = claimChallengeReward(ch.id);
    setChallengeState(newState);
    if (rewardPoints > 0) {
      onAddLifetimePoints(rewardPoints);
      setClaimedNotice(`🎉 Selamat! +${rewardPoints} PTS berhasil ditambahkan ke Total Poin!`);
      setTimeout(() => setClaimedNotice(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white overflow-hidden">
        {/* Close Button */}
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-400 shadow-md">
            <Trophy className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-arcade text-xl sm:text-2xl text-amber-400 font-bold tracking-wide">
                TANTANGAN HARIAN
              </h2>
              <span className="text-[10px] bg-amber-950/90 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/50">
                DAILY
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset dalam: <strong className="text-amber-300 font-mono">{timeRemainingStr}</strong></span>
            </div>
          </div>
        </div>

        {/* Claimed Toast Banner */}
        {claimedNotice && (
          <div className="mb-4 p-2.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-bold text-center animate-bounce shadow-lg">
            {claimedNotice}
          </div>
        )}

        {/* Overall Progress Bar Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              PROGRES TANTANGAN HARI INI
            </span>
            <span className="font-arcade text-amber-400">
              {completedCount} / {totalCount} SELESAI
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
            />
          </div>
        </div>

        {/* Daily Challenges List */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {challengeState.challenges.map((ch) => {
            const progressPercent = Math.min(100, Math.round((ch.currentProgress / ch.target) * 100));

            return (
              <div
                key={ch.id}
                className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  ch.isClaimed
                    ? 'bg-slate-950/50 border-slate-800/80 opacity-75'
                    : ch.isCompleted
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl p-1 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
                      {ch.icon}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        {ch.title}
                        {ch.isCompleted && !ch.isClaimed && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-600 px-1.5 py-0.2 rounded font-mono animate-pulse">
                            SELESAI
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 leading-snug mt-0.5">
                        {ch.description}
                      </p>
                    </div>
                  </div>

                  {/* Reward Tag */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-arcade font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                      +{ch.rewardPoints} PTS
                    </span>
                  </div>
                </div>

                {/* Progress & Action Button */}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-800/80">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span>Progres</span>
                      <span className="text-slate-200">
                        {ch.currentProgress} / {ch.target}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          ch.isCompleted
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'bg-amber-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  {ch.isClaimed ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold px-3 py-1.5 bg-emerald-950/40 rounded-xl border border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      Diklaim
                    </div>
                  ) : ch.isCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(ch)}
                      className="py-1.5 px-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-arcade font-black text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-bounce active:scale-95 transition"
                    >
                      🎁 KLAIM
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        audio.playClick();
                        onClose();
                        if (onStartChallenge) onStartChallenge();
                      }}
                      className="py-1.5 px-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 rounded-xl text-xs font-bold text-purple-200 flex items-center gap-1 active:scale-95 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-purple-300" />
                      MAINKAN
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-slate-950/60 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-slate-300">
              Selesaikan semua tantangan harian untuk piala & total poin maksimal!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
