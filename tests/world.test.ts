import { describe, expect, it } from 'vitest';
import { CELL, SEND_IDLE, WorldNet, cellKey, cellsAround, parseState, sanitizeLook, type LocalState } from '../src/online/WorldNet';
import { ESTATE, PLOTS, PLOTS_PER_BLOCK, plotFor, useHousePlot } from '../src/player/Home';
import { defaultCharacter } from '../src/player/CharacterConfig';
import { formatVisits, type WorldTransport } from '../src/online/types';

function fakeTransport() {
  const joined = new Map<string, (e: string, p: Record<string, unknown>) => void>();
  const sent: { topic: string; event: string; payload: Record<string, unknown> }[] = [];
  const posted: typeof sent = [];
  const t: WorldTransport = {
    join: (topic, on, ready) => {
      joined.set(topic, on);
      ready?.();
    },
    leave: (topic) => void joined.delete(topic),
    send: (topic, event, payload) => sent.push({ topic, event, payload }),
    post: (topic, event, payload) => posted.push({ topic, event, payload }),
  };
  return { t, joined, sent, posted };
}

const me = (over: Partial<LocalState> = {}): LocalState => ({
  x: 10, y: 0, z: 10, heading: 0, speed: 0, pose: 'normal', car: '', inst: '', role: 'student', look: defaultCharacter(), ...over,
});

describe('world cells', () => {
  it('listens to your square and the 8 around it', () => {
    const cells = cellsAround(10, 10);
    expect(cells).toHaveLength(9);
    expect(cells).toContain(cellKey(0, 0));
    expect(cells).toContain(cellKey(-1, -1));
    expect(cellsAround(-1, -1)).toContain(cellKey(-1, -1));
    expect(cellsAround(CELL + 1, 0)).toContain(cellKey(2, 0));
  });
});

describe('state messages', () => {
  it('rejects junk and clamps numbers', () => {
    expect(parseState({})).toBeNull();
    expect(parseState({ i: 'a', x: 'nope', z: 1 })).toBeNull();
    expect(parseState({ i: 'a', x: 1e9, z: 1 })).toBeNull();
    const s = parseState({ i: 'a', x: 1, z: 2, y: 999, s: -5, p: 'hacker', c: 'tank:5', n: 'estate:0' })!;
    expect(s.y).toBe(0);
    expect(s.speed).toBe(0);
    expect(s.pose).toBe('normal');
    expect(s.car).toBeNull();
    expect(s.inst).toBe('estate:0');
    expect(parseState({ i: 'a', x: 1, z: 2, c: 'benz:255', p: 'zanku' })).toMatchObject({ car: { model: 'benz', color: 255 }, pose: 'zanku' });
  });

  it('only accepts looks the character creator can make', () => {
    const look = sanitizeLook({ outfit: 'agbada', skin: 999, primary: 2, hair: '<script>', shades: 'yes', name: 'Real Name' })!;
    expect(look.outfit).toBe('agbada');
    expect(look.skin).toBe(defaultCharacter().skin);
    expect(look.hair).toBe(defaultCharacter().hair);
    expect(look.shades).toBe(false);
    expect(look.name).toBe('Player');
    expect(sanitizeLook('x')).toBeNull();
  });
});

