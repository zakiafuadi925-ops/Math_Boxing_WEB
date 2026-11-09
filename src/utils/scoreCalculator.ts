export interface MatchScoreBreakdown {
  baseScore: number;
  resultBonus: number;
  resultLabel: string;
  comboBonus: number;
  accuracyBonus: number;
  accuracyPercent: number;
  accuracy: number;
  totalPointsEarned: number;
  prevLifetimeScore: number;
  newLifetimeScore: number;
  isWin: boolean;
  isKnockout: boolean;
  isDraw: boolean;
  matchResult: "win" | "loss" | "draw";
}

export function calculateMatchScore({
  p1Score,
  p2Score,
  finishReason,
  highestCombo = 0,
  correctCount = 0,
  totalAnswered = 0,
  prevLifetimeScore = 0,
}: {
  p1Score: number;
  p2Score: number;
  finishReason?: "ko_win" | "ko_loss" | "time_up";
  highestCombo?: number;
  correctCount?: number;
  totalAnswered?: number;
  prevLifetimeScore?: number;
}): MatchScoreBreakdown {
  const baseScore = Math.max(0, p1Score);

  const isKnockout = finishReason === "ko_win" || finishReason === "ko_loss";
  const isWin =
    finishReason === "ko_win"
      ? true
      : finishReason === "ko_loss"
        ? false
        : p1Score > p2Score;
  const isDraw = finishReason === "time_up" && p1Score === p2Score;
  const matchResult: "win" | "loss" | "draw" = isWin
    ? "win"
    : isDraw
      ? "draw"
      : "loss";

  let resultBonus = 0;
  let resultLabel = "Partisipasi Pertandingan";

  if (finishReason === "ko_win") {
    resultBonus = 50;
    resultLabel = "💥 Bonus Knockout (K.O.) Win";
  } else if (isWin) {
    resultBonus = 30;
    resultLabel = "🏆 Bonus Kemenangan Angka";
  } else if (isDraw) {
    resultBonus = 15;
    resultLabel = "🤝 Bonus Hasil Seri";
  } else {
    resultBonus = 5;
    resultLabel = "🥊 Bonus Partisipasi Sportif";
  }

  // Combo Bonus: 2 PTS per combo level (misal 5 combo = +10 PTS)
  const comboBonus = highestCombo > 1 ? highestCombo * 2 : 0;

  // Accuracy Bonus
  const accuracyPercent =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  let accuracyBonus = 0;
  if (accuracyPercent === 100 && totalAnswered >= 3) {
    accuracyBonus = 25; // Sempurna / Flawless
  } else if (accuracyPercent >= 90 && totalAnswered >= 3) {
    accuracyBonus = 15;
  } else if (accuracyPercent >= 75 && totalAnswered >= 3) {
    accuracyBonus = 10;
  }

  const totalPointsEarned = baseScore + resultBonus + comboBonus + accuracyBonus;
  const newLifetimeScore = prevLifetimeScore + totalPointsEarned;

  return {
    baseScore,
    resultBonus,
    resultLabel,
    comboBonus,
    accuracyBonus,
    accuracyPercent,
    accuracy: accuracyPercent,
    totalPointsEarned,
    prevLifetimeScore,
    newLifetimeScore,
    isWin,
    isKnockout,
    isDraw,
    matchResult,
  };
}
