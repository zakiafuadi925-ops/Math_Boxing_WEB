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
    // 4. Level SMA (Kelas 10-12)
    else if (educationLevel === 'sma') {
      const chosenCat = this.resolveCategory(category, ['algebra', 'roots', 'physics', 'geometry', 'arithmetic'], seed);
      question = this.generateSma(id, chosenCat, effectiveDifficulty, isHardChallenge);
    }
    // 5. Level SMP (Kelas 7-9)
    else if (educationLevel === 'smp') {
      const chosenCat = this.resolveCategory(category, ['algebra', 'roots', 'physics', 'geometry', 'arithmetic'], seed);
      question = this.generateSmp(id, chosenCat, effectiveDifficulty, isHardChallenge);
    }
    // 6. Level SD (Kelas 1-6)
    else {
      const chosenCat = this.resolveCategory(category, ['arithmetic', 'counting', 'geometry', 'algebra', 'roots', 'physics'], seed);
      question = this.generateSd(id, chosenCat, effectiveDifficulty, isHardChallenge);
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

  private static resolveCategory(
    requested: QuestionCategory,
    available: QuestionCategory[],
    seed?: number
  ): QuestionCategory {
    if (requested !== 'all' && available.includes(requested)) {
      return requested;
    }
    if (requested !== 'all') {
      return available[0];
    }
    const idx = seed !== undefined ? Math.abs(seed) % available.length : Math.floor(Math.random() * available.length);
    return available[idx];
  }

  // ==========================================
  // 🐣 LEVEL 1: PAUD (Usia 2-4 Tahun)
  // Strictly visual objects 1-5, super simple recognition
  // ==========================================
  private static generatePaud(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean,
    category?: QuestionCategory
  ): MathQuestion {
    const isCountingOnly = category === 'counting';
    const isArithOnly = category === 'arithmetic';
    const subType = isCountingOnly ? 0 : isArithOnly ? 1 : Math.floor(Math.random() * 4);

    const icons = ['🍎', '⭐', '🍌', '🐱', '🎈', '🚗', '🍓', '🐥', '🧸', '🌸', '🍬', '🍦', '🐶', '⚽'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];

    // Subtype 0: Hitung Benda Visual (1..5)
    if (subType === 0) {
      let count = 1;
      if (difficulty === 'easy') {
        count = Math.floor(Math.random() * 3) + 1; // 1..3
      } else if (difficulty === 'medium') {
        count = Math.floor(Math.random() * 2) + 3; // 3..4
      } else {
        count = Math.floor(Math.random() * 2) + 4; // 4..5
      }

      const questionsText = [
        `Hitung ${selectedIcon} lucu ini ya!`,
        `Ada berapa ${selectedIcon} di bawah?`,
        `Berapa banyak ${selectedIcon} ini?`,
        `Hitung jumlah ${selectedIcon} yuk!`,
      ];
      const qText = questionsText[Math.floor(Math.random() * questionsText.length)];

      return {
        id,
        category: 'counting',
        educationLevel: 'paud',
        questionText: qText,
        correctAnswer: count,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Hitung Objek Bergambar (1-5)',
        visualItem: {
          icon: selectedIcon,
          count,
        },
      };
    }

    // Subtype 1: Tambah Kurang Dasar 1..3
    if (subType === 1) {
      const isPlus = Math.random() > 0.35;
      if (isPlus) {
        const a = Math.floor(Math.random() * 2) + 1; // 1..2
        const b = Math.floor(Math.random() * 2) + 1; // 1..2
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'paud',
          questionText: `${a} + ${b} = ?`,
          correctAnswer: a + b,
          scoreValue: isHardChallenge ? 15 : 2,
          difficulty,
          subText: '🐣 PAUD • Tambah Mudah (1-4)',
        };
      } else {
        const a = Math.floor(Math.random() * 2) + 2; // 2..3
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'paud',
          questionText: `${a} - 1 = ?`,
          correctAnswer: a - 1,
          scoreValue: isHardChallenge ? 15 : 2,
          difficulty,
          subText: '🐣 PAUD • Kurang 1 Sederhana',
        };
      }
    }

    // Subtype 2: Cerita Anak Bergambar Super Singkat
    if (subType === 2) {
      const storyType = Math.floor(Math.random() * 3);
      if (storyType === 0) {
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'paud',
          questionText: 'Punya 1 permen 🍬 diberi 1 🍬 lagi. Jadi berapa?',
          correctAnswer: 2,
          scoreValue: isHardChallenge ? 15 : 3,
          difficulty,
          subText: '🐣 PAUD • Cerita Permen Cilik',
        };
      } else if (storyType === 1) {
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'paud',
          questionText: 'Ada 2 balon 🎈 meletus 1 🎈. Sisa berapa?',
          correctAnswer: 1,
          scoreValue: isHardChallenge ? 15 : 3,
          difficulty,
          subText: '🐣 PAUD • Cerita Balon Cilik',
        };
      } else {
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'paud',
          questionText: 'Ada 2 anak ayam 🐥 datang 1 🐥 lagi. Total?',
          correctAnswer: 3,
          scoreValue: isHardChallenge ? 15 : 3,
          difficulty,
          subText: '🐣 PAUD • Cerita Hewan Lucu',
        };
      }
    }

    // Subtype 3: Konsep Angka & Tubuh/Benda Sekitar
    const bodyType = Math.floor(Math.random() * 4);
    if (bodyType === 0) {
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'paud',
        questionText: 'Berapa mata boneka beruang 🧸?',
        correctAnswer: 2,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Pengenalan Angka & Benda',
      };
    } else if (bodyType === 1) {
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'paud',
        questionText: 'Angka setelah angka 1 adalah?',
        correctAnswer: 2,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Urutan Angka Awal',
      };
    } else if (bodyType === 2) {
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'paud',
        questionText: 'Angka setelah angka 2 adalah?',
        correctAnswer: 3,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Urutan Angka Awal',
      };
    } else {
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'paud',
        questionText: 'Berapa jumlah roda sepeda roda dua 🚲?',
        correctAnswer: 2,
        scoreValue: isHardChallenge ? 15 : 2,
        difficulty,
        subText: '🐣 PAUD • Pengenalan Benda Sekitar',
      };
    }
  }

  // ==========================================
  // 🎈 LEVEL 2: TK (Usia 5-6 Tahun)
  // Strictly TK topics (1-10 counting, addition, subtraction, number bonds to 10, shapes/body/vehicle counting).
  // Absolutely NO SD math, no complex division, no geometry formulas.
  // ==========================================
  private static generateTk(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean,
    category?: QuestionCategory
  ): MathQuestion {
    // If specific category chosen:
    if (category === 'counting') {
      return this.generateTkCounting(id, difficulty, isHardChallenge);
    }
    if (category === 'geometry') {
      return this.generateTkGeometry(id, difficulty, isHardChallenge);
    }

    // Diverse TK category pool:
    const qTypes = [
      'counting',      // 0: Visual Counting 3..9
      'add_within_10', // 1: Penjumlahan 1..10
      'sub_within_10', // 2: Pengurangan 1..10
      'number_bonds',  // 3: Pasangan 10 (? + 7 = 10)
      'sequences',     // 4: Pola Angka (3, 4, [?], 6)
      'stories',       // 5: Soal Cerita Anak TK
      'doubles',       // 6: Angka Kembar (3+3, 4+4)
      'geometry_kids', // 7: Jumlah sisi/sudut/kaki hewan
    ];

    const pick = qTypes[Math.floor(Math.random() * qTypes.length)];

    switch (pick) {
      case 'counting':
        return this.generateTkCounting(id, difficulty, isHardChallenge);
      case 'add_within_10':
        return this.generateTkAddition(id, difficulty, isHardChallenge);
      case 'sub_within_10':
        return this.generateTkSubtraction(id, difficulty, isHardChallenge);
      case 'number_bonds':
        return this.generateTkNumberBonds(id, difficulty, isHardChallenge);
      case 'sequences':
        return this.generateTkSequence(id, difficulty, isHardChallenge);
      case 'stories':
        return this.generateTkStory(id, difficulty, isHardChallenge);
      case 'doubles':
        return this.generateTkDoubles(id, difficulty, isHardChallenge);
      case 'geometry_kids':
      default:
        return this.generateTkGeometry(id, difficulty, isHardChallenge);
    }
  }

  private static generateTkCounting(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const icons = ['⭐', '🍎', '🏆', '💎', '⚽', '🥊', '🌸', '🍩', '🦁', '🐱', '🚀', '🍰', '🍕', '🎁', '🐢', '🐼', '🍬', '🍉', '🐥'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];

    let count = 3;
    if (difficulty === 'easy') {
      count = Math.floor(Math.random() * 3) + 3; // 3..5
    } else if (difficulty === 'medium') {
      count = Math.floor(Math.random() * 3) + 6; // 6..8
    } else {
      count = Math.floor(Math.random() * 2) + 8; // 8..9
    }

    const prompts = [
      `Hitung jumlah ${selectedIcon} berikut!`,
      `Ada berapa ${selectedIcon} di bawah ini?`,
      `Berapa banyak ${selectedIcon} semuanya?`,
    ];
    const qText = prompts[Math.floor(Math.random() * prompts.length)];

    return {
      id,
      category: 'counting',
      educationLevel: 'tk',
      questionText: qText,
      correctAnswer: count,
      scoreValue: isHardChallenge ? 15 : 3,
      difficulty,
      subText: `🎈 TK • Hitung Benda (${count} Objek)`,
      visualItem: {
        icon: selectedIcon,
        count,
      },
    };
  }

  private static generateTkAddition(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    let a = 1;
    let b = 1;

    if (difficulty === 'easy') {
      // Hasil <= 6
      a = Math.floor(Math.random() * 3) + 1; // 1..3
      b = Math.floor(Math.random() * 3) + 1; // 1..3
    } else if (difficulty === 'medium') {
      // Hasil 6..9
      a = Math.floor(Math.random() * 4) + 2; // 2..5
      b = Math.floor(Math.random() * (9 - a)) + 1;
    } else {
      // Hasil 8..10
      a = Math.floor(Math.random() * 5) + 3; // 3..7
      b = Math.floor(Math.random() * (10 - a)) + 1;
    }

    return {
      id,
      category: 'arithmetic',
      educationLevel: 'tk',
      questionText: `${a} + ${b} = ?`,
      correctAnswer: a + b,
      scoreValue: isHardChallenge ? 15 : 3,
      difficulty,
      subText: '🎈 TK • Penjumlahan 1-10',
    };
  }

  private static generateTkSubtraction(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    let a = 5;
    let b = 2;

    if (difficulty === 'easy') {
      a = Math.floor(Math.random() * 3) + 3; // 3..5
      b = Math.floor(Math.random() * (a - 1)) + 1;
    } else if (difficulty === 'medium') {
      a = Math.floor(Math.random() * 4) + 5; // 5..8
      b = Math.floor(Math.random() * (a - 1)) + 1;
    } else {
      a = Math.floor(Math.random() * 3) + 8; // 8..10
      b = Math.floor(Math.random() * (a - 1)) + 1;
    }

    return {
      id,
      category: 'arithmetic',
      educationLevel: 'tk',
      questionText: `${a} - ${b} = ?`,
      correctAnswer: a - b,
      scoreValue: isHardChallenge ? 15 : 3,
      difficulty,
      subText: '🎈 TK • Pengurangan 1-10',
    };
  }

  private static generateTkNumberBonds(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const target = 10;
    const given = Math.floor(Math.random() * 7) + 2; // 2..8
    const missing = target - given;

    const isFirstMissing = Math.random() > 0.5;
    const qText = isFirstMissing ? `[?] + ${given} = 10` : `${given} + [?] = 10`;

    return {
      id,
      category: 'arithmetic',
      educationLevel: 'tk',
      questionText: qText,
      correctAnswer: missing,
      scoreValue: isHardChallenge ? 16 : 4,
      difficulty,
      subText: '🎈 TK • Pasangan Angka Menuju 10',
    };
  }

  private static generateTkSequence(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const seqType = Math.floor(Math.random() * 3);

    if (seqType === 0) {
      // 1, 2, [?], 4
      const start = Math.floor(Math.random() * 5) + 1; // 1..5
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'tk',
        questionText: `${start}, ${start + 1}, [?], ${start + 3}`,
        correctAnswer: start + 2,
        scoreValue: isHardChallenge ? 15 : 3,
        difficulty,
        subText: '🎈 TK • Urutan Angka Berurutan',
      };
    } else if (seqType === 1) {
      // 5, 6, 7, [?]
      const start = Math.floor(Math.random() * 6) + 1; // 1..6
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'tk',
        questionText: `${start}, ${start + 1}, ${start + 2}, [?]`,
        correctAnswer: start + 3,
        scoreValue: isHardChallenge ? 15 : 3,
        difficulty,
        subText: '🎈 TK • Angka Selanjutnya',
      };
    } else {
      // Hitung Mundur: 5, 4, [?], 2
      const start = Math.floor(Math.random() * 4) + 6; // 6..9
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'tk',
        questionText: `${start}, ${start - 1}, [?], ${start - 3}`,
        correctAnswer: start - 2,
        scoreValue: isHardChallenge ? 16 : 4,
        difficulty,
        subText: '🎈 TK • Hitung Mundur Angka',
      };
    }
  }

  private static generateTkStory(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const stories = [
      { text: 'Punya 3 balon 🎈 dapat lagi 2 🎈. Berapa total balon?', ans: 5 },
      { text: 'Ada 5 permen 🍬 dimakan 2 🍬. Berapa sisa permen?', ans: 3 },
      { text: 'Ada 4 anak kucing 🐱 lahir lagi 2 🐱. Berapa totalnya?', ans: 6 },
      { text: 'Ibu membeli 6 apel 🍎 dimakan adik 1 🍎. Sisa apel?', ans: 5 },
      { text: 'Ada 3 burung 🐦 datang lagi 3 🐦. Berapa semua burung?', ans: 6 },
      { text: 'Punya 7 kelereng 🔵 hilang 2 🔵. Sisa kelereng?', ans: 5 },
      { text: 'Kakak beri 4 donat 🍩 ayah beri 4 🍩. Total donat?', ans: 8 },
      { text: 'Ada 8 mobil 🚗 keluar parkir 3 🚗. Sisa mobil?', ans: 5 },
      { text: 'Punya 2 es krim 🍦 beli lagi 3 🍦. Berapa total es krim?', ans: 5 },
      { text: 'Ada 9 wortel 🥕 dimakan kelinci 4 🥕. Sisa wortel?', ans: 5 },
      { text: 'Di kolam ada 5 ikan 🐠 masuk lagi 4 🐠. Total ikan?', ans: 9 },
      { text: 'Punya 10 kue 🍪 dibagikan 5 🍪 ke teman. Sisa kue?', ans: 5 },
    ];

    const chosen = stories[Math.floor(Math.random() * stories.length)];
    return {
      id,
      category: 'arithmetic',
      educationLevel: 'tk',
      questionText: chosen.text,
      correctAnswer: chosen.ans,
      scoreValue: isHardChallenge ? 16 : 4,
      difficulty,
      subText: '🎈 TK • Soal Cerita Bergambar',
    };
  }

  private static generateTkDoubles(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const n = Math.floor(Math.random() * 5) + 1; // 1..5
    return {
      id,
      category: 'arithmetic',
      educationLevel: 'tk',
      questionText: `Angka Kembar: ${n} + ${n} = ?`,
      correctAnswer: n * 2,
      scoreValue: isHardChallenge ? 15 : 3,
      difficulty,
      subText: '🎈 TK • Penjumlahan Kembar (Doubles)',
    };
  }

  private static generateTkGeometry(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const questions = [
      { text: 'Berapa jumlah sisi pada Segitiga 🔺?', ans: 3, sub: 'Sisi Segitiga' },
      { text: 'Berapa jumlah sudut pada Kotak/Persegi 🔲?', ans: 4, sub: 'Sudut Kotak' },
      { text: 'Berapa jumlah roda pada sebuah Mobil 🚗?', ans: 4, sub: 'Roda Mobil' },
      { text: 'Berapa jumlah roda pada Sepeda Motor 🏍️?', ans: 2, sub: 'Roda Motor' },
      { text: 'Berapa jumlah kaki pada seekor Kucing 🐱?', ans: 4, sub: 'Kaki Kucing' },
      { text: 'Berapa jumlah kaki pada seekor Ayam 🐔?', ans: 2, sub: 'Kaki Ayam' },
      { text: 'Berapa jumlah ujung pada sebuah Bintang ⭐?', ans: 5, sub: 'Ujung Bintang' },
      { text: 'Berapa jumlah roda pada sebuah Becak 🛺?', ans: 3, sub: 'Roda Becak' },
      { text: 'Berapa telinga pada 2 ekor kelinci lucu 🐰🐰?', ans: 4, sub: 'Telinga Kelinci' },
      { text: 'Berapa jumlah mata pada 3 orang anak 👦👧🧒?', ans: 6, sub: 'Mata Manusia' },
      { text: 'Berapa jumlah roda pada 2 sepeda 🚲🚲?', ans: 4, sub: 'Hitung Roda' },
      { text: 'Berapa jari pada 1 tangan manusia ✋?', ans: 5, sub: 'Jari Tangan' },
      { text: 'Berapa total jari pada 2 tangan manusia 👐?', ans: 10, sub: 'Jari 2 Tangan' },
    ];

    const chosen = questions[Math.floor(Math.random() * questions.length)];
    return {
      id,
      category: 'geometry',
      educationLevel: 'tk',
      questionText: chosen.text,
      correctAnswer: chosen.ans,
      scoreValue: isHardChallenge ? 15 : 3,
      difficulty,
      subText: `🎈 TK • Pengetahuan & Bentuk (${chosen.sub})`,
    };
  }

  // ==========================================
  // 🎒 LEVEL 3: SD (Sekolah Dasar Kelas 1-6)
  // Fully enriched: Arithmetic (+,-,×,÷, brackets), Geometry, Roots/Squares, Missing numbers, Time/Units/Percent
  // ==========================================
  private static generateSd(
    id: string,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (category === 'counting') {
      return this.generateCounting(id, difficulty, isHardChallenge);
    }
    if (category === 'geometry') {
      return this.generateSdGeometry(id, difficulty, isHardChallenge);
    }
    if (category === 'roots') {
      return this.generateSdRoots(id, difficulty, isHardChallenge);
    }
    if (category === 'algebra') {
      return this.generateSdAlgebra(id, difficulty, isHardChallenge);
    }
    if (category === 'physics') {
      return this.generateSdPhysics(id, difficulty, isHardChallenge);
    }

    // Default Arithmetic for SD
    return this.generateSdArithmetic(id, difficulty, isHardChallenge);
  }

  private static generateSdArithmetic(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const subType = Math.floor(Math.random() * 5); // 0: +, 1: -, 2: *, 3: /, 4: mixed

    if (difficulty === 'easy') {
      // Kelas 1-2 SD
      if (subType === 0) {
        const n1 = Math.floor(Math.random() * 25) + 5;
        const n2 = Math.floor(Math.random() * 25) + 5;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} + ${n2} = ?`,
          correctAnswer: n1 + n2,
          scoreValue: 2,
          difficulty,
          subText: '🎒 SD • Penjumlahan Puluhan',
        };
      } else if (subType === 1) {
        const n1 = Math.floor(Math.random() * 30) + 15;
        const n2 = Math.floor(Math.random() * (n1 - 5)) + 3;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} - ${n2} = ?`,
          correctAnswer: n1 - n2,
          scoreValue: 2,
          difficulty,
          subText: '🎒 SD • Pengurangan Puluhan',
        };
      } else if (subType === 2) {
        const n1 = Math.floor(Math.random() * 6) + 2; // 2..7
        const n2 = Math.floor(Math.random() * 6) + 2; // 2..7
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} × ${n2} = ?`,
          correctAnswer: n1 * n2,
          scoreValue: 3,
          difficulty,
          subText: '🎒 SD • Perkalian Dasar 1-7',
        };
      } else if (subType === 3) {
        const ans = Math.floor(Math.random() * 6) + 2;
        const n2 = Math.floor(Math.random() * 5) + 2;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${ans * n2} ÷ ${n2} = ?`,
          correctAnswer: ans,
          scoreValue: 3,
          difficulty,
          subText: '🎒 SD • Pembagian Dasar',
        };
      } else {
        const a = Math.floor(Math.random() * 10) + 5;
        const b = Math.floor(Math.random() * 10) + 5;
        const c = Math.floor(Math.random() * 5) + 2;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${a} + ${b} - ${c} = ?`,
          correctAnswer: a + b - c,
          scoreValue: 3,
          difficulty,
          subText: '🎒 SD • Operasi Hitung Campuran',
        };
      }
    } else if (difficulty === 'medium') {
      // Kelas 3-4 SD
      if (subType === 0) {
        const n1 = Math.floor(Math.random() * 60) + 35;
        const n2 = Math.floor(Math.random() * 60) + 35;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} + ${n2} = ?`,
          correctAnswer: n1 + n2,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Penjumlahan Puluhan Besar',
        };
      } else if (subType === 1) {
        const n1 = Math.floor(Math.random() * 80) + 40;
        const n2 = Math.floor(Math.random() * (n1 - 20)) + 15;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} - ${n2} = ?`,
          correctAnswer: n1 - n2,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Pengurangan Puluhan Menengah',
        };
      } else if (subType === 2) {
        const n1 = Math.floor(Math.random() * 5) + 6; // 6..10
        const n2 = Math.floor(Math.random() * 6) + 4; // 4..9
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} × ${n2} = ?`,
          correctAnswer: n1 * n2,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Tabel Perkalian 6-10',
        };
      } else if (subType === 3) {
        const ans = Math.floor(Math.random() * 8) + 4;
        const n2 = Math.floor(Math.random() * 6) + 4;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${ans * n2} ÷ ${n2} = ?`,
          correctAnswer: ans,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Pembagian Tabel Lengkap',
        };
      } else {
        // Campuran Perkalian + Tambah/Kurang: a + b * c
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 5) + 3;
        const c = Math.floor(Math.random() * 5) + 2;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${a} + ${b} × ${c} = ?`,
          correctAnswer: a + b * c,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Dahulukan Perkalian (+ ×)',
        };
      }
    } else {
      // Kelas 5-6 SD / Hard Challenge
      if (subType === 0 || subType === 1) {
        const n1 = Math.floor(Math.random() * 250) + 150;
        const n2 = Math.floor(Math.random() * 200) + 100;
        const isAdd = subType === 0;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: isAdd ? `${n1} + ${n2} = ?` : `${n1} - ${n2} = ?`,
          correctAnswer: isAdd ? n1 + n2 : n1 - n2,
          scoreValue: isHardChallenge ? 16 : 8,
          difficulty,
          subText: isAdd ? '🎒 SD • Penjumlahan Ratusan' : '🎒 SD • Pengurangan Ratusan',
        };
      } else if (subType === 2) {
        const n1 = Math.floor(Math.random() * 9) + 12; // 12..20
        const n2 = Math.floor(Math.random() * 8) + 6; // 6..13
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${n1} × ${n2} = ?`,
          correctAnswer: n1 * n2,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🎒 SD • Perkalian Bilangan Belasan',
        };
      } else if (subType === 3) {
        const ans = Math.floor(Math.random() * 12) + 11; // 11..22
        const n2 = Math.floor(Math.random() * 7) + 8; // 8..14
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `${ans * n2} ÷ ${n2} = ?`,
          correctAnswer: ans,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🎒 SD • Pembagian Bilangan Belasan',
        };
      } else {
        // Operasi tanda kurung: (a + b) × c atau a × b - c × d
        const a = Math.floor(Math.random() * 15) + 10;
        const b = Math.floor(Math.random() * 15) + 5;
        const c = Math.floor(Math.random() * 5) + 3;
        return {
          id,
          category: 'arithmetic',
          educationLevel: 'sd',
          questionText: `(${a} + ${b}) × ${c} = ?`,
          correctAnswer: (a + b) * c,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🎒 SD • Operasi Hitung Dalam Kurung',
        };
      }
    }
  }

  private static generateSdGeometry(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const geoType = Math.floor(Math.random() * 5);

    if (geoType === 0) {
      // Keliling Persegi K = 4s
      const s = Math.floor(Math.random() * 12) + 4; // 4..15 cm
      return {
        id,
        category: 'geometry',
        educationLevel: 'sd',
        questionText: `Keliling persegi dengan sisi s = ${s} cm (K = 4s) = ?`,
        correctAnswer: 4 * s,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Keliling Persegi (4 × s)',
      };
    } else if (geoType === 1) {
      // Luas Persegi Panjang L = p × l
      const p = Math.floor(Math.random() * 9) + 6; // 6..14 cm
      const l = Math.floor(Math.random() * 6) + 3; // 3..8 cm
      return {
        id,
        category: 'geometry',
        educationLevel: 'sd',
        questionText: `Luas persegi panjang (${p} cm × ${l} cm) = ? cm²`,
        correctAnswer: p * l,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Luas Persegi Panjang (p × l)',
      };
    } else if (geoType === 2) {
      // Luas Segitiga L = 1/2 × a × t (a genap)
      const a = (Math.floor(Math.random() * 6) + 3) * 2; // 6, 8, 10, 12, 14, 16
      const t = Math.floor(Math.random() * 8) + 4; // 4..11
      return {
        id,
        category: 'geometry',
        educationLevel: 'sd',
        questionText: `Luas segitiga (alas = ${a} cm, tinggi = ${t} cm) = ? cm²`,
        correctAnswer: 0.5 * a * t,
        scoreValue: 5,
        difficulty,
        subText: '🎒 SD • Luas Segitiga: ½ × a × t',
      };
    } else if (geoType === 3) {
      // Volume Kubus V = s³
      const s = Math.floor(Math.random() * 5) + 3; // 3..7
      return {
        id,
        category: 'geometry',
        educationLevel: 'sd',
        questionText: `Volume kubus dengan rusuk s = ${s} cm (V = s³) = ? cm³`,
        correctAnswer: s * s * s,
        scoreValue: 6,
        difficulty,
        subText: '🎒 SD • Volume Kubus: s × s × s',
      };
    } else {
      // Luas Permukaan Kubus L = 6s²
      const s = Math.floor(Math.random() * 5) + 3; // 3..7
      return {
        id,
        category: 'geometry',
        educationLevel: 'sd',
        questionText: `Luas permukaan kubus (s = ${s} cm, L = 6s²) = ? cm²`,
        correctAnswer: 6 * s * s,
        scoreValue: isHardChallenge ? 18 : 8,
        difficulty,
        subText: '🎒 SD • Luas Permukaan Kubus (6 × s²)',
      };
    }
  }

  private static generateSdRoots(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const isRoot = Math.random() > 0.45;
    if (isRoot) {
      const bases = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const base = bases[Math.floor(Math.random() * bases.length)];
      return {
        id,
        category: 'roots',
        educationLevel: 'sd',
        questionText: `√${base * base} = ?`,
        correctAnswer: base,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Akar Kuadrat Dasar',
      };
    } else {
      const base = Math.floor(Math.random() * 9) + 4; // 4..12
      return {
        id,
        category: 'roots',
        educationLevel: 'sd',
        questionText: `${base}² (${base} × ${base}) = ?`,
        correctAnswer: base * base,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Kuadrat Bilangan (Pangkat 2)',
      };
    }
  }

  private static generateSdAlgebra(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    // Missing number puzzles for SD kids
    const algType = Math.floor(Math.random() * 4);
    if (algType === 0) {
      const missing = Math.floor(Math.random() * 25) + 10;
      const b = Math.floor(Math.random() * 30) + 15;
      return {
        id,
        category: 'algebra',
        educationLevel: 'sd',
        questionText: `Isi angka hilang: [?] + ${b} = ${missing + b}`,
        correctAnswer: missing,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Angka Hilang Penjumlahan',
      };
    } else if (algType === 1) {
      const missing = Math.floor(Math.random() * 25) + 10;
      const total = Math.floor(Math.random() * 40) + missing + 10;
      return {
        id,
        category: 'algebra',
        educationLevel: 'sd',
        questionText: `Isi angka hilang: ${total} - [?] = ${total - missing}`,
        correctAnswer: missing,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Angka Hilang Pengurangan',
      };
    } else if (algType === 2) {
      const missing = Math.floor(Math.random() * 7) + 3; // 3..9
      const factor = Math.floor(Math.random() * 7) + 3; // 3..9
      return {
        id,
        category: 'algebra',
        educationLevel: 'sd',
        questionText: `Isi angka hilang: [?] × ${factor} = ${missing * factor}`,
        correctAnswer: missing,
        scoreValue: 5,
        difficulty,
        subText: '🎒 SD • Angka Hilang Perkalian',
      };
    } else {
      const missing = Math.floor(Math.random() * 8) + 4; // 4..11
      const divisor = Math.floor(Math.random() * 6) + 3; // 3..8
      return {
        id,
        category: 'algebra',
        educationLevel: 'sd',
        questionText: `Isi angka hilang: ${missing * divisor} ÷ [?] = ${missing}`,
        correctAnswer: divisor,
        scoreValue: 5,
        difficulty,
        subText: '🎒 SD • Angka Hilang Pembagian',
      };
    }
  }

  private static generateSdPhysics(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    // Satuan waktu, panjang, berat, persen & pecahan SD
    const pType = Math.floor(Math.random() * 5);

    if (pType === 0) {
      // Konversi Waktu
      const hours = Math.floor(Math.random() * 4) + 2; // 2..5 jam
      return {
        id,
        category: 'physics',
        educationLevel: 'sd',
        questionText: `${hours} jam = ? menit (1 jam = 60 menit)`,
        correctAnswer: hours * 60,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Konversi Satuan Waktu',
      };
    } else if (pType === 1) {
      // Satuan Tahun / Kalender
      const calType = Math.floor(Math.random() * 4);
      if (calType === 0) {
        const windu = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `${windu} windu = ? tahun (1 windu = 8 tahun)`,
          correctAnswer: windu * 8,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Konversi Windu ke Tahun',
        };
      } else if (calType === 1) {
        const dekade = Math.floor(Math.random() * 4) + 2;
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `${dekade} dekade = ? tahun (1 dekade = 10 tahun)`,
          correctAnswer: dekade * 10,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Konversi Dekade ke Tahun',
        };
      } else if (calType === 2) {
        const abad = Math.floor(Math.random() * 3) + 2;
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `${abad} abad = ? tahun (1 abad = 100 tahun)`,
          correctAnswer: abad * 100,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Konversi Abad ke Tahun',
        };
      } else {
        const lustrum = Math.floor(Math.random() * 4) + 2;
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `${lustrum} lustrum = ? tahun (1 lustrum = 5 tahun)`,
          correctAnswer: lustrum * 5,
          scoreValue: 4,
          difficulty,
          subText: '🎒 SD • Konversi Lustrum ke Tahun',
        };
      }
    } else if (pType === 2) {
      // Persen Sederhana SD
      const percentType = Math.floor(Math.random() * 3);
      if (percentType === 0) {
        const total = (Math.floor(Math.random() * 6) + 2) * 20; // 40, 60, 80, 100, 120, 140
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `50% dari ${total} = ?`,
          correctAnswer: total * 0.5,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Persentase Dasar (50%)',
        };
      } else if (percentType === 1) {
        const total = (Math.floor(Math.random() * 6) + 2) * 20; // 40..140
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `25% dari ${total} = ?`,
          correctAnswer: total * 0.25,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Persentase Seperempat (25%)',
        };
      } else {
        const total = (Math.floor(Math.random() * 8) + 3) * 10; // 30..100
        return {
          id,
          category: 'physics',
          educationLevel: 'sd',
          questionText: `10% dari ${total} = ?`,
          correctAnswer: total * 0.1,
          scoreValue: 5,
          difficulty,
          subText: '🎒 SD • Persentase Sepersepuluh (10%)',
        };
      }
    } else if (pType === 3) {
      // Konversi Panjang / Berat
      const km = Math.floor(Math.random() * 6) + 2; // 2..7 km
      return {
        id,
        category: 'physics',
        educationLevel: 'sd',
        questionText: `${km} km = ? meter (1 km = 1.000 m)`,
        correctAnswer: km * 1000,
        scoreValue: 4,
        difficulty,
        subText: '🎒 SD • Konversi Kilometer ke Meter',
      };
    } else {
      // Kecepatan Dasar SD: Jarak = Kecepatan × Waktu
      const v = Math.floor(Math.random() * 6) + 4; // 4..9 km/jam
      const t = Math.floor(Math.random() * 3) + 2; // 2..4 jam
      return {
        id,
        category: 'physics',
        educationLevel: 'sd',
        questionText: `Jarak tempuh jika kecepatan ${v} km/jam selama ${t} jam = ? km`,
        correctAnswer: v * t,
        scoreValue: 5,
        difficulty,
        subText: '🎒 SD • Jarak: Kecepatan × Waktu',
      };
    }
  }

  // ==========================================
  // 📐 LEVEL 4: SMP (Kelas 7-9)
  // Aljabar 1-2 langkah, Pythagoras, Lingkaran, Pangkat/Akar, Fisika (v, s, F, W, Tekanan), Statistika
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
      return this.generateSmpGeometry(id, difficulty, isHardChallenge);
    }
    return this.generateSmpArithmetic(id, difficulty, isHardChallenge);
  }

  private static generateSmpGeometry(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const geoType = Math.floor(Math.random() * 4);

    if (geoType === 0) {
      // Teorema Pythagoras (Tripel Pythagoras)
      const triples = [
        { a: 3, b: 4, c: 5 },
        { a: 6, b: 8, c: 10 },
        { a: 5, b: 12, c: 13 },
        { a: 8, b: 15, c: 17 },
        { a: 7, b: 24, c: 25 },
        { a: 9, b: 12, c: 15 },
      ];
      const t = triples[Math.floor(Math.random() * triples.length)];
      const findHypo = Math.random() > 0.4;

      if (findHypo) {
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Pythagoras: Sisi siku-siku ${t.a} cm & ${t.b} cm. Sisi miring (c) = ? cm`,
          correctAnswer: t.c,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Teorema Pythagoras: c = √(a² + b²)',
        };
      } else {
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Pythagoras: Sisi miring c = ${t.c} cm & alas = ${t.a} cm. Tinggi = ? cm`,
          correctAnswer: t.b,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Teorema Pythagoras: b = √(c² - a²)',
        };
      }
    } else if (geoType === 1) {
      // Keliling & Luas Lingkaran (r kelipatan 7)
      const radii = [7, 14, 21];
      const r = radii[Math.floor(Math.random() * radii.length)];
      const isPerimeter = Math.random() > 0.5;

      if (isPerimeter) {
        const kel = Math.round((2 * 22 * r) / 7);
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Keliling lingkaran dengan jari-jari r = ${r} cm (π = 22/7) = ? cm`,
          correctAnswer: kel,
          scoreValue: 6,
          difficulty,
          subText: '📐 SMP • Keliling Lingkaran: 2 × π × r',
        };
      } else {
        const luas = Math.round((22 * r * r) / 7);
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Luas lingkaran dengan jari-jari r = ${r} cm (π = 22/7) = ? cm²`,
          correctAnswer: luas,
          scoreValue: 7,
          difficulty,
          subText: '📐 SMP • Luas Lingkaran: π × r²',
        };
      }
    } else if (geoType === 2) {
      // Sudut Berpelurus & Berpenyiku
      const isPelurus = Math.random() > 0.5;
      if (isPelurus) {
        const angle = Math.floor(Math.random() * 80) + 30; // 30..110
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Pelurus dari sudut ${angle}° (total 180°) = ?°`,
          correctAnswer: 180 - angle,
          scoreValue: 5,
          difficulty,
          subText: '📐 SMP • Sudut Berpelurus (180° - x)',
        };
      } else {
        const angle = Math.floor(Math.random() * 60) + 15; // 15..75
        return {
          id,
          category: 'geometry',
          educationLevel: 'smp',
          questionText: `Penyiku dari sudut ${angle}° (total 90°) = ?°`,
          correctAnswer: 90 - angle,
          scoreValue: 5,
          difficulty,
          subText: '📐 SMP • Sudut Berpenyiku (90° - x)',
        };
      }
    } else {
      // Volume Tabung V = π r² t (r = 7 cm)
      const t = Math.floor(Math.random() * 6) + 4; // 4..9 cm
      const r = 7;
      const vol = 22 * 7 * t; // (22/7)*49*t = 154*t
      return {
        id,
        category: 'geometry',
        educationLevel: 'smp',
        questionText: `Volume tabung (r = 7 cm, t = ${t} cm, π = 22/7) = ? cm³`,
        correctAnswer: vol,
        scoreValue: isHardChallenge ? 18 : 8,
        difficulty,
        subText: '📐 SMP • Volume Tabung: π × r² × t',
      };
    }
  }

  private static generateSmpArithmetic(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    // Bilangan bulat negatif & Statistika SMP
    const statType = Math.floor(Math.random() * 3);

    if (statType === 0) {
      // Operasi Bilangan Bulat Negatif
      const a = -(Math.floor(Math.random() * 20) + 5);
      const b = Math.floor(Math.random() * 30) + 10;
      const op = Math.random() > 0.5 ? '+' : '-';
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'smp',
        questionText: `${a} ${op} ${b} = ?`,
        correctAnswer: op === '+' ? a + b : a - b,
        scoreValue: 4,
        difficulty,
        subText: '📐 SMP • Operasi Bilangan Bulat Negatif',
      };
    } else if (statType === 1) {
      // Perkalian Negatif: (-a) × (-b)
      const a = Math.floor(Math.random() * 8) + 4;
      const b = Math.floor(Math.random() * 8) + 3;
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'smp',
        questionText: `(-${a}) × (-${b}) = ?`,
        correctAnswer: a * b,
        scoreValue: 5,
        difficulty,
        subText: '📐 SMP • Perkalian Bilangan Negatif',
      };
    } else {
      // Rata-rata (Mean) 4 angka bulat
      const targetMean = Math.floor(Math.random() * 6) + 7; // 7..12
      const d1 = targetMean - 2;
      const d2 = targetMean + 1;
      const d3 = targetMean - 1;
      const d4 = targetMean * 4 - (d1 + d2 + d3);
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'smp',
        questionText: `Rata-rata (Mean) dari: ${d1}, ${d2}, ${d3}, ${d4} = ?`,
        correctAnswer: targetMean,
        scoreValue: 6,
        difficulty,
        subText: '📐 SMP • Statistika: Rata-Rata (Mean)',
      };
    }
  }

  // ==========================================
  // 🔬 LEVEL 5: SMA (Kelas 10-12)
  // Trigonometri sudut istimewa, Logaritma, Eksponen pecahan, Vektor, GLBB, Newton, Kombinatorika
  // ==========================================
  private static generateSma(
    id: string,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    if (category === 'physics') {
      return this.generateSmaPhysics(id, difficulty, isHardChallenge);
    }
    if (category === 'roots') {
      return this.generateSmaRoots(id, difficulty, isHardChallenge);
    }
    if (category === 'geometry') {
      return this.generateSmaGeometry(id, difficulty, isHardChallenge);
    }
    if (category === 'arithmetic') {
      return this.generateSmaCombinatorics(id, difficulty, isHardChallenge);
    }

    // Default SMA Algebra (Quadratics, Logs, Sequences)
    return this.generateSmaAlgebra(id, difficulty, isHardChallenge);
  }

  private static generateSmaPhysics(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const pType = Math.floor(Math.random() * 4);

    if (pType === 0) {
      // GLBB: vt = v0 + a*t
      const v0 = Math.floor(Math.random() * 10) + 5; // 5..14 m/s
      const a = Math.floor(Math.random() * 6) + 2; // 2..7 m/s²
      const t = Math.floor(Math.random() * 5) + 3; // 3..7 s
      return {
        id,
        category: 'physics',
        educationLevel: 'sma',
        questionText: `GLBB: vₜ = v₀ + a·t (v₀ = ${v0} m/s, a = ${a} m/s², t = ${t} s). vₜ = ? m/s`,
        correctAnswer: v0 + a * t,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Kinematika GLBB: vₜ = v₀ + a·t',
      };
    } else if (pType === 1) {
      // Hukum Ohm: V = I × R atau P = V × I
      const I = Math.floor(Math.random() * 6) + 2; // 2..7 Ampere
      const R = Math.floor(Math.random() * 15) + 6; // 6..20 Ohm
      return {
        id,
        category: 'physics',
        educationLevel: 'sma',
        questionText: `Hukum Ohm: V = I × R (Arus I = ${I} A, Hambatan R = ${R} Ω). Tegangan V = ? Volt`,
        correctAnswer: I * R,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Listrik Dinamis: V = I × R',
      };
    } else if (pType === 2) {
      // Energi Mekanik: Em = Ep + Ek
      const Ep = Math.floor(Math.random() * 100) + 150; // 150..249 J
      const Ek = Math.floor(Math.random() * 80) + 100; // 100..179 J
      return {
        id,
        category: 'physics',
        educationLevel: 'sma',
        questionText: `Energi Mekanik: Em = Ep + Ek (Ep = ${Ep} J, Ek = ${Ek} J). Em = ? Joule`,
        correctAnswer: Ep + Ek,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Hukum Kekekalan Energi Mekanik',
      };
    } else {
      // Usaha & Perpindahan: W = F × s
      const F = Math.floor(Math.random() * 25) + 15;
      const s = Math.floor(Math.random() * 10) + 5;
      return {
        id,
        category: 'physics',
        educationLevel: 'sma',
        questionText: `Usaha: W = F × s (Gaya F = ${F} N, Jarak s = ${s} m). Usaha W = ? Joule`,
        correctAnswer: F * s,
        scoreValue: isHardChallenge ? 18 : 8,
        difficulty,
        subText: '🔬 SMA • Usaha Mekanik: W = F × s (Joule)',
      };
    }
  }

  private static generateSmaRoots(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const rootType = Math.floor(Math.random() * 3);

    if (rootType === 0) {
      // Eksponen Pecahan: 27^(2/3) = 9, 16^(3/4) = 8, 8^(4/3) = 16
      const table = [
        { base: 27, p: '2/3', ans: 9 },
        { base: 16, p: '3/4', ans: 8 },
        { base: 8, p: '4/3', ans: 16 },
        { base: 32, p: '3/5', ans: 8 },
        { base: 64, p: '2/3', ans: 16 },
        { base: 125, p: '2/3', ans: 25 },
        { base: 81, p: '3/4', ans: 27 },
      ];
      const chosen = table[Math.floor(Math.random() * table.length)];
      return {
        id,
        category: 'roots',
        educationLevel: 'sma',
        questionText: `Tentukan nilai: ${chosen.base}^(${chosen.p}) = ?`,
        correctAnswer: chosen.ans,
        scoreValue: 9,
        difficulty,
        subText: '🔬 SMA • Bilangan Berpangkat Pecahan',
      };
    } else if (rootType === 1) {
      // Akar Kubik Sempurna
      const base = Math.floor(Math.random() * 6) + 4; // 4..9 (64, 125, 216, 343, 512, 729)
      const cube = base * base * base;
      return {
        id,
        category: 'roots',
        educationLevel: 'sma',
        questionText: `∛${cube} = ?`,
        correctAnswer: base,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Akar Pangkat Tiga (Kubik)',
      };
    } else {
      // Sederhana Bentuk Akar: √50 = a√2 -> a=?
      const table = [
        { num: 50, inside: 2, a: 5 },
        { num: 75, inside: 3, a: 5 },
        { num: 98, inside: 2, a: 7 },
        { num: 108, inside: 3, a: 6 },
        { num: 128, inside: 2, a: 8 },
        { num: 48, inside: 3, a: 4 },
      ];
      const chosen = table[Math.floor(Math.random() * table.length)];
      return {
        id,
        category: 'roots',
        educationLevel: 'sma',
        questionText: `√${chosen.num} = a√${chosen.inside}. Nilai a = ?`,
        correctAnswer: chosen.a,
        scoreValue: 9,
        difficulty,
        subText: '🔬 SMA • Menyederhanakan Bentuk Akar',
      };
    }
  }

  private static generateSmaGeometry(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const geoType = Math.floor(Math.random() * 3);

    if (geoType === 0) {
      // Trigonometri Sudut Istimewa
      const trig = [
        { text: 'sin(30°) × 100', ans: 50, sub: 'sin(30°) = ½' },
        { text: 'cos(60°) × 100', ans: 50, sub: 'cos(60°) = ½' },
        { text: 'tan(45°) × 100', ans: 100, sub: 'tan(45°) = 1' },
        { text: 'sin(90°) × 80', ans: 80, sub: 'sin(90°) = 1' },
        { text: 'cos(0°) × 60', ans: 60, sub: 'cos(0°) = 1' },
        { text: '2 × sin(30°) + 4 × cos(60°)', ans: 3, sub: '2(½) + 4(½)' },
        { text: '6 × tan(45°) - 2 × sin(90°)', ans: 4, sub: '6(1) - 2(1)' },
      ];
      const chosen = trig[Math.floor(Math.random() * trig.length)];
      return {
        id,
        category: 'geometry',
        educationLevel: 'sma',
        questionText: `Hitung: ${chosen.text} = ?`,
        correctAnswer: chosen.ans,
        scoreValue: 8,
        difficulty,
        subText: `🔬 SMA • Trigonometri Sudut Istimewa (${chosen.sub})`,
      };
    } else if (geoType === 1) {
      // Vektor Panjang di R²: |v| = √(x² + y²)
      const triples = [
        { x: 3, y: 4, len: 5 },
        { x: 6, y: 8, len: 10 },
        { x: 5, y: 12, len: 13 },
        { x: 8, y: 15, len: 17 },
      ];
      const t = triples[Math.floor(Math.random() * triples.length)];
      return {
        id,
        category: 'geometry',
        educationLevel: 'sma',
        questionText: `Panjang vektor v = (${t.x}, ${t.y}) adalah |v| = ?`,
        correctAnswer: t.len,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Panjang Vektor: |v| = √(x² + y²)',
      };
    } else {
      // Vektor Dot Product 2D: u · v = u1*v1 + u2*v2
      const u1 = Math.floor(Math.random() * 4) + 2;
      const u2 = Math.floor(Math.random() * 4) + 1;
      const v1 = Math.floor(Math.random() * 4) + 2;
      const v2 = Math.floor(Math.random() * 4) + 1;
      const dot = u1 * v1 + u2 * v2;
      return {
        id,
        category: 'geometry',
        educationLevel: 'sma',
        questionText: `Dot Product vektor: (${u1}, ${u2}) · (${v1}, ${v2}) = ?`,
        correctAnswer: dot,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Perkalian Titik Vektor (u₁v₁ + u₂v₂)',
      };
    }
  }

  private static generateSmaCombinatorics(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const cType = Math.floor(Math.random() * 3);

    if (cType === 0) {
      // Faktorial: 4!, 5!, 6!
      const facts = [
        { n: 4, val: 24 },
        { n: 5, val: 120 },
        { n: 3, val: 6 },
        { n: 6, val: 720 },
      ];
      const chosen = facts[Math.floor(Math.random() * facts.length)];
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'sma',
        questionText: `Nilai Faktorial: ${chosen.n}! = ?`,
        correctAnswer: chosen.val,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Konsep Faktorial (n!)',
      };
    } else if (cType === 1) {
      // Permutasi P(n, r)
      const perms = [
        { n: 5, r: 2, ans: 20 },
        { n: 6, r: 2, ans: 30 },
        { n: 4, r: 2, ans: 12 },
        { n: 5, r: 3, ans: 60 },
        { n: 4, r: 3, ans: 24 },
      ];
      const chosen = perms[Math.floor(Math.random() * perms.length)];
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'sma',
        questionText: `Permutasi P(${chosen.n}, ${chosen.r}) = ?`,
        correctAnswer: chosen.ans,
        scoreValue: 9,
        difficulty,
        subText: '🔬 SMA • Permutasi: P(n,r) = n! / (n-r)!',
      };
    } else {
      // Kombinasi C(n, r)
      const combs = [
        { n: 5, r: 2, ans: 10 },
        { n: 6, r: 2, ans: 15 },
        { n: 7, r: 2, ans: 21 },
        { n: 6, r: 3, ans: 20 },
        { n: 4, r: 2, ans: 6 },
      ];
      const chosen = combs[Math.floor(Math.random() * combs.length)];
      return {
        id,
        category: 'arithmetic',
        educationLevel: 'sma',
        questionText: `Kombinasi C(${chosen.n}, ${chosen.r}) = ?`,
        correctAnswer: chosen.ans,
        scoreValue: 9,
        difficulty,
        subText: '🔬 SMA • Kombinasi: C(n,r) = n! / (r!(n-r)!)',
      };
    }
  }

  private static generateSmaAlgebra(id: string, difficulty: QuestionDifficulty, isHardChallenge?: boolean): MathQuestion {
    const algType = Math.floor(Math.random() * 3);

    if (algType === 0) {
      // Logaritma SMA
      const logs = [
        { base: 2, num: 64, ans: 6, sup: '²' },
        { base: 2, num: 32, ans: 5, sup: '²' },
        { base: 3, num: 81, ans: 4, sup: '³' },
        { base: 3, num: 27, ans: 3, sup: '³' },
        { base: 5, num: 125, ans: 3, sup: '⁵' },
        { base: 4, num: 64, ans: 3, sup: '⁴' },
        { base: 10, num: 1000, ans: 3, sup: '¹⁰' },
      ];
      const chosen = logs[Math.floor(Math.random() * logs.length)];
      return {
        id,
        category: 'algebra',
        educationLevel: 'sma',
        questionText: `Tentukan nilai: ${chosen.sup}log(${chosen.num}) = ?`,
        correctAnswer: chosen.ans,
        scoreValue: 8,
        difficulty,
        subText: `🔬 SMA • Logaritma Basis ${chosen.base}`,
      };
    } else if (algType === 1) {
      // Barisan Aritmatika: Un = a + (n-1)b
      const a = Math.floor(Math.random() * 8) + 3; // a: 3..10
      const b = Math.floor(Math.random() * 5) + 2; // b: 2..6
      const n = Math.floor(Math.random() * 6) + 5; // n: 5..10
      const un = a + (n - 1) * b;
      return {
        id,
        category: 'algebra',
        educationLevel: 'sma',
        questionText: `Barisan Aritmatika (a = ${a}, b = ${b}). Suku ke-${n} (U${n}) = ?`,
        correctAnswer: un,
        scoreValue: 8,
        difficulty,
        subText: '🔬 SMA • Barisan Aritmatika: Uₙ = a + (n-1)b',
      };
    } else {
      // Persamaan Kuadrat: Diskriminan D = b² - 4ac
      const a = 1;
      const b = Math.floor(Math.random() * 5) + 5; // 5..9
      const c = Math.floor(Math.random() * 4) + 1; // 1..4
      const D = b * b - 4 * a * c;
      return {
        id,
        category: 'algebra',
        educationLevel: 'sma',
        questionText: `Diskriminan (D = b² - 4ac) dari x² + ${b}x + ${c} = 0 adalah D = ?`,
        correctAnswer: D,
        scoreValue: 9,
        difficulty,
        subText: '🔬 SMA • Diskriminan Persamaan Kuadrat',
      };
    }
  }

  // ==========================================
  // 🎓 LEVEL 6: KULIAH / UNIVERSITAS
  // Kalkulus Diferensial & Integral, Aljabar Linier (Matriks, Trace, Det 3x3), Fisika Lanjutan, Probabilitas
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
      if (base === 2) power = Math.floor(Math.random() * 4) + 4; // 4..7
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

    // 4. Matriks: Determinan 2x2, Trace Matriks, Dot Product 3D
    if (topic === 'matrix' || topic === 'geometry') {
      const matType = Math.floor(Math.random() * 3);
      if (matType === 0) {
        const a = Math.floor(Math.random() * 6) + 3;
        const d = Math.floor(Math.random() * 6) + 3;
        const b = Math.floor(Math.random() * 4) + 1;
        const c = Math.floor(Math.random() * 3) + 1;
        const det = a * d - b * c;
        return {
          id,
          category: 'geometry',
          educationLevel: 'kuliah',
          questionText: `Determinan Matriks |[${a}, ${b}], [${c}, ${d}]| = ?`,
          correctAnswer: det,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🎓 KULIAH • Determinan Matriks 2×2: (ad - bc)',
        };
      } else if (matType === 1) {
        // Trace Matriks Tr(A) = a11 + a22 + a33
        const a11 = Math.floor(Math.random() * 8) + 2;
        const a22 = Math.floor(Math.random() * 8) + 2;
        const a33 = Math.floor(Math.random() * 8) + 2;
        return {
          id,
          category: 'geometry',
          educationLevel: 'kuliah',
          questionText: `Trace Matriks 3×3 dengan diagonal utama (${a11}, ${a22}, ${a33}) = ?`,
          correctAnswer: a11 + a22 + a33,
          scoreValue: isHardChallenge ? 18 : 9,
          difficulty,
          subText: '🎓 KULIAH • Trace Matriks (Jumlah Diagonal Utama)',
        };
      } else {
        // Dot Product Vektor 3D [u1, u2, u3] • [v1, v2, v3]
        const u1 = Math.floor(Math.random() * 4) + 1;
        const u2 = Math.floor(Math.random() * 4) + 1;
        const u3 = Math.floor(Math.random() * 4) + 1;
        const v1 = Math.floor(Math.random() * 4) + 1;
        const v2 = Math.floor(Math.random() * 4) + 1;
        const v3 = Math.floor(Math.random() * 4) + 1;
        const dot = u1 * v1 + u2 * v2 + u3 * v3;
        return {
          id,
          category: 'geometry',
          educationLevel: 'kuliah',
          questionText: `Dot Product 3D: [${u1}, ${u2}, ${u3}] · [${v1}, ${v2}, ${v3}] = ?`,
          correctAnswer: dot,
          scoreValue: isHardChallenge ? 20 : 10,
          difficulty,
          subText: '🎓 KULIAH • Perkalian Titik Vektor 3 Dimensi',
        };
      }
    }

    // 5. Fisika Kuliah: Energi Kinetik (Ek = 1/2 m v²), Momentum (p = m v), Daya (P = W / t)
    const pType = Math.floor(Math.random() * 3);
    if (pType === 0) {
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
  // SD Helper methods
  // ==========================================
  private static generateCounting(
    id: string,
    difficulty: QuestionDifficulty,
    isHardChallenge?: boolean
  ): MathQuestion {
    const icons = ['🍎', '🥊', '⭐', '🍌', '🏆', '⚽', '💎', '🔥', '🐱', '🍕', '🍰', '🌸'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    let count = 3;
    let score = 2;
    let sub = 'Hitung Cepat';

    if (difficulty === 'easy') {
      count = Math.floor(Math.random() * 4) + 3; // 3..6
      score = 2;
      sub = '🎒 SD • Hitung Objek Dasar';
    } else if (difficulty === 'medium') {
      count = Math.floor(Math.random() * 4) + 6; // 6..9
      score = 4;
      sub = '🎒 SD • Hitung Objek Sedang';
    } else {
      count = Math.floor(Math.random() * 4) + 9; // 9..12
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
}
