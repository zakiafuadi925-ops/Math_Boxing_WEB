import React, { memo } from 'react';
import { MathQuestion, EducationLevel } from '../types';
import { Sparkles, Trophy, Flame, Zap, Star, ShieldAlert, GraduationCap } from 'lucide-react';

interface QuestionCardProps {
  question: MathQuestion;
  levelingStreak?: number; // 0, 1, or 2 (2 = hard challenge active)
}

export const QuestionCard: React.FC<QuestionCardProps> = memo(({ question, levelingStreak = 0 }) => {
  const isHardChallenge = Boolean(question.isHardChallenge || question.difficulty === 'hard');

  const getEducationBadge = (edu?: EducationLevel) => {
    switch (edu) {
      case 'paud':
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-pink-950/90 text-pink-300 border border-pink-500/50 flex items-center gap-1 uppercase tracking-wider">
            🐣 PAUD
          </span>
        );
      case 'tk':
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-950/90 text-orange-300 border border-orange-500/50 flex items-center gap-1 uppercase tracking-wider">
            🎈 TK
          </span>
        );
      case 'smp':
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 uppercase tracking-wider">
            📐 SMP
          </span>
        );
      case 'sma':
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-500/50 flex items-center gap-1 uppercase tracking-wider">
            🔬 SMA
          </span>
        );
      case 'kuliah':
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-500/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_8px_rgba(168,85,247,0.4)]">
            <GraduationCap className="w-2.5 h-2.5" /> KULIAH
          </span>
        );
      case 'sd':
      default:
        return (
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-500/50 flex items-center gap-1 uppercase tracking-wider">
            🎒 SD
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'counting': return '🍎 COUNTING';
      case 'algebra': return '📐 ALJABAR';
      case 'roots': return '⚡ AKAR PANGKAT';
      case 'physics': return '🏎️ FISIKA';
      case 'geometry': return '📦 GEOMETRI';
      case 'arithmetic': default: return '➕ ARITMATIKA';
    }
  };

  const getDifficultyBadge = () => {
    if (isHardChallenge) {
      return (
        <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-amber-300 flex items-center gap-1 uppercase tracking-wider animate-pulse">
          <Flame className="w-3 h-3 text-yellow-200 fill-yellow-200" /> SOAL SULIT BONUS
        </span>
      );
    }
    const diff = question.difficulty || 'easy';
    if (diff === 'medium') {
      return (
        <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-950/90 text-amber-400 border border-amber-500/50 flex items-center gap-1 uppercase tracking-wider">
          <Zap className="w-2.5 h-2.5 text-amber-400" /> MENENGAH
        </span>
      );
    }
    return (
      <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-500/50 flex items-center gap-1 uppercase tracking-wider">
        <Star className="w-2.5 h-2.5 text-emerald-400" /> MUDAH
      </span>
    );
  };

  return (
    <div
      className={`w-full max-w-md mx-auto rounded-xl px-2.5 py-1.5 sm:py-2 shadow-lg text-center relative overflow-hidden gpu-accelerated transition-all duration-300 ${
        isHardChallenge
          ? 'bg-gradient-to-b from-slate-900 via-red-950/40 to-slate-900 border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          : 'bg-slate-900/95 border border-slate-700/80'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {getEducationBadge(question.educationLevel)}
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {getCategoryLabel(question.category)}
          </span>
          {getDifficultyBadge()}
        </div>

        <span
          className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 font-arcade ${
            isHardChallenge
              ? 'bg-amber-500 text-slate-950 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-bounce'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          <Trophy className={`w-3 h-3 ${isHardChallenge ? 'text-slate-950' : 'text-amber-400'}`} />
          +{question.scoreValue} PTS
        </span>
      </div>

      {/* Main Question Box */}
      <div
        className={`border rounded-lg px-2 py-1.5 sm:py-2 flex flex-col items-center justify-center min-h-[44px] sm:min-h-[58px] transition-colors ${
          isHardChallenge
            ? 'bg-slate-950/90 border-amber-500/40'
            : 'bg-slate-950 border-slate-800'
        }`}
      >
        {question.subText && (
          <span
            className={`text-[10px] font-semibold mb-0.5 uppercase tracking-wide flex items-center gap-1 ${
              isHardChallenge ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            {isHardChallenge && <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />}
            {question.subText}
          </span>
        )}

        <h2
          className={`font-arcade text-xl sm:text-2xl tracking-wide drop-shadow-md ${
            isHardChallenge ? 'text-amber-300 text-2xl sm:text-3xl' : 'text-slate-100'
          }`}
        >
          {question.questionText}
        </h2>

        {/* Visual Item Rendering for Counting Questions */}
        {question.visualItem && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 max-w-[280px] p-1 bg-slate-900/80 rounded-lg border border-slate-800">
            {Array.from({ length: question.visualItem.count }).map((_, idx) => (
              <span
                key={idx}
                className="text-xl sm:text-2xl"
              >
                {question.visualItem?.icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mini Leveling Tracker Bar */}
      <div className="mt-1 flex items-center justify-between px-1 text-[9px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          Tantangan Soal:
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.2 rounded font-bold transition-all ${
              levelingStreak >= 1 || isHardChallenge
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            Soal 1 {levelingStreak >= 1 || isHardChallenge ? '✓' : ''}
          </span>
          <span className="text-slate-600">→</span>
          <span
            className={`px-1.5 py-0.2 rounded font-bold transition-all ${
              levelingStreak >= 2 || isHardChallenge
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            Soal 2 {levelingStreak >= 2 || isHardChallenge ? '✓' : ''}
          </span>
          <span className="text-slate-600">→</span>
          <span
            className={`px-1.5 py-0.2 rounded font-black transition-all flex items-center gap-0.5 ${
              isHardChallenge
                ? 'bg-red-500 text-white border border-yellow-300 animate-pulse'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Flame className="w-2.5 h-2.5" />
            {isHardChallenge ? 'SOAL SULIT AKTIF!' : 'Soal Sulit'}
          </span>
        </div>
      </div>
    </div>
  );
});



