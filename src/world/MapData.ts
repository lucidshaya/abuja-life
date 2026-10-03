/**
 * Stylized, compressed Abuja. +x is east, -z is north. Units are metres.
 * Everything here is plain data so the minimap, city builder and event
 * system all agree on where things are.
 */

export type DistrictStyle = 'tower' | 'mixed' | 'estate' | 'mansion' | 'gov' | 'market' | 'park' | 'none';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface District extends Rect {
  id: string;
  name: string;
  tagline: string;
  color: string;
  ground: number;
  style: DistrictStyle;
  minH: number;
  maxH: number;
  density: number;
  palette: number[];
  minorRoads: boolean;
}

export interface RoadSeg {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
  kind: 'major' | 'minor' | 'expressway';
}

export interface NpcSpot {
  id: string;
  name: string;
  x: number;
  z: number;
  facing: number;
  eventId: string;
  /** Fire automatically when the player gets close (e.g. VIO checkpoint). */
  auto?: 'car' | 'foot' | 'any';
  look: 'vio' | 'mallam' | 'mama' | 'bigman' | 'clerk' | 'pastor' | 'uncle' | 'guard' | 'boatman' | 'driver' | 'pos' | 'aunty';
}

export interface CarSpot {
  x: number;
  z: number;
  heading: number;
  color: number;
}

const COLS = [-625, -375, -125, 125, 375];
const ROWS = [-375, -125, 125, 375];

function cell(col: number, row: number): Rect {
  return { x0: COLS[col], x1: COLS[col + 1], z0: ROWS[row], z1: ROWS[row + 1] };
}

export const WORLD: Rect = { x0: -920, z0: -420, x1: 560, z1: 420 };

export const DISTRICTS: District[] = [
  {
    id: 'highway', name: 'Abuja–Kaduna Expressway', tagline: 'Zuma Rock don welcome you to the FCT',
    x0: -920, x1: -625, z0: -375, z1: -125, color: '#b9a46a', ground: 0x9c8a55,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'kubwa', name: 'Kubwa', tagline: 'Expressway warriors. Traffic na lifestyle.',
    ...cell(0, 0), color: '#c7a36b', ground: 0x8f8a52,
    style: 'estate', minH: 4, maxH: 9, density: 0.75, palette: [0xe9d8b4, 0xd9b38c, 0xf1e5c8, 0xcfa77a, 0xe2c6a1], minorRoads: true,
  },
  {
    id: 'gwarinpa', name: 'Gwarinpa Estate', tagline: 'Biggest estate for West Africa, abi?',
    ...cell(1, 0), color: '#d1b483', ground: 0x7f9150,
    style: 'estate', minH: 5, maxH: 10, density: 0.8, palette: [0xf3ead7, 0xe5d0aa, 0xd8e0c8, 0xf0d8c0, 0xc9d6e3], minorRoads: true,
  },
  {
    id: 'maitama', name: 'Maitama', tagline: 'Where the big men sleep. Gate man dey check you.',
    ...cell(2, 0), color: '#8fbf7a', ground: 0x6f9a4a,
    style: 'mansion', minH: 7, maxH: 13, density: 0.85, palette: [0xffffff, 0xf4efe6, 0xe8e2d6, 0xdfe7ee, 0xf6e7d2], minorRoads: true,
  },
  {
    id: 'aso', name: 'Three Arms Zone', tagline: 'Aso Rock dey look you. Behave.',
    ...cell(3, 0), color: '#7fa86d', ground: 0x6c9447,
    style: 'gov', minH: 10, maxH: 22, density: 0.35, palette: [0xf5f2ea, 0xe6e1d3, 0xd8d2c0], minorRoads: true,
  },
  {
    id: 'jabi', name: 'Jabi Lake', tagline: 'Chill spot. Boat ride, small chops, cruise.',
    ...cell(1, 1), color: '#6fb3c9', ground: 0x6e9e4c,
    style: 'park', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'wuse', name: 'Wuse 2', tagline: 'Enjoyment central. Suya, lounges, and big boys.',
    ...cell(2, 1), color: '#e0915a', ground: 0x8a8a6a,
    style: 'tower', minH: 14, maxH: 48, density: 0.85, palette: [0xdfe6ec, 0xc9d3db, 0xe8dcc8, 0x9fb4c7, 0xf1f1ee, 0xb7c2a8], minorRoads: true,
  },
  {
    id: 'central', name: 'Central Area', tagline: 'Federal might. Mosque, Church, Eagle Square.',
    ...cell(3, 1), color: '#c9c1a6', ground: 0x7d9a52,
    style: 'gov', minH: 18, maxH: 55, density: 0.7, palette: [0xf0ece2, 0xd9d4c5, 0xbfc9d1, 0xe4dccb], minorRoads: true,
  },
  {
    id: 'utako', name: 'Utako & Wuse Market', tagline: 'Market women no dey carry last.',
    ...cell(1, 2), color: '#e8b04d', ground: 0x9a8656,
    style: 'market', minH: 5, maxH: 14, density: 0.85, palette: [0xe8d2a6, 0xd9b37a, 0xf0e2c0, 0xc79a62, 0xe0c9a0], minorRoads: true,
  },
  {
    id: 'garki', name: 'Garki & Area 1', tagline: 'Area 1 roundabout: enter at your own risk.',
    ...cell(2, 2), color: '#d97a6c', ground: 0x8d8a5e,
    style: 'mixed', minH: 7, maxH: 26, density: 0.85, palette: [0xe8dcc6, 0xd6c3a5, 0xc9d1d6, 0xf0e6d6, 0xbfae92], minorRoads: true,
  },
  {
    id: 'asokoro', name: 'Asokoro', tagline: 'Hilly, quiet and very, very expensive.',
    ...cell(3, 2), color: '#a3c58c', ground: 0x6a9446,
    style: 'mansion', minH: 7, maxH: 14, density: 0.8, palette: [0xffffff, 0xf2ece0, 0xe3ddd0, 0xf5e9dc], minorRoads: true,
  },
];

