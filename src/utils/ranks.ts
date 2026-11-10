export interface RankTier {
  id: string;
  level: number;
  name: string;
  shortName: string;
  minScore: number;
  maxScore: number | null; // null for highest rank (Professor)
  icon: string;
  belt: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glowColor: string;
  description: string;
  perk: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: "novice",
    level: 1,
    name: "Pemula Matematika",
    shortName: "Pemula",
    minScore: 0,
    maxScore: 999,
    icon: "🥊",
    belt: "Sabuk Putih",
    badgeBg: "bg-slate-800/90",
    badgeBorder: "border-slate-600",
    badgeText: "text-slate-200",
    glowColor: "rgba(148, 163, 184, 0.3)",
    description: "Langkah awal petinju cilik memasuki ring perhitungan dasar.",
    perk: "Akses Arena Latihan & Quick Match",
  },
  {
    id: "apprentice",
    level: 2,
    name: "Murid Berbakat",
    shortName: "Murid",
    minScore: 1000,
    maxScore: 4999,
    icon: "🥉",
    belt: "Sabuk Kuning",
    badgeBg: "bg-amber-950/80",
    badgeBorder: "border-amber-700/80",
    badgeText: "text-amber-300",
    glowColor: "rgba(217, 119, 6, 0.4)",
    description: "Mulai menguasai ritme pukulan aritmatika dan kecepatan berhitung.",
    perk: "Bonus Combo 3x & Akses Kostum Bronze",
  },
  {
    id: "warrior",
    level: 3,
    name: "Ksatria Hitung",
    shortName: "Ksatria",
    minScore: 5000,
    maxScore: 14999,
    icon: "🥈",
    belt: "Sabuk Hijau",
    badgeBg: "bg-emerald-950/80",
    badgeBorder: "border-emerald-500/80",
    badgeText: "text-emerald-300",
    glowColor: "rgba(16, 185, 129, 0.4)",
    description: "Pukulan cepat dan tepat menumbangkan soal counting & aljabar dasar.",
    perk: "Badge Ksatria Hijau di Leaderboard",
  },
  {
    id: "expert",
    level: 4,
    name: "Pendekar Aritmatika",
    shortName: "Pendekar",
    minScore: 15000,
    maxScore: 29999,
    icon: "🥇",
    belt: "Sabuk Biru",
    badgeBg: "bg-blue-950/80",
    badgeBorder: "border-blue-500/80",
    badgeText: "text-blue-300",
    glowColor: "rgba(59, 130, 246, 0.4)",
    description: "Menghitung secepat kilat dengan refleks mental yang kokoh.",
    perk: "Membuka Efek Taunt Flex & Kostum Biru Juara",
  },
  {
    id: "master",
    level: 5,
    name: "Master Aljabar",
    shortName: "Master",
    minScore: 30000,
    maxScore: 49999,
    icon: "💎",
    belt: "Sabuk Merah",
    badgeBg: "bg-cyan-950/80",
    badgeBorder: "border-cyan-400/80",
    badgeText: "text-cyan-300",
    glowColor: "rgba(6, 182, 212, 0.5)",
    description: "Menguasai persamaan aljabar dan akar pangkat dalam hitungan detik.",
    perk: "Aura Cahaya Berlian & Pengganda Skor +10%",
  },
  {
    id: "grandmaster",
    level: 6,
    name: "Grandmaster Geometri",
    shortName: "Grandmaster",
    minScore: 50000,
    maxScore: 69999,
    icon: "👑",
    belt: "Sabuk Hitam",
    badgeBg: "bg-purple-950/80",
    badgeBorder: "border-purple-400/80",
    badgeText: "text-purple-300",
    glowColor: "rgba(168, 85, 247, 0.5)",
    description: "Menaklukkan seluruh rumus geometri dan bangun ruang dengan presisi tinggi.",
    perk: "Mahkota Emas & Taunt Crown Spesial",
  },
  {
    id: "scholar",
    level: 7,
    name: "Cendekiawan Sains",
    shortName: "Cendekiawan",
    minScore: 70000,
    maxScore: 84999,
    icon: "⚡",
    belt: "Sabuk Emas",
    badgeBg: "bg-amber-900/80",
    badgeBorder: "border-amber-400",
    badgeText: "text-amber-300 font-bold",
    glowColor: "rgba(245, 158, 11, 0.5)",
    description: "Kombinasi logika matematika, fisika gerak, dan kalkulasi murni tanpa cela.",
    perk: "Gelar Spesial Cendekiawan & Efek Kilat Emas",
  },
  {
    id: "doctorate",
    level: 8,
    name: "Doktor Matematika",
    shortName: "Doktor",
    minScore: 85000,
    maxScore: 99999,
    icon: "🔬",
    belt: "Sabuk Platinum",
    badgeBg: "bg-rose-950/80",
    badgeBorder: "border-rose-400/90",
    badgeText: "text-rose-300 font-bold",
    glowColor: "rgba(244, 63, 94, 0.5)",
    description: "Pakar analisis angka tingkat lanjut yang disegani di seluruh penjuru arena.",
    perk: "Border Berkilau Rose Platinum di Leaderboard",
  },
  {
    id: "professor",
    level: 9,
    name: "Profesor Matematika",
    shortName: "Profesor",
    minScore: 100000,
    maxScore: null,
    icon: "🎓",
    belt: "Mahkota Mahaguru Tertinggi",
    badgeBg: "bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20",
    badgeBorder: "border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20",
    badgeText: "text-yellow-300 font-black",
    glowColor: "rgba(234, 179, 8, 0.7)",
    description: "Tingkat tertinggi mahaguru matematika! Legenda abadi arena tinju matematika dengan 100.000+ poin.",
    perk: "Gelar Tertinggi Profesor, Animasi Emas Mythic, Status Legenda",
  },
];

