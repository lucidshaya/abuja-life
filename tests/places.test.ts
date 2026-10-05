import { beforeAll, describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/Collision';
import { EVENTS } from '../src/events/eventsData';
import { PLACE_EVENTS } from '../src/events/eventsPlaces';
import { ROLES } from '../src/player/Roles';
import { DISTRICTS, NPC_SPOTS, ROADS, districtAt, rectsOverlap, type Rect } from '../src/world/MapData';
import { INTERIORS, PORTALS, TRAVEL, interiorAt } from '../src/world/locations/Locations';
import type { LocationBuild } from '../src/world/locations/kit';

/** Minimal canvas stub so signs/labels can be built in node. */
function fakeCtx(): unknown {
  const t: Record<string, unknown> = {};
  return new Proxy(t, {
    get(target, p) {
      if (typeof p !== 'string') return undefined;
      if (p in target) return target[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p.startsWith('create')) return () => ({ addColorStop() {} });
      if (p === 'getImageData') return (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      return () => {};
    },
    set(target, p, v) {
      target[p as string] = v;
      return true;
    },
  });
}
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fakeCtx() }) };

const NEW_TRAVEL = ['farmcity', 'banex', 'hilton', 'unity', 'nass', 'silverbird', 'wonderland', 'motorpark', 'stadium', 'airport'];
const NEW_INTERIORS = ['farmcity', 'hilton'];
const placeSpots = () => {
  const start = NPC_SPOTS.findIndex((s) => s.id === 'fc-waiter');
  return NPC_SPOTS.slice(start);
};

let world: CollisionWorld;
let abuja2: LocationBuild;
let cityBuildings: Rect[] = [];
let ABUJA2_QUICK: typeof import('../src/world/locations/Abuja2').ABUJA2_QUICK;

/** True when a player-sized circle at (x, z) overlaps a solid. */
const blocked = (x: number, z: number, r = 0.35) => world.resolveCircle({ x, z }, r, 0, false).hit;

beforeAll(async () => {
  world = new CollisionWorld();
  const mod = await import('../src/world/locations/Abuja2');
  ABUJA2_QUICK = mod.ABUJA2_QUICK;
  abuja2 = mod.buildAbuja2(world);
  // The rest of the world too, so nothing else blocks the new spots.
  const { buildCity } = await import('../src/world/CityBuilder');
  cityBuildings = buildCity(world).buildings;
  const { buildLandmarks } = await import('../src/world/Landmarks');
  buildLandmarks(world);
  const { buildCage, buildGuzape } = await import('../src/world/locations/Small');
  buildCage(world);
  buildGuzape(world);
  const { buildNile } = await import('../src/world/locations/Nile');
  buildNile(world);
  const { buildPark } = await import('../src/world/locations/Park');
  buildPark(world);
  const { buildMall } = await import('../src/world/locations/Mall');
  buildMall(world);
}, 60000);