/** Areas that the procedural builder must leave empty for landmarks. */
export const RESERVED: Rect[] = [
  { x0: -360, z0: -110, x1: -140, z1: 110 }, // Jabi Lake + park
  { x0: 140, z0: -110, x1: 240, z1: -10 }, // National Mosque
  { x0: 260, z0: -110, x1: 360, z1: -10 }, // Christian Centre
  { x0: 140, z0: 10, x1: 240, z1: 110 }, // Eagle Square
  { x0: -240, z0: 140, x1: -135, z1: 240 }, // Wuse Market stalls
  { x0: -30, z0: 220, x1: 30, z1: 280 }, // Area 1 roundabout
  { x0: -360, z0: -360, x1: -270, z1: -270 }, // Owambe hall, Gwarinpa
  { x0: -110, z0: -110, x1: -60, z1: -60 }, // Your flat in Wuse 2
  { x0: 6, z0: 6, x1: 60, z1: 40 }, // Suya joint
  { x0: 278, z0: 30, x1: 322, z1: 62 }, // Ministry of Wahala
];

export const LANDMARKS = {
  zuma: { x: -800, z: -340, r: 48, h: 120 },
  aso: { x: 480, z: -240, r: 75, h: 95 },
  cityGate: { x: -660, z: -250 },
  mosque: { x: 190, z: -60 },
  church: { x: 310, z: -60 },
  eagleSquare: { x: 190, z: 60 },
  lake: { x: -255, z: 15, rx: 78, rz: 62 },
  jabiMall: { x: -195, z: -88 },
  market: { x: -188, z: 190 },
  area1: { x: 0, z: 250, r: 18 },
  owambe: { x: -315, z: -315 },
  home: { x: -85, z: -85 },
  suya: { x: 30, z: 22 },
};

export const SPAWN = { x: -734, z: -233, heading: Math.PI / 2 };
export const HOME_SPAWN = { x: -85, z: -58, heading: 0 };

