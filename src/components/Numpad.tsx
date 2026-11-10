import React, { useState, useEffect, useCallback, memo } from 'react';
import { Delete, CornerDownLeft, Lock } from 'lucide-react';
import { audio } from '../utils/audio';

interface NumpadProps {
  onSubmitAnswer: (val: number) => void;
  isLocked: boolean;
  disabled?: boolean;
}

export const Numpad: React.FC<NumpadProps> = memo(({ onSubmitAnswer, isLocked, disabled }) => {
  const [inputVal, setInputVal] = useState<string>('');

  const handleDigit = useCallback((d: string) => {
    if (isLocked || disabled) return;
    audio.playClick();
    if (inputVal.length >= 6) return;
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
    <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-slate-700/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-xl touch-fast gpu-accelerated">
      {/* Display Screen */}
      <div className="relative mb-1 sm:mb-1.5 bg-slate-950 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1 text-right flex items-center justify-between min-h-[34px] sm:min-h-[42px]">
        <span className="text-[9px] sm:text-xs uppercase tracking-wider font-bold text-slate-500">
          {isLocked ? '🔒 PENALTY LOCK' : 'JAWABAN'}
        </span>
        <span
          className={`font-arcade text-lg sm:text-2xl font-extrabold tracking-wider ${
            isLocked ? 'text-red-500 animate-pulse text-sm sm:text-lg' : 'text-amber-400'
          }`}
        >
          {inputVal || (isLocked ? 'SALAH! (1s)' : '0')}
        </span>

        {isLocked && (
          <div className="absolute inset-0 bg-red-950/90 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-red-300 font-bold text-xs">
            <Lock className="w-3.5 h-3.5 animate-spin" />
            JAWABAN SALAH! TUNGGU 1s
          </div>
        )}
      </div>

      {/* Calculator Buttons Grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num)}
            disabled={isLocked || disabled}
            className="w-full h-9 sm:h-11 md:h-12 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-2 sm:border-b-4 border-slate-950 active:border-b-0 active:translate-y-0.5 rounded-lg sm:rounded-xl text-base sm:text-xl font-bold font-arcade transition-colors duration-75 text-slate-100 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none touch-fast"
          >
            {num}
          </button>
        ))}

        {/* Bottom Row Controls */}
        <button
          type="button"
          onClick={handleClear}
          disabled={isLocked || disabled}
          className="w-full h-9 sm:h-11 md:h-12 bg-rose-900/80 hover:bg-rose-800 active:bg-rose-600 border-b-2 sm:border-b-4 border-rose-950 active:border-b-0 active:translate-y-0.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-bold text-rose-200 transition-colors duration-75 flex items-center justify-center gap-1 shadow-md disabled:opacity-50 disabled:pointer-events-none touch-fast"
        >
          <Delete className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          CLR
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          disabled={isLocked || disabled}
          className="w-full h-9 sm:h-11 md:h-12 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-2 sm:border-b-4 border-slate-950 active:border-b-0 active:translate-y-0.5 rounded-lg sm:rounded-xl text-base sm:text-xl font-bold font-arcade transition-colors duration-75 text-slate-100 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none touch-fast"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleMinus}
          disabled={isLocked || disabled}
          className="w-full h-9 sm:h-11 md:h-12 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border-b-2 sm:border-b-4 border-slate-950 active:border-b-0 active:translate-y-0.5 rounded-lg sm:rounded-xl text-base sm:text-xl font-bold font-arcade transition-colors duration-75 text-amber-400 flex items-center justify-center shadow-md disabled:opacity-50 disabled:pointer-events-none touch-fast"
        >
          -
        </button>
      </div>

      {/* Full Width Submit Enter Button */}
      <div className="mt-1 sm:mt-1.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLocked || disabled || inputVal === '' || inputVal === '-'}
          className="w-full h-9 sm:h-11 md:h-12 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] border-b-2 sm:border-b-4 border-amber-700 rounded-lg sm:rounded-xl text-slate-950 font-arcade text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-transform disabled:opacity-50 disabled:pointer-events-none glow-gold touch-fast"
        >
          <CornerDownLeft className="w-4 h-4 stroke-[3]" />
          SERANG / ENTER
        </button>
      </div>
    </div>
  );
});
