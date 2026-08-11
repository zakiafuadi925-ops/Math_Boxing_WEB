import React, { useEffect, useState } from 'react';
import { Flame, Zap, Award, Sparkles, Crown, Trophy } from 'lucide-react';

interface ComboTrackerProps {
  combo: number;
  lastBonusPoints?: number | null;
}

export const getComboMultiplier = (combo: number): { multiplier: number; label: string; colorClass: string; borderClass: string } => {
  if (combo >= 10) return { multiplier: 5, label: '5X ULTRA COMBO!', colorClass: 'from-amber-500 via-rose-500 to-yellow-400 text-white', borderClass: 'border-amber-400 shadow-amber-500/50' };
  if (combo >= 7) return { multiplier: 3, label: '3X SUPER COMBO!', colorClass: 'from-purple-500 to-pink-500 text-white', borderClass: 'border-purple-400 shadow-purple-500/50' };
  if (combo >= 4) return { multiplier: 2, label: '2X COMBO STREAK!', colorClass: 'from-orange-500 to-amber-500 text-slate-950', borderClass: 'border-orange-400 shadow-orange-500/50' };
  if (combo >= 2) return { multiplier: 1.5, label: '1.5X STREAK!', colorClass: 'from-yellow-500 to-amber-400 text-slate-950', borderClass: 'border-yellow-400 shadow-yellow-500/40' };
  return { multiplier: 1, label: 'NO COMBO', colorClass: 'from-slate-800 to-slate-900 text-slate-400', borderClass: 'border-slate-800 shadow-none' };
};

interface MilestoneBanner {
  comboCount: number;
  title: string;
  subtitle: string;
  badgeEmoji: string;
  bgGradient: string;
  borderColor: string;
  glowShadow: string;
}

