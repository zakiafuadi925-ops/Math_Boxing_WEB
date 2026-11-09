import React, { useEffect, useRef, useState, memo } from 'react';
import { PlayerState } from '../types';
import { Flame } from 'lucide-react';
import { getComboMultiplier } from './ComboTracker';

interface BoxerCanvasProps {
  p1: PlayerState;
  p2: PlayerState;
  lastHitBy?: 'p1' | 'p2' | null;
  onTriggerEmote?: (emote: 'taunt_crown' | 'taunt_flex' | 'taunt_dance' | 'taunt_shuffle') => void;
  combo?: number;
  lastBonusPoints?: number | null;
}

export interface DamagePopup {
  id: string;
  x: number; // percentage width (e.g., 32 or 68)
  y: number; // percentage height (e.g., 28)
  scoreText: string;
  subtext?: string;
  isCritical: boolean;
  colorClass: string;
  badgeBg: string;
  target: 'p1' | 'p2';
}

// Low-overhead particle for 60fps mobile Android performance (no GC allocations during render)
interface HitParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'star' | 'sweat' | 'spark' | 'ring';
  gravity: number;
  rotation: number;
  vRot: number;
}

interface ComicBurst {
  active: boolean;
  text: string;
  x: number;
  y: number;
  alpha: number;
  scale: number;
  color: string;
}

export interface BoxerKinematics {
  shiftX: number;
  shiftY: number;
  torsoAngle: number;
  headAngle: number;
  backGloveX: number;
  backGloveY: number;
  frontGloveX: number;
  frontGloveY: number;
  recoilX: number;
  recoilY: number;
  recoilVelX: number;
  recoilHead: number;
  recoilHeadVel: number;
  kneeFlex: number;
  squashY: number;
  shadowScale: number;
  prevAction: string;
  actionTime: number;
}

const createDefaultKinematics = (facing: 'left' | 'right'): BoxerKinematics => {
  const dir = facing === 'right' ? 1 : -1;
  return {
    shiftX: 0,
    shiftY: 0,
    torsoAngle: 0,
    headAngle: 0,
    backGloveX: -dir * 14,
    backGloveY: -86,
    frontGloveX: dir * 22,
    frontGloveY: -88,
    recoilX: 0,
    recoilY: 0,
    recoilVelX: 0,
    recoilHead: 0,
    recoilHeadVel: 0,
    kneeFlex: 0,
    squashY: 1,
    shadowScale: 1,
    prevAction: 'idle',
    actionTime: 0,
  };
};

