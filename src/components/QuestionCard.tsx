import React from 'react';
import { MathQuestion } from '../types';
import { Sparkles, Trophy, HelpCircle } from 'lucide-react';

interface QuestionCardProps {
  question: MathQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'counting': return '🍎 VISUAL COUNTING';
      case 'algebra': return '📐 ALJABAR (Cari X)';
      case 'roots': return '⚡ AKAR PANGKAT';
      case 'physics': return '🏎️ FISIKA (s, v, t)';
      case 'geometry': return '📦 GEOMETRI (Volume/Luas)';
      case 'arithmetic': default: return '➕ ARITMATIKA';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-4 shadow-xl text-center relative overflow-hidden">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          {getCategoryLabel(question.category)}
        </span>

        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-arcade">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          +{question.scoreValue} PTS
        </span>
      </div>

      {/* Main Question Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 my-2 flex flex-col items-center justify-center min-h-[90px]">
        {question.subText && (
          <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">
            {question.subText}
          </span>
        )}

        <h2 className="font-arcade text-2xl sm:text-3xl text-slate-100 tracking-wide drop-shadow-md">
          {question.questionText}
        </h2>

        {/* Visual Item Rendering for Counting Questions */}
        {question.visualItem && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 max-w-[280px] p-2 bg-slate-900/80 rounded-xl border border-slate-800">
            {Array.from({ length: question.visualItem.count }).map((_, idx) => (
              <span
                key={idx}
                className="text-2xl sm:text-3xl animate-bounce"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                {question.visualItem?.icon}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
        <HelpCircle className="w-3.5 h-3.5" />
        Ketik jawaban pada numpad di bawah, lalu tekan ENTER!
      </div>
    </div>
  );
};
