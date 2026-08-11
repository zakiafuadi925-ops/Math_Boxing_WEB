import React, { useState, useEffect, useCallback } from 'react';
import { Delete, CornerDownLeft, Lock } from 'lucide-react';
import { audio } from '../utils/audio';

interface NumpadProps {
  onSubmitAnswer: (val: number) => void;
  isLocked: boolean;
  disabled?: boolean;
}

export const Numpad: React.FC<NumpadProps> = ({ onSubmitAnswer, isLocked, disabled }) => {
  const [inputVal, setInputVal] = useState<string>('');

  const handleDigit = useCallback((d: string) => {
    if (isLocked || disabled) return;
    audio.playClick();
    if (inputVal.length >= 6) return; // Prevent unreasonable string length
    setInputVal((prev) => (prev === '0' ? d : prev + d));
  }, [isLocked, disabled, inputVal]);

  const handleMinus = useCallback(() => {
    if (isLocked || disabled) return;
    audio.playClick();
    if (inputVal === '') {
      setInputVal('-');
    }
  }, [isLocked, disabled, inputVal]);

  const handleClear = useCallback(() => {
    if (isLocked || disabled) return;
    audio.playClick();
    setInputVal('');
  }, [isLocked, disabled]);

  const handleSubmit = useCallback(() => {
    if (isLocked || disabled || inputVal === '' || inputVal === '-') return;
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed)) {
      onSubmitAnswer(parsed);
      setInputVal('');
    }
  }, [isLocked, disabled, inputVal, onSubmitAnswer]);

  // Keyboard shortcut listener for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || disabled) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '-') {
        handleMinus();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleClear();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleMinus, handleClear, handleSubmit, isLocked, disabled]);

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 backdrop-blur border-2 border-slate-700/80 rounded-2xl p-4 shadow-xl">
      {/* Display Screen */}
      <div className="relative mb-3 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-3 text-right flex items-center justify-between min-h-[58px]">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
          {isLocked ? '🔒 PENALTY LOCK' : 'INPUT'}
        </span>
        <span className={`font-arcade text-3xl font-extrabold tracking-wider ${
          isLocked ? 'text-red-500 animate-pulse' : 'text-amber-400'
        }`}>
          {inputVal || (isLocked ? 'LOCKED (1s)' : '0')}
        </span>

        {isLocked && (
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
            <Lock className="w-4 h-4 animate-spin" />
            WRONG ANSWER! WAIT 1s
          </div>
        )}
      </div>

      {/* Calculator Buttons Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
          <div key={num} className="relative group">
            <button
              onClick={() => handleDigit(num)}
              disabled={isLocked || disabled}
              className="w-full h-14 sm:h-16 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 rounded-xl text-2xl font-bold font-arcade transition-all duration-75 text-slate-100 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none"
            >
              {num}
            </button>
            {/* Pop-up Tooltip */}
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-slate-950 text-amber-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
              <span>Angka {num}</span>
            </div>
          </div>
        ))}

        {/* Bottom Row Controls */}
        <div className="relative group">
          <button
            onClick={handleClear}
            disabled={isLocked || disabled}
            className="w-full h-14 sm:h-16 bg-rose-900/80 hover:bg-rose-800 active:bg-rose-600 border-b-4 border-rose-950 active:border-b-0 active:translate-y-1 rounded-xl text-lg font-bold text-rose-200 transition-all duration-75 flex items-center justify-center gap-1 shadow-md disabled:opacity-50 disabled:pointer-events-none"
          >
            <Delete className="w-5 h-5" />
            CLR
          </button>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-slate-950 text-rose-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
            <Delete className="w-3 h-3 text-rose-400" />
            <span>Clear Input</span>
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={() => handleDigit('0')}
            disabled={isLocked || disabled}
            className="w-full h-14 sm:h-16 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 rounded-xl text-2xl font-bold font-arcade transition-all duration-75 text-slate-100 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none"
          >
            0
          </button>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-slate-950 text-amber-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
            <span>Angka 0</span>
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={handleMinus}
            disabled={isLocked || disabled}
            className="w-full h-14 sm:h-16 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 rounded-xl text-2xl font-bold font-arcade transition-all duration-75 text-amber-400 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none"
          >
            -
          </button>
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-slate-950 text-amber-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
            <span className="font-arcade text-amber-400 text-xs">-</span>
            <span>Nilai Negatif</span>
          </div>
        </div>
      </div>

      {/* Full Width Submit Enter Button */}
      <div className="relative group mt-3">
        <button
          onClick={handleSubmit}
          disabled={isLocked || disabled || inputVal === '' || inputVal === '-'}
          className="w-full h-14 sm:h-16 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] border-b-4 border-amber-700 rounded-xl text-slate-950 font-arcade text-xl sm:text-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none glow-gold"
        >
          <CornerDownLeft className="w-6 h-6 stroke-[3]" />
          ENTER ANSWER
        </button>
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-slate-950 text-emerald-400 border border-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3" />
          <span>Kirim Jawaban (Enter)</span>
        </div>
      </div>
    </div>
  );
};
