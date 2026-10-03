export type Background = 'abuja' | 'lagos' | 'east' | 'north';
export type Outfit = 'kaftan' | 'agbada' | 'senator' | 'suit' | 'ankara' | 'jersey' | 'asoebi';
export type Hair = 'lowcut' | 'afro' | 'dreads' | 'braids' | 'bald' | 'gele' | 'hijab';
export type Headwear = 'none' | 'fila' | 'kufi' | 'cap';
export type FacialHair = 'none' | 'beard' | 'goatee';
export type Build = 'slim' | 'regular' | 'heavy';
export type Height = 'short' | 'average' | 'tall';
export type Pattern = 'plain' | 'circles' | 'diamonds' | 'waves' | 'stripes';

export interface CharacterConfig {
  name: string;
  background: Background;
  skin: number;
  build: Build;
  height: Height;
  hair: Hair;
  hairColor: number;
  facialHair: FacialHair;
  headwear: Headwear;
  outfit: Outfit;
  primary: number;
  secondary: number;
  pattern: Pattern;
  shades: boolean;
}

export const SKIN_TONES = [0x3b2219, 0x4f2e1f, 0x6b4029, 0x8a5636, 0xa86f48, 0xc68c62];
export const CLOTH_COLORS = [
  0xffffff, 0xf2e6c9, 0x1f6b3a, 0x0f8a4b, 0x123e7c, 0x2a64c9, 0x7a1f3d, 0xc0262d,
  0xe8a317, 0xf26b1d, 0x6c2c91, 0x111111, 0x5b5f66, 0x8c5a2b, 0x00a6a6, 0xd94f8c,
];
export const HAIR_COLORS = [0x0d0b0a, 0x2b1a10, 0x4a2d1a, 0x8f6a3a];

export const OPTIONS = {
  background: [
    { id: 'abuja', label: 'Abuja Born', desc: 'You know every shortcut. Start with ₦25k and +5 clout.' },
    { id: 'lagos', label: 'Lagos Transfer', desc: 'Lagos sharpness, Abuja money. Start with ₦40k.' },
    { id: 'east', label: 'From the East', desc: 'Business mind. Start with ₦50k, haggle better.' },
    { id: 'north', label: 'From the North', desc: 'Respect everywhere. Start with ₦30k and +10 clout.' },
  ],
  outfit: [
    { id: 'kaftan', label: 'Kaftan' },
    { id: 'agbada', label: 'Agbada' },
    { id: 'senator', label: 'Senator' },
    { id: 'suit', label: 'Corporate Suit' },
    { id: 'ankara', label: 'Ankara Shirt' },
    { id: 'jersey', label: 'Super Eagles Jersey' },
    { id: 'asoebi', label: 'Aso-ebi (Owambe)' },
  ],
  hair: [
    { id: 'lowcut', label: 'Low Cut' },
    { id: 'afro', label: 'Afro' },
    { id: 'dreads', label: 'Dreads' },
    { id: 'braids', label: 'Braids' },
    { id: 'bald', label: 'Bald / Clean' },
    { id: 'gele', label: 'Gele' },
    { id: 'hijab', label: 'Hijab' },
  ],
  headwear: [
    { id: 'none', label: 'None' },
    { id: 'fila', label: 'Fila' },
    { id: 'kufi', label: 'Kufi' },
    { id: 'cap', label: 'Face Cap' },
  ],
  facialHair: [
    { id: 'none', label: 'Clean' },
    { id: 'beard', label: 'Full Beard' },
    { id: 'goatee', label: 'Goatee' },
  ],
  build: [
    { id: 'slim', label: 'Slim' },
    { id: 'regular', label: 'Regular' },
    { id: 'heavy', label: 'Chairman' },
  ],
  height: [
    { id: 'short', label: 'Short' },
    { id: 'average', label: 'Average' },
    { id: 'tall', label: 'Tall' },
  ],
  pattern: [
    { id: 'plain', label: 'Plain' },
    { id: 'circles', label: 'Ankara Circles' },
    { id: 'diamonds', label: 'Diamonds' },
    { id: 'waves', label: 'Waves' },
    { id: 'stripes', label: 'Aso-oke Stripes' },
  ],
} as const;

export const STARTING_STATS: Record<Background, { money: number; clout: number }> = {
  abuja: { money: 25000, clout: 5 },
  lagos: { money: 40000, clout: 0 },
  east: { money: 50000, clout: 0 },
  north: { money: 30000, clout: 10 },
};

export function defaultCharacter(): CharacterConfig {
  return {
    name: 'Chidi',
    background: 'abuja',
    skin: 2,
    build: 'regular',
    height: 'average',
    hair: 'lowcut',
    hairColor: 0,
    facialHair: 'none',
    headwear: 'fila',
    outfit: 'kaftan',
    primary: 2,
    secondary: 1,
    pattern: 'plain',
    shades: false,
  };
}

/** Random-but-plausible NPC look, deterministic per rng. */
export function randomCharacter(rng: () => number): CharacterConfig {
  const p = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];
  const female = rng() < 0.5;
  const outfit = p<Outfit>(female ? ['ankara', 'asoebi', 'suit', 'jersey', 'kaftan'] : ['kaftan', 'agbada', 'senator', 'suit', 'ankara', 'jersey']);
  return {
    name: 'NPC',
    background: p<Background>(['abuja', 'lagos', 'east', 'north']),
    skin: Math.floor(rng() * SKIN_TONES.length),
    build: p<Build>(['slim', 'regular', 'regular', 'heavy']),
    height: p<Height>(['short', 'average', 'average', 'tall']),
    hair: female ? p<Hair>(['braids', 'gele', 'hijab', 'afro', 'dreads']) : p<Hair>(['lowcut', 'lowcut', 'bald', 'afro', 'dreads']),
    hairColor: rng() < 0.85 ? 0 : 1,
    facialHair: female ? 'none' : p<FacialHair>(['none', 'none', 'beard', 'goatee']),
    headwear: female ? 'none' : p<Headwear>(['none', 'none', 'fila', 'kufi', 'cap']),
    outfit,
    primary: Math.floor(rng() * CLOTH_COLORS.length),
    secondary: Math.floor(rng() * CLOTH_COLORS.length),
    pattern: outfit === 'ankara' || outfit === 'asoebi' ? p<Pattern>(['circles', 'diamonds', 'waves', 'stripes']) : 'plain',
    shades: rng() < 0.12,
  };
}
