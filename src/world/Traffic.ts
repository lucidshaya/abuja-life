import * as THREE from 'three';
import type { Dynamic } from '../core/Collision';
import { mulberry32, pick } from '../core/rng';
import { carModelGeometry, type CarModel } from '../player/Vehicle';
import { ROADS, type RoadSeg } from './MapData';

interface Lane {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  len: number;
  dx: number;
  dz: number;
  heading: number;
  speed: number;
  jam: boolean;
}

interface Car {
  lane: Lane;
  /** Section of the lane this car loops in (jam cars stay in Kubwa). */
  tMin: number;
  tMax: number;
  t: number;
  speed: number;
  target: number;
  taxi: boolean;
  /** Which instanced mesh: 0 Corolla, 1 Benz, 2 Changan UNI, 3 taxi. */
  kind: number;
}

function pickKind(rng: () => number, taxi: boolean): number {
  if (taxi) return 3;
  const r = rng();
  return r < 0.42 ? 0 : r < 0.68 ? 1 : 2;
}

const COLORS = [0xe9e9e9, 0x111111, 0x8a8f96, 0x1f3f7a, 0x7a1f1f, 0xc9c2b0, 0x2e5e3a, 0xd9d9d9, 0x3b3b3b];

/** Nigeria drives on the right. */
function lanesFor(r: RoadSeg): Lane[] {
  const out: Lane[] = [];
  const offsets = r.kind === 'expressway' ? [2, 5.5, 9] : r.kind === 'major' ? [2.2, 5.8] : [];
  for (const dir of [1, -1]) {
    const ax = dir === 1 ? r.x0 : r.x1;
    const az = dir === 1 ? r.z0 : r.z1;
    const bx = dir === 1 ? r.x1 : r.x0;
    const bz = dir === 1 ? r.z1 : r.z0;
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    const heading = Math.atan2(dx, dz);
    // Right-hand vector of the travel direction.
    const rx = -Math.cos(heading);
    const rz = Math.sin(heading);
    for (const o of offsets) {
      // Kubwa expressway eastbound: the legendary hold-up.
      const jam = r.kind === 'expressway' && dir === 1 && o < 9;
      out.push({
        x0: ax + rx * o, z0: az + rz * o, x1: bx + rx * o, z1: bz + rz * o, len, dx, dz, heading,
        speed: r.kind === 'expressway' ? (o > 8 ? 26 : 20) : o > 4 ? 16 : 12,
        jam,
      });
    }
  }
  return out;
}

