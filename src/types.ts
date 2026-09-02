export type QuestionCategory =
  | "arithmetic"
  | "counting"
  | "algebra"
  | "roots"
  | "physics"
  | "geometry"
  | "all";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type GameDuration = 60 | 300 | 600; // in seconds: 1 min, 5 min, 10 min

export interface MathQuestion {
  id: string;
  category: QuestionCategory;
  questionText: string;
  correctAnswer: number;
  scoreValue: number;
  difficulty?: QuestionDifficulty;
  subText?: string;
  isHardChallenge?: boolean;
  // For counting category (e.g. 7 apples)
  visualItem?: {
    icon: string; // e.g. "🍎" | "🥊" | "⭐" | "🥊"
    count: number;
  };
}

export type GameMode = "practice" | "quick_match" | "private_room";

export type GameStage = "main_menu" | "matchmaking" | "in_game" | "game_over";

export type ActionType =
  | "idle"
  | "jab"
  | "cross"
  | "hook"
  | "uppercut"
  | "hit"
  | "knockdown"
  | "block"
  | "taunt_crown"
  | "taunt_flex"
  | "taunt_dance"
  | "taunt_shuffle";

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  health: number; // 0 - 100 for visual KO bar
  isAi: boolean;
  avatarColor: string;
  glovesColor: string;
  combo: number;
  currentAction: ActionType;
}

export interface AnswerHistoryPoint {
  questionNumber: number;
  timeSeconds: number;
  correct: number;
  wrong: number;
  accuracy: number;
  score: number;
}

export interface MatchmakingModalProps {
  mode: GameMode;
  roomCode?: string;
  duration?: GameDuration;
  category?: QuestionCategory;
  playerName?: string;
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

export interface MatchRecord {
  id: string;
  timestamp: number;
  opponentName: string;
  p1Score: number;
  p2Score: number;
  result: "win" | "loss" | "draw";
  category: QuestionCategory;
  mode: GameMode;
  duration?: GameDuration;
  accuracy?: number;
  totalAnswered?: number;
  correctCount?: number;
  wrongCount?: number;
  finishReason?: "ko_win" | "ko_loss" | "time_up";
}

export interface MatchRoom {
  id: string;
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  currentQuestion: MathQuestion;
  questionVersion: number;
  timeRemaining: number;
  duration: GameDuration;
  p1: PlayerState;
  p2: PlayerState;
}
