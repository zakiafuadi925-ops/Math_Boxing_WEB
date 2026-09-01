import React, { useEffect, useState, useRef } from "react";
import {
  Swords,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Bot,
  Timer,
  Sparkles,
  Users,
  Shield,
} from "lucide-react";
import { GameMode, GameDuration, QuestionCategory, MathQuestion } from "../types";
import { supabase, syncRoomState } from "../lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { audio } from "../utils/audio";
import { MathGenerator } from "../utils/mathGenerator";

interface MatchmakingModalProps {
  mode: GameMode;
  roomCode?: string;
  duration?: GameDuration;
  category?: QuestionCategory;
  playerName?: string;
  userId?: string;
  selectedSkinId?: string;
  onCancel: () => void;
  onMatchFound: (roomData?: {
    roomId: string;
    duration?: GameDuration;
    category?: QuestionCategory;
    initialQuestion?: MathQuestion;
    opponentName?: string;
    isBot?: boolean;
  }) => void;
  onSwitchToBot?: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  mode,
  roomCode,
  duration = 300,
  category = "all",
  playerName = "Pemain 1",
  userId,
  selectedSkinId,
  onCancel,
  onMatchFound,
  onSwitchToBot,
}) => {
  const [searchTimer, setSearchTimer] = useState(25);
  const [matchStatus, setMatchStatus] = useState<"searching" | "found">("searching");
  const [opponentInfo, setOpponentInfo] = useState<{
    name: string;
    avatarEmoji?: string;
    badge?: string;
  }>({ name: "Lawan Online" });

  const [copiedCode, setCopiedCode] = useState(false);
  const [searchStepText, setSearchStepText] = useState("Menghubungkan ke server ring tinju...");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasMatchedRef = useRef<boolean>(false);
  const myPlayerIdRef = useRef<string>(
    `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  const durationLabels: Record<GameDuration, { label: string; desc: string; icon: string }> = {
    60: { label: "1 Menit", desc: "⚡ Kilat (Sudden Death)", icon: "⚡" },
    300: { label: "5 Menit", desc: "⭐ Standar (Rekomendasi Anak)", icon: "⭐" },
    600: { label: "10 Menit", desc: "🏆 Marathon Fokus", icon: "🏆" },
  };

  useEffect(() => {
    hasMatchedRef.current = false;
    const myId = myPlayerIdRef.current;

    // Cycle text search animation
    const steps = [
      "Mencari petinju online yang siap bertanding...",
      "Menghubungkan sinyal ring multiplayer...",
      "Menyiapkan soal matematika seimbang...",
      "Memeriksa arena ring tinju...",
    ];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setSearchStepText(steps[stepIdx]);
    }, 3500);

    // Channel target name (normalize room code for private rooms)
    const normalizedRoomCode = roomCode
      ? roomCode.trim().replace(/\s+/g, "-").toUpperCase()
      : "";
    const channelName =
      mode === "private_room" && normalizedRoomCode
        ? `room_${normalizedRoomCode}`
        : `quick_match_queue_${duration}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: myId,
        },
        broadcast: {
          self: true,
        },
      },
    });

    channelRef.current = channel;

    // Sync private room creation to backend API & Supabase
    if (mode === "private_room" && normalizedRoomCode) {
      syncRoomState({
        roomCode: normalizedRoomCode,
        status: "waiting",
        hostId: userId,
      });
    }

    // Helper untuk konfirmasi pertandingan dan transisi kedua pemain
    const handleMatchConfirmed = (payload: any) => {
      if (hasMatchedRef.current || !payload) return;
      hasMatchedRef.current = true;
      setMatchStatus("found");
      audio.playBell();

      if (mode === "private_room" && normalizedRoomCode) {
        syncRoomState({
          roomCode: normalizedRoomCode,
          status: "in_game",
          hostId: payload.hostId === myId ? userId : undefined,
          guestId: payload.guestId === myId ? userId : undefined,
        });
      }

      const isHost = payload.hostId === myId;
      const oppName = isHost
        ? payload.guestName || (mode === "private_room" ? "Teman Kamar" : "Lawan Online")
        : payload.hostName || (mode === "private_room" ? "Host Kamar" : "Lawan Online");

      setOpponentInfo({
        name: oppName,
        badge: "Siap Bertarung!",
      });

      setTimeout(() => {
        onMatchFound({
          roomId: payload.roomId,
          duration: payload.duration || duration,
          category: payload.category || category,
          initialQuestion: payload.initialQuestion,
          opponentName: oppName,
          isBot: false,
        });
      }, 1200);
    };

    // Fungsi koordinasi presence untuk mencocokkan pemain
    const checkAndMatchPlayers = () => {
      if (hasMatchedRef.current) return;

      const state = channel.presenceState();
      const playerKeys = Object.keys(state);

      if (playerKeys.length >= 2) {
        // Cari pemain lain di presence state
        const otherKey = playerKeys.find((k) => k !== myId);
        if (!otherKey) return;

        const otherPlayerData = state[otherKey]?.[0] as any;
        const otherPlayerName =
          otherPlayerData?.playerName ||
          (mode === "private_room" ? "Teman Kamar" : "Lawan Online");

        // Pemain dengan ID leksikografis lebih kecil bertindak sebagai Host/Koordinator
        const isHost = myId < otherKey;

        if (isHost) {
          const dedicatedRoomId =
            mode === "private_room" && normalizedRoomCode
              ? `private_${normalizedRoomCode}_${Date.now()}`
              : `match_${Date.now()}_${myId.substring(2, 6)}_${otherKey.substring(2, 6)}`;
          const firstQuestion = MathGenerator.generateQuestion(category, "easy");

          const matchPayload = {
            roomId: dedicatedRoomId,
            hostId: myId,
            guestId: otherKey,
            hostName: playerName || "Pemain 1",
            guestName: otherPlayerName,
            duration: otherPlayerData?.duration || duration,
            category: category !== "all" ? category : (otherPlayerData?.category || "all"),
            initialQuestion: firstQuestion,
          };

          // Broadcast ke channel (guest akan menerima event ini)
          channel.send({
            type: "broadcast",
            event: "MATCH_CONFIRMED",
            payload: matchPayload,
          });

          // Host juga langsung transisi agar tidak pernah stuck
          handleMatchConfirmed(matchPayload);
        }
      }
    };

    // 1. Presence Sync & Join Listeners
    channel
      .on("presence", { event: "sync" }, checkAndMatchPlayers)
      .on("presence", { event: "join" }, checkAndMatchPlayers)
      // 2. Broadcast Listener: MATCH_CONFIRMED
      .on("broadcast", { event: "MATCH_CONFIRMED" }, ({ payload }) => {
        handleMatchConfirmed(payload);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            playerId: myId,
            playerName: playerName || "Pemain 1",
            duration,
            category,
            selectedSkinId,
            joinedAt: Date.now(),
          });
        }
      });

    // Countdown Timer
    const timerInterval = setInterval(() => {
      setSearchTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(timerInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [mode, roomCode, duration, category, playerName, selectedSkinId, onMatchFound]);

  const handleCancel = () => {
    audio.playClick();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    onCancel();
  };

  const handleSwitchToBot = () => {
    audio.playClick();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (onSwitchToBot) {
      onSwitchToBot();
    } else {
      // Direct match with AI
      onMatchFound({
        roomId: `bot_match_${Date.now()}`,
        duration,
        category,
        opponentName: "Bot Juara AI",
        isBot: true,
      });
    }
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    audio.playClick();
    try {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
        {/* Top glowing laser line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse"></div>

        {matchStatus === "searching" ? (
          <div className="space-y-4 my-1">
            {/* Animated Radar/Swords Icon */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 border-2 border-amber-500/30 animate-ping opacity-60"></div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-slate-900 border-2 border-amber-500/60 flex items-center justify-center shadow-lg relative">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-spin" />
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 absolute" />
              </div>
            </div>

            {/* Title & Mode */}
            <div>
              <h3 className="font-arcade text-lg sm:text-xl text-amber-400 tracking-wide uppercase">
                {mode === "private_room"
                  ? "MENUNGGU TEMAN..."
                  : "MENCARI LAWAN TANDING"}
              </h3>

              {/* Match Duration & Settings Pill */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Timer className="w-3 h-3 text-amber-400" />
                  {durationLabels[duration]?.label || "5 Menit"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 uppercase">
                  {category === "all" ? "Semua Materi" : category}
                </span>
              </div>

              {/* Private Room Code Widget with 1-Click Copy */}
              {mode === "private_room" && roomCode && (
                <div className="mt-3 bg-slate-950 border-2 border-purple-500/40 rounded-2xl p-3 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block mb-1">
                    KODE KAMAR PERTANDINGAN
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-purple-500/30">
                    <span className="font-arcade text-xl text-amber-400 font-black tracking-widest">
                      {roomCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Bagikan kode ini ke temanmu untuk bertarung di ring yang sama!
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 mt-2.5 min-h-[32px] flex items-center justify-center font-medium">
                {searchStepText}
              </p>

              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Waktu mencari: <span className="text-amber-400 font-bold">{searchTimer}s</span>
              </div>
            </div>

            {/* Quick Instant AI Fallback Action */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleSwitchToBot}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Bot className="w-4 h-4 text-blue-200" />
                <span>🥊 Tanding Lawan AI Sekarang (Tanpa Tunggu)</span>
              </button>

              <button
                onClick={handleCancel}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                BATALKAN MATCHMAKING
              </button>
            </div>
          </div>
        ) : (
          /* Match Found View */
          <div className="space-y-4 my-3 animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl animate-bounce">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-arcade font-bold uppercase tracking-wider mb-1">
                PERTANDINGAN SIAP!
              </div>
              <h3 className="font-arcade text-2xl text-emerald-400">
                LAWAN DITEMUKAN!
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mt-2 shadow-inner">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  MENANTANG
                </span>
                <span className="font-arcade text-lg text-slate-100 font-bold block text-amber-300">
                  {opponentInfo.name}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-1">
                  <Timer className="w-3 h-3 text-amber-400" />
                  Durasi: {durationLabels[duration]?.label || "5 Menit"}
                </span>
              </div>

              <span className="text-xs text-slate-400 block mt-2 animate-pulse">
                🥊 Menyiapkan arena ring tinju...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
