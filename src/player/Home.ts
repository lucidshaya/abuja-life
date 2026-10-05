/**
 * Your house in Sunshine Court Estate, Gwarinpa, and the bills that come
 * with it: prepaid electricity (AEDC units) and the weekly estate service
 * charge. Pure data + rules so it can be unit tested.
 */

export const ESTATE = {
  name: 'Sunshine Court Estate',
  area: 'Gwarinpa',
  rect: { x0: -243, z0: -366, x1: -133, z1: -263 },
  gate: { x: -188, z: -263 },
  /** Your house (west side, first plot inside the gate). */
  house: { x: -216, z: -287 },
  /** Where you wake up: in front of your door, facing the house. */
  spawn: { x: -204.5, z: -287, heading: -Math.PI / 2 },
};

export interface HomeState {
  /** Prepaid electricity units (kWh) left on the meter. */
  units: number;
  /** Absolute game hour (day*24+hour) when units were last deducted. */
  lastAbs: number;
  /** Last estate week whose service charge is paid (week 1 = days 1–7). */
  duesWeek: number;
  /** Warnings already sent, so texts don't repeat. */
  warnedLow: boolean;
  warnedOut: boolean;
  /** Furniture you've bought (ids from FURNITURE). */
  furniture: string[];
  /** Day the generator fuel was last bought (gen keeps your light on that day). */
  genDay: number;
}

export interface Furniture {
  id: string;
  name: string;
  icon: string;
  price: number;
  clout: number;
  desc: string;
  /** Solid footprint inside the house interior (added when you buy it). */
  solid?: [number, number, number, number, number];
}

/** Your house interior (walk-in room, far east like the other interiors). */
export const HOUSE = { x0: 1460, z0: 240, x1: 1492, z1: 264, door: { x: 1476, z: 264 } };

/** Sims / Lagos-Life style upgrades for your house. */
export const FURNITURE: Furniture[] = [
  { id: 'rug', name: 'Persian rug', icon: '🟥', price: 35000, clout: 1, desc: 'Covers the cold tiles. Instant class.' },
  { id: 'plants', name: 'Potted plants', icon: '🪴', price: 25000, clout: 1, desc: 'Fresh vibes. Water them sometimes.' },
  { id: 'art', name: 'Wall art & family portrait', icon: '🖼️', price: 45000, clout: 1, desc: 'Big portrait of you in agbada. Visitors must see am.' },
  { id: 'shelf', name: 'Bookshelf', icon: '📚', price: 60000, clout: 1, desc: 'Books, trophies and your certificate in frame.' },
  { id: 'bed', name: 'Queen bed + orthopaedic mattress', icon: '🛏️', price: 180000, clout: 2, desc: 'No more foam on the floor. Sleep gives +2 clout.', solid: [1462.5, 241.5, 1469.5, 248.5, 0.9] },
  { id: 'couch', name: '3-seater leather couch', icon: '🛋️', price: 150000, clout: 2, desc: 'Lounge like a big man. Chill on it to rest.', solid: [1461, 252.5, 1463.4, 259.5, 1] },
  { id: 'table', name: 'Dining table set', icon: '🍽️', price: 200000, clout: 2, desc: 'Sunday rice for six. Invite your village people.', solid: [1482.4, 245.6, 1486.6, 248.4, 1] },
  { id: 'fridge', name: 'Double-door fridge', icon: '🧊', price: 250000, clout: 2, desc: 'Cold Maltina and zobo anytime (if NEPA allow).', solid: [1489.4, 240.6, 1491.6, 242.9, 2] },
  { id: 'tv', name: '65" smart TV', icon: '📺', price: 350000, clout: 3, desc: 'Super Eagles and Nollywood in 4K. Watch to rest.', solid: [1490.6, 252.5, 1491.6, 258.5, 1] },
  { id: 'ac', name: 'Split AC', icon: '❄️', price: 420000, clout: 3, desc: 'Abuja heat no fit you again. Better sleep (needs light).' },
  { id: 'gen', name: '"I-better-pass-my-neighbour" generator', icon: '⛽', price: 120000, clout: 1, desc: 'When NEPA take light, gen keeps you going (₦2,000 fuel a day).', solid: [1489.6, 261.4, 1491.4, 263.2, 1] },
  { id: 'chandelier', name: 'Crystal chandelier', icon: '💡', price: 300000, clout: 3, desc: 'Dubai style. The whole estate go see am from outside.' },
  { id: 'ps5', name: 'PS5 + FIFA', icon: '🎮', price: 800000, clout: 4, desc: 'Play FIFA with your guys. Needs the TV.' },
  { id: 'solar', name: 'Solar panels + inverter', icon: '☀️', price: 1500000, clout: 6, desc: 'Bye-bye NEPA. Your light never go off again.', solid: [1460.4, 261.6, 1461.6, 263.4, 2] },
];

export const furnitureById = (id: string): Furniture | undefined => FURNITURE.find((f) => f.id === id);

/** Is your house dark right now? (no units, no solar, no gen fuel today) */
export function homeDark(h: HomeState, day: number): boolean {
  if (h.furniture.includes('solar')) return false;
  if (!powerOut(h)) return false;
  return !(h.furniture.includes('gen') && h.genDay === day);
}

export const UNITS_PER_HOUR = 0.25; // ≈ 6 kWh a day: fan, fridge, TV, phone charging
export const NAIRA_PER_UNIT = 200;
export const TOKENS = [2000, 5000, 10000];
export const ESTATE_DUES = 10000;

export function newHome(abs = 24 + 8.5): HomeState {
  return { units: 20, lastAbs: abs, duesWeek: 1, warnedLow: false, warnedOut: false, furniture: [], genDay: 0 };
}

export function parseHome(raw: unknown, abs: number): HomeState {
  const base = newHome(abs);
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<HomeState>;
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    units: Math.max(0, n(o.units, base.units)),
    lastAbs: n(o.lastAbs, abs),
    duesWeek: Math.max(1, Math.floor(n(o.duesWeek, 1))),
    warnedLow: !!o.warnedLow,
    warnedOut: !!o.warnedOut,
    furniture: Array.isArray(o.furniture) ? o.furniture.filter((f) => typeof f === 'string' && FURNITURE.some((x) => x.id === f)) : [],
    genDay: n(o.genDay, 0),
  };
}

export const weekOf = (day: number): number => Math.floor((Math.max(1, day) - 1) / 7) + 1;

/** Burn units for the time that passed. Returns the new state (not mutated). */
export function useUnits(h: HomeState, abs: number): HomeState {
  if (h.furniture.includes('solar')) return { ...h, lastAbs: Math.max(h.lastAbs, abs) };
  const dt = Math.max(0, Math.min(24 * 7, abs - h.lastAbs));
  return { ...h, units: Math.max(0, h.units - dt * UNITS_PER_HOUR), lastAbs: Math.max(h.lastAbs, abs) };
}

export function unitsFor(naira: number): number {
  return Math.floor(naira / NAIRA_PER_UNIT);
}

/** Weeks of estate dues owed (0 = all paid). */
export function weeksOwed(h: HomeState, day: number): number {
  return Math.max(0, weekOf(day) - h.duesWeek);
}

export function powerOut(h: HomeState): boolean {
  return h.units <= 0;
}

export function inEstate(x: number, z: number, pad = 0): boolean {
  const r = ESTATE.rect;
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}
