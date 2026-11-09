import { GameMode, QuestionCategory } from '../types';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'win_match' | 'answer_correct' | 'reach_combo' | 'play_hard' | 'play_practice';
  target: number;
  currentProgress: number;
  rewardPoints: number;
  isCompleted: boolean;
  isClaimed: boolean;
  icon: string;
  categoryRequirement?: QuestionCategory;
  difficultyRequirement?: 'easy' | 'normal' | 'hard';
  modeRequirement?: GameMode;
}

export interface DailyChallengeState {
  dateKey: string; // e.g. "2026-08-11"
  challenges: DailyChallenge[];
  allClaimedBonusAwarded: boolean;
}

const STORAGE_KEY = 'mb_daily_challenges_v1';

export function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateDailyChallenges(dateKey: string): DailyChallenge[] {
  // Use date string to deterministically pick or shuffle varied challenge pools
  const dateNum = dateKey.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
  
  const pool: DailyChallenge[] = [
    {
      id: `dc_win_1_${dateKey}`,
      title: 'Penakluk Ring',
      description: 'Menangkan 1 pertandingan di arena (Practice / Matchmaking)',
      type: 'win_match',
      target: 1,
      currentProgress: 0,
      rewardPoints: 150,
      isCompleted: false,
      isClaimed: false,
      icon: '🏆',
    },
    {
      id: `dc_ans_10_${dateKey}`,
      title: 'Pakar Matematika',
      description: 'Jawab 10 soal dengan benar dalam pertandingan',
      type: 'answer_correct',
      target: 10,
      currentProgress: 0,
      rewardPoints: 100,
      isCompleted: false,
      isClaimed: false,
      icon: '⚡',
    },
    {
      id: `dc_combo_5_${dateKey}`,
      title: 'Raja Combo Streak',
      description: 'Raih Combo Streak minimal 5 Hit berturut-turut',
      type: 'reach_combo',
      target: 5,
      currentProgress: 0,
      rewardPoints: 120,
      isCompleted: false,
      isClaimed: false,
      icon: '🔥',
    },
    {
      id: `dc_hard_1_${dateKey}`,
      title: 'Latihan Keras AI',
      description: 'Selesaikan 1 pertandingan dengan AI tingkat Hard',
      type: 'play_hard',
      target: 1,
      currentProgress: 0,
      rewardPoints: 200,
      isCompleted: false,
      isClaimed: false,
      icon: '👑',
      difficultyRequirement: 'hard',
    },
  ];

  // Rotate based on day to pick 3 challenges
  const indices = [(dateNum % pool.length), ((dateNum + 1) % pool.length), ((dateNum + 2) % pool.length)];
  const selected = indices.map(i => ({ ...pool[i] }));
  
  return selected;
}

export function loadDailyChallengeState(): DailyChallengeState {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: DailyChallengeState = JSON.parse(raw);
      if (parsed.dateKey === todayKey && Array.isArray(parsed.challenges) && parsed.challenges.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load daily challenges:', e);
  }

  // Create new state for today
  const newChallenges = generateDailyChallenges(todayKey);
  const newState: DailyChallengeState = {
    dateKey: todayKey,
    challenges: newChallenges,
    allClaimedBonusAwarded: false,
  };
  saveDailyChallengeState(newState);
  return newState;
}

export function saveDailyChallengeState(state: DailyChallengeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save daily challenges:', e);
  }
}

export function recordMatchToChallenges(matchData: {
  result: 'win' | 'loss' | 'draw';
  correctCount: number;
  highestCombo: number;
  aiDifficulty?: 'easy' | 'normal' | 'hard';
  mode: GameMode;
}): DailyChallengeState {
  const currentState = loadDailyChallengeState();
  let updated = false;

  const updatedChallenges = currentState.challenges.map((ch) => {
    if (ch.isClaimed) return ch;

    let newProgress = ch.currentProgress;

    if (ch.type === 'win_match' && matchData.result === 'win') {
      newProgress = Math.min(ch.target, newProgress + 1);
    } else if (ch.type === 'answer_correct') {
      newProgress = Math.min(ch.target, newProgress + matchData.correctCount);
    } else if (ch.type === 'reach_combo') {
      newProgress = Math.min(ch.target, Math.max(newProgress, matchData.highestCombo));
    } else if (ch.type === 'play_hard' && matchData.aiDifficulty === 'hard') {
      newProgress = Math.min(ch.target, newProgress + 1);
    }

    const isCompleted = newProgress >= ch.target;
    if (newProgress !== ch.currentProgress || isCompleted !== ch.isCompleted) {
      updated = true;
    }

    return {
      ...ch,
      currentProgress: newProgress,
      isCompleted,
    };
  });

  if (updated) {
    const newState = {
      ...currentState,
      challenges: updatedChallenges,
    };
    saveDailyChallengeState(newState);
    return newState;
  }

  return currentState;
}

export function claimChallengeReward(challengeId: string): { newState: DailyChallengeState; rewardPoints: number } {
  const currentState = loadDailyChallengeState();
  let pointsAwarded = 0;

  const updatedChallenges = currentState.challenges.map((ch) => {
    if (ch.id === challengeId && ch.isCompleted && !ch.isClaimed) {
      pointsAwarded = ch.rewardPoints;
      return { ...ch, isClaimed: true };
    }
    return ch;
  });

  const newState = {
    ...currentState,
    challenges: updatedChallenges,
  };
  saveDailyChallengeState(newState);

  return { newState, rewardPoints: pointsAwarded };
}

export function getTimeUntilNextReset(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${hours}j ${minutes}m ${seconds}d`;
}
