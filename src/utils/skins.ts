export interface BoxerSkin {
  id: string;
  name: string;
  trunksColor: string;
  glovesColor: string;
  minLifetimeScore: number;
  icon: string;
  description: string;
}

export const BOXER_SKINS: BoxerSkin[] = [
  {
    id: 'rookie_red',
    name: 'Rookie Red',
    trunksColor: '#ef4444',
    glovesColor: '#dc2626',
    minLifetimeScore: 0,
    icon: '🥊',
    description: 'Baju & Sarung Merah Starter',
  },
  {
    id: 'emerald_brawler',
    name: 'Emerald Brawler',
    trunksColor: '#10b981',
    glovesColor: '#059669',
    minLifetimeScore: 50,
    icon: '🍏',
    description: 'Buka di 50 Total Poin',
  },
  {
    id: 'purple_phantom',
    name: 'Purple Phantom',
    trunksColor: '#a855f7',
    glovesColor: '#7e22ce',
    minLifetimeScore: 120,
    icon: '🔮',
    description: 'Buka di 120 Total Poin',
  },
  {
    id: 'gold_champion',
    name: 'Gold Champion',
    trunksColor: '#eab308',
    glovesColor: '#ca8a04',
    minLifetimeScore: 250,
    icon: '👑',
    description: 'Buka di 250 Total Poin',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    trunksColor: '#06b6d4',
    glovesColor: '#ec4899',
    minLifetimeScore: 500,
    icon: '⚡',
    description: 'Buka di 500 Total Poin',
  },
  {
    id: 'shadow_ninja',
    name: 'Shadow Ninja',
    trunksColor: '#475569',
    glovesColor: '#0f172a',
    minLifetimeScore: 1000,
    icon: '🥷',
    description: 'Buka di 1,000 Total Poin',
  },
];
