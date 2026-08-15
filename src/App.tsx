import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  GameStage,
  GameMode,
  QuestionCategory,
  PlayerState,
  MathQuestion,
  MatchRecord,
  AnswerHistoryPoint,
} from "./types";
import { MathGenerator } from "./utils/mathGenerator";
import { audio } from "./utils/audio";
import { BOXER_SKINS } from "./utils/skins";
import { recordMatchToChallenges } from "./utils/dailyChallenges";
import { supabase } from "./lib/supabase";
import { useAuth } from "./hooks/useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

import { MainMenu } from "./components/MainMenu";
import { MatchmakingModal } from "./components/MatchmakingModal";
import { BoxerCanvas } from "./components/BoxerCanvas";
import { QuestionCard } from "./components/QuestionCard";
import { Numpad } from "./components/Numpad";
import { GameOverModal } from "./components/GameOverModal";
import { ComboTracker, getComboMultiplier } from "./components/ComboTracker";
import { EmoteBar } from "./components/EmoteBar";

import { Timer, LogOut } from "lucide-react";

export default function App() {
  // Integrasi Custom Hook Supabase Auth
  const { user, profile, refreshProfile } = useAuth();

  // Navigation & Game State
  const [stage, setStage] = useState<GameStage>("main_menu");
  const [mode, setMode] = useState<GameMode>("practice");
  const [category, setCategory] = useState<QuestionCategory>("all");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "normal" | "hard">(
    "normal",
  );
  const [roomCode, setRoomCode] = useState<string>("");
  const [activeRoomId, setActiveRoomId] = useState<string>("");

  // Realtime Channel Ref
  const gameChannelRef = useRef<RealtimeChannel | null>(null);

  // Boxer Skins & Lifetime Progression
  const [lifetimeScore, setLifetimeScore] = useState<number>(() => {
    const saved = localStorage.getItem("mb_lifetime_score");
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [selectedSkinId, setSelectedSkinId] = useState<string>(() => {
    return localStorage.getItem("mb_selected_skin") || "rookie_red";
  });

  // Sinkronisasi data user dari Hook Supabase
  const playerName =
    profile?.username || user?.user_metadata?.full_name || "Player 1";

  useEffect(() => {
    if (
      profile?.total_score !== undefined &&
      profile.total_score > lifetimeScore
    ) {
      setLifetimeScore(profile.total_score);
      localStorage.setItem("mb_lifetime_score", profile.total_score.toString());
    }
  }, [profile, lifetimeScore]);

  const handleSelectSkin = (skinId: string) => {
    setSelectedSkinId(skinId);
    localStorage.setItem("mb_selected_skin", skinId);
  };

  // Gameplay State
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(
    null,
  );
  const [isNumpadLocked, setIsNumpadLocked] = useState<boolean>(false);
  const [lastHitBy, setLastHitBy] = useState<"p1" | "p2" | null>(null);

  // Player States
  const [p1, setP1] = useState<PlayerState>({
    id: "p1",
    name: "Player 1",
    score: 0,
    health: 100,
    isAi: false,
    avatarColor: "#ef4444",
    glovesColor: "#dc2626",
    combo: 0,
    currentAction: "idle",
  });

  const [p2, setP2] = useState<PlayerState>({
    id: "p2",
    name: "Opponent Bot",
    score: 0,
    health: 100,
    isAi: true,
    avatarColor: "#3b82f6",
    glovesColor: "#2563eb",
    combo: 0,
    currentAction: "idle",
  });

  // Analytics
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [highestCombo, setHighestCombo] = useState<number>(0);
  const [lastBonusPoints, setLastBonusPoints] = useState<number | null>(null);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryPoint[]>([]);

  // Screen Shake
  const [shakeClass, setShakeClass] = useState<string>("");
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerScreenShake = useCallback(
    (type: "light" | "heavy" | "combo") => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShakeClass("");

      requestAnimationFrame(() => {
        const cls =
          type === "combo"
            ? "animate-combo-shake"
            : type === "heavy"
              ? "animate-shake-heavy"
              : "animate-shake-light";
        setShakeClass(cls);

        shakeTimerRef.current = setTimeout(
          () => {
            setShakeClass("");
          },
          type === "combo" ? 550 : type === "heavy" ? 480 : 320,
        );
      });
    },
    [],
  );

  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const nextQuestion = useCallback(() => {
    const q = MathGenerator.generateQuestion(category);
    setCurrentQuestion(q);
  }, [category]);

  // Start Match logic
  const startMatch = useCallback(
    (roomData?: { roomId?: string }) => {
      audio.playBell();
      setTimeRemaining(60);
      setTotalAnswered(0);
      setCorrectCount(0);
      setWrongCount(0);
      setHighestCombo(0);
      setLastBonusPoints(null);
      setLastHitBy(null);
      setAnswerHistory([]);

      const activeSkin =
        BOXER_SKINS.find((s) => s.id === selectedSkinId) || BOXER_SKINS[0];

      setP1((prev) => ({
        ...prev,
        name: playerName,
        score: 0,
        health: 100,
        avatarColor: activeSkin.trunksColor,
        glovesColor: activeSkin.glovesColor,
        combo: 0,
        currentAction: "idle",
      }));

      const isMultiplayer = mode === "quick_match" || mode === "private_room";

      setP2((prev) => ({
        ...prev,
        name: isMultiplayer
          ? "Player Online"
          : `Bot (${aiDifficulty.toUpperCase()})`,
        score: 0,
        health: 100,
        isAi: !isMultiplayer,
        avatarColor: BOXER_SKINS[1].trunksColor,
        glovesColor: BOXER_SKINS[1].glovesColor,
        combo: 0,
        currentAction: "idle",
      }));

      setStage("in_game");

      if (isMultiplayer && roomData?.roomId) {
        setActiveRoomId(roomData.roomId);

        if (gameChannelRef.current) {
          supabase.removeChannel(gameChannelRef.current);
          gameChannelRef.current = null;
        }

        const gameChannel = supabase.channel(`game_${roomData.roomId}`, {
          config: {
            broadcast: { self: false },
          },
        });

        gameChannel
          .on("broadcast", { event: "PLAYER_ATTACK" }, ({ payload }) => {
            audio.playPunchHit();
            setLastHitBy("p2");
            triggerScreenShake("light");

            setP2((prev) => ({
              ...prev,
              score: prev.score + payload.earnedScore,
              currentAction: payload.punchType,
            }));

            setP1((prev) => ({
              ...prev,
              health: Math.max(0, prev.health - 8),
              currentAction: "hit",
            }));

            setTimeout(() => {
              setP1((p) => ({ ...p, currentAction: "idle" }));
              setP2((p) => ({ ...p, currentAction: "idle" }));
            }, 400);
          })
          .on("broadcast", { event: "PLAYER_EMOTE" }, ({ payload }) => {
            audio.playEmoteSound(payload.action);
            setP2((prev) => ({ ...prev, currentAction: payload.action }));
            setTimeout(() => {
              setP2((p) =>
                p.currentAction === payload.action
                  ? { ...p, currentAction: "idle" }
                  : p,
              );
            }, 2000);
          });

        gameChannel.subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ WebSocket Terhubung ke Ring Pertarungan!");
          }
          if (status === "CHANNEL_ERROR") {
            console.error("❌ Gagal terhubung ke WebSocket Realtime:", err);
          }
        });

        gameChannelRef.current = gameChannel;
      }

      nextQuestion();
    },
    [
      category,
      mode,
      aiDifficulty,
      playerName,
      nextQuestion,
      selectedSkinId,
      triggerScreenShake,
    ],
  );

  const handleStartGame = (
    selectedMode: GameMode,
    selectedCat: QuestionCategory,
    diff?: "easy" | "normal" | "hard",
    code?: string,
  ) => {
    console.log("🎮 Start Game dipanggil:", {
      selectedMode,
      selectedCat,
      diff,
      code,
    });

    setMode(selectedMode);
    setCategory(selectedCat);
    if (diff) setAiDifficulty(diff);
    if (code) setRoomCode(code);

    // PASTIKAN "private_room" MASUK KE KONDISI INI!
    if (selectedMode === "quick_match" || selectedMode === "private_room") {
      setStage("matchmaking");
    } else {
      startMatch();
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (stage !== "in_game") return;

    matchTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 10 && prev > 1) {
          audio.playTick();
        }
        if (prev <= 1) {
          clearInterval(matchTimerRef.current!);
          setStage("game_over");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    };
  }, [stage]);

  // Update Lifetime Score, Profil Supabase, & History
  useEffect(() => {
    if (stage === "game_over") {
      if (gameChannelRef.current) {
        supabase.removeChannel(gameChannelRef.current);
      }

      if (p1.score > 0) {
        setLifetimeScore((prevTotal) => {
          const updated = prevTotal + p1.score;
          localStorage.setItem("mb_lifetime_score", updated.toString());

          // Update data ke Supabase jika user terautentikasi
          if (user) {
            supabase
              .from("profiles")
              .update({
                total_score: updated,
                wins:
                  p1.score > p2.score
                    ? (profile?.wins || 0) + 1
                    : profile?.wins || 0,
                matches_played: (profile?.matches_played || 0) + 1,
              })
              .eq("id", user.id)
              .then(() => refreshProfile());
          }

          return updated;
        });
      }

      const matchResult: "win" | "loss" | "draw" =
        p1.score > p2.score ? "win" : p1.score < p2.score ? "loss" : "draw";

      const matchAccuracy =
        totalAnswered > 0
          ? Math.round((correctCount / totalAnswered) * 100)
          : 0;

      const newRecord: MatchRecord = {
        id: `match_${Date.now()}`,
        timestamp: Date.now(),
        opponentName: p2.name,
        p1Score: p1.score,
        p2Score: p2.score,
        result: matchResult,
        category,
        mode,
        accuracy: matchAccuracy,
        totalAnswered,
        correctCount,
        wrongCount,
      };

      try {
        const raw = localStorage.getItem("mb_match_history");
        const history: MatchRecord[] = raw ? JSON.parse(raw) : [];
        const updated = [newRecord, ...history].slice(0, 30);
        localStorage.setItem("mb_match_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save match history:", e);
      }

      recordMatchToChallenges({
        result: matchResult,
        correctCount,
        highestCombo,
        aiDifficulty,
        mode,
      });
    }
  }, [stage]);

  // AI Loop
  useEffect(() => {
    if (stage !== "in_game" || !p2.isAi) return;

    const delayMs =
      aiDifficulty === "easy" ? 6000 : aiDifficulty === "normal" ? 4000 : 2500;
    const accuracy =
      aiDifficulty === "easy" ? 0.6 : aiDifficulty === "normal" ? 0.8 : 0.95;

    aiIntervalRef.current = setInterval(() => {
      if (Math.random() < accuracy) {
        audio.playPunchHit();
        setLastHitBy("p2");
        triggerScreenShake("light");

        const punchTypes: ("jab" | "cross" | "hook" | "uppercut")[] = [
          "jab",
          "cross",
          "hook",
          "uppercut",
        ];
        const randomPunch =
          punchTypes[Math.floor(Math.random() * punchTypes.length)];

        setP2((prev) => ({
          ...prev,
          score: prev.score + (currentQuestion?.scoreValue || 2),
          currentAction: randomPunch,
        }));

        setP1((prev) => ({
          ...prev,
          health: Math.max(0, prev.health - 5),
          currentAction: "hit",
        }));

        setTimeout(() => {
          setP1((p) => ({ ...p, currentAction: "idle" }));
          setP2((p) => ({ ...p, currentAction: "idle" }));
        }, 400);

        nextQuestion();
      }
    }, delayMs);

    return () => {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [
    stage,
    p2.isAi,
    aiDifficulty,
    currentQuestion,
    nextQuestion,
    triggerScreenShake,
  ]);

  // Submit Answer
  const handleAnswerSubmitted = (playerAnswer: number) => {
    if (stage !== "in_game" || isNumpadLocked || !currentQuestion) return;

    const isCorrect = playerAnswer === currentQuestion.correctAnswer;
    const newTotal = totalAnswered + 1;
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const newWrong = !isCorrect ? wrongCount + 1 : wrongCount;
    const accuracy = Math.round((newCorrect / newTotal) * 100);
    const timeSeconds = 60 - timeRemaining;

    setTotalAnswered(newTotal);

    if (isCorrect) {
      audio.playPunchHit();
      setCorrectCount(newCorrect);
      setLastHitBy("p1");

      const nextCombo = p1.combo + 1;
      audio.playComboMilestone(nextCombo);

      const { multiplier } = getComboMultiplier(nextCombo);
      const earnedScore = Math.round(currentQuestion.scoreValue * multiplier);
      const bonusPoints = earnedScore - currentQuestion.scoreValue;

      if (nextCombo >= 4 || nextCombo % 5 === 0 || earnedScore >= 15) {
        triggerScreenShake("combo");
      } else if (earnedScore >= 8 || nextCombo >= 2) {
        triggerScreenShake("heavy");
      } else {
        triggerScreenShake("light");
      }

      setHighestCombo((prevMax) => Math.max(prevMax, nextCombo));

      if (bonusPoints > 0) {
        setLastBonusPoints(bonusPoints);
        setTimeout(() => setLastBonusPoints(null), 1200);
      }

      const punchTypes: ("jab" | "cross" | "hook" | "uppercut")[] = [
        "jab",
        "cross",
        "hook",
        "uppercut",
      ];
      const randomPunch =
        punchTypes[Math.floor(Math.random() * punchTypes.length)];

      const newScore = p1.score + earnedScore;

      // Broadcast Pukulan ke Lawan via Supabase Realtime
      if (gameChannelRef.current) {
        gameChannelRef.current.send({
          type: "broadcast",
          event: "PLAYER_ATTACK",
          payload: { punchType: randomPunch, earnedScore },
        });
      }

      setP1((prev) => ({
        ...prev,
        score: newScore,
        combo: nextCombo,
        currentAction: randomPunch,
      }));

      setP2((prev) => ({
        ...prev,
        health: Math.max(0, prev.health - 8),
        currentAction: "hit",
      }));

      setAnswerHistory((prev) => [
        ...prev,
        {
          questionNumber: newTotal,
          timeSeconds,
          correct: newCorrect,
          wrong: newWrong,
          accuracy,
          score: newScore,
        },
      ]);

      setTimeout(() => {
        setP1((p) => ({ ...p, currentAction: "idle" }));
        setP2((p) => ({ ...p, currentAction: "idle" }));
      }, 400);

      nextQuestion();
    } else {
      audio.playWrong();
      setWrongCount(newWrong);
      setIsNumpadLocked(true);
      triggerScreenShake("light");

      setP1((prev) => ({ ...prev, combo: 0 }));

      setAnswerHistory((prev) => [
        ...prev,
        {
          questionNumber: newTotal,
          timeSeconds,
          correct: newCorrect,
          wrong: newWrong,
          accuracy,
          score: p1.score,
        },
      ]);

      setTimeout(() => {
        setIsNumpadLocked(false);
      }, 1000);
    }
  };

  // Broadcast Emote
  const handleTriggerEmote = useCallback(
    (
      emoteAction:
        | "taunt_crown"
        | "taunt_flex"
        | "taunt_dance"
        | "taunt_shuffle",
    ) => {
      audio.playEmoteSound(emoteAction);
      setP1((prev) => ({ ...prev, currentAction: emoteAction }));
      triggerScreenShake("light");

      if (gameChannelRef.current) {
        gameChannelRef.current.send({
          type: "broadcast",
          event: "PLAYER_EMOTE",
          payload: { action: emoteAction },
        });
      }

      setTimeout(() => {
        setP1((prev) =>
          prev.currentAction === emoteAction
            ? { ...prev, currentAction: "idle" }
            : prev,
        );
      }, 2000);
    },
    [triggerScreenShake],
  );

  const handleExitMatch = () => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
    }
    setStage("main_menu");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between select-none relative overflow-x-hidden">
      {stage === "main_menu" && (
        <MainMenu
          onStartGame={handleStartGame}
          selectedCategory={category}
          onSelectCategory={setCategory}
          selectedSkinId={selectedSkinId}
          onSelectSkin={handleSelectSkin}
          onAddLifetimePoints={(pts) => {
            setLifetimeScore((prev) => {
              const updated = prev + pts;
              localStorage.setItem("mb_lifetime_score", updated.toString());
              return updated;
            });
          }}
        />
      )}

      {stage === "matchmaking" && (
        <MatchmakingModal
          mode={mode}
          roomCode={roomCode}
          onCancel={() => setStage("main_menu")}
          onMatchFound={(roomData) => startMatch(roomData)}
        />
      )}

      {stage === "in_game" && currentQuestion && (
        <div
          className={`w-full max-w-2xl mx-auto flex flex-col justify-between p-3 sm:p-4 min-h-screen gap-3 transition-transform ${shakeClass}`}
        >
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-arcade font-bold text-xs text-slate-950">
                P1
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  {p1.name}
                </span>
                <span className="font-arcade text-xl sm:text-2xl text-amber-400 font-bold">
                  {p1.score} PTS
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                <Timer className="w-3 h-3 text-amber-400" /> TIMER
              </span>
              <span
                className={`font-arcade text-2xl font-black ${
                  timeRemaining <= 10
                    ? "text-red-500 animate-pulse"
                    : "text-slate-100"
                }`}
              >
                {timeRemaining}s
              </span>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  {p2.name}
                </span>
                <span className="font-arcade text-xl sm:text-2xl text-blue-400 font-bold">
                  {p2.score} PTS
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-arcade font-bold text-xs text-slate-950">
                P2
              </div>
            </div>
          </div>

          <ComboTracker combo={p1.combo} lastBonusPoints={lastBonusPoints} />
          <BoxerCanvas p1={p1} p2={p2} lastHitBy={lastHitBy} />
          <EmoteBar
            onTriggerEmote={handleTriggerEmote}
            currentAction={p1.currentAction}
          />
          <QuestionCard question={currentQuestion} />
          <Numpad
            onSubmitAnswer={handleAnswerSubmitted}
            isLocked={isNumpadLocked}
          />

          <div className="flex items-center justify-between text-xs text-slate-500 px-2 py-1">
            <button
              onClick={handleExitMatch}
              className="hover:text-rose-400 transition flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> KELUAR MATCH
            </button>

            <span className="text-[10px] uppercase font-bold text-slate-600">
              MATH BOXING ONLINE • KIDS EDITION
            </span>
          </div>
        </div>
      )}

      {stage === "game_over" && (
        <GameOverModal
          p1={p1}
          p2={p2}
          totalAnswered={totalAnswered}
          correctCount={correctCount}
          wrongCount={wrongCount}
          highestCombo={highestCombo}
          answerHistory={answerHistory}
          onRematch={() => startMatch({ roomId: activeRoomId })}
          onExit={handleExitMatch}
        />
      )}
    </div>
  );
}
