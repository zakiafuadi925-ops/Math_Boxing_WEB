import React, { memo } from 'react';
import { MathQuestion } from '../types';
import { Sparkles, Trophy, Flame, Zap, Star } from 'lucide-react';

interface QuestionCardProps {
  question: MathQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = memo(({ question }) => {
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
    const diff = question.difficulty || 'easy';
    if (diff === 'hard') {
      return (
        <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-950/90 text-red-400 border border-red-500/50 flex items-center gap-1 uppercase tracking-wider">
          <Flame className="w-2.5 h-2.5 text-red-500" /> SULIT
        </span>
      );
    }
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
    <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 sm:py-2 shadow-lg text-center relative overflow-hidden gpu-accelerated">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {getCategoryLabel(question.category)}
          </span>
          {getDifficultyBadge()}
        </div>

        <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-arcade">
          <Trophy className="w-3 h-3 text-amber-400" />
          +{question.scoreValue} PTS
        </span>
      </div>

      {/* Main Question Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 sm:py-2 flex flex-col items-center justify-center min-h-[44px] sm:min-h-[58px]">
        {question.subText && (
          <span className="text-[10px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wide">
            {question.subText}
          </span>
        )}

        <h2 className="font-arcade text-xl sm:text-2xl text-slate-100 tracking-wide drop-shadow-md">
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
    </div>
  );
});


