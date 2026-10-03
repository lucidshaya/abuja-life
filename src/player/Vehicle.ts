import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../core/Collision';
import { angleDiff, clamp, damp } from '../core/rng';
import { normalizeGeo, paint } from '../world/Materials';

/** Car body (no wheels unless requested), white body so instance colours tint it. */
export function carBodyGeometry(bodyColor = 0xffffff, withWheels = false, taxi = false): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  const glass = 0x1d2a36;
  g.push(paint(new THREE.BoxGeometry(1.9, 0.62, 4.3).translate(0, 0.62, 0), bodyColor));
  g.push(paint(new THREE.BoxGeometry(1.7, 0.56, 2.2).translate(0, 1.2, -0.25), bodyColor));
  // Windows (slightly larger than cabin so they show)
  g.push(paint(new THREE.BoxGeometry(1.72, 0.42, 2.0).translate(0, 1.22, -0.25), glass));
  g.push(paint(new THREE.BoxGeometry(1.5, 0.4, 0.06).translate(0, 1.2, 0.87), glass));
  g.push(paint(new THREE.BoxGeometry(1.5, 0.38, 0.06).translate(0, 1.2, -1.36), glass));
  // Bumpers, lights, grille
  g.push(paint(new THREE.BoxGeometry(1.94, 0.22, 0.2).translate(0, 0.42, 2.17), 0x222222));
  g.push(paint(new THREE.BoxGeometry(1.94, 0.22, 0.2).translate(0, 0.42, -2.17), 0x222222));
  for (const s of [-1, 1]) {
    g.push(paint(new THREE.BoxGeometry(0.42, 0.16, 0.06).translate(s * 0.66, 0.75, 2.16), 0xfff6d8));
    g.push(paint(new THREE.BoxGeometry(0.4, 0.14, 0.06).translate(s * 0.68, 0.75, -2.16), 0xc4141c));
    g.push(paint(new THREE.BoxGeometry(0.06, 0.08, 0.2).translate(s * 0.98, 1.0, 0.8), 0x222222)); // mirrors
  }
  if (taxi) {
    // Abuja cab: green & white with a roof sign.
    g.push(paint(new THREE.BoxGeometry(1.92, 0.2, 4.32).translate(0, 0.78, 0), 0xffffff));
    g.push(paint(new THREE.BoxGeometry(0.7, 0.18, 0.3).translate(0, 1.57, -0.2), 0xffe14a));
  }
  if (withWheels) {
    for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
      g.push(paint(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10).rotateZ(Math.PI / 2).translate(x, 0.36, z), 0x151515));
    }
  }
  return mergeGeometries(g.map(normalizeGeo));
}

export interface DriveInput {
  throttle: number;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
}

export class Vehicle {
  readonly root = new THREE.Group();
  private bodyMesh: THREE.Mesh;
  private wheels: THREE.Mesh[] = [];
  private frontPivots: THREE.Group[] = [];
  private lights: THREE.Mesh;
  x: number;
  z: number;
  heading: number;
  speed = 0;
  vx = 0;
  vz = 0;
  steer = 0;
  occupied = false;
  /** Impact strength this frame (for camera shake / sfx). */
  impact = 0;
  private wheelSpin = 0;
  private roll = 0;
  private pitch = 0;
  readonly color: number;

