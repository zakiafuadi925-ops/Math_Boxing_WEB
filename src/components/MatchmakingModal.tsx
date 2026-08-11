import React, { useEffect, useState } from 'react';
import { Swords, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { GameMode } from '../types';

interface MatchmakingModalProps {
  mode: GameMode;
  roomCode?: string;
  onCancel: () => void;
  onMatchFound: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  mode,
  roomCode,
  onCancel,
  onMatchFound,
}) => {
  const [searchTimer, setSearchTimer] = useState(15);
  const [matchStatus, setMatchStatus] = useState<'searching' | 'found'>('searching');
  const [opponentName, setOpponentName] = useState('Opponent Player');

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    // Simulate matchmaking search
    const interval = setInterval(() => {
      setSearchTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setMatchStatus('found');
          setOpponentName('Champ_Boy_99');
          timerId = setTimeout(() => {
            onMatchFound();
          }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fast-track match found for testing/demo after 2.5s
    const fastTrack = setTimeout(() => {
      clearInterval(interval);
      setMatchStatus('found');
      setOpponentName(mode === 'private_room' ? 'Friend_Room_P2' : 'Speedy_Math_Kid');
      timerId = setTimeout(() => {
        onMatchFound();
      }, 1500);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(fastTrack);
      if (timerId) clearTimeout(timerId);
    };
  }, [mode, onMatchFound]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-300 animate-pulse"></div>

        {matchStatus === 'searching' ? (
          <div className="space-y-4 my-2">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center relative">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <Swords className="w-5 h-5 text-amber-300 absolute" />
            </div>

            <div>
              <h3 className="font-arcade text-xl text-amber-400">
                {mode === 'private_room' ? 'MENUNGGU TEMAN...' : 'MENCARI LAWAN ONLINE'}
              </h3>
              {roomCode && (
                <div className="mt-2 inline-block bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-xs text-amber-300 font-mono">
                  ROOM CODE: <span className="font-bold text-amber-400">{roomCode}</span>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Sistem sedang mencocokkan ketersediaan room di server... ({searchTimer}s)
              </p>
            </div>

            <button
              onClick={onCancel}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              BATALKAN MATCHMAKING
            </button>
          </div>
        ) : (
          <div className="space-y-4 my-2 animate-bounce">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="font-arcade text-2xl text-emerald-400">LAWAN DITEMUKAN!</h3>
              <p className="text-sm font-bold text-slate-200 mt-1">VS {opponentName}</p>
              <span className="text-xs text-slate-400 block mt-1">Menyiapkan arena ring tinju...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
