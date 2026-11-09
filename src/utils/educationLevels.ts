import { EducationLevel } from '../types';

export interface EducationLevelConfig {
  id: EducationLevel;
  label: string;
  name: string;
  shortDesc: string;
  ageRange: string;
  icon: string;
  badge: string;
  color: string;
  borderActive: string;
  bgLight: string;
  gradient: string;
  sampleQuestions: string[];
}

export const EDUCATION_LEVELS: EducationLevelConfig[] = [
  {
    id: 'paud',
    label: 'PAUD',
    name: 'Pendidikan Anak Usia Dini',
    shortDesc: 'Hitung gambar 1-5 & pengenalan visual',
    ageRange: 'Usia 2-4 Thn',
    icon: '🐣',
    badge: 'PEMULA CILIK',
    color: 'text-pink-400',
    borderActive: 'border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.3)]',
    bgLight: 'bg-pink-950/30',
    gradient: 'from-pink-500/20 to-rose-500/10',
    sampleQuestions: ['Hitung 🍎🍎🍎 = 3', '1 + 1 = 2', '2 + 1 = 3'],
  },
  {
    id: 'tk',
    label: 'TK',
    name: 'Taman Kanak-Kanak',
    shortDesc: 'Hitung benda 1-10 & tambah kurang awal',
    ageRange: 'Usia 5-6 Thn',
    icon: '🎈',
    badge: 'PRA-SEKOLAH',
    color: 'text-orange-400',
    borderActive: 'border-orange-500 text-orange-300 shadow-[0_0_15px_rgba(251,146,60,0.3)]',
    bgLight: 'bg-orange-950/30',
    gradient: 'from-orange-500/20 to-amber-500/10',
    sampleQuestions: ['Hitung ⭐⭐⭐⭐⭐⭐ = 6', '4 + 3 = 7', '8 - 3 = 5'],
  },
  {
    id: 'sd',
    label: 'SD',
    name: 'Sekolah Dasar',
    shortDesc: 'Tambah, kurang, kali & bagi hingga ratusan',
    ageRange: 'Kelas 1-6 SD',
    icon: '🎒',
    badge: 'STANDAR ANAK',
    color: 'text-amber-400',
    borderActive: 'border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    bgLight: 'bg-amber-950/30',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    sampleQuestions: ['24 + 38 = 62', '7 × 8 = 56', '72 ÷ 9 = 8'],
  },
  {
    id: 'smp',
    label: 'SMP',
    name: 'Sekolah Menengah Pertama',
    shortDesc: 'Aljabar dasar, akar kuadrat & fisika gerak',
    ageRange: 'Kelas 7-9 SMP',
    icon: '📐',
    badge: 'MENENGAH',
    color: 'text-emerald-400',
    borderActive: 'border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    bgLight: 'bg-emerald-950/30',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    sampleQuestions: ['2x + 6 = 20 (x=7)', '√144 = 12', 's = v × t (v=8, t=3 → 24)'],
  },
  {
    id: 'sma',
    label: 'SMA',
    name: 'Sekolah Menengah Atas / SMK',
    shortDesc: 'Aljabar lanjutan, akar kubik, hukum Newton & usaha',
    ageRange: 'Kelas 10-12 SMA',
    icon: '🔬',
    badge: 'TINGKAT LANJUT',
    color: 'text-sky-400',
    borderActive: 'border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]',
    bgLight: 'bg-sky-950/30',
    gradient: 'from-sky-500/20 to-blue-500/10',
    sampleQuestions: ['∛343 = 7', 'F = m × a (m=8, a=5 → 40)', 'W = F × s'],
  },
  {
    id: 'kuliah',
    label: 'KULIAH',
    name: 'Perguruan Tinggi & Mahasiswa',
    shortDesc: 'Kalkulus (Turunan & Integral), Logaritma, Matriks & Energi',
    ageRange: 'Universitas / Umum',
    icon: '🎓',
    badge: 'MASTER / EXPERT',
    color: 'text-purple-400',
    borderActive: 'border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    bgLight: 'bg-purple-950/30',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    sampleQuestions: ["f(x)=3x² di x=4 → f'(4)=24", '²log(64) = 6', 'Ek = ½mv² (m=4, v=6 → 72)'],
  },
];

export function getEducationLevelConfig(level: EducationLevel): EducationLevelConfig {
  return (
    EDUCATION_LEVELS.find((l) => l.id === level) ||
    EDUCATION_LEVELS[2] // default SD
  );
}
