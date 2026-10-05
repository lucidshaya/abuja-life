import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../core/Collision';
import { angleDiff, clamp, damp } from '../core/rng';
import { normalizeGeo, paint } from '../world/Materials';

export type CarModel = 'corolla' | 'benz' | 'suv';

interface ModelSpec {
  label: string;
  width: number;
  wheelR: number;
  wheelZ: [number, number];
  track: number;
  /** Side profile (z forward, y up): lower body up to the beltline. */
  body: [number, number][];
  /** Glass "greenhouse" above the beltline. */
  glass: [number, number][];
  roof: [number, number, number];
}

/** Low-poly but true-to-shape silhouettes of the cars you actually see on Abuja roads. */
export const CAR_MODELS: Record<CarModel, ModelSpec> = {
  corolla: {
    label: 'Toyota Corolla',
    width: 1.78,
    wheelR: 0.33,
    wheelZ: [1.38, -1.32],
    track: 0.78,
    body: [[2.3, 0.32], [2.32, 0.55], [2.22, 0.78], [1.2, 0.95], [0.85, 1.0], [-1.65, 1.03], [-2.2, 1.0], [-2.3, 0.82], [-2.32, 0.42], [-2.2, 0.3]],
    glass: [[0.86, 0.99], [0.12, 1.42], [-0.92, 1.4], [-1.62, 1.03]],
    roof: [0.1, -0.92, 1.41],
  },
  benz: {
    label: 'Mercedes-Benz',
    width: 1.86,
    wheelR: 0.35,
    wheelZ: [1.5, -1.42],
    track: 0.82,
    body: [[2.45, 0.34], [2.47, 0.6], [2.38, 0.8], [1.15, 0.94], [0.95, 0.99], [-1.8, 1.05], [-2.38, 1.02], [-2.45, 0.84], [-2.46, 0.42], [-2.32, 0.31]],
    glass: [[0.96, 0.98], [0.02, 1.44], [-1.12, 1.42], [-1.78, 1.05]],
    roof: [0.0, -1.12, 1.43],
  },
  suv: {
    label: 'Changan UNI',
    width: 1.95,
    wheelR: 0.4,
    wheelZ: [1.45, -1.42],
    track: 0.86,
    body: [[2.42, 0.42], [2.45, 0.75], [2.36, 1.0], [1.3, 1.12], [1.1, 1.16], [-1.95, 1.2], [-2.4, 1.15], [-2.45, 0.9], [-2.44, 0.5], [-2.3, 0.38]],
    glass: [[1.12, 1.15], [0.22, 1.66], [-1.15, 1.6], [-1.98, 1.2]],
    roof: [0.2, -1.2, 1.64],
  },
};

function extrudeProfile(points: [number, number][], width: number, bevel = 0.05): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  geo.rotateY(-Math.PI / 2);
  geo.translate((width - bevel * 2) / 2, 0, 0);
  return geo;
}

