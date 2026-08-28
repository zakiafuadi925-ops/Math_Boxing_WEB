import React from 'react';
import { MathQuestion } from '../types';
import { Sparkles, Trophy } from 'lucide-react';

interface QuestionCardProps {
  question: MathQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
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

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 sm:py-2 shadow-lg text-center relative overflow-hidden">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {getCategoryLabel(question.category)}
        </span>

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
                className="text-xl sm:text-2xl animate-bounce"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                {question.visualItem?.icon}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

