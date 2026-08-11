import React from 'react';
import { Crown, Flame, Sparkles, Zap } from 'lucide-react';
import { ActionType } from '../types';

interface EmoteBarProps {
  onTriggerEmote: (emote: 'taunt_crown' | 'taunt_flex' | 'taunt_dance' | 'taunt_shuffle') => void;
  currentAction?: ActionType;
  className?: string;
  compact?: boolean;
}

export const EMOTE_LIST = [
  {
    id: 'taunt_crown' as const,
    label: 'Mahkota Juara',
    sublabel: 'Crown',
    icon: Crown,
    badgeEmoji: '👑',
    btnClass: 'hover:bg-amber-500/20 hover:border-amber-400 text-amber-400 border-slate-700/80',
    activeClass: 'bg-amber-500 text-slate-950 font-black border-amber-300 ring-2 ring-amber-400/50 scale-105',
  },
  {
    id: 'taunt_flex' as const,
    label: 'Pamer Otot',
    sublabel: 'Muscle Flex',
    icon: Flame,
    badgeEmoji: '💪',
    btnClass: 'hover:bg-orange-500/20 hover:border-orange-400 text-orange-400 border-slate-700/80',
    activeClass: 'bg-orange-500 text-slate-950 font-black border-orange-300 ring-2 ring-orange-400/50 scale-105',
  },
  {
    id: 'taunt_dance' as const,
    label: 'Joget KO',
    sublabel: 'Disco Dance',
    icon: Sparkles,
    badgeEmoji: '🕺',
    btnClass: 'hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-400 border-slate-700/80',
    activeClass: 'bg-emerald-500 text-slate-950 font-black border-emerald-300 ring-2 ring-emerald-400/50 scale-105',
  },
  {
    id: 'taunt_shuffle' as const,
    label: 'Kilat Dodge',
    sublabel: 'Speed Dodge',
    icon: Zap,
    badgeEmoji: '⚡',
    btnClass: 'hover:bg-sky-500/20 hover:border-sky-400 text-sky-400 border-slate-700/80',
    activeClass: 'bg-sky-500 text-slate-950 font-black border-sky-300 ring-2 ring-sky-400/50 scale-105',
  },
];

export const EmoteBar: React.FC<EmoteBarProps> = ({
  onTriggerEmote,
  currentAction,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xl backdrop-blur-md flex flex-col items-center gap-1.5 ${className}`}>
      <div className="w-full flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400" /> TAUNT & EMOTE SELEKSI
        </span>
        <span className="text-amber-400/80 font-arcade text-[9px]">TAP KAPAN SAJA!</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 w-full">
        {EMOTE_LIST.map((emote) => {
          const Icon = emote.icon;
          const isActive = currentAction === emote.id;

          return (
            <button
              key={emote.id}
              onClick={() => onTriggerEmote(emote.id)}
              className={`py-2 px-1 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 active:scale-95 select-none ${
                isActive ? emote.activeClass : `bg-slate-950/80 ${emote.btnClass}`
              }`}
              title={emote.label}
            >
              <div className="flex items-center gap-1 text-sm sm:text-base font-black">
                <span>{emote.badgeEmoji}</span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950 fill-current' : ''}`} />
              </div>
              {!compact && (
                <span className="text-[10px] font-bold leading-none truncate w-full text-center tracking-tight">
                  {emote.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