export class Traffic {
  /** One instanced mesh per car model (+ taxis). */
  readonly meshes: THREE.InstancedMesh[] = [];
  private cars: Car[] = [];
  private jamCars: Car[] = [];
  private lanes: Lane[];
  readonly dynamics: Dynamic[] = [];
  private active = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);
  private hidden = new THREE.Vector3(0, 0, 0);

  constructor(max: number, jamCars = 22) {
    const rng = mulberry32(99);
    const capacity = max + jamCars;
    this.lanes = ROADS.flatMap(lanesFor);
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: 0x555555 });
    const models: [CarModel, boolean][] = [['corolla', false], ['benz', false], ['suv', false], ['corolla', true]];
    for (const [model, taxi] of models) {
      const m = new THREE.InstancedMesh(carModelGeometry(model, taxi ? 0x1f9a4f : 0xffffff, true, taxi), mat, capacity);
      m.castShadow = true;
      m.frustumCulled = false;
      this.meshes.push(m);
    }
    const weights = this.lanes.map((l) => l.len * (l.jam ? 3 : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < max; i++) {
      let r = rng() * total;
      let lane = this.lanes[0];
      for (let k = 0; k < this.lanes.length; k++) {
        r -= weights[k];
        if (r < 0) {
          lane = this.lanes[k];
          break;
        }
      }
      const taxi = rng() < 0.25;
      this.cars.push({ lane, tMin: 0, tMax: lane.len, t: rng() * lane.len, speed: lane.speed, target: lane.speed * (0.8 + rng() * 0.3), taxi, kind: pickKind(rng, taxi) });
    }
    // The Kubwa hold-up: dedicated cars crawling bumper to bumper (always on — it's one draw call).
    const jamLanes = this.lanes.filter((l) => l.jam);
    this.jamCars = [];
    for (let i = 0; i < jamCars && jamLanes.length; i++) {
      const lane = jamLanes[i % jamLanes.length];
      const tMin = 300; // x ≈ -620
      const tMax = 535; // x ≈ -385
      const n = Math.ceil(jamCars / jamLanes.length);
      const slot = Math.floor(i / jamLanes.length);
      const taxi = rng() < 0.35;
      this.jamCars.push({ lane, tMin, tMax, t: tMin + ((slot + rng() * 0.3) / n) * (tMax - tMin), speed: 2, target: 2.4, taxi, kind: pickKind(rng, taxi) });
    }
    for (const m of this.meshes.slice(0, 3)) {
      for (let i = 0; i < capacity; i++) m.setColorAt(i, new THREE.Color(pick(rng, COLORS)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.setActive(max);
  }

  setActive(n: number): void {
    this.active = Math.min(n, this.cars.length);
  }

  /** Free-flowing cars slow right down when they reach the Kubwa jam section. */
  private jamFactor(c: Car, x: number): number {
    return c.lane.jam && x > -625 && x < -380 ? 0.12 : 1;
  }

  update(dt: number, obstacles: { x: number; z: number }[]): void {
    this.dynamics.length = 0;
    // Per-lane ordering for car-following.
    const byLane = new Map<Lane, Car[]>();
    const all = this.cars.slice(0, this.active).concat(this.jamCars);
    for (const c of all) {
      let list = byLane.get(c.lane);
      if (!list) byLane.set(c.lane, (list = []));
      list.push(c);
    }
    for (const list of byLane.values()) list.sort((a, b) => a.t - b.t);
    const counts = [0, 0, 0, 0];
    for (const c of all) {
      const L = c.lane;
      const x = L.x0 + L.dx * c.t;
      const z = L.z0 + L.dz * c.t;
      let want = c.target * this.jamFactor(c, x);
      // Follow the car ahead.
      const list = byLane.get(L)!;
      const idx = list.indexOf(c);
      const ahead = list[idx + 1];
      if (ahead) {
        const gap = ahead.t - c.t;
        if (gap < 9) want = Math.min(want, Math.max(0, (gap - 5) * 1.5));
      }
      // Stop for the player / pedestrians in front.
      for (const o of obstacles) {
        const ox = o.x - x;
        const oz = o.z - z;
        const along = ox * L.dx + oz * L.dz;
        const side = Math.abs(ox * L.dz - oz * L.dx);
        if (along > 0 && along < 14 && side < 2.2) want = Math.min(want, Math.max(0, (along - 5) * 1.2));
      }
      c.speed += (want - c.speed) * Math.min(1, dt * (want < c.speed ? 4 : 1.2));
      c.t += c.speed * dt;
      if (c.t > c.tMax) c.t -= c.tMax - c.tMin;
      const nx = L.x0 + L.dx * c.t;
      const nz = L.z0 + L.dz * c.t;
      // Hide near section ends so wrapping isn't visible.
      const nearEnd = c.t < c.tMin + 6 || c.t > c.tMax - 6;
      this.q.setFromEuler(this.e.set(0, L.heading, 0));
      this.v.set(nx, 0, nz);
      this.m.compose(this.v, this.q, nearEnd ? this.hidden : this.s);
      this.meshes[c.kind].setMatrixAt(counts[c.kind]++, this.m);
      if (!nearEnd) {
        this.dynamics.push({ x: nx + L.dx * 1.2, z: nz + L.dz * 1.2, r: 1.05 }, { x: nx - L.dx * 1.2, z: nz - L.dz * 1.2, r: 1.05 });
      }
    }
    this.meshes.forEach((m, i) => {
      m.count = counts[i];
      m.instanceMatrix.needsUpdate = true;
    });
  }
}
