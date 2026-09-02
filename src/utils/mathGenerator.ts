import { MathQuestion, QuestionCategory, QuestionDifficulty, EducationLevel } from '../types';

export class MathGenerator {
  private static questionIdCounter = 1;

  public static generateQuestion(
    category: QuestionCategory = 'all',
    difficulty: QuestionDifficulty = 'easy',
    seed?: number,
    isHardChallenge?: boolean,
    educationLevel: EducationLevel = 'sd'
  ): MathQuestion {
    const effectiveDifficulty: QuestionDifficulty = isHardChallenge ? 'hard' : difficulty;
    const id = `q_${this.questionIdCounter++}_${Date.now()}`;

    let question: MathQuestion;

    // 1. Level PAUD (Pendidikan Anak Usia Dini - Usia 2-4 Thn)
    if (educationLevel === 'paud') {
      question = this.generatePaud(id, effectiveDifficulty, isHardChallenge, category);
    }
    // 2. Level TK (Taman Kanak-Kanak - Usia 5-6 Thn)
    else if (educationLevel === 'tk') {
      question = this.generateTk(id, effectiveDifficulty, isHardChallenge, category);
    }
    // 3. Level KULIAH (Perguruan Tinggi / Universitas / Expert)
    else if (educationLevel === 'kuliah') {
      question = this.generateKuliah(id, effectiveDifficulty, isHardChallenge, category);
    }
    // 4. Level SMP / SMA / SD
    else {
      let chosenCategory = category;
      if (category === 'all') {
        let availableCategories: QuestionCategory[] = ['arithmetic', 'counting', 'algebra', 'roots', 'physics', 'geometry'];
        if (educationLevel === 'sd') {
          availableCategories = ['arithmetic', 'counting', 'geometry'];
        } else if (educationLevel === 'smp') {
          availableCategories = ['arithmetic', 'algebra', 'roots', 'physics', 'geometry'];
        } else if (educationLevel === 'sma') {
          availableCategories = ['algebra', 'roots', 'physics', 'geometry', 'arithmetic'];
        }

        const index =
          seed !== undefined
            ? Math.abs(seed) % availableCategories.length
            : Math.floor(Math.random() * availableCategories.length);
        chosenCategory = availableCategories[index];
      }

      if (educationLevel === 'sma') {
        question = this.generateSma(id, chosenCategory, effectiveDifficulty, isHardChallenge);
      } else if (educationLevel === 'smp') {
        question = this.generateSmp(id, chosenCategory, effectiveDifficulty, isHardChallenge);
      } else {
        // SD default
        switch (chosenCategory) {
          case 'counting':
            question = this.generateCounting(id, effectiveDifficulty, isHardChallenge);
            break;
          case 'geometry':
            question = this.generateGeometry(id, effectiveDifficulty, isHardChallenge);
            break;
          case 'roots':
            question = this.generateRoots(id, effectiveDifficulty, isHardChallenge);
            break;
          case 'algebra':
            question = this.generateAlgebra(id, effectiveDifficulty, isHardChallenge);
            break;
          case 'physics':
            question = this.generatePhysics(id, effectiveDifficulty, isHardChallenge);
            break;
          case 'arithmetic':
          default:
            question = this.generateArithmetic(id, effectiveDifficulty, isHardChallenge);
            break;
        }
      }
    }

    question.educationLevel = educationLevel;

    if (isHardChallenge) {
      question.isHardChallenge = true;
      question.scoreValue = Math.max(15, question.scoreValue * 2);
      if (!question.subText?.startsWith('🔥')) {
        question.subText = `🔥 SOAL SULIT (${question.subText || 'SUPER POIN'})`;
      }
    }

    return question;
  }

