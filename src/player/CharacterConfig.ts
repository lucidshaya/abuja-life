export type Background = 'abuja' | 'lagos' | 'east' | 'north';
export type Outfit =
  | 'kaftan' | 'agbada' | 'senator' | 'suit' | 'ankara' | 'jersey' | 'asoebi'
  | 'babariga' | 'isiagu' | 'iroBuba' | 'abaya' | 'nysc' | 'jalabiya';
export type Hair = 'lowcut' | 'fade' | 'afro' | 'twists' | 'dreads' | 'braids' | 'bald' | 'gele' | 'hijab';
export type Headwear = 'none' | 'fila' | 'kufi' | 'zanna' | 'redcap' | 'cap' | 'nyscCap';
export type FacialHair = 'none' | 'beard' | 'goatee' | 'moustache' | 'stubble';
export type Build = 'slim' | 'regular' | 'heavy';
export type Height = 'short' | 'average' | 'tall';
export type Pattern = 'plain' | 'circles' | 'diamonds' | 'waves' | 'stripes' | 'lion';
export type FaceShape = 'oval' | 'round' | 'square';
export type Brows = 'natural' | 'thick' | 'thin';
export type Marks = 'none' | 'pele' | 'abaja' | 'zubaya';
export type Shoes = 'loafers' | 'sneakers' | 'sandals' | 'boots';

export interface CharacterConfig {
  name: string;
  background: Background;
  skin: number;
  build: Build;
  height: Height;
  face: FaceShape;
  eyeColor: number;
  brows: Brows;
  lips: number;
  marks: Marks;
  hair: Hair;
  hairColor: number;
  facialHair: FacialHair;
  headwear: Headwear;
  outfit: Outfit;
  primary: number;
  secondary: number;
  pattern: Pattern;
  /** -1 = matches the outfit. */
  trousers: number;
  shoes: Shoes;
  shades: boolean;
  specs: boolean;
  watch: boolean;
  chain: boolean;
  bag: boolean;
}

export const SKIN_TONES = [0x2e1a12, 0x3b2219, 0x4f2e1f, 0x6b4029, 0x8a5636, 0xa86f48, 0xc68c62, 0xd9a47a];
export const CLOTH_COLORS = [
  0xffffff, 0xf2e6c9, 0x1f6b3a, 0x0f8a4b, 0x123e7c, 0x2a64c9, 0x7a1f3d, 0xc0262d,
  0xe8a317, 0xf26b1d, 0x6c2c91, 0x111111, 0x5b5f66, 0x8c5a2b, 0x00a6a6, 0xd94f8c,
  0xc9a96e, 0x3f4a2f,
];
export const HAIR_COLORS = [0x0d0b0a, 0x2b1a10, 0x4a2d1a, 0x8f6a3a, 0xd4a62a, 0x7a1f3d];
export const EYE_COLORS = [0x2b1608, 0x4a2a12, 0x6b4a2b, 0x2f4a2a, 0x334a66];
export const LIP_COLORS = [0x5a2a20, 0x7a3a2e, 0x8c2f3a, 0xb0304a, 0x3a1a14];

