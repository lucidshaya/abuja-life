import { describe, expect, it } from 'vitest';
import { EventSystem, applyEffects, hourInRange, linesFor, meets, pickOutcome, type EventContext, type GameEvent } from '../src/events/EventSystem';
import { EVENTS } from '../src/events/eventsData';
import { NPC_SPOTS } from '../src/world/MapData';

const ctx = (over: Partial<EventContext> = {}): EventContext => ({
  district: 'wuse', hour: 20, inCar: false, outfit: 'kaftan', background: 'abuja',
  stats: { money: 50000, clout: 0 }, flags: new Set(), ...over,
});

describe('event data', () => {
  it('has unique ids and playable choices', () => {
    const ids = new Set<string>();
    for (const e of EVENTS) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(e.lines.length).toBeGreaterThan(0);
      expect(e.choices.length).toBeGreaterThan(0);
      expect(e.choices.length).toBeLessThanOrEqual(4);
      for (const c of e.choices) {
        expect(c.outcomes.length, `${e.id}: ${c.text}`).toBeGreaterThan(0);
        if (c.requires) expect(c.lockedHint, `${e.id}: ${c.text} needs a lockedHint`).toBeTruthy();
      }
      // Every event must have at least one choice with no requirements so nobody gets stuck.
      expect(e.choices.some((c) => !c.requires), `${e.id} has an always-available choice`).toBe(true);
    }
    expect(EVENTS.length).toBeGreaterThanOrEqual(15);
  });

  it('every NPC on the map points at a real NPC event', () => {
    for (const s of NPC_SPOTS) {
      const ev = EVENTS.find((e) => e.id === s.eventId);
      expect(ev, s.id).toBeDefined();
      expect(ev!.trigger.type).toBe('npc');
    }
  });
});

describe('EventSystem', () => {
  it('handles hour ranges that wrap past midnight', () => {
    expect(hourInRange(23, [16, 4])).toBe(true);
    expect(hourInRange(2, [16, 4])).toBe(true);
    expect(hourInRange(10, [16, 4])).toBe(false);
    expect(hourInRange(10, [8, 16])).toBe(true);
    expect(hourInRange(16, [8, 16])).toBe(false);
  });

  it('respects time windows and cooldowns', () => {
    const sys = new EventSystem(EVENTS, () => 0);
    expect(sys.forNpc('suya', ctx({ hour: 20 }), 0)).not.toBeNull();
    expect(sys.forNpc('suya', ctx({ hour: 10 }), 0)).toBeNull();
    sys.markFired('suya', 100);
    expect(sys.forNpc('suya', ctx(), 120)).toBeNull();
    expect(sys.cooldownLeft('suya', 120)).toBeGreaterThan(0);
    expect(sys.forNpc('suya', ctx(), 100 + 91)).not.toBeNull();
  });

  it('locks choices by money, clout, outfit, background and flags', () => {
    const owambe = EVENTS.find((e) => e.id === 'owambe')!;
    const spray = owambe.choices[0];
    const asoebi = owambe.choices[1];
    const fabric = owambe.choices[2];
    expect(meets(spray.requires, ctx({ stats: { money: 5000, clout: 0 } }))).toBe(false);
    expect(meets(spray.requires, ctx({ stats: { money: 15000, clout: 0 } }))).toBe(true);
    expect(meets(asoebi.requires, ctx({ outfit: 'jersey' }))).toBe(false);
    expect(meets(asoebi.requires, ctx({ outfit: 'agbada' }))).toBe(true);
    expect(meets(fabric.requires, ctx())).toBe(false);
    expect(meets(fabric.requires, ctx({ flags: new Set(['fabric']) }))).toBe(true);
    const market = EVENTS.find((e) => e.id === 'market')!;
    expect(meets(market.choices[1].requires, ctx({ background: 'east' }))).toBe(true);
    expect(meets(market.choices[1].requires, ctx({ background: 'lagos' }))).toBe(false);
  });

  it('refuses to resolve a locked choice', () => {
    const sys = new EventSystem(EVENTS, () => 0);
    const vio = sys.get('vio')!;
    expect(sys.resolve(vio, 1, ctx({ stats: { money: 0, clout: 0 } }))).toBeNull(); // needs 30 clout
    expect(sys.resolve(vio, 3, ctx())).not.toBeNull();
  });

  it('picks weighted outcomes deterministically', () => {
    const outs = [{ weight: 3, text: 'a' }, { weight: 1, text: 'b' }];
    expect(pickOutcome(outs, () => 0.1).text).toBe('a');
    expect(pickOutcome(outs, () => 0.74).text).toBe('a');
    expect(pickOutcome(outs, () => 0.76).text).toBe('b');
  });

  it('applies effects and clamps money at zero', () => {
    expect(applyEffects({ money: 1000, clout: 5 }, { money: -5000, clout: 3 })).toEqual({ money: 0, clout: 8 });
    expect(applyEffects({ money: 1000, clout: 99 }, { clout: 10 }).clout).toBe(100);
  });

  it('fires zone events only in the right place, time and vehicle state', () => {
    const sys = new EventSystem(EVENTS, () => 0);
    expect(sys.zoneCheck(ctx({ district: 'kubwa', hour: 7, inCar: true }), 0)?.id).toBe('kubwa-jam');
    expect(sys.zoneCheck(ctx({ district: 'kubwa', hour: 7, inCar: false }), 0)).toBeNull();
    expect(sys.zoneCheck(ctx({ district: 'kubwa', hour: 13, inCar: true }), 0)).toBeNull();
    expect(sys.zoneCheck(ctx({ district: 'wuse', hour: 7, inCar: true }), 0)).toBeNull();
  });

  it('rolls random events with probability scaled by dt', () => {
    const always = new EventSystem(EVENTS, () => 0);
    const never = new EventSystem(EVENTS, () => 0.999999);
    expect(always.randomTick(ctx({ hour: 22 }), 0, 1)).not.toBeNull();
    expect(never.randomTick(ctx({ hour: 22 }), 0, 1)).toBeNull();
  });

  it('uses background-specific lines when present', () => {
    const welcome = EVENTS.find((e) => e.id === 'welcome') as GameEvent;
    expect(linesFor(welcome, 'lagos')[0]).toContain('Lagos');
    expect(linesFor(welcome, 'north')[0]).toContain('Sannu');
  });
});