export const ComboTracker: React.FC<ComboTrackerProps> = ({ combo, lastBonusPoints }) => {
  const { multiplier, label, colorClass, borderClass } = getComboMultiplier(combo);
  const [activeBanner, setActiveBanner] = useState<MilestoneBanner | null>(null);

  // Trigger floating milestone banner when combo reaches key thresholds
  useEffect(() => {
    if (combo <= 1) return;

    let bannerConfig: MilestoneBanner | null = null;

    if (combo === 5 || (combo > 5 && combo % 5 === 0)) {
      if (combo >= 20) {
        bannerConfig = {
          comboCount: combo,
          title: `👑 ${combo} LEGENDARY COMBO!`,
          subtitle: 'UNSTOPPABLE 5X MULTIPLIER MAXED OUT!',
          badgeEmoji: '🌟',
          bgGradient: 'from-amber-400 via-rose-500 to-yellow-300 text-slate-950 font-black',
          borderColor: 'border-amber-300',
          glowShadow: 'shadow-[0_0_50px_rgba(245,158,11,1),0_0_30px_rgba(239,68,68,0.8)] ring-4 ring-amber-300',
        };
      } else if (combo >= 10) {
        bannerConfig = {
          comboCount: combo,
          title: `⚡ ${combo} ULTRA COMBO!`,
          subtitle: '5X MULTIPLIER UNLOCKED!',
          badgeEmoji: '💥',
          bgGradient: 'from-purple-600 via-pink-500 to-amber-400 text-white font-black',
          borderColor: 'border-purple-300',
          glowShadow: 'shadow-[0_0_40px_rgba(168,85,247,0.95)] ring-2 ring-purple-300',
        };
      } else {
        bannerConfig = {
          comboCount: combo,
          title: `🔥 ${combo} STREAK MILESTONE!`,
          subtitle: '2X BONUS MULTIPLIER!',
          badgeEmoji: '⚡',
          bgGradient: 'from-orange-500 to-amber-400 text-slate-950 font-black',
          borderColor: 'border-orange-300',
          glowShadow: 'shadow-[0_0_30px_rgba(249,115,22,0.9)] ring-2 ring-amber-300',
        };
      }
    } else if (combo === 2 || combo === 4 || combo === 7) {
      const mult = combo >= 7 ? '3X' : combo >= 4 ? '2X' : '1.5X';
      bannerConfig = {
        comboCount: combo,
        title: `🔥 ${combo} COMBO STREAK!`,
        subtitle: `${mult} SCORE MULTIPLIER`,
        badgeEmoji: '⚡',
        bgGradient: 'from-yellow-400 to-amber-500 text-slate-950 font-black',
        borderColor: 'border-yellow-300',
        glowShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.8)]',
      };
    }

    if (bannerConfig) {
      setActiveBanner(bannerConfig);
      const timer = setTimeout(() => {
        setActiveBanner(null);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [combo]);

  // Dynamic intense glow levels based on combo streak height
  const getGlowIntensity = (c: number) => {
    if (c >= 10) {
      return {
        containerGlow: 'shadow-[0_0_35px_rgba(245,158,11,1),0_0_20px_rgba(244,63,94,0.9)] scale-110 ring-4 ring-amber-300 animate-bounce',
        textGlow: 'drop-shadow-[0_0_16px_rgba(255,255,255,1)] drop-shadow-[0_0_8px_rgba(250,204,21,1)] tracking-widest text-amber-100',
        flameClass: 'text-amber-300 fill-amber-400 animate-spin',
      };
    }
    if (c >= 7) {
      return {
        containerGlow: 'shadow-[0_0_28px_rgba(168,85,247,0.95),0_0_14px_rgba(236,72,153,0.7)] scale-105 ring-2 ring-purple-400/80 animate-pulse',
        textGlow: 'drop-shadow-[0_0_12px_rgba(216,180,254,1)] drop-shadow-[0_0_6px_rgba(168,85,247,0.9)] text-purple-100',
        flameClass: 'text-purple-300 fill-purple-400 animate-pulse',
      };
    }
    if (c >= 4) {
      return {
        containerGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.85)] scale-105 animate-pulse',
        textGlow: 'drop-shadow-[0_0_10px_rgba(253,186,116,1)] drop-shadow-[0_0_4px_rgba(249,115,22,0.8)] text-slate-950 font-black',
        flameClass: 'text-orange-400 fill-amber-400',
      };
    }
    if (c >= 2) {
      return {
        containerGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
        textGlow: 'drop-shadow-[0_0_6px_rgba(254,240,138,0.8)] text-slate-950',
        flameClass: 'text-yellow-400 fill-amber-400',
      };
    }
    return {
      containerGlow: 'shadow-none',
      textGlow: 'text-slate-400',
      flameClass: 'text-slate-600',
    };
  };

  const { containerGlow, textGlow, flameClass } = getGlowIntensity(combo);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Prominent Floating Milestone Overlay Banner */}
      {activeBanner && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-11/12 max-w-md animate-bounce">
          <div
            className={`bg-gradient-to-r ${activeBanner.bgGradient} border-2 ${activeBanner.borderColor} ${activeBanner.glowShadow} rounded-2xl px-4 py-2 flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-300 scale-105`}
          >
            <div className="text-2xl sm:text-3xl animate-pulse">
              {activeBanner.badgeEmoji}
            </div>
            <div className="flex-1 text-center">
              <div className="font-arcade text-xs sm:text-sm font-black tracking-wider uppercase drop-shadow-md">
                {activeBanner.title}
              </div>
              <div className="text-[10px] sm:text-xs font-bold opacity-90 tracking-tight">
                {activeBanner.subtitle}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl animate-pulse">
              {activeBanner.badgeEmoji}
            </div>
          </div>
        </div>
      )}

      {/* Main HUD Bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 backdrop-blur shadow-md transition-all duration-300">
        {/* Left: Combo Flame & Streak Counter */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg flex items-center justify-center transition-all duration-300 ${
            combo > 0 ? 'bg-amber-500/20 text-amber-400 animate-bounce' : 'bg-slate-800 text-slate-600'
          }`}>
            <Flame className={`w-5 h-5 ${flameClass}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">
                COMBO STREAK
              </span>
              {combo > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border transition-all ${
                  combo >= 7
                    ? 'bg-purple-950 text-purple-300 border-purple-600 animate-pulse'
                    : combo >= 4
                    ? 'bg-orange-950 text-orange-300 border-orange-600'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                }`}>
                  ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span className={`font-arcade text-lg font-black tracking-wider transition-all ${
                combo >= 10
                  ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,1)] animate-pulse'
                  : combo >= 7
                  ? 'text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]'
                  : combo >= 4
                  ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                  : combo > 0
                  ? 'text-yellow-300'
                  : 'text-slate-500'
              }`}>
                {combo} {combo === 1 ? 'HIT' : 'HITS'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Visual Combo Progress Dots */}
        <div className="hidden sm:flex items-center gap-1">
          {[1, 2, 3, 4, 5, 7, 10, 15, 20].map((step) => {
            const isReached = combo >= step;
            return (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step <= 3 ? 'w-3.5' : step <= 7 ? 'w-4.5' : 'w-5.5'
                } ${
                  isReached
                    ? step >= 15
                      ? 'bg-gradient-to-r from-amber-300 via-rose-500 to-yellow-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,1)] ring-1 ring-amber-300'
                      : step >= 10
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,1)]'
                      : step >= 7
                      ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                      : step >= 4
                      ? 'bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.7)]'
                      : 'bg-yellow-400'
                    : 'bg-slate-800'
                }`}
                title={`Reach ${step} combo`}
              />
            );
          })}
        </div>

        {/* Right: Multiplier Badge with Dynamic Intense Glow */}
        <div className="flex items-center gap-2">
          {lastBonusPoints && lastBonusPoints > 0 ? (
            <div className="animate-bounce bg-emerald-500 text-slate-950 font-arcade font-bold text-xs px-2 py-0.5 rounded-lg shadow-lg ring-2 ring-emerald-300">
              +{lastBonusPoints} BONUS!
            </div>
          ) : null}

          <div className={`px-2.5 py-1 rounded-xl border text-xs font-arcade font-black tracking-wider bg-gradient-to-r ${colorClass} ${borderClass} ${containerGlow} flex items-center gap-1 transition-all duration-300`}>
            <Sparkles className={`w-3.5 h-3.5 ${combo >= 4 ? 'animate-spin' : ''}`} />
            <span className={textGlow}>
              {multiplier > 1 ? `${multiplier}x MULTIPLIER` : '1x NORMAL'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

