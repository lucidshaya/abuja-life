import { beforeAll, describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/Collision';
import { ROLES } from '../src/player/Roles';
import { NPC_SPOTS, RESERVED, districtAt, rectsOverlap, type Rect } from '../src/world/MapData';
import type { LocationBuild } from '../src/world/locations/kit';

/** Minimal canvas stub so signs/labels can be built in node (same as places.test.ts). */
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

let world: CollisionWorld;
let workspaces: LocationBuild;
let cityBuildings: Rect[] = [];

/** How far a player-sized circle at (x, z) gets pushed out of solids (0 = free). */
const push = (x: number, z: number, r = 0.4) => {
  const p = { x, z };
  world.resolveCircle(p, r, 0, false);
  return Math.hypot(p.x - x, p.z - z);
};

/** Workplace plots added by Workspaces.ts (see the RESERVED entries in MapData). */
const PLOTS: Record<string, Rect> = {
  techbro: { x0: 12, z0: -60, x1: 60, z1: -10 },
  corper: { x0: -488, z0: -238, x1: -423, z1: -158 },
  minister: { x0: 324, z0: 6, x1: 366, z1: 64 },
};

beforeAll(async () => {
  world = new CollisionWorld();
  const { buildCity } = await import('../src/world/CityBuilder');
  cityBuildings = buildCity(world).buildings;
  const { buildLandmarks } = await import('../src/world/Landmarks');
  buildLandmarks(world);
  const { buildAbuja2 } = await import('../src/world/locations/Abuja2');
  buildAbuja2(world);
  const { buildCage, buildGuzape } = await import('../src/world/locations/Small');
  buildCage(world);
  buildGuzape(world);
  const { buildNile } = await import('../src/world/locations/Nile');
  buildNile(world);
  const { buildPark } = await import('../src/world/locations/Park');
  buildPark(world);
  const { buildMall } = await import('../src/world/locations/Mall');
  buildMall(world);
  const { buildEstate } = await import('../src/world/locations/Estate');
  buildEstate(world);
  const { buildWorkspaces } = await import('../src/world/locations/Workspaces');
  workspaces = buildWorkspaces(world);
}, 60000);

describe('Workspaces: build', () => {
  it('builds geometry, night glow, crowds and animators for every new workplace', () => {
    const names = workspaces.group.children.map((c) => c.name);
    for (const n of ['techhub', 'gss-kubwa', 'pos-stand', 'fabric-shop', 'tsangaya', 'fcta', 'ministry-door']) expect(names, n).toContain(n);
    expect(workspaces.glowMats.length).toBeGreaterThanOrEqual(6);
    expect(workspaces.crowds.map((c) => c.id).sort()).toEqual(['fabric-shop', 'fcta', 'gss-kubwa', 'ministry-door', 'pos-stand', 'techhub', 'tsangaya']);
    for (const a of workspaces.animators) a(7.7, 0.016);
  });

  it('wander rects and loops of the workplace crowds are free of obstacles', () => {
    const bad: string[] = [];
    for (const c of workspaces.crowds) {
      for (const a of c.agents) {
        if (a.kind === 'wander') {
          const { x0, z0, x1, z1 } = a.rect;
          for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
            const x = x0 + ((x1 - x0) * i) / 4;
            const z = z0 + ((z1 - z0) * j) / 4;
            if (push(x, z, 0.25) > 0.01) bad.push(`${c.id} wander ${x.toFixed(1)},${z.toFixed(1)}`);
          }
        } else if (a.kind === 'loop') {
          for (let i = 0; i < a.path.length; i++) {
            const [ax, az] = a.path[i];
            const [bx, bz] = a.path[(i + 1) % a.path.length];
            for (let t = 0; t <= 1; t += 0.1) {
              const x = ax + (bx - ax) * t;
              const z = az + (bz - az) * t;
              if (push(x, z, 0.25) > 0.01) bad.push(`${c.id} loop ${x.toFixed(1)},${z.toFixed(1)}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('Workspaces: role workplaces', () => {
  it('every role workplace is a walkable outdoor point', () => {
    // Sanity: the buildings themselves are solid.
    expect(push(36, -41)).toBeGreaterThan(0.1); // tech hub
    expect(push(-463, -207)).toBeGreaterThan(0.1); // classroom block
    expect(push(345, 46)).toBeGreaterThan(0.1); // FCTA
    for (const r of ROLES) expect(push(r.workplace.x, r.workplace.z), `${r.id} workplace at ${r.workplace.x},${r.workplace.z}`).toBeLessThan(0.1);
  });

  it('no workplace lies inside a procedural city building', () => {
    for (const r of ROLES) {
      const { x, z } = r.workplace;
      const inside = cityBuildings.find((b) => x > b.x0 - 0.5 && x < b.x1 + 0.5 && z > b.z0 - 0.5 && z < b.z1 + 0.5);
      expect(inside, `${r.id} inside building ${JSON.stringify(inside)}`).toBeUndefined();
    }
  });

  it('procedural buildings stay out of the new plots and the plots are reserved', () => {
    for (const [id, plot] of Object.entries(PLOTS)) {
      expect(RESERVED.some((q) => q.x0 === plot.x0 && q.z0 === plot.z0 && q.x1 === plot.x1 && q.z1 === plot.z1), `${id} reserved`).toBe(true);
      for (const b of cityBuildings) expect(rectsOverlap(plot, b), `${id} vs building ${JSON.stringify(b)}`).toBe(false);
      const w = ROLES.find((r) => r.id === id)!.workplace;
      expect(w.x > plot.x0 && w.x < plot.x1 && w.z > plot.z0 && w.z < plot.z1, `${id} workplace inside its plot`).toBe(true);
    }
    // The new plots don't overlap any other reserved place.
    for (const plot of Object.values(PLOTS)) {
      const others = RESERVED.filter((q) => !(q.x0 === plot.x0 && q.z0 === plot.z0 && q.x1 === plot.x1 && q.z1 === plot.z1));
      for (const q of others) expect(rectsOverlap(plot, q), `${JSON.stringify(plot)} vs ${JSON.stringify(q)}`).toBe(false);
    }
  });

  it('workplaces sit in the right districts and near the right landmarks', () => {
    const at = (id: string) => ROLES.find((r) => r.id === id)!.workplace;
    expect(districtAt(at('techbro').x, at('techbro').z)?.id).toBe('wuse');
    expect(districtAt(at('corper').x, at('corper').z)?.id).toBe('kubwa');
    expect(districtAt(at('minister').x, at('minister').z)?.id).toBe('central');
    expect(districtAt(at('pos').x, at('pos').z)?.id).toBe('garki');
    for (const id of ['trader', 'almajiri']) expect(districtAt(at(id).x, at(id).z)?.id, id).toBe('utako');
    // The POS stand is a few metres from POS Babe.
    const babe = NPC_SPOTS.find((s) => s.id === 'pos')!;
    expect(Math.hypot(at('pos').x - babe.x, at('pos').z - babe.z)).toBeLessThan(15);
    // The minister no longer shares the civil servant's ministry door.
    expect(Math.hypot(at('minister').x - at('civil').x, at('minister').z - at('civil').z)).toBeGreaterThan(30);
  });
});