export const BoxerCanvas: React.FC<BoxerCanvasProps> = memo(({
  p1,
  p2,
  lastHitBy,
  onTriggerEmote,
  combo = 0,
  lastBonusPoints,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevP1Score = useRef(p1.score);
  const prevP2Score = useRef(p2.score);
  const prevP1Health = useRef(p1.health);
  const prevP2Health = useRef(p2.health);

  // References for smooth 60-120fps animation loop without restarting on state change
  const p1Ref = useRef(p1);
  const p2Ref = useRef(p2);
  const lastHitByRef = useRef(lastHitBy);

  p1Ref.current = p1;
  p2Ref.current = p2;
  lastHitByRef.current = lastHitBy;

  // Persistent procedural kinematics state (continuous interpolation across frames)
  const p1KinematicsRef = useRef<BoxerKinematics>(createDefaultKinematics('right'));
  const p2KinematicsRef = useRef<BoxerKinematics>(createDefaultKinematics('left'));

  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [p1HealthPulse, setP1HealthPulse] = useState(false);
  const [p2HealthPulse, setP2HealthPulse] = useState(false);
  const [p1HealPulse, setP1HealPulse] = useState(false);
  const [p2HealPulse, setP2HealPulse] = useState(false);

  // Pre-allocated Particle Pool (64 fixed objects in memory, zero garbage collection pauses)
  const particlesRef = useRef<HitParticle[]>(
    Array.from({ length: 64 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#fbbf24',
      alpha: 1,
      decay: 0.04,
      shape: 'spark',
      gravity: 0.15,
      rotation: 0,
      vRot: 0.1,
    }))
  );

  // Screen-shake & Rope Spring references
  const shakeRef = useRef(0);
  const ropeSpringRef = useRef({
    p1Offset: 0,
    p1Vel: 0,
    p2Offset: 0,
    p2Vel: 0,
  });

  // Comic text burst
  const comicBurstRef = useRef<ComicBurst>({
    active: false,
    text: '',
    x: 0,
    y: 0,
    alpha: 0,
    scale: 0.8,
    color: '#fde047',
  });

  // Spawn visual impact particles
  const spawnHitFX = (targetX: number, targetY: number, isCrit: boolean, punchType: string, targetDir: number) => {
    shakeRef.current = isCrit ? 9 : 5;

    // Trigger ring rope rebound and smooth organic boxer recoil
    if (targetDir > 0) {
      ropeSpringRef.current.p2Vel += isCrit ? 16 : 10;
      p2KinematicsRef.current.recoilVelX = isCrit ? 36 : 24;
      p2KinematicsRef.current.recoilHeadVel = isCrit ? 1.8 : 1.2;
    } else {
      ropeSpringRef.current.p1Vel -= isCrit ? 16 : 10;
      p1KinematicsRef.current.recoilVelX = -(isCrit ? 36 : 24);
      p1KinematicsRef.current.recoilHeadVel = -(isCrit ? 1.8 : 1.2);
    }

    // Set comic burst
    const burstTexts = isCrit
      ? ['CRUSH!', 'K.O.!', 'BOOM!', 'SMASH!']
      : punchType === 'uppercut'
      ? ['UPPERCUT!', 'WHAM!']
      : punchType === 'hook'
      ? ['HOOK!', 'POW!']
      : ['JAB!', 'SNAP!', 'HIT!'];
    const chosenBurst = burstTexts[Math.floor(Math.random() * burstTexts.length)];
    comicBurstRef.current = {
      active: true,
      text: chosenBurst,
      x: targetX,
      y: targetY - 25,
      alpha: 1,
      scale: isCrit ? 1.4 : 1.0,
      color: isCrit ? '#fde047' : '#ffffff',
    };

    const count = isCrit ? 24 : 14;
    let spawned = 0;
    const pool = particlesRef.current;

    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.x = targetX + (Math.random() - 0.5) * 16;
        p.y = targetY + (Math.random() - 0.5) * 16;

        // Variety of particle shapes (sparks, sweat droplets, stars)
        const rnd = Math.random();
        if (rnd < 0.35) {
          // Sweat droplet flying off cheek
          p.shape = 'sweat';
          p.color = 'rgba(186, 230, 253, 0.9)'; // light blue
          p.size = Math.random() * 3.5 + 2;
          p.vx = targetDir * (Math.random() * 4 + 2) + (Math.random() - 0.5) * 3;
          p.vy = -Math.random() * 4 - 1.5;
          p.gravity = 0.22;
          p.decay = 0.035;
        } else if (rnd < 0.75) {
          // Fiery friction sparks
          p.shape = 'spark';
          p.color = Math.random() > 0.5 ? '#f59e0b' : '#fde047';
          p.size = Math.random() * 4 + 2;
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 6 + 3;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.gravity = 0.12;
          p.decay = 0.05;
        } else {
          // Comic stars
          p.shape = 'star';
          p.color = '#facc15';
          p.size = Math.random() * 5 + 4;
          p.vx = (Math.random() - 0.5) * 6;
          p.vy = -Math.random() * 5 - 2;
          p.gravity = 0.18;
          p.decay = 0.04;
          p.rotation = Math.random() * Math.PI;
          p.vRot = (Math.random() - 0.5) * 0.4;
        }

        p.alpha = 1;
        spawned++;
      }
    }
  };

  const comboInfo = getComboMultiplier(combo);

  // Health damage and heal pulse triggers
  useEffect(() => {
    if (p1.health < prevP1Health.current || lastHitBy === 'p2') {
      setP1HealthPulse(true);
      const timer = setTimeout(() => setP1HealthPulse(false), 400);
      prevP1Health.current = p1.health;
      return () => clearTimeout(timer);
    } else if (p1.health > prevP1Health.current) {
      // P1 Healed!
      const healAmount = p1.health - prevP1Health.current;
      setP1HealPulse(true);
      const timer = setTimeout(() => setP1HealPulse(false), 600);

      // Trigger floating Heal popup over P1
      const jitterX = (Math.random() - 0.5) * 6;
      const newPopup: DamagePopup = {
        id: `p1-heal-${Date.now()}-${Math.random()}`,
        x: 32 + jitterX,
        y: 24,
        scoreText: `+${healAmount} HP`,
        subtext: '💚 3-COMBO HEAL!',
        isCritical: true,
        colorClass: 'text-emerald-300 drop-shadow-[0_2px_8px_rgba(52,211,153,0.8)] scale-105',
        badgeBg: 'bg-emerald-950/95 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/50',
        target: 'p1',
      };
      setPopups((prev) => [...prev.slice(-3), newPopup]);
      prevP1Health.current = p1.health;
      return () => clearTimeout(timer);
    }
    prevP1Health.current = p1.health;
  }, [p1.health, lastHitBy]);

  useEffect(() => {
    if (p2.health < prevP2Health.current || lastHitBy === 'p1') {
      setP2HealthPulse(true);
      const timer = setTimeout(() => setP2HealthPulse(false), 400);
      prevP2Health.current = p2.health;
      return () => clearTimeout(timer);
    } else if (p2.health > prevP2Health.current) {
      // P2 Healed!
      const healAmount = p2.health - prevP2Health.current;
      setP2HealPulse(true);
      const timer = setTimeout(() => setP2HealPulse(false), 600);

      const jitterX = (Math.random() - 0.5) * 6;
      const newPopup: DamagePopup = {
        id: `p2-heal-${Date.now()}-${Math.random()}`,
        x: 68 + jitterX,
        y: 24,
        scoreText: `+${healAmount} HP`,
        subtext: '💚 RECOVERY!',
        isCritical: true,
        colorClass: 'text-emerald-300 drop-shadow-[0_2px_8px_rgba(52,211,153,0.8)] scale-105',
        badgeBg: 'bg-emerald-950/95 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/50',
        target: 'p2',
      };
      setPopups((prev) => [...prev.slice(-3), newPopup]);
      prevP2Health.current = p2.health;
      return () => clearTimeout(timer);
    }
    prevP2Health.current = p2.health;
  }, [p2.health, lastHitBy]);

  // Track score changes & trigger floating damage text popups + Canvas hit effects
  useEffect(() => {
    if (p1.score < prevP1Score.current) {
      prevP1Score.current = p1.score;
    }
    if (p2.score < prevP2Score.current) {
      prevP2Score.current = p2.score;
    }

    // P1 scores a hit on P2
    if (p1.score > prevP1Score.current) {
      const diff = p1.score - prevP1Score.current;
      const isCrit = diff >= 15 || p1.combo >= 3;
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 6;

      const actionLabel = p1.currentAction && ['jab', 'cross', 'hook', 'uppercut'].includes(p1.currentAction)
        ? p1.currentAction.toUpperCase()
        : 'HIT';

      const newPopup: DamagePopup = {
        id: `p1-hit-${Date.now()}-${Math.random()}`,
        x: 68 + jitterX,
        y: 28 + jitterY,
        scoreText: `+${diff} PTS`,
        subtext: p1.combo > 1 ? `🔥 ${p1.combo}x COMBO!` : `💥 ${actionLabel}!`,
        isCritical: isCrit,
        colorClass: isCrit
          ? 'text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.8)] scale-105'
          : 'text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]',
        badgeBg: isCrit
          ? 'bg-amber-950/95 border-amber-400 text-amber-300'
          : 'bg-slate-950/90 border-amber-500/50 text-amber-200',
        target: 'p2',
      };

      setPopups((prev) => [...prev.slice(-3), newPopup]);
      prevP1Score.current = p1.score;

      // Spawn in-canvas FX at P2 position
      spawnHitFX(800 * 0.68, 450 * 0.7 - 80, isCrit, p1.currentAction, 1);
    }

    // P2 scores a hit on P1
    if (p2.score > prevP2Score.current) {
      const diff = p2.score - prevP2Score.current;
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 6;

      const newPopup: DamagePopup = {
        id: `p2-hit-${Date.now()}-${Math.random()}`,
        x: 32 + jitterX,
        y: 28 + jitterY,
        scoreText: `+${diff} PTS`,
        subtext: `⚡ AI HIT!`,
        isCritical: false,
        colorClass: 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.8)]',
        badgeBg: 'bg-rose-950/95 border-rose-500/60 text-rose-200',
        target: 'p1',
      };

      setPopups((prev) => [...prev.slice(-3), newPopup]);
      prevP2Score.current = p2.score;

      // Spawn in-canvas FX at P1 position
      spawnHitFX(800 * 0.32, 450 * 0.7 - 80, false, p2.currentAction, -1);
    }
  }, [p1.score, p2.score, p1.combo, p1.currentAction, p2.currentAction]);

  // Cleanup old floating damage popups automatically
  useEffect(() => {
    if (popups.length === 0) return;
    const timer = setTimeout(() => {
      setPopups((prev) => prev.slice(1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [popups]);

  // Persistent High-Performance Canvas Rendering Loop (No teardown on prop changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let lastRenderTime = performance.now();

    const width = 800;
    const height = 450;
    const matY = height * 0.7;

    // Pre-create gradients once to avoid 60fps GC allocation
    const arenaGradient = ctx.createLinearGradient(0, 0, 0, height);
    arenaGradient.addColorStop(0, '#0a0f1d');
    arenaGradient.addColorStop(0.5, '#161938');
    arenaGradient.addColorStop(1, '#070a12');

    const spotlightP1 = ctx.createRadialGradient(width * 0.32, matY - 60, 10, width * 0.32, matY - 60, width * 0.35);
    spotlightP1.addColorStop(0, 'rgba(248, 113, 113, 0.12)');
    spotlightP1.addColorStop(1, 'rgba(0,0,0,0)');

    const spotlightP2 = ctx.createRadialGradient(width * 0.68, matY - 60, 10, width * 0.68, matY - 60, width * 0.35);
    spotlightP2.addColorStop(0, 'rgba(96, 165, 250, 0.12)');
    spotlightP2.addColorStop(1, 'rgba(0,0,0,0)');

    const matGradient = ctx.createLinearGradient(0, matY, 0, height);
    matGradient.addColorStop(0, '#334155');
    matGradient.addColorStop(1, '#1e293b');

    const render = (now: number) => {
      const delta = (now - lastRenderTime) / 1000;
      lastRenderTime = now;
      time += Math.min(delta, 0.05); // Organic real-time increment for smooth physical pacing

      const curP1 = p1Ref.current;
      const curP2 = p2Ref.current;
      const curLastHitBy = lastHitByRef.current;

      // Update physical spring simulation for ring ropes
      const rope = ropeSpringRef.current;
      rope.p1Vel += -rope.p1Offset * 0.18;
      rope.p1Vel *= 0.86;
      rope.p1Offset += rope.p1Vel;

      rope.p2Vel += -rope.p2Offset * 0.18;
      rope.p2Vel *= 0.86;
      rope.p2Offset += rope.p2Vel;

      // Update Screen Shake
      ctx.save();
      if (shakeRef.current > 0.3) {
        const shakeX = (Math.random() - 0.5) * shakeRef.current;
        const shakeY = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(shakeX, shakeY);
        shakeRef.current *= 0.84;
      }

      // 1. Draw Arena Background & Lights
      ctx.fillStyle = arenaGradient;
      ctx.fillRect(0, 0, width, height);

      // Arena Wall Crowd Silhouette effect (Subtle vintage stadium rows)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      for (let r = 0; r < 4; r++) {
        const rowY = matY - 100 + r * 16;
        for (let c = 0; c < 28; c++) {
          const colX = 15 + c * 28 + (r % 2 === 0 ? 10 : 0);
          const headBob = Math.sin(time * 2 + c) * 1.5;
          ctx.beginPath();
          ctx.arc(colX, rowY + headBob, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Dual Spotlight Cones
      ctx.fillStyle = spotlightP1;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = spotlightP2;
      ctx.fillRect(0, 0, width, height);

      // 2. Ring Floor Mat (3D Isometric Perspective Trapezoid)
      ctx.fillStyle = matGradient;
      ctx.beginPath();
      ctx.moveTo(width * 0.05, height);
      ctx.lineTo(width * 0.2, matY);
      ctx.lineTo(width * 0.8, matY);
      ctx.lineTo(width * 0.95, height);
      ctx.closePath();
      ctx.fill();

      // Outer Apron Edge
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Center Ring Combat Target Emblem
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(width / 2, matY + 42, width * 0.22, 22, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(width / 2, matY + 42, width * 0.12, 12, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Dynamic Interactive Elastic Ring Ropes (Bezier Rebound)
      const ropeColors = ['#ef4444', '#f8fafc', '#3b82f6'];
      for (let idx = 0; idx < 3; idx++) {
        const baseRopeY = matY - 42 - idx * 26;
        const wave = Math.sin(time * 3 + idx) * 1.5;

        // Elastic rope bowing points when boxers are pushed or punch
        const cp1X = width * 0.32;
        const cp1Y = baseRopeY + wave + rope.p1Offset * (1 - idx * 0.2);
        const cp2X = width * 0.68;
        const cp2Y = baseRopeY + wave + rope.p2Offset * (1 - idx * 0.2);

        // Rope shadow for depth
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, baseRopeY + 3);
        ctx.bezierCurveTo(cp1X, cp1Y + 3, cp2X, cp2Y + 3, width, baseRopeY + 3);
        ctx.stroke();

        // Main colored rope
        ctx.strokeStyle = ropeColors[idx];
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, baseRopeY);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, width, baseRopeY);
        ctx.stroke();
      }

      // Turnbuckle Corner Posts (Red Left, Blue Right)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(width * 0.02, matY - 130, 14, 140);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(width * 0.02 + 2, matY - 130, 3, 140); // corner highlight

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(width * 0.98 - 14, matY - 130, 14, 140);
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(width * 0.98 - 12, matY - 130, 3, 140);

      // Turnbuckle pads
      for (let idx = 0; idx < 3; idx++) {
        const padY = matY - 48 - idx * 26;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(width * 0.02 - 3, padY, 20, 10);
        ctx.fillRect(width * 0.98 - 17, padY, 20, 10);
      }

      // 4. Draw Boxers with Procedural Dynamic Kinematics
      drawEnhancedBoxer(
        ctx,
        width * 0.32,
        matY + 12,
        curP1,
        p1KinematicsRef.current,
        'right',
        time,
        delta,
        curLastHitBy === 'p2'
      );

      drawEnhancedBoxer(
        ctx,
        width * 0.68,
        matY + 12,
        curP2,
        p2KinematicsRef.current,
        'left',
        time,
        delta,
        curLastHitBy === 'p1'
      );

      // 5. Render Particle Pool FX (Sparks, Sweat, Stars)
      const pool = particlesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.active) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.alpha -= p.decay;
          p.rotation += p.vRot;

          if (p.alpha <= 0.05) {
            p.active = false;
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);

          if (p.shape === 'sweat') {
            // Teardrop sweat particle
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.8, p.size * 1.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'star') {
            // 4-point rotating golden comic star
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const s = p.size;
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.3, -s * 0.3);
            ctx.lineTo(s, 0);
            ctx.lineTo(s * 0.3, s * 0.3);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.3, s * 0.3);
            ctx.lineTo(-s, 0);
            ctx.lineTo(-s * 0.3, -s * 0.3);
            ctx.closePath();
            ctx.fill();
          } else {
            // Sharp friction spark
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // 6. Draw Comic Action Text Burst ("POW!", "UPPERCUT!", "WHAM!")
      const burst = comicBurstRef.current;
      if (burst.active && burst.alpha > 0.05) {
        burst.y -= 0.6; // upward drift
        burst.alpha -= 0.035;
        burst.scale += 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, burst.alpha);
        ctx.translate(burst.x, burst.y);
        ctx.scale(burst.scale, burst.scale);

        // Black outline for crisp arcade readability
        ctx.font = '900 20px "Bungee", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 5;
        ctx.strokeText(burst.text, 0, 0);

        ctx.fillStyle = burst.color;
        ctx.fillText(burst.text, 0, 0);

        ctx.restore();
      }

      ctx.restore(); // Restore screen shake

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []); // Run ONCE mounted, read state from refs for ultimate 60-120fps smoothness

  return (
    <div className="relative w-full flex-1 min-h-[110px] sm:min-h-[140px] max-h-[220px] sm:max-h-[300px] bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex items-center justify-center gpu-accelerated">
      {/* Top Left P1 Arcade Health Bar HUD */}
      <div className="absolute top-1.5 left-2 sm:top-2.5 sm:left-3 z-30 pointer-events-none flex flex-col gap-0.5 w-24 sm:w-36 select-none">
        <div className="flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-200">
          <span className="flex items-center gap-1 font-arcade truncate max-w-[65px] sm:max-w-[100px]">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block shadow-sm shrink-0" />
            <span className="truncate">{p1.name}</span>
          </span>
          <span className={`font-arcade font-bold transition-all ${
            p1HealthPulse
              ? 'text-red-400 animate-pulse scale-105 drop-shadow-[0_0_6px_rgba(239,68,68,1)]'
              : p1HealPulse
              ? 'text-emerald-300 animate-pulse scale-105 drop-shadow-[0_0_6px_rgba(52,211,153,1)]'
              : 'text-slate-300'
          }`}>
            {p1.health}%
          </span>
        </div>

        <div
          className={`w-full h-2.5 sm:h-3.5 bg-slate-950/90 rounded-full border p-0.5 transition-all duration-200 ${
            p1HealthPulse
              ? 'border-red-500 bg-red-950/90 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : p1HealPulse
              ? 'border-emerald-400 bg-emerald-950/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
              : 'border-slate-700/80 shadow-sm'
          }`}
        >
          <div
            style={{ width: `${Math.max(0, Math.min(100, p1.health))}%` }}
            className={`h-full rounded-full transition-all duration-200 ${
              p1HealthPulse
                ? 'bg-gradient-to-r from-red-600 via-yellow-200 to-red-400'
                : p1HealPulse
                ? 'bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400'
                : p1.health <= 30
                ? 'bg-red-600 animate-pulse'
                : 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Center Dynamic Combo & Multiplier Banner */}
      {combo > 0 && (
        <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1.5 gpu-accelerated">
          <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/60 shadow-md flex items-center gap-1 text-[10px] sm:text-xs font-arcade font-bold text-amber-300">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <span>{combo}x COMBO</span>
            {comboInfo.multiplier > 1 && (
              <span className="text-yellow-300 font-extrabold">({comboInfo.multiplier}x PTS)</span>
            )}
          </div>
          {lastBonusPoints && lastBonusPoints > 0 && (
            <div className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-arcade text-[9px] font-black shadow-sm">
              +{lastBonusPoints} BONUS
            </div>
          )}
        </div>
      )}

      {/* Top Right P2 Arcade Health Bar HUD */}
      <div className="absolute top-1.5 right-2 sm:top-2.5 sm:right-3 z-30 pointer-events-none flex flex-col items-end gap-0.5 w-24 sm:w-36 select-none">
        <div className="flex items-center justify-between w-full text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-200">
          <span className={`font-arcade font-bold transition-all ${
            p2HealthPulse
              ? 'text-red-400 animate-pulse scale-105 drop-shadow-[0_0_6px_rgba(239,68,68,1)]'
              : p2HealPulse
              ? 'text-emerald-300 animate-pulse scale-105 drop-shadow-[0_0_6px_rgba(52,211,153,1)]'
              : 'text-slate-300'
          }`}>
            {p2.health}%
          </span>
          <span className="flex items-center gap-1 font-arcade truncate max-w-[65px] sm:max-w-[100px] justify-end">
            <span className="truncate">{p2.name}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-sm shrink-0" />
          </span>
        </div>

        <div
          className={`w-full h-2.5 sm:h-3.5 bg-slate-950/90 rounded-full border p-0.5 transition-all duration-200 ${
            p2HealthPulse
              ? 'border-red-500 bg-red-950/90 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
              : p2HealPulse
              ? 'border-emerald-400 bg-emerald-950/90 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
              : 'border-slate-700/80 shadow-sm'
          }`}
        >
          <div
            style={{ width: `${Math.max(0, Math.min(100, p2.health))}%` }}
            className={`h-full rounded-full transition-all duration-200 ml-auto ${
              p2HealthPulse
                ? 'bg-gradient-to-r from-blue-600 via-yellow-200 to-red-500'
                : p2HealPulse
                ? 'bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400'
                : p2.health <= 30
                ? 'bg-red-600 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400'
            }`}
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="w-full h-full object-cover"
      />

      {/* Bottom Floating Micro Emote Trigger Buttons */}
      {onTriggerEmote && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-950/85 p-1 rounded-full border border-slate-700/60 shadow-md">
          {[
            { id: 'taunt_crown' as const, emoji: '👑', label: 'Juara' },
            { id: 'taunt_flex' as const, emoji: '💪', label: 'Otot' },
            { id: 'taunt_dance' as const, emoji: '🕺', label: 'Joget' },
            { id: 'taunt_shuffle' as const, emoji: '⚡', label: 'Kilat' },
          ].map((em) => (
            <button
              key={em.id}
              onClick={() => onTriggerEmote(em.id)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs flex items-center justify-center transition-all duration-75 active:scale-90 touch-fast ${
                p1.currentAction === em.id
                  ? 'bg-amber-500 text-slate-950 scale-105 shadow-md ring-1 ring-amber-300 font-bold'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={em.label}
            >
              {em.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Floating Damage Text Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {popups.map((popup) => (
          <div
            key={popup.id}
            style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-float-damage flex flex-col items-center justify-center select-none gpu-accelerated"
          >
            {/* Visual Starburst Impact Background Ring */}
            <div
              className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-dashed ${
                popup.isCritical
                  ? 'border-amber-400 bg-amber-400/20'
                  : popup.target === 'p1'
                  ? 'border-rose-400 bg-rose-400/20'
                  : 'border-yellow-400 bg-yellow-400/20'
              } animate-starburst -z-10`}
            />

            {/* Main Floating Damage / Score Text */}
            <div className="flex items-center gap-1 font-arcade text-xl sm:text-3xl font-black tracking-tight whitespace-nowrap">
              <span className={popup.colorClass}>{popup.scoreText}</span>
            </div>

            {/* Subtext Badge (Combo / Punch Action) */}
            {popup.subtext && (
              <div
                className={`mt-0.5 px-2 py-0.5 rounded-full border text-[9px] sm:text-xs font-arcade font-bold shadow-md ${popup.badgeBg}`}
              >
                {popup.subtext}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Enhanced Procedural Boxer Renderer (Articulated Analytical Inverse Kinematics)
// ============================================================================

// 2-Bone Analytical Inverse Kinematics for arms (Shoulder -> Elbow -> Wrist)
function renderArticulatedArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  gloveX: number,
  gloveY: number,
  skinTone: string,
  dir: number,
  isFrontArm: boolean,
  action: string,
  strikePhase: number,
  isKunoichi?: boolean
): { elbowX: number; elbowY: number; wristAngle: number } {
  ctx.save();
  const dx = gloveX - shoulderX;
  const dy = gloveY - shoulderY;
  const dist = Math.hypot(dx, dy);

  // Anatomical bone lengths (Upper arm & Forearm)
  const L1 = 34; // Upper arm / Humerus
  const L2 = 36; // Forearm / Radius-Ulna
  const maxReach = L1 + L2 - 1.5;
  const clampedDist = Math.max(14, Math.min(dist, maxReach));

  const baseAngle = Math.atan2(dy, dx);
  const cosA = (L1 * L1 + clampedDist * clampedDist - L2 * L2) / (2 * L1 * clampedDist);
  const angleA = Math.acos(Math.max(-0.999, Math.min(0.999, cosA)));

  // Anatomical elbow deflection:
  // - Guard / Jab / Cross: Elbow points down/inward to guard ribs
  // - Hook: Elbow flares high and horizontal for destructive torque
  // - Uppercut: Elbow drops low, scooping upward
  let bendSign = dir;
  if (isFrontArm && action === 'hook') {
    bendSign = -dir * 0.95;
  } else if (action === 'uppercut') {
    bendSign = dir * 1.1;
  }

  const elbowAngle = baseAngle + bendSign * angleA;
  const elbowX = shoulderX + Math.cos(elbowAngle) * L1;
  const elbowY = shoulderY + Math.sin(elbowAngle) * L1;

  // Upper arm vector & normal
  const ux = elbowX - shoulderX;
  const uy = elbowY - shoulderY;
  const uLen = Math.hypot(ux, uy) || 1;
  const unx = -uy / uLen;
  const uny = ux / uLen;

  // Forearm vector & normal
  const fx = gloveX - elbowX;
  const fy = gloveY - elbowY;
  const fLen = Math.hypot(fx, fy) || 1;
  const fnx = -fy / fLen;
  const fny = fx / fLen;

  const wristAngle = Math.atan2(fy, fx);
  const shadowTone = isFrontArm ? 'rgba(120, 20, 20, 0.28)' : 'rgba(15, 23, 42, 0.45)';
  const baseArmColor = isFrontArm ? skinTone : '#f87171';

  // 1. Deltoid Muscle Cap (Shoulder joint)
  const deltoidRadius = isFrontArm ? 9.5 : 8.5;
  ctx.fillStyle = baseArmColor;
  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY, deltoidRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Upper Arm (Muscular Bicep & Tricep Contour)
  ctx.beginPath();
  ctx.moveTo(shoulderX + unx * 8.5, shoulderY + uny * 8.5);
  ctx.quadraticCurveTo(
    (shoulderX + elbowX) * 0.5 + unx * 9.5,
    (shoulderY + elbowY) * 0.5 + uny * 9.5,
    elbowX + unx * 6.5,
    elbowY + uny * 6.5
  );
  ctx.arc(elbowX, elbowY, 6.5, Math.atan2(uny, unx), Math.atan2(-uny, -unx));
  ctx.quadraticCurveTo(
    (shoulderX + elbowX) * 0.5 - unx * 8.5,
    (shoulderY + elbowY) * 0.5 - uny * 8.5,
    shoulderX - unx * 8.5,
    shoulderY - uny * 8.5
  );
  ctx.closePath();
  ctx.fillStyle = baseArmColor;
  ctx.fill();
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Bicep light specular sheen
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo((shoulderX + elbowX) * 0.5 + unx * 3, (shoulderY + elbowY) * 0.5 + uny * 3 - 2);
  ctx.lineTo((shoulderX + elbowX) * 0.5 + unx * 4 + ux * 0.2, (shoulderY + elbowY) * 0.5 + uny * 4 + uy * 0.2 - 2);
  ctx.stroke();

  // 3. Forearm (Brachioradialis taper into wrist)
  ctx.beginPath();
  ctx.moveTo(elbowX + fnx * 6.5, elbowY + fny * 6.5);
  ctx.quadraticCurveTo(
    elbowX + fx * 0.4 + fnx * 7.5,
    elbowY + fy * 0.4 + fny * 7.5,
    gloveX + fnx * 4.8,
    gloveY + fny * 4.8
  );
  ctx.lineTo(gloveX - fnx * 4.8, gloveY - fny * 4.8);
  ctx.quadraticCurveTo(
    elbowX + fx * 0.4 - fnx * 6.5,
    elbowY + fy * 0.4 - fny * 6.5,
    elbowX - fnx * 6.5,
    elbowY - fny * 6.5
  );
  ctx.closePath();
  ctx.fillStyle = baseArmColor;
  ctx.fill();
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Kunoichi Red Gauntlet Armor with Gold Trim
  if (isKunoichi) {
    ctx.fillStyle = isFrontArm ? '#dc2626' : '#991b1b';
    ctx.beginPath();
    ctx.moveTo(elbowX + fx * 0.22 + fnx * 7, elbowY + fy * 0.22 + fny * 7);
    ctx.lineTo(gloveX - fx * 0.12 + fnx * 5.2, gloveY - fy * 0.12 + fny * 5.2);
    ctx.lineTo(gloveX - fx * 0.12 - fnx * 5.2, gloveY - fy * 0.12 - fny * 5.2);
    ctx.lineTo(elbowX + fx * 0.22 - fnx * 7, elbowY + fy * 0.22 - fny * 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // 4. White Athletic Wrist Tape Wrap
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(gloveX - fx * 0.15 + fnx * 5.2, gloveY - fy * 0.15 + fny * 5.2);
  ctx.lineTo(gloveX + fnx * 5.2, gloveY + fny * 5.2);
  ctx.lineTo(gloveX - fnx * 5.2, gloveY - fny * 5.2);
  ctx.lineTo(gloveX - fx * 0.15 - fnx * 5.2, gloveY - fy * 0.15 - fny * 5.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
  return { elbowX, elbowY, wristAngle };
}

// Articulated Leg Kinematics (Thigh, Knee joint, Muscular calf, and Dynamic Boot with Heel Pivot)
function renderArticulatedLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  heelLift: number,
  dir: number,
  isFrontLeg: boolean,
  isKunoichi: boolean
) {
  ctx.save();
  const legTone = isFrontLeg ? '#1e293b' : '#0f172a';
  const kunoichiLegTone = isFrontLeg ? '#dc2626' : '#991b1b';

  // 1. Thigh
  ctx.strokeStyle = isKunoichi ? kunoichiLegTone : legTone;
  ctx.lineWidth = isFrontLeg ? 13 : 11;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.stroke();

  // Kneecap joint
  ctx.fillStyle = isKunoichi ? (isFrontLeg ? '#ef4444' : '#7f1d1d') : (isFrontLeg ? '#334155' : '#1e293b');
  ctx.beginPath();
  ctx.arc(kneeX, kneeY, isFrontLeg ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Muscular Calf (Knee to Ankle)
  ctx.strokeStyle = isKunoichi ? kunoichiLegTone : legTone;
  ctx.lineWidth = isFrontLeg ? 11 : 9.5;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(footX, footY - heelLift);
  ctx.stroke();

  // Kunoichi White Ribbon Ties (Kyahan cross wraps)
  if (isKunoichi && isFrontLeg) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(kneeX - dir * 2, kneeY + 4);
    ctx.lineTo(kneeX + dir * 3, kneeY + 9);
    ctx.moveTo(kneeX + dir * 3, kneeY + 12);
    ctx.lineTo(kneeX - dir * 2, kneeY + 16);
    ctx.stroke();
  }

  // 3. Dynamic Boxing Boot / Ninja Tabi
  ctx.save();
  ctx.translate(footX, footY);
  if (heelLift > 0.5) {
    const pivotAngle = -dir * Math.min(0.55, heelLift * 0.038);
    ctx.rotate(pivotAngle);
    ctx.translate(0, -heelLift * 0.4);
  }

  const bootW = isFrontLeg ? 22 : 20;
  const bootH = 13;
  const bootX = -bootW * 0.45;
  const bootY = -bootH * 0.5;

  if (isKunoichi) {
    // Ninja Tabi Boot
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(bootX, bootY, bootW, bootH, [4, 4, 2, 2]);
    ctx.fill();

    // Red Trim & Split Tabi Toe
    ctx.fillStyle = isFrontLeg ? '#ea580c' : '#dc2626';
    ctx.fillRect(bootX, bootY + bootH - 4, bootW, 3.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bootX + bootW * 0.6, bootY + 2, 2, bootH - 6);
  } else {
    // Pro Boxing High-Top Boot
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(bootX, bootY, bootW, bootH, [4, 5, 2, 2]);
    ctx.fill();

    // Thick Athletic White Sole
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bootX, bootY + bootH - 3.5, bootW, 3.5);

    // Dynamic Cross Laces
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bootX + 4, bootY + 3);
    ctx.lineTo(bootX + 11, bootY + 7);
    ctx.moveTo(bootX + 11, bootY + 3);
    ctx.lineTo(bootX + 4, bootY + 7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// Enhanced Procedural Boxer Renderer (Continuous Kinematics & Articulated Limbs)
// ============================================================================
function drawEnhancedBoxer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: PlayerState,
  kin: BoxerKinematics,
  facing: 'left' | 'right',
  time: number,
  delta: number,
  isBeingHit: boolean
) {
  const dir = facing === 'right' ? 1 : -1;
  const isKnockdown = player.currentAction === 'knockdown' || player.health <= 0;
  const action = player.currentAction;
  const dt = Math.min(delta, 0.05);

  // 1. Recoil spring physics (elastic shock absorption from punches)
  const springK = 34;
  const springDamp = 0.82;
  kin.recoilVelX += (-kin.recoilX * springK) * dt;
  kin.recoilVelX *= Math.pow(springDamp, dt * 60);
  kin.recoilX += kin.recoilVelX * dt * 25;

  kin.recoilHeadVel += (-kin.recoilHead * springK) * dt;
  kin.recoilHeadVel *= Math.pow(springDamp, dt * 60);
  kin.recoilHead += kin.recoilHeadVel * dt * 25;

  // Add initial impulse when hit begins
  if (isBeingHit && Math.abs(kin.recoilX) < 4) {
    kin.recoilVelX = -dir * 28;
    kin.recoilHeadVel = -dir * 1.5;
  }

  // 2. Dynamic Punch Cycle & Elastic Strike Snap
  if (action !== kin.prevAction) {
    kin.prevAction = action;
    kin.actionTime = 0;
  } else {
    kin.actionTime += dt;
  }

  const isPunching = action === 'jab' || action === 'cross' || action === 'hook' || action === 'uppercut';
  let strikePhase = 0;
  if (isPunching) {
    const duration = 0.36;
    const p = Math.min(1, kin.actionTime / duration);
    if (p < 0.25) {
      // Phase 1: Explosive drive forward (cubic acceleration)
      const t = p / 0.25;
      strikePhase = 1 - Math.pow(1 - t, 3);
    } else if (p < 0.35) {
      // Phase 2: Peak reach impact snap hold with subtle vibration
      const t = (p - 0.25) / 0.10;
      strikePhase = 1.0 - t * 0.03 + Math.sin(t * Math.PI) * 0.03;
    } else {
      // Phase 3: Elastic whip-back returning smoothly to chin guard
      const t = (p - 0.35) / 0.65;
      strikePhase = Math.pow(1 - t, 2.2);
    }
  }

  // 3. Natural Athletic Boxing Rhythm & Footwork Weight Shift
  const bounceSpeed = 3.5;
  const bouncePhase = time * bounceSpeed;
  const bobY = Math.abs(Math.sin(bouncePhase)) * 4.2; // Knee bounce cushion
  const weightShift = Math.sin(time * 2.0) * 3.8; // Stance weight rocking

  const baseShiftX = weightShift;
  const baseShiftY = bobY;
  const baseTorsoAngle = dir * (weightShift / 28) + Math.sin(time * 2.6) * 0.035;
  const baseHeadAngle = -dir * (weightShift / 40);
  const baseKneeFlex = bobY * 1.6;
  const baseSquashY = 1 - (bobY / 80) + Math.sin(time * 2.6) * 0.015;

  // Guard hands (protecting chin, breathing float)
  const baseBackGloveX = -dir * 14 + Math.sin(time * 2.2) * 1.5;
  const baseBackGloveY = -86 + Math.sin(time * 2.8) * 2.0;
  const baseFrontGloveX = dir * 22 + Math.cos(time * 3.4) * 3.0;
  const baseFrontGloveY = -88 + Math.sin(time * 3.4) * 3.0;

  // 4. Pose Targets (Smoothly animated through strikePhase)
  let targetShiftX = baseShiftX;
  let targetShiftY = baseShiftY;
  let targetTorsoAngle = baseTorsoAngle;
  let targetHeadAngle = baseHeadAngle;
  let targetKneeFlex = baseKneeFlex;
  let targetSquashY = baseSquashY;
  let targetShadowScale = 1;

  let targetBackGloveX = baseBackGloveX;
  let targetBackGloveY = baseBackGloveY;
  let targetFrontGloveX = baseFrontGloveX;
  let targetFrontGloveY = baseFrontGloveY;

  if (isKnockdown) {
    targetTorsoAngle = (dir * Math.PI) / 2.5;
    targetShiftX = dir * 20;
    targetShiftY = 34;
    targetShadowScale = 1.35;
    targetBackGloveX = -dir * 10;
    targetBackGloveY = -14;
    targetFrontGloveX = dir * 18;
    targetFrontGloveY = -8;
  } else if (action === 'taunt_crown') {
    const jump = Math.abs(Math.sin(time * 4)) * 22;
    targetShiftY = -jump;
    targetShadowScale = Math.max(0.6, 1 - jump / 40);
    targetBackGloveX = -dir * 18;
    targetBackGloveY = -142;
    targetFrontGloveX = dir * 18;
    targetFrontGloveY = -142;
  } else if (action === 'taunt_flex') {
    targetBackGloveX = -dir * 28;
    targetBackGloveY = -120;
    targetFrontGloveX = dir * 28;
    targetFrontGloveY = -120;
    targetKneeFlex = 4;
  } else if (action === 'taunt_dance') {
    targetShiftX = Math.sin(time * 4) * 14;
    targetShiftY = Math.cos(time * 4) * 6;
    targetTorsoAngle = Math.sin(time * 4) * 0.14;
    targetBackGloveX = -dir * 22;
    targetBackGloveY = -110 + Math.sin(time * 5) * 20;
    targetFrontGloveX = dir * 22;
    targetFrontGloveY = -90 - Math.sin(time * 5) * 20;
  } else if (action === 'taunt_shuffle') {
    targetShiftX = Math.sin(time * 7) * 16;
    targetShiftY = -Math.abs(Math.sin(time * 7)) * 5;
    targetTorsoAngle = Math.sin(time * 7) * 0.08;
    targetKneeFlex = 3;
  } else if (action === 'jab') {
    targetFrontGloveX = baseFrontGloveX + (dir * 92 - baseFrontGloveX) * strikePhase;
    targetFrontGloveY = baseFrontGloveY + (-92 - baseFrontGloveY) * strikePhase;
    targetBackGloveX = baseBackGloveX + (-dir * 12 - baseBackGloveX) * strikePhase;
    targetBackGloveY = baseBackGloveY + (-88 - baseBackGloveY) * strikePhase;
    targetShiftX = baseShiftX + (dir * 16) * strikePhase;
    targetTorsoAngle = baseTorsoAngle + (dir * 0.14) * strikePhase;
    targetKneeFlex = baseKneeFlex + 2 * strikePhase;
  } else if (action === 'cross') {
    targetBackGloveX = baseBackGloveX + (dir * 96 - baseBackGloveX) * strikePhase;
    targetBackGloveY = baseBackGloveY + (-90 - baseBackGloveY) * strikePhase;
    targetFrontGloveX = baseFrontGloveX + (dir * 10 - baseFrontGloveX) * strikePhase;
    targetFrontGloveY = baseFrontGloveY + (-84 - baseFrontGloveY) * strikePhase;
    targetShiftX = baseShiftX + (dir * 18) * strikePhase;
    targetTorsoAngle = baseTorsoAngle + (dir * 0.26) * strikePhase;
    targetKneeFlex = baseKneeFlex + 3 * strikePhase;
  } else if (action === 'hook') {
    targetFrontGloveX = baseFrontGloveX + (dir * 80 - baseFrontGloveX) * strikePhase;
    targetFrontGloveY = baseFrontGloveY + (-98 - baseFrontGloveY) * strikePhase;
    targetBackGloveX = baseBackGloveX + (-dir * 10 - baseBackGloveX) * strikePhase;
    targetBackGloveY = baseBackGloveY + (-86 - baseBackGloveY) * strikePhase;
    targetShiftX = baseShiftX + (dir * 10) * strikePhase;
    targetTorsoAngle = baseTorsoAngle + (-dir * 0.22) * strikePhase;
  } else if (action === 'uppercut') {
    targetFrontGloveX = baseFrontGloveX + (dir * 52 - baseFrontGloveX) * strikePhase;
    targetFrontGloveY = baseFrontGloveY + (-134 - baseFrontGloveY) * strikePhase;
    targetBackGloveX = baseBackGloveX + (-dir * 10 - baseBackGloveX) * strikePhase;
    targetBackGloveY = baseBackGloveY + (-82 - baseBackGloveY) * strikePhase;
    targetShiftY = baseShiftY - 14 * strikePhase;
    targetTorsoAngle = baseTorsoAngle + (-dir * 0.16) * strikePhase;
    targetSquashY = 1 + 0.08 * strikePhase;
  } else if (action === 'block') {
    targetBackGloveX = dir * 4;
    targetBackGloveY = -104;
    targetFrontGloveX = dir * 14;
    targetFrontGloveY = -106;
    targetShiftY = 4;
    targetTorsoAngle = dir * 0.06;
    targetKneeFlex = 6;
  } else if (action === 'hit') {
    targetBackGloveX = baseBackGloveX - dir * 6;
    targetBackGloveY = baseBackGloveY + 4;
    targetFrontGloveX = baseFrontGloveX - dir * 8;
    targetFrontGloveY = baseFrontGloveY + 6;
    targetKneeFlex = 7;
  }

  // 5. Smooth Responsive Interpolation
  const lerpSpeed = isPunching ? 28 : 12;
  const lerpFactor = 1 - Math.exp(-lerpSpeed * dt);

  kin.shiftX += (targetShiftX - kin.shiftX) * lerpFactor;
  kin.shiftY += (targetShiftY - kin.shiftY) * lerpFactor;
  kin.torsoAngle += (targetTorsoAngle - kin.torsoAngle) * lerpFactor;
  kin.headAngle += (targetHeadAngle - kin.headAngle) * lerpFactor;
  kin.kneeFlex += (targetKneeFlex - kin.kneeFlex) * lerpFactor;
  kin.squashY += (targetSquashY - kin.squashY) * lerpFactor;
  kin.shadowScale += (targetShadowScale - kin.shadowScale) * lerpFactor;

  const gloveSpeed = isPunching ? 32 : 14;
  const gloveFactor = 1 - Math.exp(-gloveSpeed * dt);
  kin.backGloveX += (targetBackGloveX - kin.backGloveX) * gloveFactor;
  kin.backGloveY += (targetBackGloveY - kin.backGloveY) * gloveFactor;
  kin.frontGloveX += (targetFrontGloveX - kin.frontGloveX) * gloveFactor;
  kin.frontGloveY += (targetFrontGloveY - kin.frontGloveY) * gloveFactor;

  // 6. Begin Dynamic Canvas Transforms
  ctx.save();
  ctx.translate(x + kin.shiftX + kin.recoilX, y + kin.shiftY + kin.recoilY);
  ctx.scale(1, kin.squashY);

  // Dynamic Floor Shadow (Scales with jumps and falls)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 24, 34 * kin.shadowScale, 11 * kin.shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  const isKunoichi = player.skinId === 'flame_kunoichi' || (player.avatarColor === '#dc2626' && player.glovesColor === '#ea580c');
  const skinTone = isKunoichi ? '#fed7aa' : '#fca5a5';
  const trunksColor = player.avatarColor || (dir === 1 ? '#ef4444' : '#3b82f6');
  const gloveColor = player.glovesColor || (dir === 1 ? '#dc2626' : '#2563eb');

  // Torso rotation around pelvis waist (0, -48)
  const cosT = Math.cos(kin.torsoAngle);
  const sinT = Math.sin(kin.torsoAngle);
  const localRearSX = -dir * 16;
  const localRearSY = -44;
  const rearShoulderX = localRearSX * cosT - localRearSY * sinT;
  const rearShoulderY = -48 + localRearSX * sinT + localRearSY * cosT;

  const localFrontSX = dir * 14;
  const localFrontSY = -44;
  const frontShoulderX = localFrontSX * cosT - localFrontSY * sinT;
  const frontShoulderY = -48 + localFrontSX * sinT + localFrontSY * cosT;

  // Step A: Draw Rear Arm & Glove (Back layer for realistic depth)
  const rearArm = renderArticulatedArm(
    ctx,
    rearShoulderX,
    rearShoulderY,
    kin.backGloveX,
    kin.backGloveY,
    skinTone,
    dir,
    false,
    action,
    strikePhase,
    isKunoichi
  );
  const rearGloveAngle = rearArm.wristAngle - (dir > 0 ? 0 : Math.PI);
  renderBoxingGlove(ctx, kin.backGloveX, kin.backGloveY, gloveColor, dir, 14, isKunoichi, rearGloveAngle);

  // Step B: Articulated Legs & Dynamic Footwork (Squash-the-bug rear foot pivot)
  let rearFootX = -dir * 18;
  let rearFootY = 18;
  let rearHeelLift = 0;

  let frontFootX = dir * 14;
  let frontFootY = 18;
  let frontHeelLift = 0;

  const normalizedWeight = weightShift / 3.8;
  if (normalizedWeight > 0.25) {
    rearHeelLift = (normalizedWeight - 0.25) * 5;
  } else if (normalizedWeight < -0.25) {
    frontHeelLift = (-normalizedWeight - 0.25) * 3.5;
  }

  if (action === 'cross') {
    rearHeelLift = 14 * strikePhase;
    rearFootX = -dir * (18 - strikePhase * 4);
  } else if (action === 'jab') {
    frontFootX = dir * (14 + strikePhase * 7);
  }

  const rearHipX = -dir * 14;
  const rearHipY = -24;
  const frontHipX = dir * 8;
  const frontHipY = -24;

  const rMidX = (rearHipX + rearFootX) * 0.5;
  const rMidY = (rearHipY + rearFootY - rearHeelLift) * 0.5;
  const rearKneeX = rMidX - dir * (6 + kin.kneeFlex * 0.4) + (action === 'cross' ? dir * 6 * strikePhase : 0);
  const rearKneeY = rMidY + 2 + kin.kneeFlex * 0.35;

  const fMidX = (frontHipX + frontFootX) * 0.5;
  const fMidY = (frontHipY + frontFootY - frontHeelLift) * 0.5;
  const frontKneeX = fMidX + dir * (7 + kin.kneeFlex * 0.45);
  const frontKneeY = fMidY + 2 + kin.kneeFlex * 0.4;

  // Render Rear Leg (back depth)
  renderArticulatedLeg(
    ctx,
    rearHipX,
    rearHipY,
    rearKneeX,
    rearKneeY,
    rearFootX,
    rearFootY,
    rearHeelLift,
    dir,
    false,
    isKunoichi
  );

  // Step C: Boxing Trunks & Waistband / Kunoichi Hakama & Flowing Obi Sash
  if (isKunoichi) {
    // Flowing Shigoki Obi Cloth Sash (Fluttering behind hip with physics)
    ctx.save();
    const sashWave1 = Math.sin(time * 3.4) * 8 - (kin.shiftX * 0.4);
    const sashWave2 = Math.cos(time * 3.0) * 9 - (kin.shiftX * 0.5);

    // Back sash tail
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(-dir * 10, -44);
    ctx.quadraticCurveTo(-dir * 20 + sashWave2, -22, -dir * 16 + sashWave2 * 1.3, 4);
    ctx.lineTo(-dir * 21 + sashWave2 * 1.3, 2);
    ctx.quadraticCurveTo(-dir * 24 + sashWave2, -22, -dir * 13, -44);
    ctx.fill();
    // White fringe on back sash tip
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-dir * 20 + sashWave2 * 1.3 - 2, -1, 6, 4);

    // Front sash tail
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-dir * 8, -44);
    ctx.quadraticCurveTo(-dir * 24 + sashWave1, -20, -dir * 20 + sashWave1 * 1.4, 12);
    ctx.lineTo(-dir * 26 + sashWave1 * 1.4, 10);
    ctx.quadraticCurveTo(-dir * 28 + sashWave1, -20, -dir * 11, -44);
    ctx.fill();
    // White fringe on front sash tip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-dir * 25 + sashWave1 * 1.4 - 2, 7, 7, 4);
    ctx.restore();

    // Kunoichi Red Combat Shorts
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-22, -48, 44, 32, [2, 2, 4, 4]);
    ctx.fill();

    // White Edge Hem & Side Athletic Stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-22, -18, 44, 2.5);
    ctx.fillRect(dir * 16 - 2, -48, 4, 32);

    // Black Ninja Obi Sash Waistband
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-22, -48, 44, 9);
    // Golden cord buckle
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -43.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -43.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = trunksColor;
    ctx.beginPath();
    ctx.roundRect(-24, -48, 48, 35, [2, 2, 4, 4]);
    ctx.fill();

    // Side Athletic Stripe on Trunks
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dir * 18 - 3, -48, 5, 35);

    // Thick Elastic Championship Waistband
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-24, -48, 48, 10);
    ctx.fillStyle = '#f59e0b'; // Gold belt buckle
    ctx.fillRect(-7, -49, 14, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-4, -47, 8, 8);
  }

  // Step B2: Render Front Leg (emerging naturally from beneath the shorts)
  renderArticulatedLeg(
    ctx,
    frontHipX,
    frontHipY,
    frontKneeX,
    frontKneeY,
    frontFootX,
    frontFootY,
    frontHeelLift,
    dir,
    true,
    isKunoichi
  );

  // Step D: Torso & Musculature Definition / Kunoichi Combat Gi
  ctx.save();
  ctx.translate(0, -48);
  ctx.rotate(kin.torsoAngle);
  ctx.translate(0, 48);

  // Skin tone base with subtle breathing
  const breath = Math.sin(time * 3) * 0.5;
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.roundRect(-21 - breath * 0.5, -96, 42 + breath, 50, 8);
  ctx.fill();

  if (isKunoichi) {
    // Dark athletic breathable flank mesh
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-21, -85, 5, 36);
    ctx.fillRect(16, -85, 5, 36);

    // Red Kunoichi Gi / Vest (crossing V-neck)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-16, -96);
    ctx.lineTo(16, -96);
    ctx.lineTo(12, -48);
    ctx.lineTo(-12, -48);
    ctx.closePath();
    ctx.fill();

    // White Crossing Collar Trim (Eri)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-12, -96);
    ctx.lineTo(2, -66);
    ctx.lineTo(-6, -48);
    ctx.stroke();

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, -96);
    ctx.lineTo(-2, -66);
    ctx.stroke();

    // Golden Ninja fire emblem on chest
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(dir * 5, -80, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Muscle contours
    ctx.strokeStyle = 'rgba(185, 28, 28, 0.22)';
    ctx.lineWidth = 2;
    // Chest pecks
    ctx.beginPath();
    ctx.arc(-8, -82, 9, 0, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8, -82, 9, Math.PI * 0.15, Math.PI);
    ctx.stroke();
    // Abdominal midline
    ctx.beginPath();
    ctx.moveTo(0, -74);
    ctx.lineTo(0, -52);
    ctx.moveTo(-10, -64);
    ctx.lineTo(10, -64);
    ctx.moveTo(-9, -56);
    ctx.lineTo(9, -56);
    ctx.stroke();
  }

  // Step E: Head & Facial Expressions
  ctx.save();
  ctx.translate(0, -116);
  ctx.rotate(kin.headAngle + kin.recoilHead);

  if (isKunoichi) {
    // 1. Dynamic Flowing High Ponytail (Kuncir Kuda Mai)
    const hairLag = Math.sin(time * 3.5) * 8 - (kin.recoilHead * 18) - (dir * kin.shiftX * 0.6);
    ctx.save();

    // Red Ribbon knot / Scrunchie at crown
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-dir * 14, -13, 6, 0, Math.PI * 2);
    ctx.fill();

    // Gold bead ornament on hair tie
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-dir * 15, -13, 3, 0, Math.PI * 2);
    ctx.fill();

    // Red ribbon tails fluttering
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-dir * 15, -10);
    ctx.quadraticCurveTo(-dir * 24 + hairLag * 0.5, -4, -dir * 28 + hairLag * 0.8, 8);
    ctx.stroke();

    // Ponytail Shadow Layer
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(-dir * 14, -15);
    ctx.quadraticCurveTo(-dir * 32 + hairLag * 0.6, -7, -dir * 42 + hairLag, 24);
    ctx.quadraticCurveTo(-dir * 26 + hairLag * 0.4, 4, -dir * 10, -5);
    ctx.closePath();
    ctx.fill();

    // Ponytail Main Hair (Glossy Brunette)
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.moveTo(-dir * 13, -14);
    ctx.quadraticCurveTo(-dir * 29 + hairLag * 0.6, -5, -dir * 38 + hairLag, 20);
    ctx.quadraticCurveTo(-dir * 23 + hairLag * 0.4, 6, -dir * 11, -6);
    ctx.closePath();
    ctx.fill();

    // Lustrous hair highlight sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-dir * 17, -10);
    ctx.quadraticCurveTo(-dir * 25 + hairLag * 0.5, 0, -dir * 28 + hairLag * 0.8, 12);
    ctx.stroke();

    ctx.restore();

    // 2. Head base
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // Soft Peach Cheek Blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.36)';
    ctx.beginPath();
    ctx.arc(dir * 10, 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Hair Base & Side Bangs framing face
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.arc(-dir * 3, -4, 20.5, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Side fringe / bangs
    ctx.beginPath();
    ctx.moveTo(dir * 2, -18);
    ctx.quadraticCurveTo(dir * 16, -14, dir * 18, 0);
    ctx.quadraticCurveTo(dir * 14, -6, dir * 8, -12);
    ctx.closePath();
    ctx.fill();

    // White Ninja Headband (Hachigane) across forehead
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-dir * 12, -16, 26, 6, 2);
    ctx.fill();
    // Metallic forehead plate reflection
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(dir * 2, -15, 8, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(dir * 4, -15, 4, 4);

    // Kunoichi Eyes & Facial Expressions
    if (isKnockdown) {
      // Spiral dizzy eyes
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dir * 8, -1, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dir * 8, -1, 1.5, 0, Math.PI);
      ctx.stroke();

      // Open gasp mouth
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(dir * 8, 8, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBeingHit) {
      // Wincing anime slit eye (> <)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(dir * 5 - 2, -2);
      ctx.lineTo(dir * 5 + 3, 0);
      ctx.lineTo(dir * 5 - 2, 2);
      ctx.stroke();

      // Shock mouth
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(dir * 7, 7, 3.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === 'jab' || action === 'cross' || action === 'hook' || action === 'uppercut') {
      // Fierce focused anime battle eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(dir * 8, -1, 4, 2.2, dir * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Eyelash wing
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dir * 4, -3);
      ctx.lineTo(dir * 13, -2);
      ctx.lineTo(dir * 15, -4);
      ctx.stroke();

      // Clenched determined mouth
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(dir * 5, 6, 6, 2.5);
    } else {
      // Beautiful arcade fighting eyes with double reflections
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(dir * 8, -1, 3.8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Winged eyeliner
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(dir * 4, -5);
      ctx.lineTo(dir * 12, -4);
      ctx.lineTo(dir * 14, -6);
      ctx.stroke();

      // Twin anime catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 9, -2.5, 1.3, 0, Math.PI * 2);
      ctx.arc(dir * 7, 0.5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Confident kunoichi smirk
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(dir * 5, 7);
      ctx.quadraticCurveTo(dir * 8, 9, dir * 11, 6.5);
      ctx.stroke();
    }
  } else {
    // Head base
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();

    // Padded Protective Boxing Headguard
    const headguardColor = player.glovesColor || (dir === 1 ? '#dc2626' : '#2563eb');
    ctx.fillStyle = headguardColor;

    // Crown dome of headguard
    ctx.beginPath();
    ctx.arc(0, -2, 22.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Cheek & Ear Guard flaps
    ctx.fillRect(-dir * 22, -10, 8, 18);
    ctx.fillRect(dir * 14, -10, 8, 18);

    // Chin strap
    ctx.strokeStyle = headguardColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 10, 14, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Hair fringe peeking under headguard
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(dir * 4, -12, 6, 0, Math.PI);
    ctx.fill();

    // Animated Eyes & Mouth Expressions
    if (isKnockdown) {
      // Cartoon K.O. "X X" eyes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dir * 5 - 3, -4);
      ctx.lineTo(dir * 5 + 3, 2);
      ctx.moveTo(dir * 5 + 3, -4);
      ctx.lineTo(dir * 5 - 3, 2);
      ctx.moveTo(dir * 14 - 3, -4);
      ctx.lineTo(dir * 14 + 3, 2);
      ctx.moveTo(dir * 14 + 3, -4);
      ctx.lineTo(dir * 14 - 3, 2);
      ctx.stroke();

      // Dazed open mouth
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(dir * 9, 9, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBeingHit) {
      // Wincing pain eyes ("> <" slanted slit)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dir * 6 - 3, -2);
      ctx.lineTo(dir * 6 + 3, 0);
      ctx.lineTo(dir * 6 - 3, 2);
      ctx.stroke();

      // Gasping mouth in shock
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(dir * 8, 8, 4.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === 'jab' || action === 'cross' || action === 'hook' || action === 'uppercut') {
      // Fierce combat squint
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(dir * 8, -1, 3.5, 2, dir * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Mouthguard clenched
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dir * 5, 6, 8, 3);
    } else {
      // Focused intense boxing eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * 8, -1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Reflection pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 9, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Fierce angled eyebrow
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dir * 3, -6);
      ctx.lineTo(dir * 13, -4);
      ctx.stroke();

      // Confident smirk
      ctx.beginPath();
      ctx.moveTo(dir * 5, 8);
      ctx.lineTo(dir * 11, 7);
      ctx.stroke();
    }
  }

  // Knockdown Orbiting Dizzy Stars
  if (isKnockdown) {
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const starAngle = time * 6 + (sIdx * Math.PI * 2) / 3;
      const starX = Math.cos(starAngle) * 22;
      const starY = -28 + Math.sin(starAngle) * 7;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(starX, starY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // Head restored
  ctx.restore(); // Torso restored

  // Step F: Draw Front Arm & Glove (Foreground layer)
  const frontArm = renderArticulatedArm(
    ctx,
    frontShoulderX,
    frontShoulderY,
    kin.frontGloveX,
    kin.frontGloveY,
    skinTone,
    dir,
    true,
    action,
    strikePhase,
    isKunoichi
  );
  const frontGloveAngle = frontArm.wristAngle - (dir > 0 ? 0 : Math.PI);
  renderBoxingGlove(ctx, kin.frontGloveX, kin.frontGloveY, gloveColor, dir, 16, isKunoichi, frontGloveAngle);

  // Step G: Punch Trajectory Effects & Visual Accents
  if (action === 'jab') {
    if (isKunoichi) {
      // Piercing Fire Stream / Senko Flame
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(dir * 22, -90);
      ctx.lineTo(kin.frontGloveX - dir * 8, kin.frontGloveY);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(dir * 26, -90);
      ctx.lineTo(kin.frontGloveX, kin.frontGloveY);
      ctx.stroke();

      // Flame sparks
      for (let sp = 0; sp < 4; sp++) {
        ctx.fillStyle = sp % 2 === 0 ? '#ea580c' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(kin.frontGloveX + (sp - 2) * 5, kin.frontGloveY + Math.sin(time * 20 + sp) * 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(dir * 22, -90);
      ctx.lineTo(kin.frontGloveX - dir * 10, kin.frontGloveY);
      ctx.stroke();
    }
  } else if (action === 'cross') {
    if (isKunoichi) {
      // Explosive Fireball Burst
      const fGrad = ctx.createRadialGradient(kin.backGloveX, kin.backGloveY, 2, kin.backGloveX, kin.backGloveY, 26);
      fGrad.addColorStop(0, '#fef08a');
      fGrad.addColorStop(0.4, '#f97316');
      fGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(kin.backGloveX, kin.backGloveY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Fire trail from rear hip
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-dir * 12, -84);
      ctx.lineTo(kin.backGloveX, kin.backGloveY);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-dir * 10, -84);
      ctx.lineTo(kin.backGloveX - dir * 10, kin.backGloveY);
      ctx.stroke();
    }
  } else if (action === 'hook') {
    if (isKunoichi) {
      // Ryuuenbu Curved Flame Arc (Iconic Crescent Fire Blade)
      ctx.save();
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(dir * 20, -96, 56, dir > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6, dir > 0 ? 0.15 : Math.PI * 1.15);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dir * 20, -96, 56, dir > 0 ? -Math.PI * 0.35 : -Math.PI * 0.55, dir > 0 ? 0.05 : Math.PI * 1.05);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(dir * 20, -96, 55, dir > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6, dir > 0 ? 0.1 : Math.PI * 1.1);
      ctx.stroke();
    }
  } else if (action === 'uppercut') {
    if (isKunoichi) {
      // Rising Volcanic Flame Eruption
      const upGrad = ctx.createLinearGradient(kin.frontGloveX, -70, kin.frontGloveX, kin.frontGloveY + 10);
      upGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      upGrad.addColorStop(0.5, '#ea580c');
      upGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = upGrad;
      ctx.beginPath();
      ctx.moveTo(kin.frontGloveX - 10, -70);
      ctx.lineTo(kin.frontGloveX + 10, -70);
      ctx.lineTo(kin.frontGloveX + 14, kin.frontGloveY + 12);
      ctx.lineTo(kin.frontGloveX - 14, kin.frontGloveY + 12);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(kin.frontGloveX, -80);
      ctx.lineTo(kin.frontGloveX, kin.frontGloveY + 12);
      ctx.stroke();
    }
  } else if (action === 'block') {
    if (isKunoichi) {
      // Flaming Sakura / Fan Shield Barrier
      ctx.save();
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(dir * 22, -108, 24 + Math.sin(time * 12) * 3, -Math.PI * 0.6, Math.PI * 0.6, dir < 0);
      ctx.stroke();

      // Inner fire ring
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(dir * 22, -108, 16 + Math.sin(time * 12) * 2, -Math.PI * 0.5, Math.PI * 0.5, dir < 0);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dir * 22, -108, 22 + Math.sin(time * 14) * 3, -Math.PI * 0.5, Math.PI * 0.5, dir < 0);
      ctx.stroke();
    }
  } else if (action === 'taunt_crown') {
    if (isKunoichi) {
      // Sensu Folding Fan held high
      ctx.save();
      ctx.translate(0, -155);
      ctx.rotate(Math.sin(time * 4) * 0.1);
      // Fan blades
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 24, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();

      // Gold Sun Crest on Fan
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Fan bamboo ribs
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      for (let r = -0.7; r <= -0.3; r += 0.1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(Math.PI * r) * 24, Math.sin(Math.PI * r) * 24);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-16, -145);
      ctx.lineTo(-20, -164);
      ctx.lineTo(-10, -154);
      ctx.lineTo(0, -168);
      ctx.lineTo(10, -154);
      ctx.lineTo(20, -164);
      ctx.lineTo(16, -145);
      ctx.closePath();
      ctx.fill();

      // Crown jewel
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -154, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speech Bubble
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-50, -196, 100, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#713f12';
    ctx.font = '900 12px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isKunoichi ? '🌸 SHINOBI!' : '👑 CHAMPION!', 0, -179);
  } else if (action === 'taunt_flex') {
    // Muscle Flame Aura Ring
    ctx.strokeStyle = isKunoichi ? '#f97316' : 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -85, 38 + Math.sin(time * 15) * 4, 0, Math.PI * 2);
    ctx.stroke();

    // Speech Bubble
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-45, -170, 90, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7c2d12';
    ctx.font = '900 12px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isKunoichi ? '🔥 NIPPON ICHI!' : '💪 TOO EASY!', 0, -153);
  } else if (action === 'taunt_dance') {
    // Disco Sparkles
    for (let i = 0; i < 4; i++) {
      const spAngle = (i * Math.PI) / 2 + time * 4;
      const spX = Math.cos(spAngle) * 35;
      const spY = -115 + Math.sin(spAngle) * 25;
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f472b6';
      ctx.beginPath();
      ctx.arc(spX, spY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speech Bubble
    ctx.fillStyle = '#f0fdf4';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-45, -170, 90, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#14532d';
    ctx.font = '900 12px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isKunoichi ? '✨ KACHOU SEN!' : '🕺 DISCO KO!', 0, -153);
  } else if (action === 'taunt_shuffle') {
    // Lightning speed lines
    ctx.strokeStyle = isKunoichi ? '#f97316' : '#60a5fa';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const lineY = -110 + i * 20;
      ctx.beginPath();
      ctx.moveTo(-dir * 45, lineY);
      ctx.lineTo(-dir * 15, lineY);
      ctx.stroke();
    }

    // Speech Bubble
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = isKunoichi ? '#ea580c' : '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-55, -170, 110, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isKunoichi ? '#7c2d12' : '#0c4a6e';
    ctx.font = '900 11px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isKunoichi ? '⚡ SHINOBI SPEED!' : '⚡ UNTOUCHABLE!', 0, -153);
  } else {
    if (isKunoichi) {
      // Idle / footwork flame embers dancing from fists
      const emberPhase = time * 3.5;
      for (let e = 0; e < 3; e++) {
        const ep = (emberPhase + e * 1.4) % 3;
        const ex = kin.frontGloveX + Math.sin(ep * 4 + e) * 7;
        const ey = kin.frontGloveY - ep * 8;
        const alpha = Math.max(0, 1 - ep / 3);
        ctx.fillStyle = e === 1 ? `rgba(251, 191, 36, ${alpha})` : `rgba(234, 88, 12, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Step H: Mini Overhead Ring Health Gauge
  const healthRatio = Math.max(0, Math.min(100, player.health)) / 100;
  const barW = 46;
  const barH = 5;
  const barX = -23;
  const barY = -148;

  // Background box
  ctx.fillStyle = isBeingHit ? '#7f1d1d' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = isBeingHit ? '#ef4444' : '#334155';
  ctx.lineWidth = isBeingHit ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 3);
  ctx.fill();
  ctx.stroke();

  // Health fill
  if (healthRatio > 0) {
    ctx.fillStyle = isBeingHit ? '#ffffff' : dir === 1 ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * healthRatio, barH, 2);
    ctx.fill();
  }

  ctx.restore();
}

// Render 3D shaded rounded boxing glove with wrist tape wrap & leather highlight
function renderBoxingGlove(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  color: string,
  dir: number,
  radius: number,
  isFlame?: boolean,
  angle: number = 0
) {
  ctx.save();
  ctx.translate(gx, gy);
  if (angle) {
    ctx.rotate(angle * 0.65);
  }

  if (isFlame) {
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
  }

  // White athletic wrist tape wrap
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-dir * (radius * 0.9), radius * 0.3, radius * 0.9, radius * 0.7);

  // Tape red/black cross lace
  ctx.strokeStyle = isFlame ? '#ea580c' : '#ef4444';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-dir * (radius * 0.8), radius * 0.4);
  ctx.lineTo(-dir * (radius * 0.2), radius * 0.8);
  ctx.stroke();

  // Main Rounded Glove Leather
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Distinct curved thumb pocket
  ctx.beginPath();
  ctx.arc(dir * (radius * 0.7), -radius * 0.2, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Top Glossy Light Highlight (Simulates shiny patent boxing leather)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.beginPath();
  ctx.ellipse(-dir * 2, -radius * 0.45, radius * 0.5, radius * 0.25, -dir * 0.2, 0, Math.PI * 2);
  ctx.fill();

  if (isFlame) {
    // Golden Flame Insignia on Glove
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