  constructor(x: number, z: number, heading: number, color: number) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.color = color;
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x444444 });
    this.bodyMesh = new THREE.Mesh(carBodyGeometry(color), mat);
    this.bodyMesh.castShadow = true;
    this.root.add(this.bodyMesh);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12).rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8).rotateZ(Math.PI / 2);
    const hubMat = new THREE.MeshLambertMaterial({ color: 0xbfbfbf });
    for (const [wx, wz] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, 0.36, wz);
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.add(new THREE.Mesh(hubGeo, hubMat));
      w.castShadow = true;
      pivot.add(w);
      this.root.add(pivot);
      this.wheels.push(w);
      if (wz > 0) this.frontPivots.push(pivot);
    }
    // Headlight beams (visible at night).
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.ConeGeometry(2.2, 12, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 0.7, 8.3);
    this.lights = new THREE.Mesh(beam, beamMat);
    this.root.add(this.lights);
    this.sync();
  }

  get forward(): { x: number; z: number } {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  setNight(n: number): void {
    (this.lights.material as THREE.MeshBasicMaterial).opacity = this.occupied ? n * 0.12 : 0;
  }

  update(dt: number, inp: DriveInput, world: CollisionWorld): void {
    const f = this.forward;
    const maxF = inp.nitro ? 42 : 30;
    const maxR = -9;
    this.impact = 0;
    // Longitudinal
    if (inp.throttle > 0.05) {
      if (this.speed < -0.5) this.speed += 24 * inp.throttle * dt;
      else this.speed += (inp.nitro ? 15 : 9.5) * inp.throttle * dt * (1 - Math.max(0, this.speed) / (maxF + 4));
    } else if (inp.throttle < -0.05) {
      if (this.speed > 0.5) this.speed += 24 * inp.throttle * dt;
      else this.speed += 6 * inp.throttle * dt;
    } else {
      this.speed -= this.speed * 0.35 * dt + Math.sign(this.speed) * Math.min(Math.abs(this.speed), 1.4 * dt);
    }
    if (inp.handbrake) this.speed -= this.speed * 1.2 * dt;
    this.speed = clamp(this.speed, maxR, maxF);

    // Steering: less lock at speed.
    const lock = 0.62 * (1 - Math.min(Math.abs(this.speed) / 50, 0.55));
    this.steer += (inp.steer * lock - this.steer) * damp(10, dt);
    const yawRate = (this.speed / 2.7) * Math.tan(this.steer) * (inp.handbrake ? 1.5 : 1);
    this.heading -= yawRate * dt;

    // Velocity lags heading → drift when grip is low.
    const grip = inp.handbrake ? 1.6 : 9;
    const nf = this.forward;
    const k = damp(grip, dt);
    this.vx += (nf.x * this.speed - this.vx) * k;
    this.vz += (nf.z * this.speed - this.vz) * k;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Collisions: two circles along the body.
    const before = Math.hypot(this.vx, this.vz);
    let hit = false;
    for (const off of [1.3, -1.3]) {
      const p = { x: this.x + nf.x * off, z: this.z + nf.z * off };
      const r = world.resolveCircle(p, 1.05, 0.25);
      if (r.hit) {
        hit = true;
        this.x += r.x;
        this.z += r.z;
        const nl = Math.hypot(r.x, r.z) || 1;
        const nx = r.x / nl;
        const nz = r.z / nl;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) {
          this.vx -= vn * nx * 1.3;
          this.vz -= vn * nz * 1.3;
        }
      }
    }
    if (hit) {
      const along = this.vx * nf.x + this.vz * nf.z;
      this.speed = along * 0.7;
      this.impact = Math.max(0, before - Math.hypot(this.vx, this.vz));
    }
    void f;

    // Cosmetics
    this.wheelSpin += (this.speed * dt) / 0.36;
    for (const w of this.wheels) w.rotation.x = this.wheelSpin;
    for (const p of this.frontPivots) p.rotation.y = this.steer;
    const lat = this.vx * Math.cos(this.heading) - this.vz * Math.sin(this.heading);
    this.roll += (clamp(-yawRate * this.speed * 0.004 + lat * 0.01, -0.08, 0.08) - this.roll) * damp(6, dt);
    this.pitch += (clamp(-inp.throttle * 0.03 * Math.sign(this.speed + 0.01), -0.04, 0.04) - this.pitch) * damp(5, dt);
    this.sync();
  }

  /** Slip angle in radians — for tyre screech sfx. */
  get slip(): number {
    const sp = Math.hypot(this.vx, this.vz);
    if (sp < 4) return 0;
    return Math.abs(angleDiff(Math.atan2(this.vx, this.vz), this.heading));
  }

  sync(): void {
    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.set(0, this.heading, 0);
    this.bodyMesh.rotation.set(this.pitch, 0, this.roll);
  }

  /** Position for the driver to step out (left side). */
  exitPoint(): { x: number; z: number } {
    const r = { x: Math.cos(this.heading), z: -Math.sin(this.heading) };
    return { x: this.x + r.x * 1.8, z: this.z + r.z * 1.8 };
  }
}
