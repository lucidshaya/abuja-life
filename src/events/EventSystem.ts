import type { Background, Outfit } from '../player/CharacterConfig';
import type { Stats } from '../core/Save';

export interface Effects {
  money?: number;
  clout?: number;
  /** Advance the in-game clock by this many hours. */
  timeSkip?: number;
  teleport?: { x: number; z: number; heading?: number };
  flag?: string;
  /** Lights out across the city for N real seconds. */
  blackout?: number;
  /** Sleep until 7am the next day. */
  sleep?: boolean;
  /** Open the outfit customizer after the dialogue. */
  customize?: boolean;
}

export interface Outcome {
  weight?: number;
  text: string;
  effects?: Effects;
}

export interface Requirement {
  outfit?: Outfit[];
  minMoney?: number;
  minClout?: number;
  flag?: string;
  notFlag?: string;
  background?: Background[];
}

export interface Choice {
  text: string;
  requires?: Requirement;
  /** Shown on a locked choice so the player knows why. */
  lockedHint?: string;
  outcomes: Outcome[];
}

export interface Trigger {
  type: 'npc' | 'zone' | 'random';
  npc?: string;
  district?: string;
  hours?: [number, number];
  inCar?: boolean;
  /** For random triggers: probability per real minute. */
  chance?: number;
  /** Seconds before this event can fire again. */
  cooldown: number;
  once?: boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  speaker: string;
  trigger: Trigger;
  requires?: Requirement;
  lines: string[];
  /** Line shown when the NPC is talked to but the event can't fire (wrong hour, cooldown). */
  unavailable?: string;
  variants?: Partial<Record<Background, string[]>>;
  choices: Choice[];
}

export interface EventContext {
  district: string | null;
  hour: number;
  inCar: boolean;
  outfit: Outfit;
  background: Background;
  stats: Stats;
  flags: ReadonlySet<string>;
}

export function hourInRange(hour: number, range: [number, number] | undefined): boolean {
  if (!range) return true;
  const [a, b] = range;
  return a <= b ? hour >= a && hour < b : hour >= a || hour < b;
}

export function meets(req: Requirement | undefined, ctx: EventContext): boolean {
  if (!req) return true;
  if (req.outfit && !req.outfit.includes(ctx.outfit)) return false;
  if (req.minMoney !== undefined && ctx.stats.money < req.minMoney) return false;
  if (req.minClout !== undefined && ctx.stats.clout < req.minClout) return false;
  if (req.flag && !ctx.flags.has(req.flag)) return false;
  if (req.notFlag && ctx.flags.has(req.notFlag)) return false;
  if (req.background && !req.background.includes(ctx.background)) return false;
  return true;
}

export function applyEffects(stats: Stats, fx: Effects | undefined): Stats {
  if (!fx) return { ...stats };
  return {
    money: Math.max(0, Math.round(stats.money + (fx.money ?? 0))),
    clout: Math.max(-100, Math.min(100, stats.clout + (fx.clout ?? 0))),
  };
}

export function pickOutcome(outcomes: Outcome[], rng: () => number): Outcome {
  const total = outcomes.reduce((s, o) => s + (o.weight ?? 1), 0);
  let r = rng() * total;
  for (const o of outcomes) {
    r -= o.weight ?? 1;
    if (r < 0) return o;
  }
  return outcomes[outcomes.length - 1];
}

export function linesFor(ev: GameEvent, bg: Background): string[] {
  return ev.variants?.[bg] ?? ev.lines;
}

export class EventSystem {
  private byId = new Map<string, GameEvent>();
  private lastFired = new Map<string, number>();
  private fired = new Set<string>();

  constructor(readonly events: GameEvent[], private rng: () => number = Math.random) {
    for (const e of events) this.byId.set(e.id, e);
  }

  get(id: string): GameEvent | undefined {
    return this.byId.get(id);
  }

  canFire(ev: GameEvent, ctx: EventContext, now: number): boolean {
    const t = ev.trigger;
    if (t.once && this.fired.has(ev.id)) return false;
    const last = this.lastFired.get(ev.id);
    if (last !== undefined && now - last < t.cooldown) return false;
    if (t.district && t.district !== ctx.district) return false;
    if (!hourInRange(ctx.hour, t.hours)) return false;
    if (t.inCar !== undefined && t.inCar !== ctx.inCar) return false;
    return meets(ev.requires, ctx);
  }

  markFired(id: string, now: number): void {
    this.lastFired.set(id, now);
    this.fired.add(id);
  }

  /** Seconds until an event is available again (0 = ready). */
  cooldownLeft(id: string, now: number): number {
    const ev = this.byId.get(id);
    const last = this.lastFired.get(id);
    if (!ev || last === undefined) return 0;
    return Math.max(0, ev.trigger.cooldown - (now - last));
  }

  /** Event for an NPC conversation, or null if it's on cooldown / unmet. */
  forNpc(npcEventId: string, ctx: EventContext, now: number): GameEvent | null {
    const ev = this.byId.get(npcEventId);
    if (!ev || !this.canFire(ev, ctx, now)) return null;
    return ev;
  }

  /** Check zone-triggered events when the player is in a district. */
  zoneCheck(ctx: EventContext, now: number): GameEvent | null {
    for (const ev of this.events) {
      if (ev.trigger.type === 'zone' && this.canFire(ev, ctx, now)) return ev;
    }
    return null;
  }

  /** Roll random events. `dt` in seconds. */
  randomTick(ctx: EventContext, now: number, dt: number): GameEvent | null {
    for (const ev of this.events) {
      if (ev.trigger.type !== 'random' || !this.canFire(ev, ctx, now)) continue;
      const perSec = (ev.trigger.chance ?? 0) / 60;
      if (this.rng() < perSec * dt) return ev;
    }
    return null;
  }

  choiceAvailable(choice: Choice, ctx: EventContext): boolean {
    return meets(choice.requires, ctx);
  }

  resolve(ev: GameEvent, choiceIndex: number, ctx: EventContext): Outcome | null {
    const choice = ev.choices[choiceIndex];
    if (!choice || !this.choiceAvailable(choice, ctx)) return null;
    return pickOutcome(choice.outcomes, this.rng);
  }
}
