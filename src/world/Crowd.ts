import * as THREE from 'three';
import type { Dynamic } from '../core/Collision';
import { mulberry32 } from '../core/rng';
import { Character } from '../player/Character';
import { randomCharacter, type CharacterConfig } from '../player/CharacterConfig';
import type { Rect } from './MapData';

type Pose = Character['pose'];

export type AgentSpec =
  /** Stroll between random points inside a rect (keep rects free of obstacles). */
  | { kind: 'wander'; rect: Rect; count: number; speed?: number; carry?: 'trolley' | 'bag' | 'balloon'; scale?: number; cfg?: Partial<CharacterConfig> }
  /** Walk / jog around a closed loop. */
  | { kind: 'loop'; path: [number, number][]; count: number; speed?: number; scale?: number; cfg?: Partial<CharacterConfig> }
  /** Stand / sit / dance in place. */
  | { kind: 'static'; x: number; z: number; facing: number; pose: Pose; scale?: number; cfg?: Partial<CharacterConfig> };

export interface CrowdSpec {
  id: string;
  /** The crowd only simulates while the player is within `radius` of (cx, cz). */
  cx: number;
  cz: number;
  radius: number;
  agents: AgentSpec[];
}

interface Agent {
  char: Character;
  spec: AgentSpec;
  x: number;
  z: number;
  tx: number;
  tz: number;
  speed: number;
  pause: number;
  t: number;
}

interface Group {
  spec: CrowdSpec;
  root: THREE.Group;
  agents: Agent[];
  active: boolean;
}

function trolley(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0xb8bcc2 });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.8), new THREE.MeshLambertMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.85 }));
  basket.position.set(0, 0.75, 0.75);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), new THREE.MeshLambertMaterial({ color: 0xc0262d }));
  handle.position.set(0, 1.0, 0.33);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), metal);
  legs.position.set(0, 0.3, 1.1);
  const goods = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0xe8a317 }));
  goods.position.set(0, 0.95, 0.78);
  g.add(basket, handle, legs, goods);
  return g;
}

function balloon(): THREE.Group {
  const g = new THREE.Group();
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  string.position.set(0.3, 1.9, 0.1);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshLambertMaterial({ color: [0xc0262d, 0xe8a317, 0x2a64c9, 0x0f8a4b][Math.floor(Math.random() * 4)] }));
  b.scale.y = 1.2;
  b.position.set(0.3, 2.6, 0.1);
  g.add(string, b);
  return g;
}

function bag(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.12), new THREE.MeshLambertMaterial({ color: [0xffffff, 0xc0262d, 0x2a64c9][Math.floor(Math.random() * 3)] }));
  b.position.set(0.3, 0.75, 0);
  g.add(b);
  return g;
}

/** Ambient people for the built-out locations. */
export class Crowds {
  readonly root = new THREE.Group();
  readonly dynamics: Dynamic[] = [];
  private groups: Group[] = [];
  private rng = mulberry32(777);

  constructor(specs: CrowdSpec[], density: number) {
    this.root.name = 'crowds';
    for (const spec of specs) {
      const root = new THREE.Group();
      root.visible = false;
      const g: Group = { spec, root, agents: [], active: false };
      for (const a of spec.agents) {
        const n = a.kind === 'static' ? 1 : Math.max(1, Math.round(a.count * density));
        for (let i = 0; i < n; i++) g.agents.push(this.makeAgent(a, i, n, root));
      }
      this.groups.push(g);
      this.root.add(root);
    }
  }

  private makeAgent(spec: AgentSpec, i: number, n: number, parent: THREE.Group): Agent {
    const cfg = { ...randomCharacter(this.rng), ...(spec.cfg ?? {}) };
    const char = new Character(cfg, false);
    if (spec.scale) char.root.scale.multiplyScalar(spec.scale);
    parent.add(char.root);
    const ag: Agent = { char, spec, x: 0, z: 0, tx: 0, tz: 0, speed: (spec.kind !== 'static' ? spec.speed : 0) ?? 1.2 + this.rng() * 0.5, pause: this.rng() * 3, t: 0 };
    if (spec.kind === 'wander') {
      ag.speed = (spec.speed ?? 1.1) + this.rng() * 0.5;
      ag.x = spec.rect.x0 + this.rng() * (spec.rect.x1 - spec.rect.x0);
      ag.z = spec.rect.z0 + this.rng() * (spec.rect.z1 - spec.rect.z0);
      this.retarget(ag);
      if (spec.carry === 'trolley') char.root.add(trolley());
      if (spec.carry === 'balloon') char.root.add(balloon());
      if (spec.carry === 'bag') char.root.add(bag());
    } else if (spec.kind === 'loop') {
      ag.speed = (spec.speed ?? 1.3) * (0.85 + this.rng() * 0.3);
      ag.t = (i / n) * this.loopLength(spec.path) + this.rng() * 4;
    } else {
      ag.x = spec.x;
      ag.z = spec.z;
      char.pose = spec.pose;
      char.root.position.set(spec.x, 0, spec.z);
      char.root.rotation.y = spec.facing;
    }
    return ag;
  }

  private retarget(a: Agent): void {
    if (a.spec.kind !== 'wander') return;
    const r = a.spec.rect;
    a.tx = r.x0 + this.rng() * (r.x1 - r.x0);
    a.tz = r.z0 + this.rng() * (r.z1 - r.z0);
  }

  private loopLength(path: [number, number][]): number {
    let L = 0;
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[(i + 1) % path.length];
      L += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return L;
  }

  private pointOnLoop(path: [number, number][], t: number): { x: number; z: number; h: number } {
    const L = this.loopLength(path);
    let d = ((t % L) + L) % L;
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[(i + 1) % path.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= seg) {
        const k = d / seg;
        return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, h: Math.atan2(b[0] - a[0], b[1] - a[1]) };
      }
      d -= seg;
    }
    return { x: path[0][0], z: path[0][1], h: 0 };
  }

  update(dt: number, px: number, pz: number): void {
    this.dynamics.length = 0;
    for (const g of this.groups) {
      const d = Math.hypot(g.spec.cx - px, g.spec.cz - pz);
      const active = d < g.spec.radius;
      if (active !== g.active) {
        g.active = active;
        g.root.visible = active;
      }
      if (!active) continue;
      for (const a of g.agents) {
        const s = a.spec;
        let speed = 0;
        if (s.kind === 'wander') {
          if (a.pause > 0) a.pause -= dt;
          else {
            const dx = a.tx - a.x;
            const dz = a.tz - a.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 0.3) {
              a.pause = 1 + this.rng() * 5;
              this.retarget(a);
            } else {
              const step = Math.min(dist, a.speed * dt);
              a.x += (dx / dist) * step;
              a.z += (dz / dist) * step;
              speed = a.speed;
              const want = Math.atan2(dx, dz);
              const r = a.char.root.rotation;
              r.y += Math.atan2(Math.sin(want - r.y), Math.cos(want - r.y)) * Math.min(1, dt * 8);
            }
          }
          a.char.root.position.set(a.x, 0, a.z);
        } else if (s.kind === 'loop') {
          a.t += a.speed * dt;
          const p = this.pointOnLoop(s.path, a.t);
          a.x = p.x;
          a.z = p.z;
          speed = a.speed;
          a.char.root.position.set(p.x, 0, p.z);
          a.char.root.rotation.y = p.h;
        }
        a.char.update(dt, speed);
        if (s.kind !== 'static' || s.pose !== 'sit') this.dynamics.push({ x: a.x, z: a.z, r: 0.3 });
      }
    }
  }
}
