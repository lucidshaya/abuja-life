import type { Bindings } from './Input';
import { defaultCharacter, type CharacterConfig } from '../player/CharacterConfig';
import { newPhoneState, parsePhone, type PhoneState } from '../phone/PhoneData';

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  quality: QualitySetting;
  sensitivity: number;
  invertY: boolean;
  showHints: boolean;
  volume: number;
  musicVolume: number;
  muted: boolean;
  bindings: Partial<Bindings>;
}

export interface Stats {
  money: number;
  clout: number;
}

export interface SaveData {
  version: 1;
  character: CharacterConfig;
  stats: Stats;
  pos: { x: number; z: number; heading: number } | null;
  hour: number;
  day: number;
  flags: string[];
  settings: Settings;
  phone: PhoneState;
}

export const SAVE_KEY = 'abuja-life-save-v1';

export function defaultSettings(): Settings {
  return { quality: 'auto', sensitivity: 1, invertY: false, showHints: true, volume: 0.6, musicVolume: 0.5, muted: false, bindings: {} };
}

export function newSave(character: CharacterConfig = defaultCharacter()): SaveData {
  return {
    version: 1,
    character,
    stats: { money: 25000, clout: 0 },
    pos: null,
    hour: 9,
    day: 1,
    flags: [],
    settings: defaultSettings(),
    phone: newPhoneState(),
  };
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Parse a stored save, filling any missing or corrupt fields with defaults. */
export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  let o: Partial<SaveData>;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.version !== 1) return null;
  const base = newSave();
  const s = { ...base.settings, ...(o.settings ?? {}) };
  return {
    version: 1,
    character: { ...base.character, ...(o.character ?? {}) },
    stats: { money: num(o.stats?.money, base.stats.money), clout: num(o.stats?.clout, base.stats.clout) },
    pos: o.pos && Number.isFinite(o.pos.x) && Number.isFinite(o.pos.z) ? { x: o.pos.x, z: o.pos.z, heading: num(o.pos.heading, 0) } : null,
    hour: num(o.hour, base.hour) % 24,
    day: Math.max(1, Math.floor(num(o.day, 1))),
    flags: Array.isArray(o.flags) ? o.flags.filter((f) => typeof f === 'string') : [],
    phone: parsePhone(o.phone),
    settings: {
      quality: (['auto', 'low', 'medium', 'high'] as const).includes(s.quality) ? s.quality : 'auto',
      sensitivity: Math.min(3, Math.max(0.2, num(s.sensitivity, 1))),
      invertY: !!s.invertY,
      showHints: s.showHints !== false,
      volume: Math.min(1, Math.max(0, num(s.volume, 0.6))),
      musicVolume: Math.min(1, Math.max(0, num(s.musicVolume, 0.5))),
      // Sound is always on when the game starts; mute only lasts for the session.
      muted: false,
      bindings: typeof s.bindings === 'object' && s.bindings ? s.bindings : {},
    },
  };
}

export function loadSave(kv: KV | null = storage()): SaveData | null {
  if (!kv) return null;
  try {
    return parseSave(kv.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData, kv: KV | null = storage()): boolean {
  if (!kv) return false;
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(kv: KV | null = storage()): void {
  try {
    kv?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
