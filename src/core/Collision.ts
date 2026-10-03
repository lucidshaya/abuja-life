/**
 * 2.5D collision: the world is flat, so solids are axis-aligned boxes and
 * circles/ellipses in the XZ plane with a height. A spatial hash keeps
 * queries cheap even with thousands of buildings, trees and poles.
 */

export interface Box {
  kind: 'box';
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  h: number;
}

export interface Circle {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
  h: number;
}

export interface Ellipse {
  kind: 'ellipse';
  x: number;
  z: number;
  rx: number;
  rz: number;
  h: number;
}

export type Collider = Box | Circle | Ellipse;

export interface Dynamic {
  x: number;
  z: number;
  r: number;
}

const CELL = 24;

export class CollisionWorld {
  private grid = new Map<number, number[]>();
  readonly colliders: Collider[] = [];
  /** Moving obstacles (traffic). Rebuilt by their owner each frame. */
  dynamics: Dynamic[] = [];
  bounds = { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 };
  private stamp = 0;
  private stamps: number[] = [];

  private key(cx: number, cz: number): number {
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  add(c: Collider): void {
    const idx = this.colliders.length;
    this.colliders.push(c);
    this.stamps.push(0);
    const [x0, z0, x1, z1] = extent(c);
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
      for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        const k = this.key(cx, cz);
        let list = this.grid.get(k);
        if (!list) this.grid.set(k, (list = []));
        list.push(idx);
      }
    }
  }

  addBox(x0: number, z0: number, x1: number, z1: number, h = 10): void {
    this.add({ kind: 'box', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h });
  }

  addCircle(x: number, z: number, r: number, h = 10): void {
    this.add({ kind: 'circle', x, z, r, h });
  }

  /** Visit each collider overlapping the given XZ rectangle once. */
  query(x0: number, z0: number, x1: number, z1: number, out: Collider[] = []): Collider[] {
    out.length = 0;
    this.stamp++;
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
      for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        const list = this.grid.get(this.key(cx, cz));
        if (!list) continue;
        for (const i of list) {
          if (this.stamps[i] === this.stamp) continue;
          this.stamps[i] = this.stamp;
          out.push(this.colliders[i]);
        }
      }
    }
    return out;
  }

  private tmp: Collider[] = [];

  /**
   * Push a circle at (p.x, p.z) out of every solid it overlaps. Solids lower
   * than `footY` (e.g. kerbs when jumping) are ignored.
   * Returns the summed push normal (zero length if no hit).
   */
  resolveCircle(p: { x: number; z: number }, r: number, footY = 0, withDynamics = true): { x: number; z: number; hit: boolean } {
    let nx = 0;
    let nz = 0;
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      const list = this.query(p.x - r, p.z - r, p.x + r, p.z + r, this.tmp);
      let moved = false;
      for (const c of list) {
        if (c.h <= footY) continue;
        const push = pushOut(c, p.x, p.z, r);
        if (push) {
          p.x += push.x;
          p.z += push.z;
          nx += push.x;
          nz += push.z;
          hit = moved = true;
        }
      }
      if (withDynamics) {
        for (const d of this.dynamics) {
          const dx = p.x - d.x;
          const dz = p.z - d.z;
          const rr = r + d.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-8) {
            const dist = Math.sqrt(d2);
            const k = (rr - dist) / dist;
            p.x += dx * k;
            p.z += dz * k;
            nx += dx * k;
            nz += dz * k;
            hit = moved = true;
          }
        }
      }
      if (!moved) break;
    }
    const b = this.bounds;
    if (p.x < b.x0 + r) { p.x = b.x0 + r; nx += 1; hit = true; }
    if (p.x > b.x1 - r) { p.x = b.x1 - r; nx -= 1; hit = true; }
    if (p.z < b.z0 + r) { p.z = b.z0 + r; nz += 1; hit = true; }
    if (p.z > b.z1 - r) { p.z = b.z1 - r; nz -= 1; hit = true; }
    return { x: nx, z: nz, hit };
  }

  /**
   * Ray vs solids, used to stop the camera clipping into buildings.
   * Returns the hit distance along the ray (<= maxDist).
   */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number {
    const ex = ox + dx * maxDist;
    const ez = oz + dz * maxDist;
    const list = this.query(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), this.tmp);
    let best = maxDist;
    for (const c of list) {
      let t: number | null = null;
      if (c.kind === 'box') t = rayBox(ox, oy, oz, dx, dy, dz, c.x0, 0, c.z0, c.x1, c.h, c.z1);
      else {
        const r = c.kind === 'circle' ? c.r : Math.min(c.rx, c.rz);
        t = rayBox(ox, oy, oz, dx, dy, dz, c.x - r * 0.75, 0, c.z - r * 0.75, c.x + r * 0.75, c.h, c.z + r * 0.75);
      }
      if (t !== null && t < best) best = t;
    }
    return best;
  }
}

function extent(c: Collider): [number, number, number, number] {
  if (c.kind === 'box') return [c.x0, c.z0, c.x1, c.z1];
  if (c.kind === 'circle') return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
  return [c.x - c.rx, c.z - c.rz, c.x + c.rx, c.z + c.rz];
}

export function pushOut(c: Collider, x: number, z: number, r: number): { x: number; z: number } | null {
  if (c.kind === 'box') {
    const cx = Math.max(c.x0, Math.min(x, c.x1));
    const cz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return null;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      const k = (r - d) / d;
      return { x: dx * k, z: dz * k };
    }
    // Centre is inside the box: push out along the shallowest axis.
    const left = x - c.x0 + r;
    const right = c.x1 - x + r;
    const top = z - c.z0 + r;
    const bottom = c.z1 - z + r;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: -left, z: 0 };
    if (m === right) return { x: right, z: 0 };
    if (m === top) return { x: 0, z: -top };
    return { x: 0, z: bottom };
  }
  if (c.kind === 'circle') {
    const dx = x - c.x;
    const dz = z - c.z;
    const rr = r + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return null;
    const d = Math.sqrt(d2) || 1e-5;
    const k = (rr - d) / d;
    return { x: (dx || 1e-5) * k, z: dz * k };
  }
  // Ellipse: scale into unit-circle space, push radially.
  const ex = (x - c.x) / (c.rx + r);
  const ez = (z - c.z) / (c.rz + r);
  const d2 = ex * ex + ez * ez;
  if (d2 >= 1) return null;
  const d = Math.sqrt(d2) || 1e-5;
  const tx = c.x + (ex / d) * (c.rx + r);
  const tz = c.z + (ez / d) * (c.rz + r);
  return { x: tx - x, z: tz - z };
}

function rayBox(
  ox: number, oy: number, oz: number, dx: number, dy: number, dz: number,
  x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  const axes: [number, number, number, number][] = [
    [ox, dx, x0, x1],
    [oy, dy, y0, y1],
    [oz, dz, z0, z1],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : null;
}