export const NPC_SPOTS: NpcSpot[] = [
  { id: 'uncle', name: 'Uncle Emeka', x: -728, z: -232, facing: -Math.PI / 2, eventId: 'welcome', look: 'uncle' },
  { id: 'vio', name: 'VIO Officer Bature', x: 136, z: 205, facing: -Math.PI / 2, eventId: 'vio', auto: 'car', look: 'vio' },
  { id: 'suya', name: 'Mallam Musa (Suya)', x: 24, z: 14, facing: Math.PI, eventId: 'suya', look: 'mallam' },
  { id: 'market', name: 'Mama Nkechi', x: -186, z: 182, facing: Math.PI, eventId: 'market', look: 'mama' },
  { id: 'owambe', name: 'Aunty Funmi (Celebrant)', x: -300, z: -296, facing: 0, eventId: 'owambe', look: 'aunty' },
  { id: 'ministry', name: 'Mr. Danjuma (Clerk)', x: 300, z: 46, facing: Math.PI, eventId: 'ministry', look: 'clerk' },
  { id: 'bigman', name: 'Chief "Do You Know Me"', x: 12, z: -238, facing: Math.PI, eventId: 'bigman', look: 'bigman' },
  { id: 'pastor', name: 'Evangelist Joshua', x: 28, z: 226, facing: Math.PI / 2, eventId: 'preacher', look: 'pastor' },
  { id: 'boat', name: 'Baba Boat', x: -255, z: -54, facing: 0, eventId: 'jabi-boat', look: 'boatman' },
  { id: 'oneway', name: 'Danladi (One-Way Driver)', x: -500, z: -236, facing: Math.PI, eventId: 'oneway', look: 'driver' },
  { id: 'guard', name: 'Soldier at Checkpoint', x: 368, z: -250, facing: -Math.PI / 2, eventId: 'aso-guard', auto: 'any', look: 'guard' },
  { id: 'pos', name: 'POS Babe', x: -40, z: 136, facing: Math.PI, eventId: 'pos', look: 'pos' },
  { id: 'gateman', name: 'Gateman Sule', x: -85, z: -64, facing: Math.PI, eventId: 'gateman', look: 'mallam' },
];

export const CAR_SPOTS: CarSpot[] = [
  { x: -742, z: -244, heading: Math.PI / 2, color: 0x1f5fbf }, // spawn
  { x: -70, z: -64, heading: 0, color: 0xe9e9e9 }, // home
  { x: 48, z: 30, heading: Math.PI / 2, color: 0x0f8a4b }, // Wuse 2
  { x: -205, z: 146, heading: 0, color: 0xc0262d }, // market
  { x: 145, z: 140, heading: 0, color: 0x111111 }, // Garki
];

const MAJOR = 16;
const MINOR = 10;
const EXPRESS = 22;

/** Road network: district edges are major roads, district centres get minor roads. */
export function buildRoads(): RoadSeg[] {
  const roads: RoadSeg[] = [];
  // Vertical majors through the main grid.
  for (const x of [-375, -125, 125, 375]) roads.push({ x0: x, z0: -375, x1: x, z1: 375, width: MAJOR, kind: 'major' });
  roads.push({ x0: -625, z0: -375, x1: -625, z1: -125, width: MAJOR, kind: 'major' });
  // Horizontal majors.
  for (const z of [-375, -125, 125, 375]) roads.push({ x0: -375, z0: z, x1: 375, z1: z, width: MAJOR, kind: 'major' });
  for (const z of [-375, -125]) roads.push({ x0: -625, z0: z, x1: -375, z1: z, width: MAJOR, kind: 'major' });
  // The expressway from Zuma Rock through Kubwa and Gwarinpa into the city.
  roads.push({ x0: -920, z0: -250, x1: -125, z1: -250, width: EXPRESS, kind: 'expressway' });
  // Minor roads through district centres.
  for (const d of DISTRICTS) {
    if (!d.minorRoads) continue;
    const cx = (d.x0 + d.x1) / 2;
    const cz = (d.z0 + d.z1) / 2;
    roads.push({ x0: cx, z0: d.z0, x1: cx, z1: d.z1, width: MINOR, kind: 'minor' });
    if (!(d.id === 'kubwa' || d.id === 'gwarinpa')) roads.push({ x0: d.x0, z0: cz, x1: d.x1, z1: cz, width: MINOR, kind: 'minor' });
  }
  // Ring road past Aso Rock.
  roads.push({ x0: 375, z0: -250, x1: 400, z1: -250, width: MINOR, kind: 'minor' });
  return roads;
}

export const ROADS = buildRoads();

export function districtAt(x: number, z: number): District | null {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return null;
}

export function inRect(r: Rect, x: number, z: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

/** True if a point lies on any road surface (with optional padding). */
export function onRoad(x: number, z: number, pad = 0): RoadSeg | null {
  for (const r of ROADS) {
    const hw = r.width / 2 + pad;
    const minX = Math.min(r.x0, r.x1) - hw;
    const maxX = Math.max(r.x0, r.x1) + hw;
    const minZ = Math.min(r.z0, r.z1) - hw;
    const maxZ = Math.max(r.z0, r.z1) + hw;
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return r;
  }
  return null;
}
