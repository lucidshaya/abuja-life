import type { CollisionWorld } from '../core/Collision';
import { angleDiff, damp } from '../core/rng';
import type { Character } from './Character';

export const WALK_SPEED = 3.2;
export const RUN_SPEED = 9.5;

export class PlayerController {
  x: number;
  z: number;
  y = 0;
  vy = 0;
  heading: number;
  vx = 0;
  vz = 0;
  grounded = true;
  readonly radius = 0.35;

  constructor(x: number, z: number, heading: number, readonly char: Character) {
    this.x = x;
    this.z = z;
    this.heading = heading;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  teleport(x: number, z: number, heading?: number): void {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.vx = this.vz = 0;
    if (heading !== undefined) this.heading = heading;
    this.sync();
  }

  /**
   * move: input vector (x right, y forward) relative to the camera yaw.
   */
  update(dt: number, move: { x: number; y: number }, camYaw: number, sprint: boolean, jump: boolean, world: CollisionWorld, analog = false): boolean {
    const mag = Math.min(1, Math.hypot(move.x, move.y));
    // Camera-relative: forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw).
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    const rx = -Math.cos(camYaw);
    const rz = Math.sin(camYaw);
    let dx = fx * move.y + rx * move.x;
    let dz = fz * move.y + rz * move.x;
    const dl = Math.hypot(dx, dz);
    if (dl > 1e-4) {
      dx /= dl;
      dz /= dl;
    }
    // Full-tilt stick also counts as running on touch / gamepad.
    const run = sprint || (analog && mag > 0.95);
    const target = mag * (run ? RUN_SPEED : WALK_SPEED);
    const accel = this.grounded ? 14 : 3;
    const k = damp(accel, dt);
    this.vx += (dx * target - this.vx) * k;
    this.vz += (dz * target - this.vz) * k;
    if (mag > 0.05) {
      const want = Math.atan2(dx, dz);
      this.heading += angleDiff(this.heading, want) * damp(12, dt);
    }
    let jumped = false;
    if (jump && this.grounded) {
      this.vy = 5.4;
      this.grounded = false;
      jumped = true;
    }
    this.vy -= 17 * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      this.y = 0;
      this.vy = 0;
      this.grounded = true;
    }
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    const p = { x: this.x, z: this.z };
    const hit = world.resolveCircle(p, this.radius, this.y);
    if (hit.hit) {
      this.x = p.x;
      this.z = p.z;
      // Remove velocity into the wall so we slide along it.
      const nl = Math.hypot(hit.x, hit.z);
      if (nl > 1e-6) {
        const nx = hit.x / nl;
        const nz = hit.z / nl;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) {
          this.vx -= vn * nx;
          this.vz -= vn * nz;
        }
      }
    }
    this.sync();
    this.char.update(dt, this.speed, !this.grounded);
    return jumped;
  }

  sync(): void {
    this.char.root.position.set(this.x, this.y, this.z);
    this.char.root.rotation.y = this.heading;
  }
}