export const OPTIONS = {
  background: [
    { id: 'abuja', label: 'Abuja Born', desc: 'You know every shortcut. +₦5k and +5 clout.' },
    { id: 'lagos', label: 'Lagos Transfer', desc: 'Lagos sharpness, Abuja money. +₦15k.' },
    { id: 'east', label: 'From the East', desc: 'Business mind. +₦25k and you haggle better.' },
    { id: 'north', label: 'From the North', desc: 'Respect everywhere. +₦10k and +10 clout.' },
  ],
  outfit: [
    { id: 'kaftan', label: 'Kaftan' },
    { id: 'agbada', label: 'Agbada' },
    { id: 'babariga', label: 'Babariga' },
    { id: 'senator', label: 'Senator' },
    { id: 'isiagu', label: 'Isiagu' },
    { id: 'suit', label: 'Corporate Suit' },
    { id: 'ankara', label: 'Ankara Shirt' },
    { id: 'jersey', label: 'Super Eagles Jersey' },
    { id: 'asoebi', label: 'Aso-ebi Gown' },
    { id: 'iroBuba', label: 'Iro & Buba' },
    { id: 'abaya', label: 'Abaya' },
    { id: 'nysc', label: 'NYSC Khaki' },
    { id: 'jalabiya', label: 'Jalabiya' },
  ],
  hair: [
    { id: 'lowcut', label: 'Low Cut' },
    { id: 'fade', label: 'Skin Fade' },
    { id: 'afro', label: 'Afro' },
    { id: 'twists', label: 'Twists' },
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
    { id: 'zanna', label: 'Zanna Cap' },
    { id: 'redcap', label: 'Red Cap (Chief)' },
    { id: 'cap', label: 'Face Cap' },
    { id: 'nyscCap', label: 'NYSC Cap' },
  ],
  facialHair: [
    { id: 'none', label: 'Clean' },
    { id: 'stubble', label: 'Stubble' },
    { id: 'moustache', label: 'Moustache' },
    { id: 'goatee', label: 'Goatee' },
    { id: 'beard', label: 'Full Beard' },
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
  face: [
    { id: 'oval', label: 'Oval' },
    { id: 'round', label: 'Round' },
    { id: 'square', label: 'Square' },
  ],
  brows: [
    { id: 'natural', label: 'Natural' },
    { id: 'thick', label: 'Thick' },
    { id: 'thin', label: 'Thin' },
  ],
  marks: [
    { id: 'none', label: 'None' },
    { id: 'pele', label: 'Pele (Yoruba)' },
    { id: 'abaja', label: 'Abaja (Yoruba)' },
    { id: 'zubaya', label: 'Zubaya (Hausa)' },
  ],
  shoes: [
    { id: 'loafers', label: 'Loafers' },
    { id: 'sneakers', label: 'Sneakers' },
    { id: 'sandals', label: 'Palm Slippers' },
    { id: 'boots', label: 'Boots' },
  ],
  pattern: [
    { id: 'plain', label: 'Plain' },
    { id: 'circles', label: 'Ankara Circles' },
    { id: 'diamonds', label: 'Diamonds' },
    { id: 'waves', label: 'Waves' },
    { id: 'stripes', label: 'Aso-oke Stripes' },
    { id: 'lion', label: 'Isiagu Lions' },
  ],
} as const;

export const STARTING_STATS: Record<Background, { money: number; clout: number }> = {
  abuja: { money: 5000, clout: 5 },
  lagos: { money: 15000, clout: 0 },
  east: { money: 25000, clout: 0 },
  north: { money: 10000, clout: 10 },
};

export function defaultCharacter(): CharacterConfig {
  return {
    name: 'Chidi',
    background: 'abuja',
    skin: 3,
    build: 'regular',
    height: 'average',
    face: 'oval',
    eyeColor: 0,
    brows: 'natural',
    lips: 0,
    marks: 'none',
    hair: 'lowcut',
    hairColor: 0,
    facialHair: 'none',
    headwear: 'fila',
    outfit: 'kaftan',
    primary: 2,
    secondary: 1,
    pattern: 'plain',
    trousers: -1,
    shoes: 'loafers',
    shades: false,
    specs: false,
    watch: true,
    chain: false,
    bag: false,
  };
}

/** Fill fields missing from older saves. */
export function upgradeCharacter(c: Partial<CharacterConfig>): CharacterConfig {
  const d = defaultCharacter();
  const out = { ...d, ...c } as CharacterConfig;
  if (out.skin >= SKIN_TONES.length) out.skin = SKIN_TONES.length - 1;
  return out;
}

/** Random-but-plausible NPC look, deterministic per rng. */
export function randomCharacter(rng: () => number): CharacterConfig {
  const p = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];
  const female = rng() < 0.5;
  const outfit = p<Outfit>(
    female ? ['ankara', 'asoebi', 'suit', 'jersey', 'iroBuba', 'abaya', 'kaftan'] : ['kaftan', 'agbada', 'senator', 'suit', 'ankara', 'jersey', 'babariga', 'isiagu'],
  );
  const patterned = outfit === 'ankara' || outfit === 'asoebi' || outfit === 'iroBuba';
  return {
    ...defaultCharacter(),
    name: 'NPC',
    background: p<Background>(['abuja', 'lagos', 'east', 'north']),
    skin: Math.floor(rng() * SKIN_TONES.length),
    build: p<Build>(['slim', 'regular', 'regular', 'heavy']),
    height: p<Height>(['short', 'average', 'average', 'tall']),
    face: p<FaceShape>(['oval', 'round', 'square']),
    eyeColor: rng() < 0.85 ? 0 : 1,
    brows: p<Brows>(['natural', 'thick', 'thin']),
    lips: Math.floor(rng() * LIP_COLORS.length),
    marks: rng() < 0.08 ? p<Marks>(['pele', 'abaja', 'zubaya']) : 'none',
    hair: female ? p<Hair>(['braids', 'gele', 'hijab', 'afro', 'dreads', 'twists']) : p<Hair>(['lowcut', 'lowcut', 'fade', 'bald', 'afro', 'dreads', 'twists']),
    hairColor: rng() < 0.85 ? 0 : 1,
    facialHair: female ? 'none' : p<FacialHair>(['none', 'none', 'stubble', 'beard', 'goatee', 'moustache']),
    headwear: female ? 'none' : outfit === 'babariga' ? 'zanna' : outfit === 'isiagu' ? 'redcap' : p<Headwear>(['none', 'none', 'fila', 'kufi', 'cap']),
    outfit,
    primary: Math.floor(rng() * CLOTH_COLORS.length),
    secondary: Math.floor(rng() * CLOTH_COLORS.length),
    pattern: outfit === 'isiagu' ? 'lion' : patterned ? p<Pattern>(['circles', 'diamonds', 'waves', 'stripes']) : 'plain',
    trousers: -1,
    shoes: p<Shoes>(['loafers', 'sneakers', 'sandals']),
    shades: rng() < 0.1,
    specs: rng() < 0.08,
    watch: rng() < 0.4,
    chain: rng() < 0.15,
    bag: rng() < 0.15,
  };
}
