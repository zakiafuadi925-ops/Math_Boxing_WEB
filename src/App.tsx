import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  GameStage,
  GameMode,
  QuestionCategory,
  PlayerState,
  MathQuestion,
  MatchRecord,
  AnswerHistoryPoint,
  GameDuration,
  QuestionDifficulty,
} from "./types";
import { MathGenerator } from "./utils/mathGenerator";
import { audio } from "./utils/audio";
import { BOXER_SKINS } from "./utils/skins";
import { recordMatchToChallenges } from "./utils/dailyChallenges";
import { supabase, PlayerProfile, getCurrentUserProfile } from "./lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

import { MainMenu } from "./components/MainMenu";
import { MatchmakingModal } from "./components/MatchmakingModal";
import { BoxerCanvas } from "./components/BoxerCanvas";
import { QuestionCard } from "./components/QuestionCard";
import { Numpad } from "./components/Numpad";
import { GameOverModal } from "./components/GameOverModal";
import { ComboTracker, getComboMultiplier } from "./components/ComboTracker";
import { EmoteBar } from "./components/EmoteBar";

import { Timer, LogOut, Maximize2, Minimize2 } from "lucide-react";

export default function App() {
  // Navigation & Game State
  const [stage, setStage] = useState<GameStage>("main_menu");
  const [mode, setMode] = useState<GameMode>("practice");
  const [category, setCategory] = useState<QuestionCategory>("all");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "normal" | "hard">(
    "normal",
  );
  const [roomCode, setRoomCode] = useState<string>("");
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("Player 1");
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);

  // Match Duration Preference (Default to 300s = 5 minutes for children friendliness)
  const [selectedDuration, setSelectedDuration] = useState<GameDuration>(() => {
    try {
      const saved = localStorage.getItem("mb_preferred_duration");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed === 60 || parsed === 300 || parsed === 600) {
          return parsed as GameDuration;
        }
      }
    } catch (e) {}
    return 300;
  });

  const [activeDuration, setActiveDuration] = useState<GameDuration>(300);
  const [finishReason, setFinishReason] = useState<"ko_win" | "ko_loss" | "time_up">("time_up");

  // Fullscreen Detection & Toggle (Optimized for Mobile)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateFs = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener("fullscreenchange", updateFs);
    document.addEventListener("webkitfullscreenchange", updateFs);
    document.addEventListener("mozfullscreenchange", updateFs);
    document.addEventListener("MSFullscreenChange", updateFs);

    return () => {
      document.removeEventListener("fullscreenchange", updateFs);
      document.removeEventListener("webkitfullscreenchange", updateFs);
      document.removeEventListener("mozfullscreenchange", updateFs);
      document.removeEventListener("MSFullscreenChange", updateFs);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    audio.playClick();
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle exception:", err);
    }
  }, []);

  const handleSelectDuration = (dur: GameDuration) => {
    setSelectedDuration(dur);
    try {
      localStorage.setItem("mb_preferred_duration", dur.toString());
    } catch (e) {}
  };

  // Realtime Channel Ref
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const currentGameRoomIdRef = useRef<string | null>(null);

  // Boxer Skins & Lifetime Progression
  const [lifetimeScore, setLifetimeScore] = useState<number>(() => {
    const saved = localStorage.getItem("mb_lifetime_score");
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [selectedSkinId, setSelectedSkinId] = useState<string>(() => {
    return localStorage.getItem("mb_selected_skin") || "rookie_red";
  });

  const handleSelectSkin = (skinId: string) => {
    setSelectedSkinId(skinId);
    localStorage.setItem("mb_selected_skin", skinId);
  };

  // Subscribe to Supabase Auth state & fetch remote profile
  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (profile) {
        setCurrentUser(profile);
        setPlayerName(profile.name || "Petinju");
        if (profile.high_score && profile.high_score > lifetimeScore) {
          setLifetimeScore(profile.high_score);
          localStorage.setItem(
            "mb_lifetime_score",
            profile.high_score.toString(),
          );
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await getCurrentUserProfile();
          if (profile) {
            setCurrentUser(profile);
            setPlayerName(profile.name || "Petinju");
            if (profile.high_score && profile.high_score > lifetimeScore) {
              setLifetimeScore(profile.high_score);
              localStorage.setItem(
                "mb_lifetime_score",
                profile.high_score.toString(),
              );
            }
          }
        } else {
          setCurrentUser(null);
          setPlayerName("Player 1");
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
  const [rematchStatus, setRematchStatus] = useState<
    "idle" | "requested_by_me" | "requested_by_opponent"
  >("idle");
  const [opponentLeft, setOpponentLeft] = useState<boolean>(false);

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

  // Helper to format countdown timer (e.g. 5:00, 0:45)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Helper untuk menentukan tingkat kesulitan soal berdasarkan durasi permainan dan progres waktu
  const getDifficultyForProgress = useCallback(
    (timeRem: number, dur: GameDuration, answered: number): QuestionDifficulty => {
      // Pemanasan di awal (3 soal pertama selalu easy)
      if (answered < 3) return "easy";

      const elapsed = dur - timeRem;
      const progress = elapsed / Math.max(1, dur);

      // Menit-menit awal (0% - 35% durasi): Mudah
      if (progress < 0.35) {
        return "easy";
      }
      // Pertengahan game (35% - 70% durasi): Menengah
      else if (progress < 0.7) {
        return "medium";
      }
      // Akhir game / Klimaks (70% - 100% durasi): Sulit
      else {
        return "hard";
      }
    },
    [],
  );

  const nextQuestion = useCallback(() => {
    const diff = getDifficultyForProgress(
      timeRemaining,
      activeDuration,
      totalAnswered,
    );
    const q = MathGenerator.generateQuestion(category, diff);
    setCurrentQuestion(q);
    return q;
  }, [category, getDifficultyForProgress, timeRemaining, activeDuration, totalAnswered]);

  // Start Match logic
  const startMatch = useCallback(
    (roomData?: {
      roomId?: string;
      initialQuestion?: MathQuestion;
      opponentName?: string;
      duration?: GameDuration;
      category?: QuestionCategory;
      isBot?: boolean;
    }) => {
      console.log("--> startMatch dipanggil dengan roomData:", roomData);

      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

      const matchDur = roomData?.duration || selectedDuration || 300;
      setActiveDuration(matchDur);
      setTimeRemaining(matchDur);
      setFinishReason("time_up");

      audio.playBell();
      setTotalAnswered(0);
      setCorrectCount(0);
      setWrongCount(0);
      setHighestCombo(0);
      setLastBonusPoints(null);
      setLastHitBy(null);
      setAnswerHistory([]);
      setRematchStatus("idle");
      setOpponentLeft(false);

      if (roomData?.category) {
        setCategory(roomData.category);
      }

      const activeSkin =
        BOXER_SKINS.find((s) => s.id === selectedSkinId) || BOXER_SKINS[0];

      setP1((prev) => ({
        ...prev,
        name: playerName || "Player 1",
        score: 0,
        health: 100,
        avatarColor: activeSkin.trunksColor,
        glovesColor: activeSkin.glovesColor,
        combo: 0,
        currentAction: "idle",
      }));

      const isBotMatch =
        Boolean(roomData?.isBot) ||
        Boolean(roomData?.roomId?.startsWith("bot_")) ||
        mode === "practice";
      const isMultiplayer = !isBotMatch && (mode === "quick_match" || mode === "private_room");

      setP2((prev) => ({
        ...prev,
        name: isMultiplayer
          ? roomData?.opponentName ||
            (prev.name &&
            prev.name !== "Menunggu Lawan..." &&
            !prev.name.startsWith("Bot")
              ? prev.name
              : "Lawan")
          : roomData?.opponentName || `Bot (${aiDifficulty.toUpperCase()})`,
        score: 0,
        health: 100,
        isAi: isBotMatch,
        avatarColor: BOXER_SKINS[1].trunksColor,
        glovesColor: BOXER_SKINS[1].glovesColor,
        combo: 0,
        currentAction: "idle",
      }));

      // Ubah stage ke "in_game" agar modal matchmaking/game over langsung tertutup
      setStage("in_game");

      const targetRoomId = roomData?.roomId || activeRoomId;

      // Inisialisasi / Reuse Multiplayer Realtime Broadcast
      if (isMultiplayer && targetRoomId) {
        setActiveRoomId(targetRoomId);

        // Jika belum ada channel atau room berbeda, buat channel baru
        let gameChannel = gameChannelRef.current;
        if (!gameChannel || currentGameRoomIdRef.current !== targetRoomId) {
          if (gameChannel) {
            supabase.removeChannel(gameChannel);
          }

          currentGameRoomIdRef.current = targetRoomId;
          gameChannel = supabase.channel(`game_${targetRoomId}`, {
            config: {
              broadcast: { self: false },
            },
          });
          gameChannelRef.current = gameChannel;

          // 1. Dengarkan jika ada lawan bergabung
          gameChannel
            .on("broadcast", { event: "PLAYER_JOINED" }, ({ payload }) => {
              if (payload?.playerName) {
                setP2((prev) => ({ ...prev, name: payload.playerName }));
                if (!payload.isReply && gameChannelRef.current) {
                  gameChannelRef.current.send({
                    type: "broadcast",
                    event: "PLAYER_JOINED",
                    payload: { playerName: playerName || "Player 1", isReply: true },
                  });
                }
              }
            })
            // 2. Dengarkan pukulan lawan
            .on("broadcast", { event: "PLAYER_ATTACK" }, ({ payload }) => {
              audio.playPunchHit();
              setLastHitBy("p2");
              triggerScreenShake("light");

              if (payload.nextQuestion) {
                setCurrentQuestion(payload.nextQuestion);
              }

              const updatedP1Health = payload.p2Health !== undefined ? payload.p2Health : 100;
              const updatedP2Health = payload.p1Health !== undefined ? payload.p1Health : undefined;

              setP2((prev) => ({
                ...prev,
                ...(updatedP2Health !== undefined ? { health: updatedP2Health } : {}),
                score:
                  payload.totalScore ??
                  prev.score + (payload.earnedScore || 2),
                currentAction: payload.punchType || "jab",
              }));

              // Cek apakah serangan lawan menyebabkan Knockout (K.O.) pada kita
              if (updatedP1Health <= 0) {
                audio.playKnockout();
                if (matchTimerRef.current) clearInterval(matchTimerRef.current);
                setP1((prev) => ({
                  ...prev,
                  health: 0,
                  currentAction: "knockdown",
                }));
                setP2((prev) => ({
                  ...prev,
                  currentAction: "taunt_crown",
                }));
                setFinishReason("ko_loss");
                setTimeout(() => {
                  setStage("game_over");
                }, 600);
              } else {
                setP1((prev) => ({
                  ...prev,
                  health: updatedP1Health,
                  currentAction: "hit",
                }));

                setTimeout(() => {
                  setP1((p) => ({ ...p, currentAction: "idle" }));
                  setP2((p) => ({ ...p, currentAction: "idle" }));
                }, 400);
              }
            })
            // 3. Dengarkan event Knockout instan dari lawan
            .on("broadcast", { event: "PLAYER_KNOCKOUT" }, ({ payload }) => {
              audio.playKnockout();
              if (matchTimerRef.current) clearInterval(matchTimerRef.current);
              if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
              
              if (payload?.winner === "p1") {
                // Pengirim payload menang, artinya kita kalah KO
                setP1((prev) => ({ ...prev, health: 0, currentAction: "knockdown" }));
                setP2((prev) => ({ ...prev, currentAction: "taunt_crown" }));
                setFinishReason("ko_loss");
              } else {
                // Kita yang menang KO
                setP1((prev) => ({ ...prev, currentAction: "taunt_crown" }));
                setP2((prev) => ({ ...prev, health: 0, currentAction: "knockdown" }));
                setFinishReason("ko_win");
              }

              setTimeout(() => {
                setStage("game_over");
              }, 600);
            })
            // 4. Dengarkan emote lawan
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
            })
            // 5. Dengarkan permintaan rematch lawan
            .on("broadcast", { event: "PLAYER_REMATCH_REQUEST" }, ({ payload }) => {
              audio.playBell();
              setRematchStatus("requested_by_opponent");
              if (payload?.playerName) {
                setP2((prev) => ({ ...prev, name: payload.playerName }));
              }
            })
            // 6. Dengarkan mulainya pertandingan rematch yang telah disetujui
            .on("broadcast", { event: "GAME_REMATCH_START" }, ({ payload }) => {
              console.log("🎮 Rematch disetujui lawan! Memulai game baru:", payload);
              startMatch({
                roomId: targetRoomId,
                initialQuestion: payload?.initialQuestion,
                opponentName: payload?.senderName,
              });
            })
            // 7. Dengarkan jika lawan keluar
            .on("broadcast", { event: "PLAYER_LEFT_MATCH" }, () => {
              setOpponentLeft(true);
            });

          gameChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              gameChannel?.send({
                type: "broadcast",
                event: "PLAYER_JOINED",
                payload: { playerName: playerName || "Player 1" },
              });
            }
          });
        }
      }

      if (roomData?.initialQuestion) {
        setCurrentQuestion(roomData.initialQuestion);
      } else {
        nextQuestion();
      }
    },
    [
      activeRoomId,
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
    duration?: GameDuration,
  ) => {
    console.log("🎮 Start Game dipanggil:", {
      selectedMode,
      selectedCat,
      diff,
      code,
      duration,
    });
    setMode(selectedMode);
    setCategory(selectedCat);
    if (diff) setAiDifficulty(diff);
    if (code) setRoomCode(code);
    const dur = duration || selectedDuration;
    setSelectedDuration(dur);

    if (selectedMode === "quick_match" || selectedMode === "private_room") {
      setStage("matchmaking");
    } else {
      startMatch({ duration: dur });
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

  // Update Lifetime Score & Match History
  useEffect(() => {
    if (stage === "game_over") {
      // NOTE: We do NOT remove gameChannelRef.current here so players can still communicate
      // and trigger synchronized rematches from the GameOver screen.

      if (p1.score > 0) {
        setLifetimeScore((prevTotal) => {
          const updated = prevTotal + p1.score;
          localStorage.setItem("mb_lifetime_score", updated.toString());
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

        const baseAiDmg = activeDuration <= 60 ? 8 : activeDuration <= 300 ? 6 : 5;

        setP1((prev) => {
          const newP1Health = Math.max(0, prev.health - baseAiDmg);

          // Cek apakah serangan Bot menyebabkan Knockout (K.O.) pada pemain
          if (newP1Health <= 0) {
            audio.playKnockout();
            if (matchTimerRef.current) clearInterval(matchTimerRef.current);
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
            triggerScreenShake("heavy");
            setFinishReason("ko_loss");

            setTimeout(() => {
              setP2((bot) => ({ ...bot, currentAction: "taunt_crown" }));
              setStage("game_over");
            }, 600);

            return {
              ...prev,
              health: 0,
              currentAction: "knockdown",
            };
          }

          return {
            ...prev,
            health: newP1Health,
            currentAction: "hit",
          };
        });

        setTimeout(() => {
          setP1((p) => (p.currentAction === "hit" ? { ...p, currentAction: "idle" } : p));
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
    activeDuration,
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
    const timeSeconds = activeDuration - timeRemaining;

    setTotalAnswered(newTotal);

    if (isCorrect) {
      audio.playPunchHit();
      setCorrectCount(newCorrect);
      setLastHitBy("p1");

      const nextCombo = p1.combo + 1;
      audio.playComboMilestone(nextCombo);

      // ✨ FITUR HEAL: Pulihkan +15 HP setiap 3 jawaban benar berturut-turut!
      const isHealStreak = nextCombo >= 3 && nextCombo % 3 === 0;
      let healedP1Health = p1.health;
      if (isHealStreak) {
        healedP1Health = Math.min(100, p1.health + 15);
        audio.playHeal();
      }

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

      // Kalkulasi Damage berdasarkan durasi match dan combo streak
      const baseDamage = activeDuration <= 60 ? 9 : activeDuration <= 300 ? 7 : 6;
      const comboBonusDmg = nextCombo >= 5 ? 3 : nextCombo >= 3 ? 1 : 0;
      const totalDamage = baseDamage + comboBonusDmg;
      const newP2Health = Math.max(0, p2.health - totalDamage);
      const isKnockoutWin = newP2Health <= 0;

      // ✅ Generate soal baru yang SAMA untuk dikirim ke lawan dengan leveling kesulitan
      const nextDiff = getDifficultyForProgress(
        timeRemaining,
        activeDuration,
        newTotal,
      );
      const nextQ = MathGenerator.generateQuestion(category, nextDiff);

      // ✅ Handle Instant Knockout Victory vs Normal Hit
      if (isKnockoutWin) {
        audio.playKnockout();
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        setFinishReason("ko_win");
        triggerScreenShake("combo");

        // Broadcast Knockout ke lawan
        if (gameChannelRef.current) {
          gameChannelRef.current.send({
            type: "broadcast",
            event: "PLAYER_KNOCKOUT",
            payload: {
              winner: "p1",
              senderName: playerName,
              p1Score: newScore,
              p2Score: p2.score,
            },
          });
        }

        setP1((prev) => ({
          ...prev,
          health: healedP1Health,
          score: newScore,
          combo: nextCombo,
          currentAction: "taunt_crown",
        }));

        setP2((prev) => ({
          ...prev,
          health: 0,
          currentAction: "knockdown",
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
          setStage("game_over");
        }, 600);
      } else {
        // ✅ Broadcast Payload Lengkap ke Lawan via Supabase Realtime
        if (gameChannelRef.current) {
          gameChannelRef.current.send({
            type: "broadcast",
            event: "PLAYER_ATTACK",
            payload: {
              punchType: randomPunch,
              earnedScore,
              totalScore: newScore, // Total skor P1
              p1Health: healedP1Health, // Status HP P1 (termasuk heal)
              p2Health: newP2Health, // Sisa HP P2 setelah dipukul
              nextQuestion: nextQ, // Soal baru hasil sinkronisasi
            },
          });
        }

        setP1((prev) => ({
          ...prev,
          health: healedP1Health,
          score: newScore,
          combo: nextCombo,
          currentAction: randomPunch,
        }));

        setP2((prev) => ({
          ...prev,
          health: newP2Health,
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

        // Set soal baru secara lokal
        setCurrentQuestion(nextQ);
      }
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

  const handleRematchClick = () => {
    const isMultiplayer = mode === "quick_match" || mode === "private_room";

    if (!isMultiplayer) {
      startMatch();
      return;
    }

    if (!gameChannelRef.current) {
      if (mode === "private_room" && roomCode) {
        setStage("matchmaking");
      } else {
        startMatch({ roomId: activeRoomId });
      }
      return;
    }

    if (rematchStatus === "requested_by_opponent") {
      // Lawan sudah mengajak rematch, kita setujui dan mulai pertandingan bersama (mulai dari pemanasan easy)
      const firstQ = MathGenerator.generateQuestion(category, "easy");
      try {
        gameChannelRef.current.send({
          type: "broadcast",
          event: "GAME_REMATCH_START",
          payload: {
            initialQuestion: firstQ,
            senderName: playerName || "Player 1",
          },
        });
      } catch (e) {
        console.error("Gagal mengirim GAME_REMATCH_START:", e);
      }

      startMatch({
        roomId: activeRoomId,
        initialQuestion: firstQ,
      });
    } else {
      // Kita mengajak rematch ke lawan
      setRematchStatus("requested_by_me");
      try {
        gameChannelRef.current.send({
          type: "broadcast",
          event: "PLAYER_REMATCH_REQUEST",
          payload: {
            playerName: playerName || "Player 1",
          },
        });
      } catch (e) {
        console.error("Gagal mengirim PLAYER_REMATCH_REQUEST:", e);
      }
    }
  };

  const handleExitMatch = () => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    if (gameChannelRef.current) {
      try {
        gameChannelRef.current.send({
          type: "broadcast",
          event: "PLAYER_LEFT_MATCH",
          payload: { playerName },
        });
      } catch {}
      supabase.removeChannel(gameChannelRef.current);
      gameChannelRef.current = null;
    }
    setRematchStatus("idle");
    setOpponentLeft(false);
    setStage("main_menu");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between select-none relative overflow-x-hidden">
      {stage === "main_menu" && (
        <MainMenu
          onStartGame={handleStartGame}
          selectedCategory={category}
          onSelectCategory={setCategory}
          selectedDuration={selectedDuration}
          onSelectDuration={handleSelectDuration}
          playerName={playerName}
          onUpdatePlayerName={setPlayerName}
          lifetimeScore={lifetimeScore}
          selectedSkinId={selectedSkinId}
          onSelectSkin={handleSelectSkin}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onAddLifetimePoints={(pts) => {
            setLifetimeScore((prev) => {
              const updated = prev + pts;
              localStorage.setItem("mb_lifetime_score", updated.toString());
              return updated;
            });
          }}
          currentUser={currentUser}
          onUserLogin={(user) => {
            setCurrentUser(user);
            setPlayerName(user.name || "Petinju");
            if (user.high_score && user.high_score > lifetimeScore) {
              setLifetimeScore(user.high_score);
            }
          }}
          onUserLogout={() => {
            setCurrentUser(null);
            setPlayerName("Player 1");
          }}
        />
      )}

      {stage === "matchmaking" && (
        <MatchmakingModal
          mode={mode}
          roomCode={roomCode}
          category={category}
          duration={selectedDuration}
          playerName={playerName}
          selectedSkinId={selectedSkinId}
          onCancel={() => setStage("main_menu")}
          onMatchFound={(roomData) => {
            if (roomData?.isBot) {
              setMode("practice");
            }
            startMatch(roomData);
          }}
          onSwitchToBot={() => {
            setMode("practice");
            startMatch({
              duration: selectedDuration,
              opponentName: "Bot Juara AI",
              isBot: true,
            });
          }}
        />
      )}

      {stage === "in_game" && currentQuestion && (
        <div
          className={`w-full max-w-lg mx-auto h-[100dvh] max-h-[100dvh] flex flex-col justify-between p-1.5 sm:p-2.5 overflow-hidden select-none relative gap-1 sm:gap-1.5 transition-transform ${shakeClass}`}
        >
          {/* 1. Compact Arcade Combat Header */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-2.5 py-1 sm:py-1.5 flex items-center justify-between shadow-lg shrink-0">
            {/* P1 Score & Avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 flex items-center justify-center font-arcade font-black text-xs text-slate-950 shadow-sm shrink-0">
                P1
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block leading-none truncate max-w-[70px] sm:max-w-[100px]">
                  {p1.name}
                </span>
                <span className="font-arcade text-lg sm:text-xl text-amber-400 font-bold leading-tight">
                  {p1.score} <span className="text-[10px] text-amber-300">PTS</span>
                </span>
              </div>
            </div>

            {/* Match Timer & Fullscreen Quick Control */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col items-center px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-lg shadow-inner">
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                  <Timer className="w-2.5 h-2.5 text-amber-400" /> WAKTU
                </span>
                <span
                  className={`font-arcade text-base sm:text-lg font-black leading-none ${
                    timeRemaining <= (activeDuration <= 60 ? 10 : 20)
                      ? "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                      : "text-slate-100"
                  }`}
                >
                  {formatTimer(timeRemaining)}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-1 sm:p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 text-amber-400 transition"
                title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* P2 Score & Avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-right">
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block leading-none truncate max-w-[70px] sm:max-w-[100px]">
                  {p2.name}
                </span>
                <span className="font-arcade text-lg sm:text-xl text-blue-400 font-bold leading-tight">
                  {p2.score} <span className="text-[10px] text-blue-300">PTS</span>
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center font-arcade font-black text-xs text-slate-950 shadow-sm shrink-0">
                P2
              </div>
            </div>
          </div>

          {/* 2. Real-Time Boxing Ring Stage with Integrated Emotes & Combos */}
          <ComboTracker combo={p1.combo} lastBonusPoints={lastBonusPoints} compact={true} />
          <BoxerCanvas
            p1={p1}
            p2={p2}
            lastHitBy={lastHitBy}
            onTriggerEmote={handleTriggerEmote}
            combo={p1.combo}
            lastBonusPoints={lastBonusPoints}
          />

          {/* 3. Math Question Card */}
          <div className="shrink-0">
            <QuestionCard question={currentQuestion} />
          </div>

          {/* 4. Ergonomic Responsive Numpad */}
          <div className="shrink-0">
            <Numpad
              onSubmitAnswer={handleAnswerSubmitted}
              isLocked={isNumpadLocked}
            />
          </div>

          {/* 5. Minimalistic Match Controls Footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 shrink-0">
            <button
              onClick={handleExitMatch}
              className="hover:text-rose-400 active:text-rose-300 transition flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3 h-3" /> KELUAR MATCH
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-[9px] uppercase font-bold text-amber-400/80 hover:text-amber-300 flex items-center gap-1 transition"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3" /> NORMAL SCREEN
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3" /> FULLSCREEN MODE
                </>
              )}
            </button>
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
          duration={activeDuration}
          finishReason={finishReason}
          answerHistory={answerHistory}
          isMultiplayer={mode === "quick_match" || mode === "private_room"}
          rematchStatus={rematchStatus}
          opponentLeft={opponentLeft}
          onRematch={handleRematchClick}
          onExit={handleExitMatch}
        />
      )}
    </div>
  );
}
