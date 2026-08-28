import { MathQuestion, QuestionCategory, QuestionDifficulty } from '../types';

export class MathGenerator {
  private static questionIdCounter = 1;

  public static generateQuestion(
    category: QuestionCategory = 'all',
    difficulty: QuestionDifficulty = 'easy',
    seed?: number
  ): MathQuestion {
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

    switch (chosenCategory) {
      case 'counting':
        return this.generateCounting(id, difficulty);
      case 'algebra':
        return this.generateAlgebra(id, difficulty);
      case 'roots':
        return this.generateRoots(id, difficulty);
      case 'physics':
        return this.generatePhysics(id, difficulty);
      case 'geometry':
        return this.generateGeometry(id, difficulty);
      case 'arithmetic':
      default:
        return this.generateArithmetic(id, difficulty);
    }
  }

  private static generateArithmetic(
    id: string,
    difficulty: QuestionDifficulty
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
      // 🔥 TINGKAT SULIT: Angka besar, kombinasi, dan perkalian belasan
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 90) + 55;
        const n2 = Math.floor(Math.random() * 80) + 45;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = 7;
        sub = 'Penjumlahan Besar';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 120) + 90;
        const n2 = Math.floor(Math.random() * 70) + 35;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = 7;
        sub = 'Pengurangan Tingkat Lanjut';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 8) + 11; // 11..18
        const n2 = Math.floor(Math.random() * 8) + 4; // 4..11
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = 9;
        sub = 'Perkalian Belasan';
      } else {
        answer = Math.floor(Math.random() * 14) + 8; // 8..21
        const n2 = Math.floor(Math.random() * 8) + 6; // 6..13
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = 9;
        sub = 'Pembagian Tingkat Lanjut';
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
    difficulty: QuestionDifficulty
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
      count = Math.floor(Math.random() * 7) + 14; // 14..20
      score = 6;
      sub = 'Hitung Cepat Fokus Tinggi';
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
    difficulty: QuestionDifficulty
  ): MathQuestion {
    if (difficulty === 'easy') {
      // Persamaan satu langkah (x + a = b atau ax = b)
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
      // Persamaan dua langkah: ax + b = c atau ax - b = c
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
      // Tingkat sulit: koefisien lebih besar dan tantangan aljabar
      const x = Math.floor(Math.random() * 12) + 3; // 3..14
      const a = Math.floor(Math.random() * 5) + 4; // 4..8
      const b = Math.floor(Math.random() * 25) + 10;
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        const rhs = a * x + b;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x + ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: 9,
          difficulty,
          subText: 'Aljabar Tingkat Lanjut',
        };
      } else {
        const rhs = a * x - b;
        return {
          id,
          category: 'algebra',
          questionText: `Cari nilai x:  ${a}x - ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: 9,
          difficulty,
          subText: 'Aljabar Tingkat Lanjut',
        };
      }
    }
  }

  private static generateRoots(
    id: string,
    difficulty: QuestionDifficulty
  ): MathQuestion {
    if (difficulty === 'easy') {
      // Kuadrat mudah: 2..8 (√4 s/d √64)
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
      // Kuadrat 9..13 (√81 s/d √169) atau Akar Pangkat Tiga 2..3 (∛8, ∛27)
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
      // Kuadrat 13..16 (√169 s/d √256) atau Akar Pangkat Tiga 4..7 (∛64, ∛125, ∛216, ∛343)
      const isCube = Math.random() > 0.45;
      if (isCube) {
        const base = Math.floor(Math.random() * 4) + 4; // 4..7
        const num = base * base * base;
        return {
          id,
          category: 'roots',
          questionText: `∛${num} = ?`,
          correctAnswer: base,
          scoreValue: 10,
          difficulty,
          subText: 'Akar Pangkat Tiga Master',
        };
      } else {
        const base = Math.floor(Math.random() * 4) + 13; // 13..16
        const num = base * base;
        return {
          id,
          category: 'roots',
          questionText: `√${num} = ?`,
          correctAnswer: base,
          scoreValue: 9,
          difficulty,
          subText: 'Akar Kuadrat Tingkat Lanjut',
        };
      }
    }
  }

  private static generatePhysics(
    id: string,
    difficulty: QuestionDifficulty
  ): MathQuestion {
    if (difficulty === 'easy') {
      // Jarak sederhana: s = v * t
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
      const type = Math.floor(Math.random() * 2); // 0: speed, 1: time
      if (type === 0) {
        const answer = Math.floor(Math.random() * 8) + 5; // 5..12 km/jam
        const t = Math.floor(Math.random() * 4) + 2; // 2..5 jam
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
        const answer = Math.floor(Math.random() * 5) + 2; // 2..6 jam
        const v = Math.floor(Math.random() * 8) + 5; // 5..12 km/jam
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
      // Tingkat lanjut: Hukum Newton Gaya (F = m * a) atau Usaha (W = F * s)
      const isForce = Math.random() > 0.5;
      if (isForce) {
        const m = Math.floor(Math.random() * 8) + 4; // 4..11 kg
        const a = Math.floor(Math.random() * 6) + 3; // 3..8 m/s²
        return {
          id,
          category: 'physics',
          questionText: `Gaya (F) jika massa m = ${m} kg & percepatan a = ${a} m/s²?`,
          correctAnswer: m * a,
          scoreValue: 9,
          difficulty,
          subText: 'Hukum II Newton: F = m × a (Satuan Newton)',
        };
      } else {
        const F = Math.floor(Math.random() * 10) + 8; // 8..17 N
        const s = Math.floor(Math.random() * 6) + 3; // 3..8 m
        return {
          id,
          category: 'physics',
          questionText: `Usaha (W) jika gaya F = ${F} N & jarak perpindahan s = ${s} m?`,
          correctAnswer: F * s,
          scoreValue: 9,
          difficulty,
          subText: 'Rumus Usaha: W = F × s (Satuan Joule)',
        };
      }
    }
  }

  private static generateGeometry(
    id: string,
    difficulty: QuestionDifficulty
  ): MathQuestion {
    if (difficulty === 'easy') {
      // Keliling persegi (K = 4s) atau Luas Persegi Panjang (L = p * l)
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
      // Volume kubus (s³) atau Volume balok (p * l * t)
      const isCube = Math.random() > 0.5;
      if (isCube) {
        const s = Math.floor(Math.random() * 3) + 2; // 2..4
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
      // Luas permukaan kubus (6s²) atau Luas permukaan balok: 2(pl + pt + lt)
      const isCubeSurface = Math.random() > 0.5;
      if (isCubeSurface) {
        const s = Math.floor(Math.random() * 4) + 3; // 3..6
        return {
          id,
          category: 'geometry',
          questionText: `Luas permukaan kubus dengan sisi ${s} cm = ?`,
          correctAnswer: 6 * s * s,
          scoreValue: 9,
          difficulty,
          subText: 'Luas Permukaan Kubus: L = 6s² (cm²)',
        };
      } else {
        const p = Math.floor(Math.random() * 4) + 3; // 3..6
        const l = Math.floor(Math.random() * 3) + 2; // 2..4
        const t = Math.floor(Math.random() * 3) + 2; // 2..4
        const surfaceArea = 2 * (p * l + p * t + l * t);
        return {
          id,
          category: 'geometry',
          questionText: `Luas permukaan balok (${p} cm × ${l} cm × ${t} cm) = ?`,
          correctAnswer: surfaceArea,
          scoreValue: 10,
          difficulty,
          subText: 'L = 2(p·l + p·t + l·t)',
        };
      }
    }
  }
}

