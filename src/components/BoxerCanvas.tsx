import React, { useEffect, useRef, useState } from 'react';
import { PlayerState } from '../types';
import { Crown, Flame, Sparkles, Zap } from 'lucide-react';
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

export const BoxerCanvas: React.FC<BoxerCanvasProps> = ({
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

  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [p1HealthPulse, setP1HealthPulse] = useState(false);
  const [p2HealthPulse, setP2HealthPulse] = useState(false);

  const comboInfo = getComboMultiplier(combo);

  // Health damage pulse triggers
  useEffect(() => {
    if (p1.health < prevP1Health.current || lastHitBy === 'p2') {
      setP1HealthPulse(true);
      const timer = setTimeout(() => setP1HealthPulse(false), 550);
      prevP1Health.current = p1.health;
      return () => clearTimeout(timer);
    }
    prevP1Health.current = p1.health;
  }, [p1.health, lastHitBy]);

  useEffect(() => {
    if (p2.health < prevP2Health.current || lastHitBy === 'p1') {
      setP2HealthPulse(true);
      const timer = setTimeout(() => setP2HealthPulse(false), 550);
      prevP2Health.current = p2.health;
      return () => clearTimeout(timer);
    }
    prevP2Health.current = p2.health;
  }, [p2.health, lastHitBy]);

  // Track score changes & trigger floating damage text popups
  useEffect(() => {
    // Handle game resets
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
        x: 68 + jitterX, // Positioned over P2 (Right Boxer)
        y: 28 + jitterY,
        scoreText: `+${diff} PTS`,
        subtext: p1.combo > 1 ? `🔥 ${p1.combo}x COMBO!` : `💥 ${actionLabel}!`,
        isCritical: isCrit,
        colorClass: isCrit
          ? 'text-yellow-300 drop-shadow-[0_4px_16px_rgba(250,204,21,1)] scale-110'
          : 'text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.9)]',
        badgeBg: isCrit
          ? 'bg-amber-950/90 border-amber-400 text-amber-300'
          : 'bg-slate-950/80 border-amber-500/50 text-amber-200',
        target: 'p2',
      };

      setPopups((prev) => [...prev, newPopup]);
      prevP1Score.current = p1.score;
    }

    // P2 scores a hit on P1
    if (p2.score > prevP2Score.current) {
      const diff = p2.score - prevP2Score.current;
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 6;

      const newPopup: DamagePopup = {
        id: `p2-hit-${Date.now()}-${Math.random()}`,
        x: 32 + jitterX, // Positioned over P1 (Left Boxer)
        y: 28 + jitterY,
        scoreText: `+${diff} PTS`,
        subtext: `⚡ AI HIT!`,
        isCritical: false,
        colorClass: 'text-rose-400 drop-shadow-[0_4px_14px_rgba(244,63,94,1)]',
        badgeBg: 'bg-rose-950/90 border-rose-500/60 text-rose-200',
        target: 'p1',
      };

      setPopups((prev) => [...prev, newPopup]);
      prevP2Score.current = p2.score;
    }
  }, [p1.score, p2.score, p1.combo, p1.currentAction, p2.currentAction]);

  // Cleanup old floating damage popups automatically
  useEffect(() => {
    if (popups.length === 0) return;
    const timer = setTimeout(() => {
      setPopups((prev) => prev.slice(1));
    }, 1250);
    return () => clearTimeout(timer);
  }, [popups]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Ring Background & Ropes
      ctx.clearRect(0, 0, width, height);

      // Arena Floor Gradient
      const arenaGradient = ctx.createLinearGradient(0, 0, 0, height);
      arenaGradient.addColorStop(0, '#0f172a');
      arenaGradient.addColorStop(0.5, '#1e1b4b');
      arenaGradient.addColorStop(1, '#090d16');
      ctx.fillStyle = arenaGradient;
      ctx.fillRect(0, 0, width, height);

      // Spotlight effect
      const spotlight = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.6);
      spotlight.addColorStop(0, 'rgba(238, 242, 255, 0.15)');
      spotlight.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // Canvas Floor Mat
      const matY = height * 0.7;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(width * 0.05, height);
      ctx.lineTo(width * 0.2, matY);
      ctx.lineTo(width * 0.8, matY);
      ctx.lineTo(width * 0.95, height);
      ctx.closePath();
      ctx.fill();

      // Mat Center Logo Ring
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(width / 2, matY + 40, width * 0.22, 20, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Ring Ropes
      const ropeColors = ['#ef4444', '#ffffff', '#3b82f6'];
      ropeColors.forEach((color, idx) => {
        const ropeY = matY - 40 - idx * 25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, ropeY + Math.sin(time + idx) * 2);
        ctx.lineTo(width, ropeY + Math.cos(time + idx) * 2);
        ctx.stroke();
      });

      // Turnbuckle Corner Posts
      ctx.fillStyle = '#ef4444'; // Left Corner
      ctx.fillRect(width * 0.02, matY - 120, 12, 130);
      ctx.fillStyle = '#3b82f6'; // Right Corner
      ctx.fillRect(width * 0.98 - 12, matY - 120, 12, 130);

      // 2. Draw Boxers
      // P1 (Left Boxer, Red Trunks)
      drawBoxer(
        ctx,
        width * 0.32,
        matY + 10,
        p1,
        'right', // faces right
        time,
        lastHitBy === 'p2'
      );

      // P2 (Right Boxer, Blue Trunks)
      drawBoxer(
        ctx,
        width * 0.68,
        matY + 10,
        p2,
        'left', // faces left
        time,
        lastHitBy === 'p1'
      );

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [p1, p2, lastHitBy]);

  return (
    <div className="relative w-full flex-1 min-h-[150px] max-h-[250px] sm:max-h-[320px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 flex items-center justify-center">
      {/* Top Left P1 Arcade Health Bar HUD */}
      <div className="absolute top-1.5 left-2 sm:top-2.5 sm:left-3 z-30 pointer-events-none flex flex-col gap-0.5 w-24 sm:w-36 select-none">
        <div className="flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-200">
          <span className="flex items-center gap-1 font-arcade truncate max-w-[65px] sm:max-w-[100px]">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block shadow-sm shrink-0" />
            <span className="truncate">{p1.name}</span>
          </span>
          <span className={`font-arcade font-bold transition-all ${p1HealthPulse ? 'text-red-400 animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,1)]' : 'text-slate-300'}`}>
            {p1.health}%
          </span>
        </div>

        <div
          className={`w-full h-2.5 sm:h-3.5 bg-slate-950/90 rounded-full border p-0.5 transition-all duration-300 backdrop-blur-sm ${
            p1HealthPulse
              ? 'border-red-500 bg-red-950/90 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-105 ring-1 ring-red-400'
              : 'border-slate-700/80 shadow-md'
          }`}
        >
          <div
            style={{ width: `${Math.max(0, Math.min(100, p1.health))}%` }}
            className={`h-full rounded-full transition-all duration-300 ${
              p1HealthPulse
                ? 'bg-gradient-to-r from-red-600 via-yellow-200 to-red-400 animate-pulse'
                : p1.health <= 30
                ? 'bg-red-600 animate-pulse'
                : 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Center Dynamic Combo & Multiplier Banner */}
      {combo > 0 && (
        <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/60 backdrop-blur-md shadow-lg flex items-center gap-1 text-[10px] sm:text-xs font-arcade font-bold text-amber-300">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>{combo}x COMBO</span>
            {comboInfo.multiplier > 1 && (
              <span className="text-yellow-300 font-extrabold">({comboInfo.multiplier}x PTS)</span>
            )}
          </div>
          {lastBonusPoints && lastBonusPoints > 0 && (
            <div className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-arcade text-[9px] font-black shadow-md">
              +{lastBonusPoints} BONUS
            </div>
          )}
        </div>
      )}

      {/* Top Right P2 Arcade Health Bar HUD */}
      <div className="absolute top-1.5 right-2 sm:top-2.5 sm:right-3 z-30 pointer-events-none flex flex-col items-end gap-0.5 w-24 sm:w-36 select-none">
        <div className="flex items-center justify-between w-full text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-200">
          <span className={`font-arcade font-bold transition-all ${p2HealthPulse ? 'text-red-400 animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,1)]' : 'text-slate-300'}`}>
            {p2.health}%
          </span>
          <span className="flex items-center gap-1 font-arcade truncate max-w-[65px] sm:max-w-[100px] justify-end">
            <span className="truncate">{p2.name}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-sm shrink-0" />
          </span>
        </div>

        <div
          className={`w-full h-2.5 sm:h-3.5 bg-slate-950/90 rounded-full border p-0.5 transition-all duration-300 backdrop-blur-sm ${
            p2HealthPulse
              ? 'border-red-500 bg-red-950/90 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-105 ring-1 ring-red-400'
              : 'border-slate-700/80 shadow-md'
          }`}
        >
          <div
            style={{ width: `${Math.max(0, Math.min(100, p2.health))}%` }}
            className={`h-full rounded-full transition-all duration-300 ml-auto ${
              p2HealthPulse
                ? 'bg-gradient-to-r from-blue-600 via-yellow-200 to-red-500 animate-pulse'
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
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-700/60 backdrop-blur-sm shadow-md">
          {[
            { id: 'taunt_crown' as const, emoji: '👑', label: 'Juara' },
            { id: 'taunt_flex' as const, emoji: '💪', label: 'Otot' },
            { id: 'taunt_dance' as const, emoji: '🕺', label: 'Joget' },
            { id: 'taunt_shuffle' as const, emoji: '⚡', label: 'Kilat' },
          ].map((em) => (
            <button
              key={em.id}
              onClick={() => onTriggerEmote(em.id)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs flex items-center justify-center transition-all duration-100 active:scale-90 ${
                p1.currentAction === em.id
                  ? 'bg-amber-500 text-slate-950 scale-110 shadow-md ring-1 ring-amber-300 font-bold'
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
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-float-damage flex flex-col items-center justify-center select-none"
          >
            {/* Visual Starburst Impact Background Ring */}
            <div
              className={`absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed ${
                popup.isCritical
                  ? 'border-amber-400 bg-amber-400/20'
                  : popup.target === 'p1'
                  ? 'border-rose-400 bg-rose-400/20'
                  : 'border-yellow-400 bg-yellow-400/20'
              } animate-starburst -z-10`}
            />

            {/* Main Floating Damage / Score Text */}
            <div className="flex items-center gap-1 font-arcade text-2xl sm:text-4xl font-black tracking-tight whitespace-nowrap">
              <span className={popup.colorClass}>{popup.scoreText}</span>
            </div>

            {/* Subtext Badge (Combo / Punch Action) */}
            {popup.subtext && (
              <div
                className={`mt-0.5 px-2 py-0.5 rounded-full border text-[9px] sm:text-xs font-arcade font-bold shadow-xl backdrop-blur-sm ${popup.badgeBg}`}
              >
                {popup.subtext}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function drawBoxer(
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
  const isPunching = ['jab', 'cross', 'hook', 'uppercut'].includes(player.currentAction);

  ctx.save();
  ctx.translate(x, y);

  // Knockdown pose vs Taunt pose vs Idle
  const isTaunting = player.currentAction.startsWith('taunt_');
  if (isKnockdown) {
    ctx.rotate((dir * Math.PI) / 3);
    ctx.translate(0, 30);
  } else if (player.currentAction === 'taunt_crown') {
    // Champion Victory Jump
    const jump = Math.abs(Math.sin(time * 10)) * 14;
    ctx.translate(0, -jump);
  } else if (player.currentAction === 'taunt_shuffle') {
    // Lightning side shuffle
    const shuffleX = Math.sin(time * 24) * 18;
    ctx.translate(shuffleX, 0);
  } else if (player.currentAction === 'taunt_dance') {
    // Disco dance sway
    const danceX = Math.sin(time * 12) * 10;
    const danceY = Math.cos(time * 12) * 6;
    ctx.translate(danceX, danceY);
  } else {
    // Idle bounce
    const bounce = Math.sin(time * 6) * 4;
    ctx.translate(0, bounce);
  }

  // Hit shake
  if (isBeingHit && !isKnockdown) {
    const shakeX = (Math.random() - 0.5) * 14;
    const shakeY = (Math.random() - 0.5) * 14;
    ctx.translate(shakeX, shakeY);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 25, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Legs & Boots
  ctx.fillStyle = '#1e293b';
  // Back leg
  ctx.fillRect(-dir * 18, -15, 12, 35);
  // Front leg
  ctx.fillRect(dir * 6, -15, 12, 35);

  // Boots
  ctx.fillStyle = '#020617';
  ctx.fillRect(-dir * 22, 15, 18, 12);
  ctx.fillRect(dir * 2, 15, 18, 12);

  // 2. Shorts / Trunks
  ctx.fillStyle = player.avatarColor || (dir === 1 ? '#ef4444' : '#3b82f6');
  ctx.fillRect(-22, -45, 44, 32);
  // Waistband
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-22, -45, 44, 8);

  // 3. Torso
  ctx.fillStyle = '#f87171'; // skin tone
  ctx.beginPath();
  ctx.roundRect(-20, -95, 40, 52, 6);
  ctx.fill();

  // 4. Head & Face
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(0, -115, 20, 0, Math.PI * 2);
  ctx.fill();

  // Headguard
  ctx.fillStyle = player.glovesColor || (dir === 1 ? '#dc2626' : '#2563eb');
  ctx.beginPath();
  ctx.arc(0, -118, 22, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(dir * 8, -115, 3, 0, Math.PI * 2);
  ctx.fill();

  // 5. Arms & Boxing Gloves
  const gloveColor = player.glovesColor || (dir === 1 ? '#dc2626' : '#2563eb');

  let backGloveX = -dir * 14;
  let backGloveY = -85;
  let gloveX = dir * 20;
  let gloveY = -90;

  if (isPunching) {
    gloveX = dir * 75; // Extended punch!
    gloveY = -100;

    // Punch motion trail
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(dir * 20, -90);
    ctx.lineTo(gloveX, gloveY);
    ctx.stroke();

    // Impact Starburst
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(gloveX + dir * 10, gloveY, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (player.currentAction === 'taunt_crown') {
    // Both gloves raised overhead in Victory Champion Pose!
    backGloveX = -dir * 18;
    backGloveY = -140;
    gloveX = dir * 18;
    gloveY = -140;

    // Golden Champion Crown overhead
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-16, -145);
    ctx.lineTo(-20, -162);
    ctx.lineTo(-10, -153);
    ctx.lineTo(0, -166);
    ctx.lineTo(10, -153);
    ctx.lineTo(20, -162);
    ctx.lineTo(16, -145);
    ctx.closePath();
    ctx.fill();

    // Crown jewels
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -152, 3, 0, Math.PI * 2);
    ctx.fill();

    // Speech Bubble
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-50, -195, 100, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#713f12';
    ctx.font = '900 12px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑 CHAMPION!', 0, -178);
  } else if (player.currentAction === 'taunt_flex') {
    // Double Muscle Flex Arms!
    backGloveX = -dir * 28;
    backGloveY = -120;
    gloveX = dir * 28;
    gloveY = -120;

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
  } else if (player.currentAction === 'taunt_dance') {
    // Disco Dance Wave Gloves
    backGloveX = -dir * 22;
    backGloveY = -110 + Math.sin(time * 15) * 20;
    gloveX = dir * 22;
    gloveY = -90 - Math.sin(time * 15) * 20;

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
  } else if (player.currentAction === 'taunt_shuffle') {
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
  }

  // Draw Guarding / Back Arm Glove
  ctx.fillStyle = gloveColor;
  ctx.beginPath();
  ctx.arc(backGloveX, backGloveY, 14, 0, Math.PI * 2);
  ctx.fill();

  // Draw Front Arm Glove
  ctx.fillStyle = gloveColor;
  ctx.beginPath();
  ctx.arc(gloveX, gloveY, 16, 0, Math.PI * 2);
  ctx.fill();

  // Mini Overhead Health Bar in Canvas Context
  const healthRatio = Math.max(0, Math.min(100, player.health)) / 100;
  const barW = 44;
  const barH = 5;
  const barX = -22;
  const barY = -142;

  // Health Bar Frame
  ctx.fillStyle = isBeingHit ? '#7f1d1d' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = isBeingHit ? '#ef4444' : '#334155';
  ctx.lineWidth = isBeingHit ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 3);
  ctx.fill();
  ctx.stroke();

  // Health Bar Fill
  if (healthRatio > 0) {
    ctx.fillStyle = isBeingHit ? '#ffffff' : dir === 1 ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * healthRatio, barH, 2);
    ctx.fill();
  }

  // Hit spark lines and reaction
  if (isBeingHit && !isKnockdown) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + (time % 1);
      const length = 22 + Math.sin(time * 10 + i) * 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 15, -115 + Math.sin(angle) * 15);
      ctx.lineTo(Math.cos(angle) * (15 + length), -115 + Math.sin(angle) * (15 + length));
      ctx.stroke();
    }

    ctx.fillStyle = '#f87171';
    ctx.font = '900 16px "Bungee", sans-serif';
    ctx.fillText('💥 POW!', -25, -145);
  }

  ctx.restore();
}

