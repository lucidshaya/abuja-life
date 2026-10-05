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
}

export const UNITS_PER_HOUR = 0.25; // ≈ 6 kWh a day: fan, fridge, TV, phone charging
export const NAIRA_PER_UNIT = 200;
export const TOKENS = [2000, 5000, 10000];
export const ESTATE_DUES = 10000;

export function newHome(abs = 24 + 8.5): HomeState {
  return { units: 20, lastAbs: abs, duesWeek: 1, warnedLow: false, warnedOut: false };
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
  };
}

export const weekOf = (day: number): number => Math.floor((Math.max(1, day) - 1) / 7) + 1;

/** Burn units for the time that passed. Returns the new state (not mutated). */
export function useUnits(h: HomeState, abs: number): HomeState {
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
