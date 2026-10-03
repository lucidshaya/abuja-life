import { describe, expect, it } from 'vitest';
import { CollisionWorld, pushOut } from '../src/core/Collision';
import { DEFAULT_BINDINGS, actionsForCode, combineMove, keyLabel, mergeBindings, rebind } from '../src/core/Input';
import { SAVE_KEY, loadSave, newSave, parseSave, writeSave, type KV } from '../src/core/Save';
import { defaultCharacter } from '../src/player/CharacterConfig';
import { DISTRICTS, ROADS, districtAt, onRoad } from '../src/world/MapData';

class MemKV implements KV {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe('Input mapping', () => {
  it('maps WASD and arrows to movement', () => {
    const b = mergeBindings({});
    expect(actionsForCode(b, 'KeyW')).toEqual(['forward']);
    expect(actionsForCode(b, 'ArrowLeft')).toEqual(['left']);
    expect(actionsForCode(b, 'Space')).toEqual(['jump']);
    expect(actionsForCode(b, 'KeyZ')).toEqual([]);
  });

  it('rebinding moves a key off its old action', () => {
    const b = rebind(mergeBindings({}), 'jump', 'KeyE');
    expect(b.jump[0]).toBe('KeyE');
    expect(b.interact).not.toContain('KeyE');
    expect(actionsForCode(b, 'KeyE')).toContain('jump');
  });

  it('falls back to defaults for missing custom bindings', () => {
    const b = mergeBindings({ jump: ['KeyJ'], forward: [] });
    expect(b.jump).toEqual(['KeyJ']);
    expect(b.forward).toEqual(DEFAULT_BINDINGS.forward);
  });

  it('normalizes diagonal keyboard movement and clamps analog input', () => {
    const d = combineMove({ f: true, b: false, l: false, r: true }, 0, 0);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    const a = combineMove({ f: false, b: false, l: false, r: false }, 0.5, 0.2);
    expect(a).toEqual({ x: 0.5, y: 0.2 });
    const c = combineMove({ f: true, b: false, l: false, r: false }, 0, 1);
    expect(c.y).toBe(1);
  });

  it('labels keys nicely', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('ShiftLeft')).toBe('Shift');
    expect(keyLabel('Digit1')).toBe('1');
  });
});

describe('Save', () => {
  it('round-trips through storage', () => {
    const kv = new MemKV();
    const s = newSave({ ...defaultCharacter(), name: 'Amina', outfit: 'agbada' });
    s.stats.money = 123456;
    s.flags = ['fabric'];
    s.pos = { x: 1, z: 2, heading: 3 };
    expect(writeSave(s, kv)).toBe(true);
    const back = loadSave(kv)!;
    expect(back.character.name).toBe('Amina');
    expect(back.character.outfit).toBe('agbada');
    expect(back.stats.money).toBe(123456);
    expect(back.flags).toEqual(['fabric']);
    expect(back.pos).toEqual({ x: 1, z: 2, heading: 3 });
  });

  it('survives corrupt or partial data', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 2 }))).toBeNull();
    const partial = parseSave(JSON.stringify({ version: 1, stats: { money: 'lots' }, settings: { sensitivity: 99, quality: 'ultra' } }))!;
    expect(partial.stats.money).toBe(25000);
    expect(partial.settings.sensitivity).toBe(3);
    expect(partial.settings.quality).toBe('auto');
    expect(partial.character.name).toBeTruthy();
  });

  it('returns null when storage throws', () => {
    const bad: KV = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(loadSave(bad)).toBeNull();
    expect(writeSave(newSave(), bad)).toBe(false);
    expect(SAVE_KEY).toContain('abuja');
  });
});

describe('Collision', () => {
  it('pushes a circle out of a box and slides', () => {
    const w = new CollisionWorld();
    w.addBox(0, 0, 10, 10, 5);
    const p = { x: -0.2, z: 5 };
    const r = w.resolveCircle(p, 0.5);
    expect(r.hit).toBe(true);
    expect(p.x).toBeCloseTo(-0.5);
    expect(p.z).toBeCloseTo(5);
  });

  it('ignores solids lower than the feet (jumping over kerbs)', () => {
    const w = new CollisionWorld();
    w.addBox(0, 0, 10, 10, 0.5);
    const p = { x: 0.1, z: 5 };
    expect(w.resolveCircle(p, 0.4, 1).hit).toBe(false);
  });

  it('handles circles, ellipses and dynamic obstacles', () => {
    expect(pushOut({ kind: 'circle', x: 0, z: 0, r: 1, h: 1 }, 1.2, 0, 0.5)!.x).toBeCloseTo(0.3);
    expect(pushOut({ kind: 'ellipse', x: 0, z: 0, rx: 10, rz: 5, h: 1 }, 0, 4, 0.5)!.z).toBeGreaterThan(0);
    const w = new CollisionWorld();
    w.dynamics = [{ x: 0, z: 0, r: 1 }];
    const p = { x: 1, z: 0 };
    w.resolveCircle(p, 0.5);
    expect(p.x).toBeCloseTo(1.5);
  });

  it('raycasts against boxes for the camera', () => {
    const w = new CollisionWorld();
    w.addBox(5, -1, 6, 1, 10);
    expect(w.raycast(0, 1, 0, 1, 0, 0, 20)).toBeCloseTo(5);
    expect(w.raycast(0, 1, 0, -1, 0, 0, 20)).toBe(20);
  });
});

describe('Map data', () => {
  it('knows which district a point is in', () => {
    expect(districtAt(0, 0)?.id).toBe('wuse');
    expect(districtAt(250, 0)?.id).toBe('central');
    expect(districtAt(-500, -250)?.id).toBe('kubwa');
    expect(districtAt(0, 250)?.id).toBe('garki');
  });

  it('has the expressway running from Zuma Rock into the city', () => {
    const ex = ROADS.find((r) => r.kind === 'expressway')!;
    expect(Math.min(ex.x0, ex.x1)).toBeLessThan(-800);
    expect(onRoad(-500, -250)).not.toBeNull();
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(10);
  });
});
