import { MathQuestion, QuestionCategory, QuestionDifficulty } from '../types';

export class MathGenerator {
  private static questionIdCounter = 1;

  public static generateQuestion(
    category: QuestionCategory = 'all',
    difficulty: QuestionDifficulty = 'easy',
    seed?: number,
    isHardChallenge?: boolean
  ): MathQuestion {
    const effectiveDifficulty: QuestionDifficulty = isHardChallenge ? 'hard' : difficulty;

    let chosenCategory = category;
    if (category === 'all') {
      const categories: QuestionCategory[] = [
        'arithmetic',
        'counting',
        'algebra',
        'roots',
        'physics',
        'geometry',
      ];
      const index =
        seed !== undefined
          ? Math.abs(seed) % categories.length
          : Math.floor(Math.random() * categories.length);
      chosenCategory = categories[index];
    }

    const id = `q_${this.questionIdCounter++}_${Date.now()}`;
    let question: MathQuestion;

    switch (chosenCategory) {
      case 'counting':
        question = this.generateCounting(id, effectiveDifficulty, isHardChallenge);
        break;
      case 'algebra':
        question = this.generateAlgebra(id, effectiveDifficulty, isHardChallenge);
        break;
      case 'roots':
        question = this.generateRoots(id, effectiveDifficulty, isHardChallenge);
        break;
      case 'physics':
        question = this.generatePhysics(id, effectiveDifficulty, isHardChallenge);
        break;
      case 'geometry':
        question = this.generateGeometry(id, effectiveDifficulty, isHardChallenge);
        break;
      case 'arithmetic':
      default:
        question = this.generateArithmetic(id, effectiveDifficulty, isHardChallenge);
        break;
    }

    if (isHardChallenge) {
      question.isHardChallenge = true;
      // Berikan skor ekstra tinggi untuk soal sulit tantangan 2-streak!
      question.scoreValue = Math.max(15, question.scoreValue * 2);
      if (!question.subText?.startsWith('🔥')) {
        question.subText = `🔥 SOAL SULIT (${question.subText || 'SUPER POIN'})`;
      }
    }

    return question;
  }

