import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, LIP_COLORS, OPTIONS, SKIN_TONES, defaultCharacter, type CharacterConfig } from '../player/CharacterConfig';
import type { WorldTransport } from './types';

/**
 * Seeing other players in the city. The map is cut into CELL-sized squares;
 * each square is a realtime topic. You send your state to your square and
 * listen to the 3×3 squares around you, so you only hear players near you.
 * Rates are kept low (3/s while moving, a heartbeat every few seconds when
 * still) and the receiver smooths the motion in between.
 */

export const CELL = 200;
export const SEND_MOVING = 0.33;
export const SEND_IDLE = 4;
/** Attach your full look this often even if it didn't change (late joiners). */
export const LOOK_EVERY = 8;
/** A player who hasn't sent anything for this long has left. */
export const REMOTE_TIMEOUT = 12;

export type PokeKind = 'wave' | 'knock';
const POKES: readonly PokeKind[] = ['wave', 'knock'];
const POSES = ['normal', 'dance', 'sit', 'cheer', 'phone', 'egwu', 'steppass', 'shaku', 'zanku', 'buga'] as const;
export type NetPose = (typeof POSES)[number];
const CARS = ['corolla', 'benz', 'suv'] as const;

export interface LocalState {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  pose: NetPose;
  /** "model:color" when driving, "" on foot. */
  car: string;
  /** Who can see you: "" = the open city, "estate:<block>", "home:<owner id>". */
  inst: string;
  role: string | null;
  look: CharacterConfig;
}

export interface RemoteState {
  id: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  pose: NetPose;
  car: { model: (typeof CARS)[number]; color: number } | null;
  inst: string;
  role: string | null;
  look: CharacterConfig | null;
}

export const cellKey = (cx: number, cz: number): string => `cell:${cx}:${cz}`;

export function cellOf(x: number, z: number): { cx: number; cz: number } {
  return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
}

/** Your square and the 8 around it. */
export function cellsAround(x: number, z: number): string[] {
  const { cx, cz } = cellOf(x, z);
  const out: string[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push(cellKey(cx + dx, cz + dz));
  return out;
}

const num = (v: unknown, lim: number): number | null => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? v : null);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null);
const idx = (v: unknown, list: readonly unknown[], d: number): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < list.length ? v : d);

/** Only accept looks the character creator could make (anything else falls back to defaults). */
export function sanitizeLook(raw: unknown): CharacterConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const d = defaultCharacter();
  const pick = <K extends keyof typeof OPTIONS>(k: K) => {
    const ids = OPTIONS[k].map((x) => x.id);
    return (oneOf(o[k], ids) ?? d[k as keyof CharacterConfig]) as never;
  };
  return {
    ...d,
    name: 'Player',
    background: pick('background'),
    outfit: pick('outfit'),
    hair: pick('hair'),
    headwear: pick('headwear'),
    facialHair: pick('facialHair'),
    build: pick('build'),
    height: pick('height'),
    face: pick('face'),
    brows: pick('brows'),
    marks: pick('marks'),
    shoes: pick('shoes'),
    pattern: pick('pattern'),
    skin: idx(o.skin, SKIN_TONES, d.skin),
    eyeColor: idx(o.eyeColor, EYE_COLORS, d.eyeColor),
    lips: idx(o.lips, LIP_COLORS, d.lips),
    hairColor: idx(o.hairColor, HAIR_COLORS, d.hairColor),
    primary: idx(o.primary, CLOTH_COLORS, d.primary),
    secondary: idx(o.secondary, CLOTH_COLORS, d.secondary),
    trousers: o.trousers === -1 ? -1 : idx(o.trousers, CLOTH_COLORS, -1),
    shades: o.shades === true,
    specs: o.specs === true,
    watch: o.watch === true,
    chain: o.chain === true,
    bag: o.bag === true,
  };
}

/** The look without your name (other players only see your @username). */
export function wireLook(c: CharacterConfig): Record<string, unknown> {
  const { name: _name, ...rest } = c;
  return rest;
}

/** Validate a state message from another player. */
export function parseState(p: Record<string, unknown>): RemoteState | null {
  const id = str(p.i, 64);
  const x = num(p.x, 5000);
  const z = num(p.z, 5000);
  if (!id || x === null || z === null) return null;
  let car: RemoteState['car'] = null;
  const c = str(p.c, 24);
  if (c) {
    const [m, col] = c.split(':');
    const model = oneOf(m, CARS);
    const color = Number(col);
    if (model && Number.isInteger(color) && color >= 0 && color <= 0xffffff) car = { model, color };
  }
  return {
    id,
    x,
    z,
    y: Math.max(0, Math.min(10, num(p.y, 100) ?? 0)),
    heading: num(p.h, 100) ?? 0,
    speed: Math.max(0, Math.min(60, num(p.s, 1000) ?? 0)),
    pose: oneOf(p.p, POSES) ?? 'normal',
    car,
    inst: str(p.n, 64) ?? '',
    role: str(p.r, 24),
    look: p.l ? sanitizeLook(p.l) : null,
  };
}

