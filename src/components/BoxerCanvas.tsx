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

    // Trigger ring rope rebound
    if (targetDir > 0) {
      ropeSpringRef.current.p2Vel += isCrit ? 16 : 10;
    } else {
      ropeSpringRef.current.p1Vel -= isCrit ? 16 : 10;
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
      time += Math.min(delta * 3, 0.1); // Smooth stable time increment

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
        'right',
        time,
        curLastHitBy === 'p2'
      );

      drawEnhancedBoxer(
        ctx,
        width * 0.68,
        matY + 12,
        curP2,
        'left',
        time,
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
// Enhanced Procedural Boxer Renderer (High Performance 2D Vector Primitives)
// ============================================================================
function drawEnhancedBoxer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: PlayerState,
  facing: 'left' | 'right',
  time: number,
  isBeingHit: boolean
) {
  const dir = facing === 'right' ? 1 : -1;
  const isKnockdown = player.currentAction === 'knockdown' || player.health <= 0;
  const action = player.currentAction;

  ctx.save();
  ctx.translate(x, y);

  // Dynamic Procedural Sway & Bob-and-Weave
  let torsoAngle = 0;
  let headAngle = 0;
  let shadowScale = 1;

  if (isKnockdown) {
    // Fallen flat / dazed on mat
    ctx.rotate((dir * Math.PI) / 2.6);
    ctx.translate(dir * 15, 36);
    shadowScale = 1.3;
  } else if (action === 'taunt_crown') {
    // High Champion Victory Leap
    const jump = Math.abs(Math.sin(time * 8)) * 18;
    ctx.translate(0, -jump);
    shadowScale = Math.max(0.6, 1 - jump / 35);
  } else if (action === 'taunt_shuffle') {
    // Lightning Ali Footwork Shuffle
    const shuffleX = Math.sin(time * 22) * 16;
    const shuffleY = Math.abs(Math.sin(time * 22)) * 5;
    ctx.translate(shuffleX, -shuffleY);
    torsoAngle = Math.sin(time * 22) * 0.1;
  } else if (action === 'taunt_dance') {
    // Groovy Disco Torso Roll
    const danceX = Math.sin(time * 12) * 12;
    const danceY = Math.cos(time * 12) * 6;
    ctx.translate(danceX, danceY);
    torsoAngle = Math.sin(time * 12) * 0.15;
  } else if (action === 'uppercut') {
    // Uppercut launching puncher slightly upward
    ctx.translate(0, -10);
    shadowScale = 0.8;
    torsoAngle = -dir * 0.12;
  } else if (action === 'cross') {
    // Deep forward leaning cross
    ctx.translate(dir * 12, 2);
    torsoAngle = dir * 0.14;
  } else if (action === 'hook') {
    // Torso twist hook
    torsoAngle = -dir * 0.1;
  } else if (action === 'jab') {
    // Quick snap forward
    ctx.translate(dir * 8, 0);
  } else {
    // Natural Boxing Stance: Rhythmic figure-8 Bob & Weave
    const bobY = Math.sin(time * 5) * 3.5;
    const swayX = Math.cos(time * 2.5) * 2;
    ctx.translate(swayX, bobY);
    torsoAngle = (swayX / 20) * dir;
  }

  // Heavy Hit-Reaction Snap
  if (isBeingHit && !isKnockdown) {
    const hitSnapX = -dir * (8 + Math.random() * 6);
    const hitSnapY = (Math.random() - 0.5) * 6;
    ctx.translate(hitSnapX, hitSnapY);
    headAngle = -dir * 0.28;
    torsoAngle = -dir * 0.16;
  }

  // 1. Dynamic Floor Shadow (Scales with jumps and falls)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 24, 34 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Legs & Boxing Boots
  // Rear Leg (Staggered back in athletic stance)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-dir * 20, -16, 13, 36, 4);
  ctx.fill();

  // Front Leg (Planted forward)
  ctx.beginPath();
  ctx.roundRect(dir * 6, -18, 13, 38, 4);
  ctx.fill();

  // Boxing Boots (Contrasting high-top laces & rubber ring sole)
  // Rear Boot
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-dir * 24, 15, 20, 13, [3, 6, 2, 2]);
  ctx.fill();
  ctx.fillStyle = '#f8fafc'; // White boxing boot ring sole
  ctx.fillRect(-dir * 24, 25, 20, 3);

  // Front Boot
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(dir * 2, 16, 22, 13, [6, 3, 2, 2]);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(dir * 2, 26, 22, 3);

  // Boot Laces accent
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dir * 6, 18);
  ctx.lineTo(dir * 14, 22);
  ctx.moveTo(dir * 14, 18);
  ctx.lineTo(dir * 6, 22);
  ctx.stroke();

  // 3. Boxing Trunks (Custom avatar color + side athletic stripe)
  const trunksColor = player.avatarColor || (dir === 1 ? '#ef4444' : '#3b82f6');
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

  // 4. Torso & Musculature Definition
  ctx.save();
  ctx.rotate(torsoAngle);

  // Skin tone base
  const skinTone = '#fca5a5';
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.roundRect(-22, -98, 44, 52, 8);
  ctx.fill();

  // Athletic muscle contours (peck shadow & abdominal shading lines)
  ctx.strokeStyle = 'rgba(185, 28, 28, 0.22)';
  ctx.lineWidth = 2;
  // Chest pecks
  ctx.beginPath();
  ctx.arc(-8, -82, 9, 0, Math.PI * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, -82, 9, Math.PI * 0.15, Math.PI);
  ctx.stroke();
  // Abdominal midline & six-pack lines
  ctx.beginPath();
  ctx.moveTo(0, -74);
  ctx.lineTo(0, -52);
  ctx.moveTo(-10, -64);
  ctx.lineTo(10, -64);
  ctx.moveTo(-9, -56);
  ctx.lineTo(9, -56);
  ctx.stroke();

  // 5. Head & Facial Expressions
  ctx.save();
  ctx.translate(0, -116);
  ctx.rotate(headAngle);

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

  // Dynamic Animated Eyes & Mouth Expressions
  if (isKnockdown) {
    // Cartoon K.O. "X X" eyes
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    // Eye 1
    ctx.beginPath();
    ctx.moveTo(dir * 5 - 3, -4);
    ctx.lineTo(dir * 5 + 3, 2);
    ctx.moveTo(dir * 5 + 3, -4);
    ctx.lineTo(dir * 5 - 3, 2);
    // Eye 2
    ctx.moveTo(dir * 14 - 3, -4);
    ctx.lineTo(dir * 14 + 3, 2);
    ctx.moveTo(dir * 14 + 3, -4);
    ctx.lineTo(dir * 14 - 3, 2);
    ctx.stroke();

    // Dazed open tongue/mouth
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

    // Determined clenched jaw / mouthguard
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dir * 5, 6, 8, 3);
  } else {
    // Idle: Focused intense boxing eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(dir * 8, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye light reflection pupil
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

    // Subtle confident smirk
    ctx.beginPath();
    ctx.moveTo(dir * 5, 8);
    ctx.lineTo(dir * 11, 7);
    ctx.stroke();
  }

  // Knockdown Orbiting Dizzy Stars (3D elliptical orbit above head)
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

  // 6. Boxing Gloves, Arms & Kinematics
  const gloveColor = player.glovesColor || (dir === 1 ? '#dc2626' : '#2563eb');

  let backGloveX = -dir * 14;
  let backGloveY = -86;
  let frontGloveX = dir * 20;
  let frontGloveY = -88;

  // Render Punch Trajectories & Weaponized Kinetic Trails
  if (action === 'jab') {
    // Straight lightning jab
    frontGloveX = dir * 88;
    frontGloveY = -96;

    // Straight speed motion lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(dir * 22, -90);
    ctx.lineTo(frontGloveX - dir * 10, frontGloveY);
    ctx.stroke();
  } else if (action === 'cross') {
    // Powerful rear cross punch (rear glove fires through front)
    backGloveX = dir * 92;
    backGloveY = -94;
    frontGloveX = dir * 12;
    frontGloveY = -78;

    // Fiery speed streak
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-dir * 10, -84);
    ctx.lineTo(backGloveX - dir * 10, backGloveY);
    ctx.stroke();
  } else if (action === 'hook') {
    // Wide horizontal sweeping hook
    frontGloveX = dir * 80;
    frontGloveY = -102;

    // Curved crescent swoosh trail
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(dir * 20, -96, 55, dir > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6, dir > 0 ? 0.1 : Math.PI * 1.1);
    ctx.stroke();
  } else if (action === 'uppercut') {
    // Explosive vertical upward thrust
    frontGloveX = dir * 55;
    frontGloveY = -130; // Driving straight up!

    // Vertical shock lines
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(frontGloveX, -80);
    ctx.lineTo(frontGloveX, frontGloveY + 12);
    ctx.stroke();
  } else if (action === 'block') {
    // Tight protective clamshell guard
    backGloveX = dir * 8;
    backGloveY = -106;
    frontGloveX = dir * 16;
    frontGloveY = -108;

    // Defensive Energy Shield Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dir * 22, -108, 22 + Math.sin(time * 14) * 3, -Math.PI * 0.5, Math.PI * 0.5, dir < 0);
    ctx.stroke();
  } else if (action === 'taunt_crown') {
    // Victory overhead double gloves
    backGloveX = -dir * 18;
    backGloveY = -142;
    frontGloveX = dir * 18;
    frontGloveY = -142;

    // Golden Champion Crown overhead
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

    // Crown jewels
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -154, 3.5, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.fillText('👑 CHAMPION!', 0, -179);
  } else if (action === 'taunt_flex') {
    // Muscle Flex Arms
    backGloveX = -dir * 28;
    backGloveY = -120;
    frontGloveX = dir * 28;
    frontGloveY = -120;

    // Muscle Flame Aura Ring
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
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
    ctx.fillText('💪 TOO EASY!', 0, -153);
  } else if (action === 'taunt_dance') {
    // Disco Wave Gloves
    backGloveX = -dir * 22;
    backGloveY = -110 + Math.sin(time * 15) * 20;
    frontGloveX = dir * 22;
    frontGloveY = -90 - Math.sin(time * 15) * 20;

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
    ctx.fillText('🕺 DISCO KO!', 0, -153);
  } else if (action === 'taunt_shuffle') {
    // Lightning speed lines
    ctx.strokeStyle = '#60a5fa';
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
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-55, -170, 110, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0c4a6e';
    ctx.font = '900 11px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ UNTOUCHABLE!', 0, -153);
  } else {
    // Idle: Front glove relaxed probing motion, rear glove tucked to chin
    frontGloveX += Math.sin(time * 6) * 3;
    frontGloveY += Math.cos(time * 5) * 2;
    backGloveY += Math.sin(time * 4) * 2;
  }

  // Draw Rear Arm & Glove (Guarding or punching)
  renderBoxingGlove(ctx, backGloveX, backGloveY, gloveColor, dir, 14);

  // Draw Front Arm & Glove
  renderBoxingGlove(ctx, frontGloveX, frontGloveY, gloveColor, dir, 16);

  // 7. Mini Overhead Ring Health Gauge
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
  radius: number
) {
  ctx.save();
  ctx.translate(gx, gy);

  // White athletic wrist tape wrap
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-dir * (radius * 0.9), radius * 0.3, radius * 0.9, radius * 0.7);

  // Tape red/black cross lace
  ctx.strokeStyle = '#ef4444';
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

  ctx.restore();
}