/** Car body (wheels optional). Body colour white by default so instance colours can tint it. */
export function carModelGeometry(model: CarModel, bodyColor = 0xffffff, withWheels = false, taxi = false): THREE.BufferGeometry {
  const m = CAR_MODELS[model];
  const g: THREE.BufferGeometry[] = [];
  const W = m.width;
  const glass = 0x1b2833;
  const chrome = 0xc9ccd1;
  const black = 0x161616;
  const front = m.body[1][0];
  const rear = m.body[m.body.length - 2][0];
  g.push(paint(extrudeProfile(m.body, W), bodyColor));
  g.push(paint(extrudeProfile(m.glass, W - 0.14, 0.04), glass));
  const [rz0, rz1, ry] = m.roof;
  g.push(paint(new THREE.BoxGeometry(W - 0.2, 0.05, rz0 - rz1 - 0.1).translate(0, ry + 0.01, (rz0 + rz1) / 2), bodyColor));
  // B-pillars in body colour.
  const bz = (rz0 + rz1) / 2 - 0.1;
  for (const s of [-1, 1]) g.push(paint(new THREE.BoxGeometry(0.03, ry - m.glass[0][1], 0.14).translate(s * (W / 2 - 0.07), (ry + m.glass[0][1]) / 2, bz), bodyColor));
  // Wheel arches (dark) and side skirts.
  for (const z of m.wheelZ) for (const s of [-1, 1]) g.push(paint(new THREE.CylinderGeometry(m.wheelR + 0.07, m.wheelR + 0.07, 0.06, 14).rotateZ(Math.PI / 2).translate(s * (W / 2 + 0.005), m.wheelR, z), black));
  // Front face: grille + headlights; rear: tail lights.
  if (model === 'benz') {
    g.push(paint(new THREE.BoxGeometry(0.9, 0.32, 0.06).translate(0, 0.6, front + 0.02), 0x2a2d31));
    for (let i = -3; i <= 3; i++) g.push(paint(new THREE.BoxGeometry(0.03, 0.3, 0.07).translate(i * 0.12, 0.6, front + 0.03), chrome));
    g.push(paint(new THREE.BoxGeometry(0.94, 0.04, 0.07).translate(0, 0.77, front + 0.02), chrome));
    g.push(paint(new THREE.BoxGeometry(W - 0.3, 0.03, 0.02).translate(0, 0.995, 0.2), chrome));
  } else if (model === 'suv') {
    g.push(paint(new THREE.BoxGeometry(1.25, 0.42, 0.06).translate(0, 0.72, front + 0.02), 0x0e0e10));
    g.push(paint(new THREE.BoxGeometry(W - 0.25, 0.04, 0.05).translate(0, 0.97, front - 0.04), 0xe8f4ff));
    g.push(paint(new THREE.BoxGeometry(W - 0.3, 0.05, 0.05).translate(0, 1.0, rear - 0.01), 0xd11b24));
  } else {
    g.push(paint(new THREE.BoxGeometry(0.85, 0.2, 0.06).translate(0, 0.56, front + 0.02), 0x1f2226));
    g.push(paint(new THREE.BoxGeometry(0.5, 0.04, 0.065).translate(0, 0.66, front + 0.025), chrome));
  }
  for (const s of [-1, 1]) {
    g.push(paint(new THREE.BoxGeometry(0.42, 0.13, 0.06).translate(s * (W / 2 - 0.32), model === 'suv' ? 0.88 : 0.74, front - 0.03), 0xfff6d8));
    g.push(paint(new THREE.BoxGeometry(0.42, 0.13, 0.06).translate(s * (W / 2 - 0.3), model === 'suv' ? 0.98 : 0.86, rear + 0.01), 0xc4141c));
    g.push(paint(new THREE.BoxGeometry(0.1, 0.09, 0.2).translate(s * (W / 2 + 0.05), m.glass[0][1] + 0.05, m.glass[0][0] - 0.25), bodyColor));
  }
  // Bumpers / plates.
  g.push(paint(new THREE.BoxGeometry(W - 0.1, 0.14, 0.1).translate(0, model === 'suv' ? 0.48 : 0.38, front - 0.02), black));
  g.push(paint(new THREE.BoxGeometry(W - 0.1, 0.14, 0.1).translate(0, model === 'suv' ? 0.52 : 0.42, rear + 0.02), black));
  g.push(paint(new THREE.BoxGeometry(0.52, 0.12, 0.02).translate(0, model === 'suv' ? 0.62 : 0.5, rear - 0.01), 0xf2f2f2));
  if (taxi) {
    // Abuja cab: green body with a white band and a roof sign.
    for (const s of [-1, 1]) g.push(paint(new THREE.BoxGeometry(0.02, 0.16, front - rear - 0.6).translate(s * (W / 2 + 0.02), 0.78, (front + rear) / 2), 0xffffff));
    g.push(paint(new THREE.BoxGeometry(0.7, 0.18, 0.28).translate(0, ry + 0.12, (rz0 + rz1) / 2), 0xffe14a));
  }
  if (withWheels) {
    for (const z of m.wheelZ) {
      for (const s of [-1, 1]) {
        g.push(paint(new THREE.CylinderGeometry(m.wheelR, m.wheelR, 0.24, 12).rotateZ(Math.PI / 2).translate(s * m.track, m.wheelR, z), black));
        g.push(paint(new THREE.CylinderGeometry(m.wheelR * 0.6, m.wheelR * 0.6, 0.25, 8).rotateZ(Math.PI / 2).translate(s * m.track, m.wheelR, z), chrome));
      }
    }
  }
  return mergeGeometries(g.map(normalizeGeo));
}

/** Back-compat helper used by older callers: a Corolla. */
export function carBodyGeometry(bodyColor = 0xffffff, withWheels = false, taxi = false): THREE.BufferGeometry {
  return carModelGeometry('corolla', bodyColor, withWheels, taxi);
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

  readonly model: CarModel;

  constructor(x: number, z: number, heading: number, color: number, model: CarModel = 'corolla') {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.color = color;
    this.model = model;
    const spec = CAR_MODELS[model];
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0x666666 });
    this.bodyMesh = new THREE.Mesh(carModelGeometry(model, color), mat);
    this.bodyMesh.castShadow = true;
    this.root.add(this.bodyMesh);
    const wheelGeo = new THREE.CylinderGeometry(spec.wheelR, spec.wheelR, 0.26, 14).rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
    const hubGeo = new THREE.CylinderGeometry(spec.wheelR * 0.62, spec.wheelR * 0.62, 0.28, 10).rotateZ(Math.PI / 2);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0xc9ccd1, shininess: 80 });
    for (const [wx, wz] of [[-spec.track, spec.wheelZ[0]], [spec.track, spec.wheelZ[0]], [-spec.track, spec.wheelZ[1]], [spec.track, spec.wheelZ[1]]]) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, spec.wheelR, wz);
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
    this.wheelSpin += (this.speed * dt) / CAR_MODELS[this.model].wheelR;
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