  // ==========================================
  // 🐣 LEVEL 1: PAUD (Usia 2-4 Tahun)
  // ==========================================
  private static generatePaud(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean,
    _category?: QuestionCategory
  ): MathQuestion {
    const isVisual = Math.random() > 0.4 || difficulty === 'easy';
    const icons = ['🍎', '⭐', '🥊', '🍌', '🐱', '🎈', '🚗', '🍓'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];

    if (isVisual) {
      // Hitung 1 s.d 5 objek
      let count = Math.floor(Math.random() * 3) + 1; // 1..3
      if (difficulty === 'medium') count = Math.floor(Math.random() * 2) + 4; // 4..5
      if (difficulty === 'hard') count = 5;

      return {
        id,
        category: 'counting',
        educationLevel: 'paud',
        questionText: 'Hitung benda lucu ini ya!',
        correctAnswer: count,
        scoreValue: isHardChallenge ? 15 : 3,
        difficulty,
        subText: '🐣 PAUD • Pengenalan Objek & Angka',
        visualItem: {
          icon: selectedIcon,
          count,
        },
      };
    } else {
      // Tambah / Kurang super dasar (1+1, 2+1, 3-1)
      const op = Math.random() > 0.4 ? '+' : '-';
      let text = '';
      let ans = 0;

      if (op === '+') {
        const a = Math.floor(Math.random() * 2) + 1; // 1..2
        const b = Math.floor(Math.random() * 2) + 1; // 1..2
        text = `${a} + ${b} = ?`;
        ans = a + b;
      } else {
        const a = Math.floor(Math.random() * 2) + 2; // 2..3
        text = `${a} - 1 = ?`;
        ans = a - 1;
      }

      return {
        id,
        category: 'arithmetic',
        educationLevel: 'paud',
        questionText: text,
        correctAnswer: ans,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Tambah Kurang Pemula',
      };
    }
  }