// Helper mendapatkan tier berdasarkan score
export const getRankTierByScore = (score: number): RankTier => {
  const safeScore = Math.max(0, Math.floor(score || 0));
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (safeScore >= RANK_TIERS[i].minScore) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
};

// Helper mendapatkan tier berikutnya
export const getNextRankTier = (score: number): RankTier | null => {
  const currentTier = getRankTierByScore(score);
  const nextIndex = RANK_TIERS.findIndex((t) => t.id === currentTier.id) + 1;
  if (nextIndex < RANK_TIERS.length) {
    return RANK_TIERS[nextIndex];
  }
  return null; // Sudah tier tertinggi (Profesor)
};

// Helper menghitung persentase progress dan sisa poin ke tier berikutnya
export interface RankProgressInfo {
  currentTier: RankTier;
  nextTier: RankTier | null;
  percentage: number;
  pointsNeeded: number;
  currentPointsInTier: number;
  totalPointsInTier: number;
  isMaxRank: boolean;
}

export const getRankProgress = (score: number): RankProgressInfo => {
  const safeScore = Math.max(0, Math.floor(score || 0));
  const currentTier = getRankTierByScore(safeScore);
  const nextTier = getNextRankTier(safeScore);

  if (!nextTier) {
    // Pangkat tertinggi: Profesor Matematika
    return {
      currentTier,
      nextTier: null,
      percentage: 100,
      pointsNeeded: 0,
      currentPointsInTier: safeScore - currentTier.minScore,
      totalPointsInTier: 1000,
      isMaxRank: true,
    };
  }

  const currentPointsInTier = safeScore - currentTier.minScore;
  const totalPointsInTier = nextTier.minScore - currentTier.minScore;
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((currentPointsInTier / totalPointsInTier) * 100))
  );
  const pointsNeeded = Math.max(0, nextTier.minScore - safeScore);

  return {
    currentTier,
    nextTier,
    percentage,
    pointsNeeded,
    currentPointsInTier,
    totalPointsInTier,
    isMaxRank: false,
  };
};

// Backward-compatible badge string calculator
export const calculateBadge = (score: number): string => {
  const tier = getRankTierByScore(score);
  return tier.name;
};
