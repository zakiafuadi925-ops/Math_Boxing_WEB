import { MathQuestion, QuestionCategory } from '../types';

export class MathGenerator {
  private static questionIdCounter = 1;

  public static generateQuestion(category: QuestionCategory = 'all', seed?: number): MathQuestion {
    let chosenCategory = category;
    if (category === 'all') {
      const categories: QuestionCategory[] = ['arithmetic', 'counting', 'algebra', 'roots', 'physics', 'geometry'];
      const index = seed !== undefined ? Math.abs(seed) % categories.length : Math.floor(Math.random() * categories.length);
      chosenCategory = categories[index];
    }

    const id = `q_${this.questionIdCounter++}_${Date.now()}`;

    switch (chosenCategory) {
      case 'counting':
        return this.generateCounting(id);
      case 'algebra':
        return this.generateAlgebra(id);
      case 'roots':
        return this.generateRoots(id);
      case 'physics':
        return this.generatePhysics(id);
      case 'geometry':
        return this.generateGeometry(id);
      case 'arithmetic':
      default:
        return this.generateArithmetic(id);
    }
  }

  private static generateArithmetic(id: string): MathQuestion {
    const opType = Math.floor(Math.random() * 4); // +, -, *, /
    let num1: number;
    let num2: number;
    let text: string;
    let answer: number;
    let score = 2;

    if (opType === 0) { // Addition
      num1 = Math.floor(Math.random() * 25) + 1;
      num2 = Math.floor(Math.random() * 25) + 1;
      text = `${num1} + ${num2} = ?`;
      answer = num1 + num2;
      score = 2;
    } else if (opType === 1) { // Subtraction
      num1 = Math.floor(Math.random() * 30) + 5;
      num2 = Math.floor(Math.random() * num1) + 1;
      text = `${num1} - ${num2} = ?`;
      answer = num1 - num2;
      score = 2;
    } else if (opType === 2) { // Multiplication
      num1 = Math.floor(Math.random() * 12) + 2;
      num2 = Math.floor(Math.random() * 10) + 2;
      text = `${num1} × ${num2} = ?`;
      answer = num1 * num2;
      score = 5;
    } else { // Division
      answer = Math.floor(Math.random() * 12) + 2;
      num2 = Math.floor(Math.random() * 10) + 2;
      num1 = answer * num2;
      text = `${num1} ÷ ${num2} = ?`;
      score = 5;
    }

    return {
      id,
      category: 'arithmetic',
      questionText: text,
      correctAnswer: answer,
      scoreValue: score
    };
  }

  private static generateCounting(id: string): MathQuestion {
    const icons = ['🍎', '🥊', '⭐', '🍌', '🏆', '⚽'];
    const selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    const count = Math.floor(Math.random() * 12) + 3;

    return {
      id,
      category: 'counting',
      questionText: 'Hitung jumlah objek di bawah ini!',
      correctAnswer: count,
      scoreValue: 3,
      visualItem: {
        icon: selectedIcon,
        count
      }
    };
  }

  private static generateAlgebra(id: string): MathQuestion {
    const x = Math.floor(Math.random() * 12) + 1;
    const a = Math.floor(Math.random() * 5) + 2;
    const b = Math.floor(Math.random() * 15) + 1;
    const isPlus = Math.random() > 0.5;

    let text: string;
    if (isPlus) {
      const rhs = a * x + b;
      text = `Cari nilai x:  ${a}x + ${b} = ${rhs}`;
    } else {
      const rhs = a * x - b;
      if (rhs > 0) {
        text = `Cari nilai x:  ${a}x - ${b} = ${rhs}`;
      } else {
        // Fallback simple
        text = `Cari nilai x:  ${a}x = ${a * x}`;
      }
    }

    return {
      id,
      category: 'algebra',
      questionText: text,
      correctAnswer: x,
      scoreValue: 8,
      subText: 'Selesaikan persamaan aljabar'
    };
  }

  private static generateRoots(id: string): MathQuestion {
    const isSquare = Math.random() > 0.3;
    if (isSquare) {
      const base = Math.floor(Math.random() * 12) + 2; // 2..13
      const num = base * base;
      return {
        id,
        category: 'roots',
        questionText: `√${num} = ?`,
        correctAnswer: base,
        scoreValue: 6,
        subText: 'Akar Pangkat Dua'
      };
    } else {
      const base = Math.floor(Math.random() * 6) + 2; // 2..7
      const num = base * base * base;
      return {
        id,
        category: 'roots',
        questionText: `∛${num} = ?`,
        correctAnswer: base,
        scoreValue: 10,
        subText: 'Akar Pangkat Tiga'
      };
    }
  }

  private static generatePhysics(id: string): MathQuestion {
    const type = Math.floor(Math.random() * 3); // speed, distance, time
    let text: string;
    let answer: number;

    if (type === 0) { // Distance: s = v * t
      const v = Math.floor(Math.random() * 10) + 5; // km/h
      const t = Math.floor(Math.random() * 5) + 2; // hours
      answer = v * t;
      text = `Jarak (s) jika v = ${v} km/jam & t = ${t} jam?`;
    } else if (type === 1) { // Speed: v = s / t
      answer = Math.floor(Math.random() * 10) + 5;
      const t = Math.floor(Math.random() * 4) + 2;
      const s = answer * t;
      text = `Kecepatan (v) jika s = ${s} km & t = ${t} jam?`;
    } else { // Time: t = s / v
      answer = Math.floor(Math.random() * 5) + 2;
      const v = Math.floor(Math.random() * 10) + 5;
      const s = answer * v;
      text = `Waktu (t) jika s = ${s} km & v = ${v} km/jam?`;
    }

    return {
      id,
      category: 'physics',
      questionText: text,
      correctAnswer: answer,
      scoreValue: 7,
      subText: 'Rumus Kecepatan, Jarak & Waktu'
    };
  }

  private static generateGeometry(id: string): MathQuestion {
    const isCube = Math.random() > 0.5;
    if (isCube) {
      const side = Math.floor(Math.random() * 6) + 2; // 2..7
      const isVolume = Math.random() > 0.5;
      if (isVolume) {
        return {
          id,
          category: 'geometry',
          questionText: `Volume kubus dengan sisi ${side} cm = ?`,
          correctAnswer: side * side * side,
          scoreValue: 8,
          subText: 'V = s³'
        };
      } else {
        return {
          id,
          category: 'geometry',
          questionText: `Luas permukaan kubus dengan sisi ${side} cm = ?`,
          correctAnswer: 6 * side * side,
          scoreValue: 8,
          subText: 'L = 6s²'
        };
      }
    } else {
      const p = Math.floor(Math.random() * 5) + 2;
      const l = Math.floor(Math.random() * 4) + 2;
      const t = Math.floor(Math.random() * 4) + 2;
      return {
        id,
        category: 'geometry',
        questionText: `Volume balok (${p} cm × ${l} cm × ${t} cm) = ?`,
        correctAnswer: p * l * t,
        scoreValue: 7,
        subText: 'V = p × l × t'
      };
    }
  }
}
