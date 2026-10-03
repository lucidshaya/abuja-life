import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../../core/Collision';
import { nightGlowMaterial, normalizeGeo, paint, signTexture } from '../Materials';
import type { CrowdSpec } from '../Crowd';

export interface LocationBuild {
  group: THREE.Group;
  animators: ((t: number, dt: number) => void)[];
  glowMats: THREE.MeshLambertMaterial[];
  crowds: CrowdSpec[];
}

export function newBuild(name: string): LocationBuild {
  const group = new THREE.Group();
  group.name = name;
  return { group, animators: [], glowMats: [], crowds: [] };
}

/**
 * Collects many small vertex-coloured primitives and merges them into one
 * mesh per material, registering colliders as it goes.
 */
export class Kit {
  private geos: THREE.BufferGeometry[] = [];
  private flatGeos: THREE.BufferGeometry[] = [];

  constructor(readonly world: CollisionWorld) {}

  private push(g: THREE.BufferGeometry, color: number, flat = false): void {
    (flat ? this.flatGeos : this.geos).push(normalizeGeo(paint(g, color)));
  }

  /** Axis-aligned box with its base at y. `solid` = collider height (true → box height). */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, solid: boolean | number = false): this {
    this.push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), color);
    if (solid !== false) this.world.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, solid === true ? y + h : solid);
    return this;
  }

  /** Box rotated around Y (no collider). */
  rbox(x: number, y: number, z: number, w: number, h: number, d: number, ry: number, color: number): this {
    this.push(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y + h / 2, z), color);
    return this;
  }

  cyl(x: number, y: number, z: number, rt: number, rb: number, h: number, color: number, seg = 12, solid: boolean | number = false): this {
    this.push(new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z), color);
    if (solid !== false) this.world.addCircle(x, z, Math.max(rt, rb), solid === true ? y + h : solid);
    return this;
  }

  cone(x: number, y: number, z: number, r: number, h: number, color: number, seg = 12, ry = 0): this {
    this.push(new THREE.ConeGeometry(r, h, seg).rotateY(ry).translate(x, y + h / 2, z), color, seg <= 6);
    return this;
  }

  sphere(x: number, y: number, z: number, r: number, color: number, sy = 1, seg = 10): this {
    this.push(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 4)).scale(1, sy, 1).translate(x, y, z), color);
    return this;
  }

  /** Flat floor/ground patch (slightly raised to avoid z-fighting). */
  floor(x0: number, z0: number, x1: number, z1: number, y: number, color: number): this {
    this.push(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), color);
    return this;
  }

  disc(x: number, z: number, r: number, y: number, color: number, sx = 1, sz = 1, seg = 32): this {
    this.push(new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2).scale(sx, 1, sz).translate(x, y, z), color);
    return this;
  }

  geo(g: THREE.BufferGeometry, color: number): this {
    this.push(g, color);
    return this;
  }

  /** Low wall run between two points (axis-aligned). */
  wall(x0: number, z0: number, x1: number, z1: number, h: number, color: number, thick = 0.3): this {
    const w = Math.max(thick, Math.abs(x1 - x0));
    const d = Math.max(thick, Math.abs(z1 - z0));
    return this.box((x0 + x1) / 2, 0, (z0 + z1) / 2, w, h, d, color, true);
  }

  /** Simple low-poly tree. */
  tree(x: number, z: number, s = 1, palm = false, solid = true): this {
    const h = (palm ? 7 : 3) * s;
    this.cyl(x, 0, z, 0.18 * s, 0.26 * s, h, 0x5a3e2b, 6);
    if (palm) {
      for (let k = 0; k < 7; k++) {
        this.push(new THREE.BoxGeometry(0.5 * s, 0.06, 2.6 * s).translate(0, 0, 1.3 * s).rotateX(0.45).rotateY((k / 7) * Math.PI * 2).translate(x, h, z), 0x3f7a2a);
      }
    } else {
      const c = [0x3f7f2f, 0x4a8c35, 0x356b28, 0x5c9a3a][Math.floor(Math.abs(x * 7 + z * 3)) % 4];
      this.push(new THREE.IcosahedronGeometry(2.2 * s, 0).scale(1, 0.85, 1).translate(x, h + 1.4 * s, z), c, true);
    }
    if (solid) this.world.addCircle(x, z, 0.4 * s, h);
    return this;
  }

  bench(x: number, z: number, ry = 0, color = 0x7a5534): this {
    const along = Math.abs(Math.sin(ry)) > 0.5;
    this.box(x, 0.4, z, along ? 0.5 : 2, 0.1, along ? 2 : 0.5, color);
    this.box(x + (along ? 0.22 : 0), 0.5, z + (along ? 0 : 0.22), along ? 0.08 : 2, 0.5, along ? 2 : 0.08, color);
    for (const s of [-0.8, 0.8]) this.box(x + (along ? 0 : s), 0, z + (along ? s : 0), 0.1, 0.4, 0.4, 0x333333);
    this.world.addBox(x - (along ? 0.3 : 1), z - (along ? 1 : 0.3), x + (along ? 0.3 : 1), z + (along ? 1 : 0.3), 0.9);
    return this;
  }

  /** Merge everything collected so far into the group and reset. */
  flush(group: THREE.Object3D, opts: { cast?: boolean; receive?: boolean } = {}): void {
    const make = (list: THREE.BufferGeometry[], flat: boolean) => {
      if (!list.length) return;
      const m = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat }));
      m.castShadow = opts.cast ?? true;
      m.receiveShadow = opts.receive ?? true;
      group.add(m);
      list.forEach((g) => g.dispose());
    };
    make(this.geos, false);
    make(this.flatGeos, true);
    this.geos = [];
    this.flatGeos = [];
  }
}