  private static generateArithmetic(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    const opType = Math.floor(Math.random() * 4); // 0: +, 1: -, 2: *, 3: /
    let text = '';
    let answer = 0;
    let score = 2;
    let sub = '';

    if (difficulty === 'easy') {
      // ⭐ TINGKAT MUDAH: Angka kecil dan operasi dasar cepat
      if (opType === 0) {
        // Penjumlahan (1..15 + 1..15)
        const n1 = Math.floor(Math.random() * 15) + 1;
        const n2 = Math.floor(Math.random() * 15) + 1;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = 2;
        sub = 'Penjumlahan Cepat';
      } else if (opType === 1) {
        // Pengurangan (1..20)
        const n1 = Math.floor(Math.random() * 15) + 5;
        const n2 = Math.floor(Math.random() * (n1 - 1)) + 1;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = 2;
        sub = 'Pengurangan Dasar';
      } else if (opType === 2) {
        // Perkalian tabel 2..5
        const n1 = Math.floor(Math.random() * 4) + 2;
        const n2 = Math.floor(Math.random() * 8) + 1;
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = 3;
        sub = 'Perkalian Dasar';
      } else {
        // Pembagian bulat sederhana
        answer = Math.floor(Math.random() * 6) + 1;
        const n2 = Math.floor(Math.random() * 4) + 2;
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = 3;
        sub = 'Pembagian Dasar';
      }
    } else if (difficulty === 'medium') {
      // ⚡ TINGKAT MENENGAH: Puluhan dan perkalian tabel menengah
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 40) + 15;
        const n2 = Math.floor(Math.random() * 40) + 12;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = 4;
        sub = 'Penjumlahan Puluhan';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 60) + 30;
        const n2 = Math.floor(Math.random() * (n1 - 10)) + 11;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = 4;
        sub = 'Pengurangan Puluhan';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 7) + 6; // 6..12
        const n2 = Math.floor(Math.random() * 8) + 3; // 3..10
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = 5;
        sub = 'Tabel Perkalian';
      } else {
        answer = Math.floor(Math.random() * 8) + 4; // 4..11
        const n2 = Math.floor(Math.random() * 6) + 3; // 3..8
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = 5;
        sub = 'Pembagian Menengah';
      }
    } else {
      // 🔥 TINGKAT SULIT: Angka besar, perkalian belasan / 2 digit
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 95) + 65;
        const n2 = Math.floor(Math.random() * 95) + 55;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = isHardChallenge ? 16 : 8;
        sub = '🔥 Penjumlahan Angka Besar';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 150) + 110;
        const n2 = Math.floor(Math.random() * 80) + 45;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = isHardChallenge ? 16 : 8;
        sub = '🔥 Pengurangan Tingkat Lanjut';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 8) + 12; // 12..19
        const n2 = Math.floor(Math.random() * 9) + 6; // 6..14
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = isHardChallenge ? 18 : 10;
        sub = '🔥 Perkalian Belasan Lanjut';
      } else {
        answer = Math.floor(Math.random() * 15) + 11; // 11..25
        const n2 = Math.floor(Math.random() * 8) + 7; // 7..14
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = isHardChallenge ? 18 : 10;
        sub = '🔥 Pembagian Angka Besar';
      }
    }

    return {
      id,
      category: 'arithmetic',
      questionText: text,
      correctAnswer: answer,
      scoreValue: score,
      difficulty,
      subText: sub,
    };
  }

  private static generateCounting(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    const icons = ['🍎', '🥊', '⭐', '🍌', '🏆', '⚽', '💎', '🔥'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    let count = 3;
    let score = 2;
    let sub = 'Hitung Cepat';

    if (difficulty === 'easy') {
      count = Math.floor(Math.random() * 5) + 3; // 3..7
      score = 2;
      sub = 'Hitung Objek Dasar';
    } else if (difficulty === 'medium') {
      count = Math.floor(Math.random() * 6) + 8; // 8..13
      score = 4;
      sub = 'Hitung Objek Sedang';
    } else {
      count = Math.floor(Math.random() * 8) + 16; // 16..23
      score = isHardChallenge ? 15 : 8;
      sub = '🔥 Hitung Cepat Fokus Ekstrem';
    }

    return {
      id,
      category: 'counting',
      questionText: 'Hitung jumlah objek di bawah ini!',
      correctAnswer: count,
      scoreValue: score,
      difficulty,
      subText: sub,
      visualItem: {
        icon: selectedIcon,
        count,
      },
    };
  }

  private static generateAlgebra(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (difficulty === 'easy') {
      const isLinear = Math.random() > 0.5;
      if (isLinear) {
        const x = Math.floor(Math.random() * 8) + 2;
        const a = Math.floor(Math.random() * 4) + 2;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x = ${a * x}`,
          correctAnswer: x,
          scoreValue: 3,
          difficulty,
          subText: 'Aljabar Dasar: 1 Langkah',
        };
      } else {
        const x = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 8) + 1;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  x + ${b} = ${x + b}`,
          correctAnswer: x,
          scoreValue: 3,
          difficulty,
          subText: 'Aljabar Dasar: Penjumlahan',
        };
      }
    } else if (difficulty === 'medium') {
      const x = Math.floor(Math.random() * 8) + 2;
      const a = Math.floor(Math.random() * 4) + 2; // 2..5
      const b = Math.floor(Math.random() * 12) + 2;
      const isPlus = Math.random() > 0.4;

      if (isPlus) {
        const rhs = a * x + b;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x + ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: 6,
          difficulty,
          subText: 'Aljabar Menengah: 2 Langkah',
        };
      } else {
        const rhs = a * x - b;
        if (rhs > 0) {
          return {
            id,
            category: 'algebra',
            questionText: `Cari nilai x:  ${a}x - ${b} = ${rhs}`,
            correctAnswer: x,
            scoreValue: 6,
            difficulty,
            subText: 'Aljabar Menengah: 2 Langkah',
          };
        }
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x + 3 = ${a * x + 3}`,
          correctAnswer: x,
          scoreValue: 6,
          difficulty,
          subText: 'Aljabar Menengah: 2 Langkah',
        };
      }
    } else {
      // 🔥 Tingkat sulit: koefisien lebih besar
      const x = Math.floor(Math.random() * 12) + 4; // 4..15
      const a = Math.floor(Math.random() * 6) + 4; // 4..9
      const b = Math.floor(Math.random() * 30) + 12;
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        const rhs = a * x + b;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x + ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Aljabar Tingkat Lanjut',
        };
      } else {
        const rhs = a * x - b;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x - ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Aljabar Tingkat Lanjut',
        };
      }
    }
  }

  private static generateRoots(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (difficulty === 'easy') {
      const base = Math.floor(Math.random() * 7) + 2;
      const num = base * base;
      return {
        id,
        category: 'roots',
        questionText: `√${num} = ?`,
        correctAnswer: base,
        scoreValue: 3,
        difficulty,
        subText: 'Akar Kuadrat Dasar',
      };
    } else if (difficulty === 'medium') {
      const isCube = Math.random() > 0.6;
      if (isCube) {
        const base = Math.floor(Math.random() * 2) + 2; // 2..3
        const num = base * base * base;
        return {
          id,
          category: 'roots',
          questionText: `∛${num} = ?`,
          correctAnswer: base,
          scoreValue: 6,
          difficulty,
          subText: 'Akar Pangkat Tiga',
        };
      } else {
        const base = Math.floor(Math.random() * 5) + 9; // 9..13
        const num = base * base;
        return {
          id,
          category: 'roots',
          questionText: `√${num} = ?`,
          correctAnswer: base,
          scoreValue: 5,
          difficulty,
          subText: 'Akar Kuadrat Menengah',
        };
      }
    } else {
      // 🔥 Kuadrat besar 14..20 atau Kubik 5..10
      const isCube = Math.random() > 0.45;
      if (isCube) {
        const base = Math.floor(Math.random() * 6) + 5; // 5..10 (125, 216, 343, 512, 729, 1000)
        const num = base * base * base;
        return {
          id,
          category: 'roots',
          questionText: `∛${num} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🔥 Akar Pangkat Tiga Master',
        };
      } else {
        const base = Math.floor(Math.random() * 7) + 14; // 14..20 (196, 225, 256, 289, 324, 361, 400)
        const num = base * base;
        return {
          id,
          category: 'roots',
          questionText: `√${num} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Akar Kuadrat Tingkat Lanjut',
        };
      }
    }
  }

  private static generatePhysics(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (difficulty === 'easy') {
      const v = Math.floor(Math.random() * 6) + 3; // 3..8 km/jam
      const t = Math.floor(Math.random() * 4) + 2; // 2..5 jam
      return {
        id,
        category: 'physics',
        questionText: `Jarak (s) jika v = ${v} km/jam & t = ${t} jam?`,
        correctAnswer: v * t,
        scoreValue: 3,
        difficulty,
        subText: 'Rumus: Jarak s = v × t',
      };
    } else if (difficulty === 'medium') {
      const type = Math.floor(Math.random() * 2);
      if (type === 0) {
        const answer = Math.floor(Math.random() * 8) + 5;
        const t = Math.floor(Math.random() * 4) + 2;
        const s = answer * t;
        return {
          id,
          category: 'physics',
          questionText: `Kecepatan (v) jika s = ${s} km & t = ${t} jam?`,
          correctAnswer: answer,
          scoreValue: 6,
          difficulty,
          subText: 'Rumus: Kecepatan v = s ÷ t',
        };
      } else {
        const answer = Math.floor(Math.random() * 5) + 2;
        const v = Math.floor(Math.random() * 8) + 5;
        const s = answer * v;
        return {
          id,
          category: 'physics',
          questionText: `Waktu (t) jika s = ${s} km & v = ${v} km/jam?`,
          correctAnswer: answer,
          scoreValue: 6,
          difficulty,
          subText: 'Rumus: Waktu t = s ÷ v',
        };
      }
    } else {
      // 🔥 Hukum Newton Gaya (F = m * a) atau Usaha (W = F * s)
      const isForce = Math.random() > 0.5;
      if (isForce) {
        const m = Math.floor(Math.random() * 10) + 6; // 6..15 kg
        const a = Math.floor(Math.random() * 8) + 4; // 4..11 m/s²
        return {
          id,
          category: 'physics',
          questionText: `Gaya (F) jika massa m = ${m} kg & percepatan a = ${a} m/s²?`,
          correctAnswer: m * a,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Hukum II Newton: F = m × a (Newton)',
        };
      } else {
        const F = Math.floor(Math.random() * 15) + 10; // 10..24 N
        const s = Math.floor(Math.random() * 8) + 4; // 4..11 m
        return {
          id,
          category: 'physics',
          questionText: `Usaha (W) jika gaya F = ${F} N & jarak perpindahan s = ${s} m?`,
          correctAnswer: F * s,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Rumus Usaha: W = F × s (Joule)',
        };
      }
    }
  }

  private static generateGeometry(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (difficulty === 'easy') {
      const isPerimeter = Math.random() > 0.5;
      if (isPerimeter) {
        const s = Math.floor(Math.random() * 8) + 3;
        return {
          id,
          category: 'geometry',
          questionText: `Keliling persegi dengan panjang sisi ${s} cm = ?`,
          correctAnswer: 4 * s,
          scoreValue: 3,
          difficulty,
          subText: 'Keliling Persegi: K = 4s',
        };
      } else {
        const p = Math.floor(Math.random() * 6) + 3;
        const l = Math.floor(Math.random() * 4) + 2;
        return {
          id,
          category: 'geometry',
          questionText: `Luas persegi panjang (${p} cm × ${l} cm) = ?`,
          correctAnswer: p * l,
          scoreValue: 3,
          difficulty,
          subText: 'Luas: L = p × l',
        };
      }
    } else if (difficulty === 'medium') {
      const isCube = Math.random() > 0.5;
      if (isCube) {
        const s = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'geometry',
          questionText: `Volume kubus dengan sisi ${s} cm = ?`,
          correctAnswer: s * s * s,
          scoreValue: 6,
          difficulty,
          subText: 'Volume Kubus: V = s³ (cm³)',
        };
      } else {
        const p = Math.floor(Math.random() * 5) + 3;
        const l = Math.floor(Math.random() * 3) + 2;
        const t = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'geometry',
          questionText: `Volume balok (${p} cm × ${l} cm × ${t} cm) = ?`,
          correctAnswer: p * l * t,
          scoreValue: 6,
          difficulty,
          subText: 'Volume Balok: V = p × l × t (cm³)',
        };
      }
    } else {
      // 🔥 Luas permukaan kubus (6s²) atau Luas permukaan balok: 2(pl + pt + lt)
      const isCubeSurface = Math.random() > 0.5;
      if (isCubeSurface) {
        const s = Math.floor(Math.random() * 5) + 4; // 4..8
        return {
          id,
          category: 'geometry',
          questionText: `Luas permukaan kubus dengan sisi ${s} cm = ?`,
          correctAnswer: 6 * s * s,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🔥 Luas Permukaan Kubus: L = 6s² (cm²)',
        };
      } else {
        const p = Math.floor(Math.random() * 5) + 4; // 4..8
        const l = Math.floor(Math.random() * 4) + 3; // 3..6
        const t = Math.floor(Math.random() * 3) + 2; // 2..4
        const surfaceArea = 2 * (p * l + p * t + l * t);
        return {
          id,
          category: 'geometry',
          questionText: `Luas permukaan balok (${p} cm × ${l} cm × ${t} cm) = ?`,
          correctAnswer: surfaceArea,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🔥 L = 2(p·l + p·t + l·t)',
        };
      }
    }
  }
}


