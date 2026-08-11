import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Home, Flame, CheckCircle, XCircle, TrendingUp, Activity } from 'lucide-react';
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
import { PlayerState, AnswerHistoryPoint, ActionType } from '../types';
import { audio } from '../utils/audio';
import { BoxerCanvas } from './BoxerCanvas';
import { EmoteBar } from './EmoteBar';

interface GameOverModalProps {
  p1: PlayerState;
  p2: PlayerState;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  highestCombo: number;
  answerHistory?: AnswerHistoryPoint[];
  onRematch: () => void;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  p1,
  p2,
  totalAnswered,
  correctCount,
  wrongCount,
  highestCombo,
  answerHistory = [],
  onRematch,
  onExit,
}) => {
  const isP1Winner = p1.score > p2.score;
  const isDraw = p1.score === p2.score;

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
  const chartData = React.useMemo(() => {
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
        }`}></div>

        {/* Top Header Result */}
        <div className="my-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-500/40 text-amber-400 mb-2 shadow-lg">
            <Trophy className="w-7 h-7" />
          </div>

          <h2 className="font-arcade text-2xl sm:text-3xl text-amber-400 tracking-wider">
            TIME UP!
          </h2>

          <div className="mt-1 font-arcade text-lg sm:text-xl text-slate-100">
            {isDraw ? (
              <span className="text-yellow-400">PERTANDINGAN SERI!</span>
            ) : isP1Winner ? (
              <span className="text-emerald-400">KAMU MENANG (KO)!</span>
            ) : (
              <span className="text-rose-400">LAWAN MENANG!</span>
            )}
          </div>
        </div>

        {/* Victory Ring Boxer Canvas & Interactive Emote Controls */}
        <div className="my-3 space-y-2">
          <div className="rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl max-h-[220px]">
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

        {/* Score Comparison Board */}
        <div className="my-3 bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold block">{p1.name} (P1)</span>
            <span className="font-arcade text-2xl sm:text-3xl text-amber-400 block mt-0.5">{p1.score}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">SKOR AKHIR</span>
          </div>

          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold block">{p2.name} (P2)</span>
            <span className="font-arcade text-2xl sm:text-3xl text-blue-400 block mt-0.5">{p2.score}</span>
            <span className="text-[10px] text-slate-400 font-semibold">SKOR AKHIR</span>
          </div>
        </div>

        {/* Stats Breakdown */}
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

          <div className="w-full h-44 mt-1">
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

        {/* Control Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => {
              audio.playClick();
              onExit();
            }}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            MENU UTAMA
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onRematch();
            }}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-1.5 glow-gold"
          >
            <RefreshCw className="w-4 h-4" />
            REMATCH
          </button>
        </div>
      </div>
    </div>
  );
};
