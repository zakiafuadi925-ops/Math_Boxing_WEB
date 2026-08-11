export interface ShopItem {
  id: string;
  name: string;
  category: 'skin' | 'arena' | 'attribute' | 'topup';
  diamondPrice?: number;
  idrPrice?: number;
  icon: string;
  description: string;
  badge?: string;
  colors?: {
    trunks: string;
    gloves: string;
    bg?: string;
  };
  attributeBoost?: string;
}

export const SHOP_SKINS: ShopItem[] = [
  {
    id: 'skin_gold_dragon',
    name: 'Golden Dragon Legend',
    category: 'skin',
    diamondPrice: 500,
    idrPrice: 15000,
    icon: '🐉',
    badge: 'POPULER',
    description: 'Baju emas berkilau dengan efek aura naga emas sang juara.',
    colors: { trunks: '#f59e0b', gloves: '#d97706' },
  },
  {
    id: 'skin_cyber_boss',
    name: 'Cyberpunk Neon Boss',
    category: 'skin',
    diamondPrice: 800,
    idrPrice: 25000,
    icon: '⚡',
    badge: 'SULTAN',
    description: 'Baju neon cyan & sarung pink magenta dari masa depan.',
    colors: { trunks: '#06b6d4', gloves: '#ec4899' },
  },
  {
    id: 'skin_galaxy_cosmic',
    name: 'Galaxy Cosmic Fighter',
    category: 'skin',
    diamondPrice: 1200,
    idrPrice: 35000,
    icon: '🌌',
    badge: 'EXCLUSIVE',
    description: 'Gaya petarung galaksi dengan warna nebula ungu cosmic.',
    colors: { trunks: '#7c3aed', gloves: '#c084fc' },
  },
  {
    id: 'skin_titan_iron',
    name: 'Iron Titan Mecha',
    category: 'skin',
    diamondPrice: 2000,
    idrPrice: 50000,
    icon: '🤖',
    badge: 'LEGENDARY',
    description: 'Armor baja robot titan yang kokoh dan disegani lawan.',
    colors: { trunks: '#334155', gloves: '#64748b' },
  },
];

export const SHOP_ARENAS: ShopItem[] = [
  {
    id: 'arena_madison',
    name: 'Madison Square Coliseum',
    category: 'arena',
    diamondPrice: 300,
    idrPrice: 10000,
    icon: '🏛️',
    description: 'Stadion kelas dunia dengan lampu sorot megah dan riuh penonton.',
    colors: { trunks: '#1e293b', gloves: '#f59e0b', bg: '#0f172a' },
  },
  {
    id: 'arena_tokyo_neon',
    name: 'Tokyo Cyber Dome 2099',
    category: 'arena',
    diamondPrice: 500,
    idrPrice: 15000,
    icon: '🌆',
    badge: 'HOT',
    description: 'Ring neon futuristik dengan hologram kota Tokyo malam hari.',
    colors: { trunks: '#0f172a', gloves: '#06b6d4', bg: '#030712' },
  },
  {
    id: 'arena_volcano',
    name: 'Volcano Magma Arena',
    category: 'arena',
    diamondPrice: 800,
    idrPrice: 25000,
    icon: '🌋',
    description: 'Arena tinju ekstrem di puncak kawah lahar berapi.',
    colors: { trunks: '#450a0a', gloves: '#ef4444', bg: '#18181b' },
  },
];

export const SHOP_ATTRIBUTES: ShopItem[] = [
  {
    id: 'attr_titan_knuckles',
    name: 'Titan Knuckles (+25% Punch KO)',
    category: 'attribute',
    diamondPrice: 400,
    idrPrice: 12000,
    icon: '🥊',
    badge: 'DAMAGE UP',
    attributeBoost: 'Pukulan KO 25% lebih kuat',
    description: 'Meningkatkan damage pukulan saat jawaban matematika benar.',
  },
  {
    id: 'attr_speed_gloves',
    name: 'Sarung Kilat (+10s Extra Time)',
    category: 'attribute',
    diamondPrice: 400,
    idrPrice: 12000,
    icon: '⚡',
    badge: 'TIME BOOST',
    attributeBoost: 'Waktu pertandingan +10 Detik',
    description: 'Memberikan tambahan waktu ronda tinju agar bisa menjawab lebih banyak soal.',
  },
  {
    id: 'attr_double_exp',
    name: 'Kartu Double EXP & Points (2x)',
    category: 'attribute',
    diamondPrice: 600,
    idrPrice: 18000,
    icon: '💎',
    badge: '2X POINTS',
    attributeBoost: '2x Poin Lifetime per Pertandingan',
    description: 'Mendapatkan poin 2x lipat setiap kali menang atau menyelesaikan ronde.',
  },
];

export interface DiamondBundle {
  id: string;
  diamonds: number;
  bonus: number;
  idrPrice: number;
  badge?: string;
  icon: string;
}

export const DIAMOND_BUNDLES: DiamondBundle[] = [
  {
    id: 'topup_100',
    diamonds: 100,
    bonus: 0,
    idrPrice: 5000,
    icon: '💎',
  },
  {
    id: 'topup_500',
    diamonds: 500,
    bonus: 50,
    idrPrice: 20000,
    badge: 'PALING LARIS',
    icon: '💎✨',
  },
  {
    id: 'topup_1500',
    diamonds: 1500,
    bonus: 200,
    idrPrice: 50000,
    badge: 'HEMAT 25%',
    icon: '👑💎',
  },
  {
    id: 'topup_5000',
    diamonds: 5000,
    bonus: 1000,
    idrPrice: 150000,
    badge: 'SULTAN BUNDLE',
    icon: '🏆💎',
  },
];