/** Text sign as a plane. */
export function sign(
  group: THREE.Object3D, text: string, x: number, y: number, z: number, ry: number, w: number, h: number,
  opts: Parameters<typeof signTexture>[1] = {},
): THREE.Mesh {
  const tex = signTexture(text, { w: 512, h: Math.max(64, Math.round((512 * h) / w)), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  group.add(m);
  return m;
}

/** Glowing (unlit) box, e.g. fridge lights, neon, LED panels. */
export function glow(group: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: number, intensity = 1): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }));
  m.position.set(x, y + h / 2, z);
  group.add(m);
  return m;
}

/** Night-lit material that the game dims by day. */
export function nightMat(color: number, day = 0x888888, strength = 1.4): THREE.MeshLambertMaterial {
  const m = nightGlowMaterial(color, day);
  m.userData.glowStrength = strength;
  return m;
}

/** Instanced boxes with per-instance colour (shelf products, chairs, flowers…). */
export class BoxField {
  private items: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number; c: number }[] = [];
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: number, ry = 0): void {
    this.items.push({ x, y, z, sx, sy, sz, ry, c });
  }
  build(group: THREE.Object3D, geo: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), cast = false): THREE.InstancedMesh | null {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), this.items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    this.items.forEach((it, i) => {
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q.setFromEuler(e.set(0, it.ry, 0)), new THREE.Vector3(it.sx, it.sy, it.sz));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.setHex(it.c));
    });
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    return mesh;
  }
}

/** Animated fountain jets: rising particles that fall back. */
export function fountain(group: THREE.Object3D, animators: ((t: number, dt: number) => void)[], x: number, z: number, y: number, radius: number, jets: number, height: number): void {
  const n = jets * 10;
  const geo = new THREE.SphereGeometry(0.12, 5, 3);
  const mat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.75, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  group.add(mesh);
  const m = new THREE.Matrix4();
  animators.push((t) => {
    for (let i = 0; i < n; i++) {
      const j = i % jets;
      const life = (t * 0.9 + i / n * 7.3) % 1;
      const ang = (j / jets) * Math.PI * 2;
      const r = jets === 1 ? 0 : radius;
      const spread = life * 0.8;
      const px = x + Math.cos(ang) * (r + spread * (jets === 1 ? Math.cos(i) : 1));
      const pz = z + Math.sin(ang) * (r + spread * (jets === 1 ? Math.sin(i) : 1));
      const py = y + 4 * height * life * (1 - life);
      const s = 1 + life;
      m.makeScale(s, s, s).setPosition(px, py, pz);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
}

export const waterMat = () => new THREE.MeshPhongMaterial({ color: 0x2f8fc0, shininess: 120, specular: 0xaad4ee, transparent: true, opacity: 0.9 });

export { THREE };