export class WorldNet {
  onState: (s: RemoteState) => void = () => {};
  onLeave: (id: string) => void = () => {};
  onPoke: (fromId: string, kind: PokeKind) => void = () => {};

  private cells = new Set<string>();
  private home = '';
  /** Seconds since we last sent our state. */
  private since = 99;
  /** Send early (someone said hi) when this reaches 0. */
  private forceT = Infinity;
  private lookT = LOOK_EVERY;
  private hiT = 0;
  private wantLook = false;
  private last: LocalState | null = null;
  private lookKey = '';
  private pokedAt = new Map<string, number>();
  private time = 0;

  constructor(private t: WorldTransport, readonly myId: string) {
    t.join('p:' + myId, (event, p) => {
      const from = str(p.i, 64);
      const kind = oneOf(p.k, POKES);
      if (event === 'poke' && from && kind && from !== myId) this.onPoke(from, kind);
    });
  }

  private onCell = (event: string, p: Record<string, unknown>): void => {
    if (p.i === this.myId) return;
    if (event === 's') {
      const s = parseState(p);
      if (s) this.onState(s);
    } else if (event === 'bye') {
      const id = str(p.i, 64);
      if (id) this.onLeave(id);
    } else if (event === 'hi') {
      // Someone just arrived nearby: send them our full state soon.
      this.wantLook = true;
      if (this.hiT <= 0) this.forceT = Math.min(this.forceT, 0.3 + Math.random() * 0.5);
    }
  };

  /** Call every frame. `me` = null when you're not in the world (menus, travel map). */
  update(dt: number, me: LocalState | null): void {
    this.time += dt;
    this.hiT -= dt;
    if (!me) {
      if (this.cells.size) this.leaveAll();
      return;
    }
    const want = new Set(cellsAround(me.x, me.z));
    for (const c of [...this.cells]) {
      if (!want.has(c)) {
        this.t.leave(c);
        this.cells.delete(c);
      }
    }
    for (const c of want) {
      if (this.cells.has(c)) continue;
      this.cells.add(c);
      this.t.join(c, this.onCell, () => this.t.send(c, 'hi', { i: this.myId }));
    }
    const { cx, cz } = cellOf(me.x, me.z);
    const home = cellKey(cx, cz);
    const moved = home !== this.home;
    this.home = home;
    const key = JSON.stringify(me.look);
    const lookChanged = key !== this.lookKey;
    const l = this.last;
    const changed =
      !l || moved || lookChanged || l.pose !== me.pose || l.car !== me.car || l.inst !== me.inst ||
      Math.hypot(l.x - me.x, l.z - me.z) > 0.15 || Math.abs(l.y - me.y) > 0.1 || Math.abs(l.heading - me.heading) > 0.12;
    this.since += dt;
    this.forceT -= dt;
    this.lookT -= dt;
    const due = this.forceT <= 0 || this.since >= (changed ? SEND_MOVING : SEND_IDLE);
    if (!due) return;
    const withLook = lookChanged || this.wantLook || this.lookT <= 0;
    this.t.send(home, 's', {
      i: this.myId,
      x: round(me.x, 2), y: round(me.y, 2), z: round(me.z, 2), h: round(me.heading, 2), s: round(me.speed, 1),
      p: me.pose, c: me.car, n: me.inst, r: me.role ?? '',
      ...(withLook ? { l: wireLook(me.look) } : {}),
    });
    if (withLook) {
      this.lookKey = key;
      this.lookT = LOOK_EVERY;
      this.wantLook = false;
      this.hiT = 1.5;
    }
    this.last = { ...me };
    this.since = 0;
    this.forceT = Infinity;
  }

  /** Wave at / knock for a player (anywhere in the city). Returns false if you did it a moment ago. */
  poke(toId: string, kind: PokeKind): boolean {
    const k = toId + kind;
    if (this.time - (this.pokedAt.get(k) ?? -99) < 4) return false;
    this.pokedAt.set(k, this.time);
    this.t.post('p:' + toId, 'poke', { i: this.myId, k: kind });
    return true;
  }

  private leaveAll(): void {
    if (this.home) this.t.send(this.home, 'bye', { i: this.myId });
    for (const c of this.cells) this.t.leave(c);
    this.cells.clear();
    this.home = '';
    this.last = null;
    this.lookKey = '';
    this.since = 99;
  }

  stop(): void {
    this.leaveAll();
    this.t.leave('p:' + this.myId);
  }
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