describe('Abuja2 places: build', () => {
  it('builds geometry, glow materials and crowds for all ten places', () => {
    expect(abuja2.group.children.length).toBeGreaterThanOrEqual(12);
    expect(abuja2.glowMats.length).toBeGreaterThan(10);
    expect(abuja2.crowds.length).toBeGreaterThanOrEqual(12);
    expect(abuja2.animators.length).toBeGreaterThan(5);
    for (const a of abuja2.animators) a(12.3, 0.016);
  });

  it('procedural city buildings stay out of every place', () => {
    for (const z of ABUJA2_QUICK) for (const r of z.rects) for (const b of cityBuildings) expect(rectsOverlap(r, b), `${z.id} vs building ${JSON.stringify(b)}`).toBe(false);
  });

  it('wander rects and jog loops of the new crowds are free of obstacles', () => {
    const bad: string[] = [];
    for (const c of abuja2.crowds) {
      for (const a of c.agents) {
        if (a.kind === 'wander') {
          const { x0, z0, x1, z1 } = a.rect;
          for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
            const x = x0 + ((x1 - x0) * i) / 4;
            const z = z0 + ((z1 - z0) * j) / 4;
            if (blocked(x, z, 0.25)) bad.push(`${c.id} wander point ${x.toFixed(1)},${z.toFixed(1)}`);
          }
        } else if (a.kind === 'loop') {
          for (const [x, z] of a.path) if (blocked(x, z, 0.25)) bad.push(`${c.id} loop point ${x.toFixed(1)},${z.toFixed(1)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('Abuja2 places: travel, quick actions, portals', () => {
  it('adds ten fast-travel places with walkable spawns, at most four featured', () => {
    const spots = TRAVEL.filter((t) => NEW_TRAVEL.includes(t.id));
    expect(spots.map((s) => s.id).sort()).toEqual([...NEW_TRAVEL].sort());
    expect(spots.filter((s) => s.featured).length).toBeLessThanOrEqual(4);
    for (const t of spots) expect(blocked(t.x, t.z), `travel ${t.id} at ${t.x},${t.z}`).toBe(false);
    expect(interiorAt(TRAVEL.find((t) => t.id === 'hilton')!.x, TRAVEL.find((t) => t.id === 'hilton')!.z)?.id).toBe('hilton');
  });

  it('every quick-action item is walkable, inside its zone, and talk items are next to their NPC', () => {
    expect(ABUJA2_QUICK).toHaveLength(10);
    const bad: string[] = [];
    for (const zone of ABUJA2_QUICK) {
      expect(zone.items.length, zone.id).toBeGreaterThanOrEqual(4);
      expect(zone.items.length, zone.id).toBeLessThanOrEqual(8);
      for (const it of zone.items) {
        if (blocked(it.x, it.z)) bad.push(`${zone.id}: ${it.label} at ${it.x.toFixed(1)},${it.z.toFixed(1)}`);
        const inRect = zone.rects.some((r) => it.x >= r.x0 && it.x <= r.x1 && it.z >= r.z0 && it.z <= r.z1);
        const inInterior = (zone.interiors ?? []).includes(interiorAt(it.x, it.z)?.id ?? '');
        expect(inRect || inInterior, `${zone.id}: ${it.label} is inside the zone`).toBe(true);
        if (it.npc) {
          const s = NPC_SPOTS.find((p) => p.id === it.npc);
          expect(s, it.npc).toBeDefined();
          expect(Math.hypot(s!.x - it.x, s!.z - it.z), `${it.label} near ${it.npc}`).toBeLessThanOrEqual(2.5);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('new interiors do not overlap and their doors lead somewhere walkable', () => {
    for (const id of NEW_INTERIORS) expect(INTERIORS.find((i) => i.id === id), id).toBeDefined();
    for (let i = 0; i < INTERIORS.length; i++) for (let j = i + 1; j < INTERIORS.length; j++) expect(rectsOverlap(INTERIORS[i].rect, INTERIORS[j].rect)).toBe(false);
    for (const p of PORTALS.filter((q) => NEW_INTERIORS.some((id) => q.id.startsWith(id + '-')))) {
      expect(blocked(p.to.x, p.to.z), `${p.id} arrival`).toBe(false);
      if (p.id.endsWith('-in')) expect(interiorAt(p.to.x, p.to.z)?.id).toBe(p.id.replace('-in', ''));
      else expect(interiorAt(p.to.x, p.to.z)).toBeNull();
    }
  });

  it('role workplaces for the Senator and Taxi Driver are walkable', () => {
    for (const id of ['senator', 'driver']) {
      const r = ROLES.find((q) => q.id === id)!;
      expect(blocked(r.workplace.x, r.workplace.z), `${id} workplace`).toBe(false);
    }
    expect(blocked(470, 30)).toBe(false);
    expect(blocked(-300, 150)).toBe(false);
  });
});

describe('Abuja2 places: map data', () => {
  it('adds districts for the Three Arms Zone, stadium and airport', () => {
    expect(districtAt(470, 30)?.id).toBe('assembly');
    expect(districtAt(-505, 340)?.id).toBe('stadium');
    expect(districtAt(-750, 220)?.id).toBe('airport');
    expect(districtAt(89, 90)?.id).toBe('wuse');
    for (let i = 0; i < DISTRICTS.length; i++) for (let j = i + 1; j < DISTRICTS.length; j++) expect(rectsOverlap(DISTRICTS[i], DISTRICTS[j]), `${DISTRICTS[i].id}/${DISTRICTS[j].id}`).toBe(false);
  });

  it('new roads are clear of buildings', () => {
    const newRoads = ROADS.filter((r) => (r.z0 === 258 && r.z1 === 258) || (r.z0 === 85 && r.z1 === 85 && r.x0 === 375));
    expect(newRoads).toHaveLength(2);
    for (const r of newRoads) {
      for (let x = Math.min(r.x0, r.x1) + 10; x < Math.max(r.x0, r.x1) - 2; x += 3) {
        for (const o of [-r.width / 2 + 1.5, 0, r.width / 2 - 1.5]) expect(blocked(x, r.z0 + o, 0.5), `road at ${x},${r.z0 + o}`).toBe(false);
      }
    }
  });
});

describe('Abuja2 places: NPCs and events', () => {
  it('ships ~25+ place events, each started by its own NPC spot', () => {
    expect(PLACE_EVENTS.length).toBeGreaterThanOrEqual(25);
    for (const e of PLACE_EVENTS) {
      expect(EVENTS).toContain(e);
      expect(e.trigger.type).toBe('npc');
      const s = NPC_SPOTS.find((p) => p.id === e.trigger.npc);
      expect(s, `${e.id} -> ${e.trigger.npc}`).toBeDefined();
      expect(s!.eventId).toBe(e.id);
      expect(e.choices.length).toBeLessThanOrEqual(4);
      expect(e.choices.some((c) => !c.requires), `${e.id} has a free choice`).toBe(true);
      for (const c of e.choices) if (c.requires) expect(c.lockedHint, `${e.id}: ${c.text}`).toBeTruthy();
    }
    expect(PLACE_EVENTS.some((e) => e.choices.some((c) => c.requires?.role?.includes('senator')))).toBe(true);
  });

  it('every new NPC spot points at an existing event and stands in a free spot', () => {
    const spots = placeSpots();
    expect(spots.length).toBeGreaterThanOrEqual(30);
    for (const s of spots) {
      const ev = EVENTS.find((e) => e.id === s.eventId);
      expect(ev, `${s.id} -> ${s.eventId}`).toBeDefined();
      expect(ev!.trigger.npc).toBe(s.id);
      expect(blocked(s.x, s.z, 0.25), `npc ${s.id}`).toBe(false);
    }
    const ids = NPC_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('teleporting events land on walkable ground', () => {
    for (const e of PLACE_EVENTS) for (const c of e.choices) for (const o of c.outcomes) {
      const t = o.effects?.teleport;
      if (t) expect(blocked(t.x, t.z), `${e.id} teleport`).toBe(false);
    }
  });
});