describe('WorldNet', () => {
  it('joins your inbox and nearby squares, then sends your state with your look (no real name)', () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    expect(f.joined.has('p:me')).toBe(true);
    net.update(0.016, me());
    expect([...f.joined.keys()].filter((k) => k.startsWith('cell:'))).toHaveLength(9);
    const states = f.sent.filter((m) => m.event === 's');
    expect(states).toHaveLength(1);
    expect(states[0].topic).toBe(cellKey(0, 0));
    expect(states[0].payload.l).toBeTruthy();
    expect((states[0].payload.l as Record<string, unknown>).name).toBeUndefined();
  });

  it('sends ~3/s while moving and only a heartbeat when standing still', () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    net.update(0.016, me());
    const count = () => f.sent.filter((m) => m.event === 's').length;
    for (let i = 0; i < 60; i++) net.update(0.05, me()); // 3 s still
    expect(count()).toBe(1);
    net.update(SEND_IDLE, me());
    expect(count()).toBe(2);
    let x = 10;
    for (let i = 0; i < 20; i++) net.update(0.05, me({ x: (x += 0.3), speed: 6 })); // 1 s walking
    expect(count()).toBeGreaterThanOrEqual(4);
    expect(count()).toBeLessThanOrEqual(6);
  });

  it("answers a newcomer's hi with a full state, and says bye when leaving the world", () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    net.update(0.016, me());
    net.update(1, me());
    f.joined.get(cellKey(0, 0))!('hi', { i: 'other' });
    for (let i = 0; i < 20; i++) net.update(0.05, me());
    const last = f.sent.filter((m) => m.event === 's').pop()!;
    expect(last.payload.l).toBeTruthy();
    net.update(0.016, null);
    expect(f.sent.pop()!.event).toBe('bye');
    expect([...f.joined.keys()]).toEqual(['p:me']);
  });

  it('passes on other players, ignores itself, and rate-limits waves', () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    const got: string[] = [];
    const pokes: string[] = [];
    net.onState = (s) => got.push(s.id);
    net.onPoke = (from, kind) => pokes.push(from + kind);
    net.update(0.016, me());
    const cell = f.joined.get(cellKey(0, 0))!;
    cell('s', { i: 'me', x: 1, z: 1 });
    cell('s', { i: 'amaka', x: 1, z: 1 });
    expect(got).toEqual(['amaka']);
    f.joined.get('p:me')!('poke', { i: 'amaka', k: 'wave' });
    f.joined.get('p:me')!('poke', { i: 'amaka', k: 'slap' });
    expect(pokes).toEqual(['amakawave']);
    expect(net.poke('amaka', 'wave')).toBe(true);
    expect(net.poke('amaka', 'wave')).toBe(false);
    expect(f.posted).toEqual([{ topic: 'p:amaka', event: 'poke', payload: { i: 'me', k: 'wave' } }]);
  });
});

describe('moving between squares', () => {
  it('tells the old square you left, with where you went', () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    net.update(0.016, me({ x: 10, z: 10 }));
    net.update(0.5, me({ x: 1476, z: 255 })); // walked into a house far away
    const bye = f.sent.find((m) => m.event === 'bye')!;
    expect(bye).toEqual({ topic: cellKey(0, 0), event: 'bye', payload: { i: 'me', to: cellKey(7, 1) } });
    expect(f.joined.has(cellKey(0, 0))).toBe(false);
    expect(f.joined.has(cellKey(7, 1))).toBe(true);
  });

  it('drops a player who left for a square we cannot hear, keeps one we can', () => {
    const f = fakeTransport();
    const net = new WorldNet(f.t, 'me');
    const left: string[] = [];
    net.onLeave = (id) => left.push(id);
    net.update(0.016, me({ x: 10, z: 10 }));
    const cell = f.joined.get(cellKey(0, 0))!;
    cell('bye', { i: 'amaka', to: cellKey(1, 0) }); // next door: we still listen there
    cell('bye', { i: 'tunde', to: cellKey(7, 1) }); // far away
    cell('bye', { i: 'bola' }); // left the game
    expect(left).toEqual(['tunde', 'bola']);
  });
});

describe('estate houses', () => {
  it('plot 0 is the original house, and every plot has its own door', () => {
    expect(PLOTS).toHaveLength(PLOTS_PER_BLOCK);
    expect(PLOTS[0]).toMatchObject({ x: -216, z: -287, door: { x: -207.6, z: -287 }, meter: { x: -207.6, z: -290.5 }, spawn: { x: -204.5, z: -287 }, car: { x: -204, z: -294.6 } });
    const doors = new Set(PLOTS.map((p) => `${p.door.x},${p.door.z}`));
    expect(doors.size).toBe(PLOTS_PER_BLOCK);
    for (const p of PLOTS) expect(Math.abs(p.door.x - -188)).toBeLessThan(25);
  });

  it('players fill houses in sign-up order, six per copy of the estate', () => {
    expect(plotFor(0)).toEqual({ block: 0, plot: 0 });
    expect(plotFor(5)).toEqual({ block: 0, plot: 5 });
    expect(plotFor(6)).toEqual({ block: 1, plot: 0 });
    expect(plotFor(13)).toEqual({ block: 2, plot: 1 });
  });

  it('switching house moves where you wake up', () => {
    useHousePlot(4);
    expect(ESTATE.spawn).toEqual(PLOTS[4].spawn);
    expect(ESTATE.house).toEqual({ x: PLOTS[4].x, z: PLOTS[4].z });
    useHousePlot(0);
    expect(ESTATE.spawn).toEqual({ x: -204.5, z: -287, heading: -Math.PI / 2 });
  });
});

describe('visit counter', () => {
  it('shows exact numbers up to 9,999, then short ones', () => {
    expect(formatVisits(0)).toBe('0');
    expect(formatVisits(1234)).toBe('1,234');
    expect(formatVisits(12345)).toBe('12.3K');
    expect(formatVisits(2_500_000)).toBe('2.5M');
  });
});