  // ==========================================
  // 🎈 LEVEL 2: TK (Usia 5-6 Tahun)
  // ==========================================
  private static generateTk(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean,
    _category?: QuestionCategory
  ): MathQuestion {
    const qType = Math.floor(Math.random() * 3); // 0: visual counting (4..10), 1: addition (1..10), 2: subtraction / sequence

    if (qType === 0) {
      const icons = ['⭐', '🍎', '🏆', '💎', '⚽', '🥊', '🌸', '🍩'];
      const selectedIcon = icons[Math.floor(Math.random() * icons.length)];
      let count = Math.floor(Math.random() * 4) + 4; // 4..7
      if (difficulty === 'medium') count = Math.floor(Math.random() * 3) + 7; // 7..9
      if (difficulty === 'hard') count = 10;

      return {
        id,
        category: 'counting',
        educationLevel: 'tk',
        questionText: 'Berapa jumlah benda di bawah ini?',
        correctAnswer: count,
        scoreValue: isHardChallenge ? 15 : 3,
        difficulty,
        subText: '🎈 TK • Berhitung Cepat 1-10',
        visualItem: {
          icon: selectedIcon,
          count,
        },
      };
    } else if (qType === 1) {
      // Penjumlahan dalam 1-10
      const a = Math.floor(Math.random() * 5) + 1; // 1..5
      const b = Math.floor(Math.random() * 5) + 1; // 1..5
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'tk',
        questionText: `${a} + ${b} = ?`,
        correctAnswer: a + b,
        scoreValue: isHardChallenge ? 15 : 3,
        difficulty,
        subText: '🎈 TK • Penjumlahan Dasar 1-10',
      };
    } else {
      // Pengurangan dalam 1-10 atau tebak pola
      const isSequence = Math.random() > 0.6;
      if (isSequence) {
        const start = Math.floor(Math.random() * 6) + 1; // e.g. start=3 -> 3, 4, [?], 6
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'tk',
          questionText: `Lengkapi: ${start}, ${start + 1}, [?], ${start + 3}`,
          correctAnswer: start + 2,
          scoreValue: isHardChallenge ? 16 : 4,
          difficulty,
          subText: '🎈 TK • Tebak Pola Angka Urut',
        };
      } else {
        const a = Math.floor(Math.random() * 5) + 5; // 5..9
        const b = Math.floor(Math.random() * (a - 1)) + 1;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'tk',
          questionText: `${a} - ${b} = ?`,
          correctAnswer: a - b,
          scoreValue: isHardChallenge ? 15 : 3,
          difficulty,
          subText: '🎈 TK • Pengurangan Sederhana',
        };
      }
    }
  }

  // ==========================================
  // 📐 LEVEL 4: SMP (Kelas 7-9)
  // ==========================================
  private static generateSmp(
    id: string,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (category === 'algebra') {
      return this.generateAlgebra(id, difficulty, isHardChallenge);
    }
    if (category === 'roots') {
      return this.generateRoots(id, difficulty, isHardChallenge);
    }
    if (category === 'physics') {
      return this.generatePhysics(id, difficulty, isHardChallenge);
    }
    if (category === 'geometry') {
      return this.generateGeometry(id, difficulty, isHardChallenge);
    }
    return this.generateArithmetic(id, difficulty, isHardChallenge);
  }

  // ==========================================
  // 🔬 LEVEL 5: SMA (Kelas 10-12)
  // ==========================================
  private static generateSma(
    id: string,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (category === 'physics') {
      // SMA Physics: Hukum Newton II (F=ma), Usaha (W=Fs), Energi Potensial (Ep=mgh, g=10)
      const pType = Math.floor(Math.random() * 3);
      if (pType === 0) {
        const m = Math.floor(Math.random() * 12) + 5; // 5..16 kg
        const a = Math.floor(Math.random() * 8) + 4; // 4..11 m/s²
        return {
          id,
          category: 'physics',
          educationLevel: 'sma',
          questionText: `F = m × a (m = ${m} kg, a = ${a} m/s²). Gaya F = ? N`,
          correctAnswer: m * a,
          scoreValue: isHardChallenge ? 18 : 8,
          difficulty,
          subText: '🔬 SMA • Hukum II Newton: F = m × a (Newton)',
        };
      } else if (pType === 1) {
        const F = Math.floor(Math.random() * 16) + 10; // 10..25 N
        const s = Math.floor(Math.random() * 9) + 4; // 4..12 m
        return {
          id,
          category: 'physics',
          educationLevel: 'sma',
          questionText: `W = F × s (F = ${F} N, s = ${s} m). Usaha W = ? Joule`,
          correctAnswer: F * s,
          scoreValue: isHardChallenge ? 18 : 8,
          difficulty,
          subText: '🔬 SMA • Usaha Mekanik: W = F × s',
        };
      } else {
        const m = Math.floor(Math.random() * 6) + 2; // 2..7 kg
        const h = Math.floor(Math.random() * 8) + 3; // 3..10 m
        const g = 10;
        return {
          id,
          category: 'physics',
          educationLevel: 'sma',
          questionText: `Ep = m × g × h (m = ${m} kg, g = 10, h = ${h} m). Ep = ? J`,
          correctAnswer: m * g * h,
          scoreValue: isHardChallenge ? 20 : 9,
          difficulty,
          subText: '🔬 SMA • Energi Potensial Gravitasi (Joule)',
        };
      }
    }

    if (category === 'roots') {
      // Akar pangkat 3 dan akar kuadrat lanjutan
      const isCube = Math.random() > 0.4;
      if (isCube) {
        const base = Math.floor(Math.random() * 6) + 4; // 4..9 (64, 125, 216, 343, 512, 729)
        const cube = base * base * base;
        return {
          id,
          category: 'roots',
          educationLevel: 'sma',
          questionText: `∛${cube} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 18 : 8,
          difficulty,
          subText: '🔬 SMA • Akar Pangkat Tiga',
        };
      } else {
        const base = Math.floor(Math.random() * 8) + 13; // 13..20
        return {
          id,
          category: 'roots',
          educationLevel: 'sma',
          questionText: `√${base * base} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 18 : 8,
          difficulty,
          subText: '🔬 SMA • Akar Kuadrat Tingkat Lanjut',
        };
      }
    }

    if (category === 'geometry') {
      const s = Math.floor(Math.random() * 5) + 4; // 4..8
      return {
        id,
        category: 'geometry',
        educationLevel: 'sma',
        questionText: `Luas permukaan kubus dengan rusuk s = ${s} cm (L = 6s²) = ?`,
        correctAnswer: 6 * s * s,
        scoreValue: isHardChallenge ? 18 : 8,
        difficulty,
        subText: '🔬 SMA • Luas Permukaan Kubus: L = 6s²',
      };
    }

    // Default SMA Algebra
    const x = Math.floor(Math.random() * 12) + 4;
    const a = Math.floor(Math.random() * 6) + 4;
    const b = Math.floor(Math.random() * 25) + 10;
    return {
      id,
      category: 'algebra',
      educationLevel: 'sma',
      questionText: `Cari nilai x:  ${a}x + ${b} = ${a * x + b}`,
      correctAnswer: x,
      scoreValue: isHardChallenge ? 18 : 8,
      difficulty,
      subText: '🔬 SMA • Persamaan Linier Satu Variabel',
    };
  }

  // ==========================================
  // 🎓 LEVEL 6: KULIAH / PERGURUAN TINGGI (Calculus, Log, Matrix, Advanced Physics)
  // ==========================================
  private static generateKuliah(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean,
    category?: QuestionCategory
  ): MathQuestion {
    const topic = category && category !== 'all' ? category : (['calculus', 'logarithm', 'matrix', 'physics', 'integral'][Math.floor(Math.random() * 5)]);

    // 1. Kalkulus: Turunan Fungsi f'(x)
    if (topic === 'calculus' || topic === 'algebra') {
      const cType = Math.floor(Math.random() * 3);
      if (cType === 0) {
        // f(x) = a x² -> f'(x) = 2ax di x = c
        const a = Math.floor(Math.random() * 4) + 2; // 2..5
        const c = Math.floor(Math.random() * 5) + 2; // 2..6
        const ans = 2 * a * c;
        return {
          id,
          category: 'algebra',
          educationLevel: 'kuliah',
          questionText: `f(x) = ${a}x². Tentukan nilai f'(${c}) = ?`,
          correctAnswer: ans,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Kalkulus Diferensial: f'(x) = ${2 * a}x`,
        };
      } else if (cType === 1) {
        // f(x) = a x³ -> f'(x) = 3ax² di x = c
        const a = Math.floor(Math.random() * 2) + 2; // 2..3
        const c = Math.floor(Math.random() * 3) + 2; // 2..4
        const ans = 3 * a * c * c;
        return {
          id,
          category: 'algebra',
          educationLevel: 'kuliah',
          questionText: `f(x) = ${a}x³. Tentukan nilai f'(${c}) = ?`,
          correctAnswer: ans,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Kalkulus Turunan: f'(x) = ${3 * a}x²`,
        };
      } else {
        // f(x) = a x² + b x di x = c
        const a = Math.floor(Math.random() * 3) + 2; // 2..4
        const b = Math.floor(Math.random() * 6) + 3; // 3..8
        const c = Math.floor(Math.random() * 4) + 2; // 2..5
        const ans = 2 * a * c + b;
        return {
          id,
          category: 'algebra',
          educationLevel: 'kuliah',
          questionText: `f(x) = ${a}x² + ${b}x. Tentukan nilai f'(${c}) = ?`,
          correctAnswer: ans,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Turunan: f'(x) = ${2 * a}x + ${b}`,
        };
      }
    }

    // 2. Integral Tentu: ∫[0..k] f(x) dx
    if (topic === 'integral' || topic === 'roots') {
      const k = Math.floor(Math.random() * 6) + 3; // 3..8
      const iType = Math.random() > 0.5;
      if (iType) {
        // ∫[0..k] 2x dx = k²
        return {
          id,
          category: 'roots',
          educationLevel: 'kuliah',
          questionText: `Hitung Integral Tentu: ∫₀^${k} (2x) dx = ?`,
          correctAnswer: k * k,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Integral Tentu: [x²]₀^${k}`,
        };
      } else {
        // ∫[0..k] 3x² dx = k³ (k 2..4)
        const smallK = Math.floor(Math.random() * 3) + 2; // 2..4
        return {
          id,
          category: 'roots',
          educationLevel: 'kuliah',
          questionText: `Hitung Integral Tentu: ∫₀^${smallK} (3x²) dx = ?`,
          correctAnswer: smallK * smallK * smallK,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Integral Tentu: [x³]₀^${smallK}`,
        };
      }
    }

    // 3. Logaritma & Eksponensial
    if (topic === 'logarithm') {
      const bases = [2, 3, 5];
      const base = bases[Math.floor(Math.random() * bases.length)];
      let power = Math.floor(Math.random() * 3) + 3; // 3..5
      if (base === 2) power = Math.floor(Math.random() * 4) + 4; // 4..7 (16, 32, 64, 128)
      const val = Math.pow(base, power);

      const isLog = Math.random() > 0.4;
      if (isLog) {
        const baseSup = base === 2 ? '²' : base === 3 ? '³' : '⁵';
        return {
          id,
          category: 'algebra',
          educationLevel: 'kuliah',
          questionText: `Tentukan nilai: ${baseSup}log(${val}) = ?`,
          correctAnswer: power,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: `🎓 KULIAH • Logaritma Basis ${base}: ${base}^${power} = ${val}`,
        };
      } else {
        return {
          id,
          category: 'algebra',
          educationLevel: 'kuliah',
          questionText: `${base}ˣ = ${val}. Berapakah nilai x?`,
          correctAnswer: power,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: `🎓 KULIAH • Persamaan Eksponensial Basis ${base}`,
        };
      }
    }

    // 4. Matriks: Determinan 2x2 atau Dot Product
    if (topic === 'matrix' || topic === 'geometry') {
      const isDet = Math.random() > 0.5;
      if (isDet) {
        const a = Math.floor(Math.random() * 6) + 3; // 3..8
        const d = Math.floor(Math.random() * 6) + 3; // 3..8
        const b = Math.floor(Math.random() * 4) + 1; // 1..4
        const c = Math.floor(Math.random() * 3) + 1; // 1..3
        const det = a * d - b * c;
        return {
          id,
          category: 'geometry',
          educationLevel: 'kuliah',
          questionText: `Determinan Matriks |[${a}, ${b}], [${c}, ${d}]| = ?`,
          correctAnswer: det,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Determinan Matriks 2×2: (ad - bc)`,
        };
      } else {
        // Dot Product Vektor [u1, u2] • [v1, v2]
        const u1 = Math.floor(Math.random() * 5) + 2;
        const u2 = Math.floor(Math.random() * 5) + 2;
        const v1 = Math.floor(Math.random() * 5) + 2;
        const v2 = Math.floor(Math.random() * 5) + 2;
        const dot = u1 * v1 + u2 * v2;
        return {
          id,
          category: 'geometry',
          educationLevel: 'kuliah',
          questionText: `Dot Product vektor: [${u1}, ${u2}] • [${v1}, ${v2}] = ?`,
          correctAnswer: dot,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: `🎓 KULIAH • Perkalian Titik Vektor: (u₁v₁ + u₂v₂)`,
        };
      }
    }

    // 5. Fisika Kuliah: Energi Kinetik (Ek = 1/2 m v²), Momentum (p = m v), Daya (P = W / t)
    const pType = Math.floor(Math.random() * 3);
    if (pType === 0) {
      // Ek = 1/2 m v² (m even: 2, 4, 6, 8)
      const m = (Math.floor(Math.random() * 4) + 1) * 2; // 2, 4, 6, 8 kg
      const v = Math.floor(Math.random() * 6) + 3; // 3..8 m/s
      const ek = 0.5 * m * v * v;
      return {
        id,
        category: 'physics',
        educationLevel: 'kuliah',
        questionText: `Ek = ½ m v² (m = ${m} kg, v = ${v} m/s). Ek = ? Joule`,
        correctAnswer: ek,
        scoreValue: isHardChallenge ? 20 : 10,
        difficulty,
        subText: '🎓 KULIAH • Energi Kinetik Benda (Joule)',
      };
    } else if (pType === 1) {
      // Momentum p = m * v
      const m = Math.floor(Math.random() * 8) + 4; // 4..11 kg
      const v = Math.floor(Math.random() * 9) + 5; // 5..13 m/s
      return {
        id,
        category: 'physics',
        educationLevel: 'kuliah',
        questionText: `Momentum: p = m × v (m = ${m} kg, v = ${v} m/s). p = ?`,
        correctAnswer: m * v,
        scoreValue: isHardChallenge ? 18 : 9,
        difficulty,
        subText: '🎓 KULIAH • Momentum Linier: p = m × v (kg·m/s)',
      };
    } else {
      // Daya P = W / t
      const p = Math.floor(Math.random() * 15) + 15; // 15..30 Watt
      const t = Math.floor(Math.random() * 8) + 4; // 4..11 s
      const w = p * t;
      return {
        id,
        category: 'physics',
        educationLevel: 'kuliah',
        questionText: `Daya P = W ÷ t (W = ${w} J, t = ${t} s). Daya P = ? Watt`,
        correctAnswer: p,
        scoreValue: isHardChallenge ? 18 : 9,
        difficulty,
        subText: '🎓 KULIAH • Daya Mekanik/Listrik: P = W ÷ t (Watt)',
      };
    }
  }

  // ==========================================
  // 🎒 LEVEL 3: SD (Standard Methods)
  // ==========================================
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
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 15) + 1;
        const n2 = Math.floor(Math.random() * 15) + 1;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = 2;
        sub = '🎒 SD • Penjumlahan Cepat';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 15) + 5;
        const n2 = Math.floor(Math.random() * (n1 - 1)) + 1;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = 2;
        sub = '🎒 SD • Pengurangan Dasar';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 4) + 2;
        const n2 = Math.floor(Math.random() * 8) + 1;
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = 3;
        sub = '🎒 SD • Perkalian Dasar';
      } else {
        answer = Math.floor(Math.random() * 6) + 1;
        const n2 = Math.floor(Math.random() * 4) + 2;
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = 3;
        sub = '🎒 SD • Pembagian Dasar';
      }
    } else if (difficulty === 'medium') {
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 40) + 15;
        const n2 = Math.floor(Math.random() * 40) + 12;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = 4;
        sub = '🎒 SD • Penjumlahan Puluhan';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 60) + 30;
        const n2 = Math.floor(Math.random() * (n1 - 10)) + 11;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = 4;
        sub = '🎒 SD • Pengurangan Puluhan';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 7) + 6;
        const n2 = Math.floor(Math.random() * 8) + 3;
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = 5;
        sub = '🎒 SD • Tabel Perkalian';
      } else {
        answer = Math.floor(Math.random() * 8) + 4;
        const n2 = Math.floor(Math.random() * 6) + 3;
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = 5;
        sub = '🎒 SD • Pembagian Menengah';
      }
    } else {
      if (opType === 0) {
        const n1 = Math.floor(Math.random() * 95) + 65;
        const n2 = Math.floor(Math.random() * 95) + 55;
        text = `${n1} + ${n2} = ?`;
        answer = n1 + n2;
        score = isHardChallenge ? 16 : 8;
        sub = '🎒 SD • Penjumlahan Ratusan';
      } else if (opType === 1) {
        const n1 = Math.floor(Math.random() * 150) + 110;
        const n2 = Math.floor(Math.random() * 80) + 45;
        text = `${n1} - ${n2} = ?`;
        answer = n1 - n2;
        score = isHardChallenge ? 16 : 8;
        sub = '🎒 SD • Pengurangan Ratusan';
      } else if (opType === 2) {
        const n1 = Math.floor(Math.random() * 8) + 12;
        const n2 = Math.floor(Math.random() * 9) + 6;
        text = `${n1} × ${n2} = ?`;
        answer = n1 * n2;
        score = isHardChallenge ? 18 : 10;
        sub = '🎒 SD • Perkalian Belasan';
      } else {
        answer = Math.floor(Math.random() * 15) + 11;
        const n2 = Math.floor(Math.random() * 8) + 7;
        const n1 = answer * n2;
        text = `${n1} ÷ ${n2} = ?`;
        score = isHardChallenge ? 18 : 10;
        sub = '🎒 SD • Pembagian Puluhan';
      }
    }

    return {
      id,
      category: 'arithmetic',
      educationLevel: 'sd',
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
      sub = '🎒 SD • Hitung Objek Dasar';
    } else if (difficulty === 'medium') {
      count = Math.floor(Math.random() * 6) + 8; // 8..13
      score = 4;
      sub = '🎒 SD • Hitung Objek Sedang';
    } else {
      count = Math.floor(Math.random() * 8) + 16; // 16..23
      score = isHardChallenge ? 15 : 8;
      sub = '🎒 SD • Hitung Cepat Banyak Objek';
    }

    return {
      id,
      category: 'counting',
      educationLevel: 'sd',
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
          educationLevel: 'smp',
          questionText: `Cari nilai x:  ${a}x = ${a * x}`,
          correctAnswer: x,
          scoreValue: 3,
          difficulty,
          subText: '📐 SMP • Aljabar Dasar 1 Langkah',
        };
      } else {
        const x = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 8) + 1;
        return {
          id,
          category: 'algebra',
          educationLevel: 'smp',
          questionText: `Cari nilai x:  x + ${b} = ${x + b}`,
          correctAnswer: x,
          scoreValue: 3,
          difficulty,
          subText: '📐 SMP • Aljabar: Penjumlahan',
        };
      }
    } else if (difficulty === 'medium') {
      const x = Math.floor(Math.random() * 8) + 2;
      const a = Math.floor(Math.random() * 4) + 2;
      const b = Math.floor(Math.random() * 12) + 2;
      const isPlus = Math.random() > 0.4;

      if (isPlus) {
        const rhs = a * x + b;
        return {
          id,
          category: 'algebra',
          educationLevel: 'smp',
          questionText: `Cari nilai x:  ${a}x + ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Aljabar 2 Langkah',
        };
      } else {
        const rhs = a * x - b;
        if (rhs > 0) {
          return {
            id,
            category: 'algebra',
            educationLevel: 'smp',
            questionText: `Cari nilai x:  ${a}x - ${b} = ${rhs}`,
            correctAnswer: x,
            scoreValue: 6,
            difficulty,
            subText: '📐 SMP • Aljabar 2 Langkah',
          };
        }
        return {
          id,
          category: 'algebra',
          educationLevel: 'smp',
          questionText: `Cari nilai x:  ${a}x + 3 = ${a * x + 3}`,
          correctAnswer: x,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Aljabar 2 Langkah',
        };
      }
    } else {
      const x = Math.floor(Math.random() * 12) + 4;
      const a = Math.floor(Math.random() * 6) + 4;
      const b = Math.floor(Math.random() * 30) + 12;
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        const rhs = a * x + b;
        return {
          id,
          category: 'algebra',
          educationLevel: 'smp',
          questionText: `Cari nilai x:  ${a}x + ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '📐 SMP • Aljabar Tingkat Lanjut',
        };
      } else {
        const rhs = a * x - b;
        return {
          id,
          category: 'algebra',
          educationLevel: 'smp',
          questionText: `Cari nilai x:  ${a}x - ${b} = ${rhs}`,
          correctAnswer: x,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '📐 SMP • Aljabar Tingkat Lanjut',
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
        educationLevel: 'smp',
        questionText: `√${num} = ?`,
        correctAnswer: base,
        scoreValue: 3,
        difficulty,
        subText: '📐 SMP • Akar Kuadrat Dasar',
      };
    } else if (difficulty === 'medium') {
      const isCube = Math.random() > 0.6;
      if (isCube) {
        const base = Math.floor(Math.random() * 2) + 2;
        const num = base * base * base;
        return {
          id,
          category: 'roots',
          educationLevel: 'smp',
          questionText: `∛${num} = ?`,
          correctAnswer: base,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Akar Pangkat Tiga',
        };
      } else {
        const base = Math.floor(Math.random() * 5) + 9;
        const num = base * base;
        return {
          id,
          category: 'roots',
          educationLevel: 'smp',
          questionText: `√${num} = ?`,
          correctAnswer: base,
          scoreValue: 5,
          difficulty,
          subText: '📐 SMP • Akar Kuadrat Menengah',
        };
      }
    } else {
      const isCube = Math.random() > 0.45;
      if (isCube) {
        const base = Math.floor(Math.random() * 6) + 5;
        const num = base * base * base;
        return {
          id,
          category: 'roots',
          educationLevel: 'smp',
          questionText: `∛${num} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '📐 SMP • Akar Pangkat Tiga Master',
        };
      } else {
        const base = Math.floor(Math.random() * 7) + 14;
        const num = base * base;
        return {
          id,
          category: 'roots',
          educationLevel: 'smp',
          questionText: `√${num} = ?`,
          correctAnswer: base,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '📐 SMP • Akar Kuadrat Tingkat Lanjut',
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
      const v = Math.floor(Math.random() * 6) + 3;
      const t = Math.floor(Math.random() * 4) + 2;
      return {
        id,
        category: 'physics',
        educationLevel: 'smp',
        questionText: `Jarak (s) jika v = ${v} km/jam & t = ${t} jam?`,
        correctAnswer: v * t,
        scoreValue: 3,
        difficulty,
        subText: '📐 SMP • Rumus: Jarak s = v × t',
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
          educationLevel: 'smp',
          questionText: `Kecepatan (v) jika s = ${s} km & t = ${t} jam?`,
          correctAnswer: answer,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Rumus: Kecepatan v = s ÷ t',
        };
      } else {
        const answer = Math.floor(Math.random() * 5) + 2;
        const v = Math.floor(Math.random() * 8) + 5;
        const s = answer * v;
        return {
          id,
          category: 'physics',
          educationLevel: 'smp',
          questionText: `Waktu (t) jika s = ${s} km & v = ${v} km/jam?`,
          correctAnswer: answer,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Rumus: Waktu t = s ÷ v',
        };
      }
    } else {
      const isForce = Math.random() > 0.5;
      if (isForce) {
        const m = Math.floor(Math.random() * 10) + 6;
        const a = Math.floor(Math.random() * 8) + 4;
        return {
          id,
          category: 'physics',
          educationLevel: 'smp',
          questionText: `Gaya (F) jika massa m = ${m} kg & percepatan a = ${a} m/s²?`,
          correctAnswer: m * a,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '📐 SMP • Hukum II Newton: F = m × a (N)',
        };
      } else {
        const F = Math.floor(Math.random() * 15) + 10;
        const s = Math.floor(Math.random() * 8) + 4;
        return {
          id,
          category: 'physics',
          educationLevel: 'smp',
          questionText: `Usaha (W) jika gaya F = ${F} N & perpindahan s = ${s} m?`,
          correctAnswer: F * s,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '📐 SMP • Rumus Usaha: W = F × s (J)',
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
          educationLevel: 'sd',
          questionText: `Keliling persegi dengan panjang sisi ${s} cm = ?`,
          correctAnswer: 4 * s,
          scoreValue: 3,
          difficulty,
          subText: '🎒 SD • Keliling Persegi: K = 4s',
        };
      } else {
        const p = Math.floor(Math.random() * 6) + 3;
        const l = Math.floor(Math.random() * 4) + 2;
        return {
          id,
          category: 'geometry',
          educationLevel: 'sd',
          questionText: `Luas persegi panjang (${p} cm × ${l} cm) = ?`,
          correctAnswer: p * l,
          scoreValue: 3,
          difficulty,
          subText: '🎒 SD • Luas: L = p × l',
        };
      }
    } else if (difficulty === 'medium') {
      const isCube = Math.random() > 0.5;
      if (isCube) {
        const s = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'geometry',
          educationLevel: 'sd',
          questionText: `Volume kubus dengan sisi ${s} cm = ?`,
          correctAnswer: s * s * s,
          scoreValue: 6,
          difficulty,
          subText: '🎒 SD • Volume Kubus: V = s³ (cm³)',
        };
      } else {
        const p = Math.floor(Math.random() * 5) + 3;
        const l = Math.floor(Math.random() * 3) + 2;
        const t = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'geometry',
          educationLevel: 'sd',
          questionText: `Volume balok (${p} cm × ${l} cm × ${t} cm) = ?`,
          correctAnswer: p * l * t,
          scoreValue: 6,
          difficulty,
          subText: '🎒 SD • Volume Balok: V = p × l × t (cm³)',
        };
      }
    } else {
      const isCubeSurface = Math.random() > 0.5;
      if (isCubeSurface) {
        const s = Math.floor(Math.random() * 5) + 4;
        return {
          id,
          category: 'geometry',
          educationLevel: 'sd',
          questionText: `Luas permukaan kubus dengan sisi ${s} cm = ?`,
          correctAnswer: 6 * s * s,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🎒 SD • Luas Permukaan Kubus: L = 6s²',
        };
      } else {
        const p = Math.floor(Math.random() * 5) + 4;
        const l = Math.floor(Math.random() * 4) + 3;
        const t = Math.floor(Math.random() * 3) + 2;
        const surfaceArea = 2 * (p * l + p * t + l * t);
        return {
          id,
          category: 'geometry',
          educationLevel: 'sd',
          questionText: `Luas permukaan balok (${p} cm × ${l} cm × ${t} cm) = ?`,
          correctAnswer: surfaceArea,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🎒 SD • L = 2(p·l + p·t + l·t)',
        };
      }
    }
  }
}
