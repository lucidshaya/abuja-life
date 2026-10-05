import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import { CLOTH_COLORS, type CharacterConfig } from '../../player/CharacterConfig';
import { carModelGeometry, type CarModel } from '../../player/Vehicle';
import { prismGeo } from '../CityBuilder';
import type { AgentSpec } from '../Crowd';
import { BoxField, Kit, THREE, glow, newBuild, nightMat, sign, type LocationBuild } from './kit';

/*
 * A proper workplace for every role that didn't have one (see Roles.ts `workplace`):
 *   Wuse Tech Hub (Tech Bro)            Wuse 2        plot x 12..60,     z -60..-10   door (36, -30)
 *   Govt Secondary School Kubwa (NYSC)  Kubwa         plot x -488..-423, z -238..-158 gate (-456, -232)
 *   Your POS stand (POS Agent)          Garki         x -35..-25, z 133..139 (pavement, beside POS Babe)
 *   Your fabric shop (Market Trader)    Wuse Market   x -226..-217, z 141..150 (north strip)
 *   Tsangaya (Almajiri)                 Wuse Market   x -242..-232, z 207..222 (west strip)
 *   FCTA Secretariat (FCT Minister)     Central Area  plot x 324..366,   z 6..64      door (345, 36)
 */

const HALF = Math.PI / 2;
const ci = (hex: number) => Math.max(0, CLOTH_COLORS.indexOf(hex));

type Build = LocationBuild;

function sub(b: Build, name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  b.group.add(g);
  return g;
}

/** Geometry that glows at night (windows, screens, bulbs), merged into one mesh. */
class Lights {
  private geos: THREE.BufferGeometry[] = [];
  box(x: number, y: number, z: number, w: number, h: number, d: number, ry = 0): this {
    this.geos.push(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y + h / 2, z));
    return this;
  }
  geo(g: THREE.BufferGeometry): this {
    this.geos.push(g);
    return this;
  }
  flush(b: Build, parent: THREE.Object3D, color: number, day = 0x8a8a8a, strength = 1.6): void {
    if (!this.geos.length) return;
    const mat = nightMat(color, day, strength);
    b.glowMats.push(mat);
    parent.add(new THREE.Mesh(mergeGeometries(this.geos), mat));
    this.geos.forEach((g) => g.dispose());
    this.geos = [];
  }
}

/** Box with a local transform: tilt about X, then turn about Y, then move. */
function tbox(w: number, h: number, d: number, x: number, y: number, z: number, ry: number, rx = 0, rz = 0): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).rotateZ(rz).rotateX(rx).rotateY(ry).translate(x, y, z);
}

/** Two-sided sign (front faces +z when ry = 0). */
function sign2(g: THREE.Object3D, text: string, x: number, y: number, z: number, ry: number, w: number, h: number, opts: Parameters<typeof sign>[8] = {}): void {
  sign(g, text, x, y, z, ry, w, h, opts);
  sign(g, text, x - Math.sin(ry) * 0.03, y, z - Math.cos(ry) * 0.03, ry + Math.PI, w, h, opts);
}

/** Nigerian (or any three-band) flag on a pole. */
function flagPole(k: Kit, x: number, z: number, h = 8, cols: [number, number, number] = [0x0f8a4b, 0xffffff, 0x0f8a4b]): void {
  k.cyl(x, 0, z, 0.06, 0.08, h, 0xdddddd, 6, h);
  k.sphere(x, h + 0.1, z, 0.12, 0xd4a62a, 1, 6);
  for (let j = 0; j < 3; j++) k.box(x + 0.35 + j * 0.55, h - 1.45, z, 0.55, 1.15, 0.04, cols[j]);
}

function umbrella(k: Kit, x: number, z: number, y: number, r: number, a: number, b: number, solid = true): void {
  k.cyl(x, 0, z, 0.04, 0.04, y, 0x555555, 6, solid ? y : false);
  for (let i = 0; i < 8; i++) k.geo(new THREE.ConeGeometry(r, r * 0.32, 8, 1, false, (i * Math.PI) / 4, Math.PI / 4).translate(x, y + r * 0.16, z), i % 2 ? a : b);
}

/** Plastic chair; the back is on the side opposite to where the sitter faces (ry = facing). */
function plasticChair(k: Kit, x: number, z: number, ry: number, color: number): void {
  k.geo(tbox(0.46, 0.05, 0.44, x, 0.44, z, ry), color);
  const bx = x - Math.sin(ry) * 0.21;
  const bz = z - Math.cos(ry) * 0.21;
  k.geo(tbox(0.46, 0.45, 0.04, bx, 0.7, bz, ry, -0.12), color);
  for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]] as const) {
    const c = Math.cos(ry), s = Math.sin(ry);
    k.box(x + dx * c + dz * s, 0, z - dx * s + dz * c, 0.04, 0.43, 0.04, color);
  }
  k.world.addBox(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 0.9);
}

/** Bicycle lying along z. */
function bicycle(k: Kit, x: number, z: number, color: number): void {
  for (const dz of [-0.5, 0.5]) k.geo(new THREE.TorusGeometry(0.32, 0.035, 5, 14).rotateY(HALF).translate(x, 0.34, z + dz), 0x1a1a1a);
  k.geo(tbox(0.05, 0.05, 1.0, x, 0.62, z, 0), color);
  k.geo(tbox(0.05, 0.05, 0.62, x, 0.48, z - 0.18, 0, 0.75), color);
  k.geo(tbox(0.05, 0.38, 0.05, x, 0.74, z - 0.45, 0), color);
  k.box(x, 0.92, z - 0.45, 0.5, 0.04, 0.04, 0x1a1a1a);
  k.box(x, 0.8, z + 0.25, 0.14, 0.05, 0.26, 0x1a1a1a);
}

function scooter(k: Kit, x: number, z: number, color: number): void {
  k.box(x, 0.1, z, 0.18, 0.06, 0.9, color);
  for (const dz of [-0.42, 0.42]) k.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10).rotateZ(HALF).translate(x, 0.1, z + dz), 0x111111);
  k.geo(tbox(0.05, 1.0, 0.05, x, 0.6, z - 0.48, 0, -0.12), 0x333333);
  k.box(x, 1.08, z - 0.53, 0.5, 0.04, 0.04, 0x111111);
}

interface Parked { x: number; z: number; heading: number; color: number; model?: CarModel }

/** Parked cars, one instanced mesh per model, with colliders. */
function parkedCars(g: THREE.Object3D, world: CollisionWorld, cars: Parked[]): void {
  const groups = new Map<CarModel, Parked[]>();
  for (const c of cars) {
    const m = c.model ?? 'suv';
    let list = groups.get(m);
    if (!list) groups.set(m, (list = []));
    list.push(c);
    const along = Math.abs(Math.sin(c.heading)) > 0.5;
    world.addBox(c.x - (along ? 2.3 : 1), c.z - (along ? 1 : 2.3), c.x + (along ? 2.3 : 1), c.z + (along ? 1 : 2.3), 1.5);
  }
  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0x666666 });
  for (const [model, list] of groups) {
    const mesh = new THREE.InstancedMesh(carModelGeometry(model, 0xffffff, true), mat, list.length);
    list.forEach((c, i) => {
      mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.heading, 0)), new THREE.Vector3(1, 1, 1)));
      mesh.setColorAt(i, new THREE.Color(c.color));
    });
    mesh.castShadow = true;
    mesh.computeBoundingSphere();
    g.add(mesh);
  }
}

/** Ankara-style wax print as a small canvas texture. */
function ankaraTexture(bg: string, fg: string, accent: string, kind: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = i * 16 + 8 + (j % 2) * 8;
      const cy = j * 16 + 8;
      g.fillStyle = fg;
      g.beginPath();
      if (kind === 0) g.arc(cx, cy, 6, 0, Math.PI * 2);
      else {
        g.moveTo(cx, cy - 7);
        g.lineTo(cx + 7, cy);
        g.lineTo(cx, cy + 7);
        g.lineTo(cx - 7, cy);
      }
      g.fill();
      g.fillStyle = accent;
      g.beginPath();
      g.arc(cx, cy, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  return t;
}

// =====================================================================
// 1. WUSE TECH HUB — glass co-working space, Wuse 2 (Tech Bro)
// =====================================================================
function techHub(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'techhub');
  const k = new Kit(world);
  const lit = new Lights();
  const screens = new Lights();
  const neon = new Lights();
  const rng = mulberry32(501);
  const X0 = 18, X1 = 54, Z0 = -52, Z1 = -30, CX = 36, CZ = -41;
  const DARK = 0x2b2f33;
  const ORANGE = 0xf26b1d;

  // Grounds: pavers, lawn edges, path to the road.
  k.floor(12, -60, 60, -10, 0.035, 0xd9d5cc);
  k.floor(12, -60, 16, -12, 0.045, 0x5f9a3e);
  k.floor(56, -60, 60, -12, 0.045, 0x5f9a3e);
  k.floor(16, -58, 56, -54, 0.045, 0x5f9a3e);
  k.floor(33, -30, 39, -10, 0.05, 0xb8b2a6);
  for (let z = -29; z < -10; z += 1.2) k.floor(33, z, 39, z + 0.08, 0.055, 0xa59f93);

  // ---- Building shell (one collider; you look in through the glass) ----
  world.addBox(X0, Z0, X1, Z1, 9);
  k.box(CX, 0, CZ, X1 - X0, 0.06, Z1 - Z0, 0xbfc5c9);
  k.box(CX, 4.05, CZ, X1 - X0 + 0.6, 0.3, Z1 - Z0 + 0.6, 0xeeeeee);
  k.box(CX, 8.3, CZ, X1 - X0 + 1, 0.45, Z1 - Z0 + 1, 0xf4f4f4);
  k.box(CX, 0, Z0 + 0.2, X1 - X0, 8.3, 0.4, 0x39414a);
  k.box(X1 - 0.2, 0, CZ, 0.4, 8.3, Z1 - Z0, 0x39414a);
  k.box(X0 + 0.2, 0, Z0 + 2, 0.4, 8.3, 4, 0x39414a);
  k.box(X1 + 0.05, 0.6, CZ + 4, 0.1, 7.2, 1.4, ORANGE);
  k.box(X1 + 0.05, 0.6, CZ + 1, 0.1, 7.2, 0.5, ORANGE);
  // Mullions + spandrels.
  for (let x = X0; x <= X1 + 0.01; x += 3) k.box(x, 0, Z1 - 0.1, 0.16, 8.3, 0.16, DARK);
  for (let z = Z0 + 4; z <= Z1 + 0.01; z += 3) k.box(X0 - 0.1, 0, z, 0.16, 8.3, 0.16, DARK);
  k.box(CX, 3.9, Z1 - 0.1, X1 - X0 + 0.2, 0.45, 0.2, DARK);
  k.box(X0 - 0.1, 3.9, CZ + 2, 0.2, 0.45, Z1 - Z0 - 4, DARK);
  const glassMat = new THREE.MeshPhongMaterial({ color: 0xa8d8f0, transparent: true, opacity: 0.26, shininess: 120, specular: 0xffffff, side: THREE.DoubleSide, depthWrite: false });
  const glass = new THREE.Mesh(mergeGeometries([
    new THREE.PlaneGeometry(X1 - X0, 8.2).translate(CX, 4.15, Z1 - 0.05),
    new THREE.PlaneGeometry(Z1 - Z0 - 4, 8.2).rotateY(HALF).translate(X0 - 0.05, 4.15, CZ + 2),
  ]), glassMat);
  g.add(glass);

  // Entrance canopy, doors, fascia sign.
  k.box(CX, 3.3, Z1 + 2, 9, 0.25, 4.2, DARK);
  for (const x of [CX - 4.2, CX + 4.2]) k.cyl(x, 0, Z1 + 3.8, 0.08, 0.08, 3.3, DARK, 8, 3.3);
  for (const x of [CX - 2, CX, CX + 2]) k.box(x, 0, Z1 - 0.02, 0.08, 2.8, 0.1, 0x111111);
  k.box(CX, 2.8, Z1 - 0.02, 4.1, 0.1, 0.1, 0x111111);
  neon.box(CX, 3.24, Z1 + 4.05, 9, 0.06, 0.1);
  k.box(CX, 3.55, Z1 + 4.05, 9, 0.6, 0.1, DARK);
  sign(g, 'WUSE TECH HUB', CX, 3.85, Z1 + 4.12, 0, 8.6, 0.55, { bg: '#16191c', fg: '#ff8a3d', w: 1024, h: 64 });
  // Rooftop sign.
  for (const x of [CX - 7, CX + 7]) k.box(x, 8.75, Z1 - 1.5, 0.25, 3.2, 0.25, DARK);
  k.box(CX, 9.2, Z1 - 1.6, 18.4, 2.9, 0.15, 0x16191c);
  sign2(g, 'WUSE TECH HUB', CX, 10.65, Z1 - 1.5, 0, 18, 2.7, { bg: '#16191c', fg: '#ff8a3d', sub: 'Co-working • Startups • 24/7 Power', w: 1024, h: 154 });
  neon.box(CX, 9.15, Z1 - 1.48, 18, 0.1, 0.12);
  // Roof: solar panels, AC units, water tank.
  for (let x = X0 + 3; x < X1 - 2; x += 2.6) for (const z of [Z0 + 3, Z0 + 5.6, Z0 + 8.2]) k.geo(tbox(2.3, 0.06, 1.3, x, 9.1, z, 0, -0.3), 0x1f3550);
  for (const x of [X0 + 3, X0 + 6]) k.box(x, 8.75, Z1 - 4.5, 1.6, 1.1, 1.0, 0xc9ccd1);
  k.cyl(X1 - 3, 8.75, Z1 - 5, 1, 1, 1.9, 0x1c1c1c, 12);

  // ---- Inside, ground floor: desk islands, reception, lounge, coffee bar ----
  const agents: AgentSpec[] = [];
  const techCfg = (): Partial<CharacterConfig> => pick(rng, [
    { outfit: 'ankara', specs: true, bag: false, watch: true },
    { outfit: 'jersey', primary: ci(0x111111), headwear: 'none', bag: false },
    { outfit: 'ankara', hair: 'braids', headwear: 'none', facialHair: 'none', bag: false },
    { outfit: 'suit', primary: ci(0x5b5f66), headwear: 'none', specs: true, bag: false },
  ] as Partial<CharacterConfig>[]);
  const desk = (x: number, z: number, y: number, people: boolean) => {
    k.box(x, y + 0.72, z, 4.2, 0.05, 1.7, 0xf4f4f4);
    for (const dx of [-1.95, 1.95]) k.box(x + dx, y, z, 0.06, 0.72, 1.5, 0xc9ccd1);
    k.box(x, y + 0.77, z, 4.0, 0.3, 0.03, 0xd8dde0);
    for (const dx of [-1, 1]) {
      for (const s of [-1, 1]) {
        const lx = x + dx, lz = z + s * 0.45;
        k.box(lx, y + 0.75, lz, 0.38, 0.02, 0.26, 0x3a3f45);
        k.box(lx, y + 0.77, lz + s * 0.13, 0.38, 0.25, 0.02, 0x2b2f33);
        screens.box(lx, y + 0.79, lz + s * 0.115, 0.34, 0.21, 0.01);
        const cz = z + s * 1.3;
        const cc = pick(rng, [0x222222, ORANGE, 0x2a64c9, 0x222222]);
        k.box(lx, y + 0.45, cz, 0.5, 0.08, 0.5, cc);
        k.box(lx, y + 0.5, cz + s * 0.25, 0.5, 0.55, 0.06, cc);
        k.cyl(lx, y, cz, 0.04, 0.2, 0.45, 0x333333, 6);
        if (people && rng() < 0.6) agents.push({ kind: 'static', x: lx, z: cz, facing: s > 0 ? Math.PI : 0, pose: 'sit', cfg: techCfg() });
      }
    }
  };
  for (const x of [22.5, 28.5, 43.5, 49.5]) for (const z of [-34.6, -40.6]) desk(x, z, 0, true);
  // Upstairs: more desks along the glass (seen from outside).
  for (const x of [22.5, 28.5, 34.5, 40.5, 46.5]) desk(x, -34.2, 4.2, false);
  // Reception.
  k.box(CX, 0, Z1 - 4, 3.6, 1.1, 0.8, 0xffffff);
  k.box(CX, 0.2, Z1 - 3.58, 3.6, 0.15, 0.04, ORANGE);
  agents.push({ kind: 'static', x: CX, z: Z1 - 5, facing: 0, pose: 'phone', cfg: { outfit: 'ankara', hair: 'braids', headwear: 'none', facialHair: 'none' } });
  // Lounge with beanbags.
  const bean = [ORANGE, 0x00a6a6, 0x6c2c91, 0xe8a317, 0x2a64c9, 0xc0262d];
  [[30.5, -46.5], [33, -48.8], [35.8, -46.2], [38.6, -48.5], [41, -46.4]].forEach(([x, z], i) => k.sphere(x, 0.3, z, 0.6, bean[i % bean.length], 0.55, 10));
  k.box(35.5, 0, -47.6, 2.4, 0.4, 1.2, 0xd8c39a);
  agents.push({ kind: 'static', x: 33, z: -48.8, facing: 0.4, pose: 'phone', cfg: { outfit: 'jersey', primary: ci(0x0f8a4b) } });
  // Coffee bar along the back wall.
  k.box(47.5, 0, -49.6, 8, 1.05, 0.9, 0x5a3a24);
  k.box(47.5, 1.05, -49.6, 8.2, 0.06, 1.0, 0xe8e2d6);
  k.box(45.2, 1.11, -49.8, 0.7, 0.55, 0.5, 0xc9ccd1);
  k.box(46.2, 1.11, -49.8, 0.25, 0.4, 0.25, 0x111111);
  for (let i = 0; i < 5; i++) k.cyl(48 + i * 0.35, 1.11, -49.4, 0.05, 0.04, 0.12, 0xffffff, 8);
  for (let i = 0; i < 4; i++) {
    k.cyl(44.5 + i * 2, 0, -48.4, 0.05, 0.05, 0.75, 0x333333, 6);
    k.cyl(44.5 + i * 2, 0.75, -48.4, 0.22, 0.22, 0.06, 0x111111, 10);
  }
  sign(g, 'COFFEE BAR', 47.5, 2.6, -51.57, 0, 4, 0.9, { bg: '#3a2418', fg: '#ffd9a8', sub: 'Zobo latte • Cold brew • Chin-chin' });
  agents.push({ kind: 'static', x: 47.5, z: -50.7, facing: 0, pose: 'normal', cfg: { outfit: 'jersey', primary: ci(0x111111), headwear: 'cap' } });
  // Wall graphics.
  sign(g, 'BUILD • SHIP • REPEAT', 27, 2.4, -51.57, 0, 7, 1.0, { bg: '#f26b1d', fg: '#16191c' });
  sign(g, 'ABUJA TO THE WORLD', CX, 6.6, -51.57, 0, 9, 1.2, { bg: '#16191c', fg: '#ffffff', sub: 'Wuse Tech Hub • Est. 2026' });
  // Ceiling light panels.
  for (let x = X0 + 3; x < X1; x += 6) for (let z = Z0 + 3; z < Z1; z += 5) {
    lit.box(x, 3.98, z, 2.2, 0.05, 0.6);
    lit.box(x, 8.23, z, 2.2, 0.05, 0.6);
  }
  // Plants.
  for (const [x, z] of [[X0 + 1, Z1 - 1], [X1 - 1.2, Z1 - 1], [X0 + 1, Z0 + 5]] as const) {
    k.cyl(x, 0, z, 0.35, 0.28, 0.6, 0xe8e2d6, 10);
    k.sphere(x, 1.2, z, 0.6, 0x3f7f2f, 1.2, 8);
  }

  // ---- Forecourt: bikes, scooters, outdoor tables, generator ----
  k.box(47, 0, Z1 + 3.2, 7.6, 0.6, 0.06, 0x9aa1a8);
  [[0x2a64c9, 44], [ORANGE, 45.6], [0x111111, 47.2], [0x0f8a4b, 48.8], [0xc0262d, 50.4]].forEach(([c, x]) => bicycle(k, x, Z1 + 3.9, c));
  world.addBox(43.4, Z1 + 3.2, 51, Z1 + 4.6, 1);
  for (const [x, c] of [[53, 0x1dc48a], [54.2, 0x1dc48a], [55.4, 0x111111]] as const) scooter(k, x, Z1 + 4, c);
  world.addBox(52.6, Z1 + 3.4, 55.8, Z1 + 4.6, 1.1);
  for (const [x, z, c] of [[21, -22, ORANGE], [27, -19.5, 0x00a6a6], [21, -15, 0xe8a317]] as const) {
    k.cyl(x, 0, z, 0.06, 0.06, 0.74, 0x333333, 6);
    k.cyl(x, 0.74, z, 0.6, 0.6, 0.05, 0xffffff, 14);
    world.addCircle(x, z, 0.65, 0.8);
    umbrella(k, x, z, 2.4, 1.6, c, 0xffffff, false);
    for (const s of [-1, 1]) {
      k.cyl(x + s * 1.05, 0, z, 0.22, 0.22, 0.45, 0x333333, 10);
      world.addCircle(x + s * 1.05, z, 0.25, 0.5);
    }
  }
  k.box(21, 0.78, -22, 0.36, 0.02, 0.26, 0x3a3f45);
  k.box(21, 0.8, -22.13, 0.36, 0.25, 0.02, 0x2b2f33);
  screens.box(21, 0.82, -22.115, 0.34, 0.21, 0.01);
  agents.push(
    { kind: 'static', x: 19.95, z: -22, facing: HALF, pose: 'sit', cfg: techCfg() },
    { kind: 'static', x: 28.05, z: -19.5, facing: -HALF, pose: 'sit', cfg: techCfg() },
    { kind: 'static', x: 25.95, z: -19.5, facing: HALF, pose: 'sit', cfg: techCfg() },
    { kind: 'static', x: 31.5, z: -27, facing: 0.6, pose: 'phone', cfg: techCfg() },
    { kind: 'static', x: 41, z: -24.5, facing: -2.4, pose: 'phone', cfg: techCfg() },
    { kind: 'static', x: 42, z: -25.7, facing: -0.3, pose: 'normal', cfg: techCfg() },
    { kind: 'static', x: 54.4, z: -24.8, facing: Math.PI, pose: 'phone', cfg: techCfg() },
  );
  // Planters along the front.
  for (let z = -48; z <= -16; z += 8) k.tree(15, z, 0.75, false);
  for (let z = -40; z <= -16; z += 8) k.tree(57.5, z, 0.75, false);
  // Generator house (Nigerian reality: backup power).
  k.box(57.5, 0, -47, 3, 2.3, 5, 0x3d5a3a, true);
  k.box(57.5, 2.3, -47, 3.4, 0.15, 5.4, 0x9aa1a8);
  for (let i = 0; i < 5; i++) k.box(55.95, 0.5 + i * 0.3, -47, 0.05, 0.08, 3.6, 0x22301f);
  sign(g, 'BACKUP POWER 24/7', 55.9, 2.0, -47, -HALF, 3, 0.45, { bg: '#e8a317', fg: '#16191c' });
  // Monument sign at the path.
  k.box(24, 0, -12.5, 6, 1.1, 0.5, 0x16191c, true);
  sign2(g, 'WUSE TECH HUB', 24, 0.62, -12.22, 0, 5.6, 0.85, { bg: '#16191c', fg: '#ff8a3d', sub: 'Co-working space • Day passes ₦5,000' });
  // Bollard lights.
  for (const x of [32.2, 39.8]) for (let z = -27; z <= -13; z += 7) {
    k.cyl(x, 0, z, 0.1, 0.1, 0.8, DARK, 8, 0.8);
    lit.box(x, 0.8, z, 0.18, 0.12, 0.18);
  }

  k.flush(g);
  lit.flush(b, g, 0xfff6e0, 0xdedede, 1.5);
  screens.flush(b, g, 0xcfe8ff, 0x22303e, 2.0);
  neon.flush(b, g, 0xff8a3d, 0xc85a1d, 2.4);
  b.crowds.push({ id: 'techhub', cx: CX, cz: -32, radius: 75, agents });
}

// =====================================================================
// 2. GOVERNMENT SECONDARY SCHOOL KUBWA — NYSC PPA (Corper)
// =====================================================================
function school(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'gss-kubwa');
  const k = new Kit(world);
  const lit = new Lights();
  const rng = mulberry32(502);
  const X0 = -486, X1 = -425, Z0 = -232, Z1 = -160;
  const GX = -456;
  const WALL = 0xe6dcc0;
  const GREEN = 0x1f8a4b;

  // Grounds: sandy compound, driveway in.
  k.floor(X0, Z0, X1, Z1, 0.03, 0xb39b6e);
  k.floor(GX - 4, Z0 - 7, GX + 4, Z0 + 6, 0.04, 0x9a8a6a);
  for (let i = 0; i < 25; i++) k.disc(X0 + 3 + rng() * (X1 - X0 - 6), Z0 + 3 + rng() * 30, 0.6 + rng() * 1.4, 0.035, 0xa38a5c, 1, 0.6 + rng() * 0.6, 10);

  // Perimeter fence with the gate in the north wall.
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    k.wall(x0, z0, x1, z1, 2.2, WALL);
    k.box((x0 + x1) / 2, 1.85, (z0 + z1) / 2, Math.max(0.34, Math.abs(x1 - x0)), 0.3, Math.max(0.34, Math.abs(z1 - z0)), GREEN);
  };
  wall(X0, Z0 - 0.2, GX - 6, Z0 + 0.2);
  wall(GX + 6, Z0 - 0.2, X1, Z0 + 0.2);
  wall(X0 - 0.2, Z0, X0 + 0.2, Z1);
  wall(X1 - 0.2, Z0, X1 + 0.2, Z1);
  wall(X0, Z1 - 0.2, X1, Z1 + 0.2);
  for (const s of [-1, 1]) k.box(GX + s * 6.4, 0, Z0, 1, 6, 1, WALL, true);
  k.box(GX, 3.8, Z0, 12, 1.9, 0.3, GREEN);
  sign(g, 'GOVERNMENT SECONDARY SCHOOL KUBWA', GX, 4.75, Z0 - 0.17, Math.PI, 11.6, 1.7, { bg: '#1f6b3a', fg: '#ffffff', sub: 'FCT Secondary Education Board • Knowledge is Light', w: 1024, h: 150 });
  sign(g, 'GSS KUBWA', GX, 4.75, Z0 + 0.17, 0, 11.6, 1.7, { bg: '#1f6b3a', fg: '#ffd76a', sub: 'Discipline • Hard work • Excellence', w: 1024, h: 150 });
  // Gate leaves swung open against the wall.
  for (const s of [-1, 1]) k.box(GX + s * 7.6, 0, Z0 + 0.6, 2.4, 2.1, 0.08, 0x1f6b3a);

  // Classroom block: verandah with pillars, louvre windows, zinc gable roof.
  const BX0 = -482, BX1 = -444, BZ0 = -211, BZ1 = -203;
  const BCX = (BX0 + BX1) / 2;
  k.box(BCX, 0, (BZ0 + BZ1) / 2, BX1 - BX0, 3.3, BZ1 - BZ0, 0xf0e2c0, true);
  k.box(BCX, 0, (BZ0 + BZ1) / 2, BX1 - BX0 + 0.08, 0.9, BZ1 - BZ0 + 0.08, 0x8c6a3a);
  k.box(BCX, 0, BZ0 - 1.1, BX1 - BX0 + 1, 0.14, 2.4, 0xbdb3a0);
  const roof = prismGeo().scale(BX1 - BX0 + 1.6, 1.8, BZ1 - BZ0 + 4.4).translate(BCX, 3.3, (BZ0 + BZ1) / 2 - 1.1);
  k.geo(roof, 0x8f969c);
  for (let x = BX0; x <= BX1 + 0.01; x += 4.75) k.cyl(x, 0, BZ0 - 2.1, 0.14, 0.14, 3.3, 0xf6f1e4, 8, 3.3);
  const rooms = ['JSS 1A', 'JSS 2B', 'JSS 3A', 'SS 1 SCIENCE'];
  rooms.forEach((name, i) => {
    const x0 = BX0 + i * 9.5;
    k.box(x0 + 1.8, 0, BZ0 - 0.04, 1.1, 2.3, 0.08, 0x6b4a2b);
    sign(g, name, x0 + 1.8, 2.75, BZ0 - 0.1, Math.PI, 1.6, 0.4, { bg: '#123e7c', fg: '#ffffff' });
    for (const wx of [x0 + 4.4, x0 + 7.4]) {
      k.box(wx, 1.0, BZ0 - 0.04, 2.0, 1.4, 0.06, 0x2f5a4a);
      for (let j = 0; j < 6; j++) k.box(wx, 1.08 + j * 0.23, BZ0 - 0.09, 1.9, 0.05, 0.04, 0x9fb4a8);
    }
    for (const wx of [x0 + 2.5, x0 + 6.5]) k.box(wx, 1.0, BZ1 + 0.04, 2.4, 1.4, 0.06, 0x2f5a4a);
  });
  k.bench(-470, BZ0 - 0.9, Math.PI, 0x6b4a2b);
  k.bench(-452, BZ0 - 0.9, Math.PI, 0x6b4a2b);

  // Staff room / principal's office near the gate.
  k.box(-433, 0, -223.5, 12, 3.2, 9, 0xf3ead8, true);
  k.box(-433, 3.2, -223.5, 12.8, 0.3, 9.8, 0x1f6b3a);
  k.box(-439.04, 0, -223.5, 0.08, 2.3, 1.2, 0x6b4a2b);
  for (const z of [-226.5, -220.5]) k.box(-439.05, 1.0, z, 0.06, 1.3, 1.8, 0x2f5a4a);
  sign(g, "PRINCIPAL • STAFF ROOM", -439.12, 2.7, -223.5, -HALF, 4.6, 0.55, { bg: '#123e7c', fg: '#ffffff' });

  // CDS notice board just inside the gate.
  for (const s of [-1, 1]) k.cyl(-448.5, 0, -228.5 + s * 1.5, 0.07, 0.07, 2.6, 0x444444, 6, 2.6);
  k.box(-448.45, 1.1, -228.5, 0.12, 1.4, 3.3, 0x0f6b3a);
  sign(g, 'NYSC FCT • CDS THURSDAY', -448.6, 1.8, -228.5, -HALF, 3.1, 1.25, { bg: '#f2e6c9', fg: '#0f6b3a', sub: 'Service and Humility • Corps members report 9am' });

  // Flag pole on the assembly ground + school bell.
  flagPole(k, -446, -217, 8);
  k.box(-446, 0, -217, 1.2, 0.3, 1.2, 0xd9d0bc, 0.3);
  for (const s of [-1, 1]) k.cyl(-464 + s * 0.6, 0, -217, 0.05, 0.05, 2.2, 0x444444, 6, 2.2);
  k.box(-464, 2.2, -217, 1.4, 0.08, 0.08, 0x444444);
  k.geo(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 10).translate(-464, 1.95, -217), 0x9a7a2a);

  // Outdoor lesson under the mango tree: chalkboard + benches.
  k.tree(-476, -219, 1.4);
  k.box(-475, 0.8, -226.6, 2.6, 1.3, 0.1, 0x5a3a24);
  for (const dx of [-1.1, 1.1]) k.geo(tbox(0.07, 2.1, 0.07, -475 + dx, 1.0, -226.45, 0, 0.12), 0x5a3a24);
  sign(g, '2x + 5 = 15', -475, 1.45, -226.52, 0, 2.3, 1.2, { bg: '#22332a', fg: '#f2f2f2', sub: 'JSS 2 Maths • Find x' });
  world.addBox(-476.4, -226.8, -473.6, -226.4, 2);
  for (const z of [-223.8, -221.8]) {
    k.box(-475, 0.4, z, 3.4, 0.08, 0.4, 0x7a5534);
    for (const dx of [-1.5, 1.5]) k.box(-475 + dx, 0, z, 0.08, 0.4, 0.35, 0x5a3a24);
    world.addBox(-476.7, z - 0.22, -473.3, z + 0.22, 0.48);
  }

  // Football field (south half).
  const FX0 = -482, FX1 = -430, FZ0 = -196, FZ1 = -164, FCX = (FX0 + FX1) / 2, FCZ = (FZ0 + FZ1) / 2;
  k.floor(FX0, FZ0, FX1, FZ1, 0.045, 0x6f9a45);
  for (let i = 0; i < 6; i += 2) k.floor(FX0 + i * ((FX1 - FX0) / 6), FZ0, FX0 + (i + 1) * ((FX1 - FX0) / 6), FZ1, 0.05, 0x7aa64e);
  const line = (x0: number, z0: number, x1: number, z1: number) => k.floor(x0, z0, x1, z1, 0.06, 0xf2f2f2);
  line(FX0, FZ0, FX1, FZ0 + 0.12);
  line(FX0, FZ1 - 0.12, FX1, FZ1);
  line(FX0, FZ0, FX0 + 0.12, FZ1);
  line(FX1 - 0.12, FZ0, FX1, FZ1);
  line(FCX - 0.06, FZ0, FCX + 0.06, FZ1);
  k.disc(FCX, FCZ, 0.3, 0.065, 0xf2f2f2, 1, 1, 10);
  for (const [x, d] of [[FX0, 1], [FX1, -1]] as const) {
    line(x, FCZ - 6, x + d * 5, FCZ - 5.88);
    line(x, FCZ + 5.88, x + d * 5, FCZ + 6);
    line(x + d * 5 - 0.06, FCZ - 6, x + d * 5 + 0.06, FCZ + 6);
    for (const s of [-1, 1]) k.cyl(x + d * 0.3, 0, FCZ + s * 2.5, 0.06, 0.06, 2.2, 0xffffff, 6, 2.2);
    k.box(x + d * 0.3, 2.2, FCZ, 0.1, 0.1, 5.1, 0xffffff);
  }
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  ball.castShadow = true;
  g.add(ball);
  b.animators.push((t) => {
    ball.position.set(FCX + Math.sin(t * 0.37) * 18, 0.16 + Math.abs(Math.sin(t * 2.3)) * 0.5, FCZ + Math.sin(t * 0.61) * 9);
    ball.rotation.x = t * 5;
  });

  // Overhead water tank, trees along the wall, tuck-shop mama outside the gate.
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) k.box(-430 + dx * 1.2, 0, -205 + dz * 1.2, 0.2, 4.5, 0.2, 0x777777);
  world.addBox(-431.4, -206.4, -428.6, -203.6, 4.5);
  k.box(-430, 4.5, -205, 3, 0.2, 3, 0x777777);
  k.cyl(-430, 4.7, -205, 1.3, 1.3, 2, 0x1c1c1c, 14);
  for (const [x, z] of [[-483, -228], [-483, -190], [-483, -170], [-428, -190], [-428, -170], [-440, -163], [-470, -163]] as const) k.tree(x, z, 1.1 + rng() * 0.3);
  k.box(-468, 0.72, -235.4, 1.4, 0.06, 0.8, 0xf2e6c9);
  for (const [dx, dz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]] as const) k.box(-468 + dx, 0, -235.4 + dz, 0.05, 0.72, 0.05, 0x5a3a24);
  world.addBox(-468.7, -235.8, -467.3, -235, 0.8);
  for (let i = 0; i < 6; i++) k.sphere(-468.5 + (i % 3) * 0.4, 0.84, -235.6 + Math.floor(i / 3) * 0.35, 0.09, 0xc98a3a, 0.8, 6);
  k.box(-467.6, 0.78, -235.2, 0.35, 0.25, 0.3, 0x2a64c9);
  umbrella(k, -468, -235.4, 2.4, 1.5, 0xc0262d, 0xf2e6c9, true);
  // Lamp over the gate.
  for (const s of [-1, 1]) lit.box(GX + s * 6.4, 6, Z0 - 0.3, 0.5, 0.25, 0.5);
  k.flush(g);
  lit.flush(b, g, 0xfff1c4, 0xdddddd, 2);

  // People: corpers in khaki, students in uniform.
  const corper = (extra: Partial<CharacterConfig> = {}): Partial<CharacterConfig> => ({ outfit: 'nysc', headwear: 'nyscCap', facialHair: 'none', shades: false, chain: false, bag: false, shoes: 'boots', ...extra });
  const boy = (): Partial<CharacterConfig> => ({ outfit: 'ankara', pattern: 'plain', primary: 0, secondary: 0, trousers: ci(0x1f6b3a), hair: 'lowcut', headwear: 'none', facialHair: 'none', shades: false, specs: false, chain: false, watch: false, bag: false, shoes: 'sandals' });
  const girl = (): Partial<CharacterConfig> => ({ outfit: 'asoebi', pattern: 'plain', primary: ci(0x1f6b3a), secondary: 0, hair: 'braids', headwear: 'none', facialHair: 'none', shades: false, specs: false, chain: false, watch: false, bag: false, shoes: 'sandals' });
  const kid = () => (rng() < 0.5 ? boy() : girl());
  const agents: AgentSpec[] = [
    { kind: 'static', x: -472.8, z: -226, facing: 0.2, pose: 'normal', cfg: corper() },
    { kind: 'static', x: -447.3, z: -227.6, facing: -HALF, pose: 'phone', cfg: corper({ hair: 'braids', facialHair: 'none' }) },
    { kind: 'static', x: -447.1, z: -229.6, facing: -HALF + 0.4, pose: 'normal', cfg: corper() },
    { kind: 'static', x: -441, z: -221.2, facing: -HALF, pose: 'normal', cfg: { outfit: 'senator', primary: ci(0x8c5a2b), headwear: 'none', hair: 'bald', facialHair: 'goatee', specs: true } },
    { kind: 'static', x: -468.6, z: -236.4, facing: 0, pose: 'normal', cfg: { outfit: 'iroBuba', hair: 'gele', headwear: 'none', facialHair: 'none', build: 'heavy' } },
    { kind: 'wander', rect: { x0: FX0 + 3, z0: FZ0 + 3, x1: FX1 - 3, z1: FZ1 - 3 }, count: 8, scale: 0.8, speed: 2.4, cfg: { outfit: 'jersey', headwear: 'none', facialHair: 'none', shades: false, bag: false } },
    { kind: 'loop', path: [[-466, -225], [-443, -225], [-443, -214.5], [-466, -214.5]], count: 2, speed: 1.1, cfg: corper() },
  ];
  for (const z of [-223.8, -221.8]) for (const dx of [-1.1, 0, 1.1]) agents.push({ kind: 'static', x: -475 + dx, z, facing: Math.PI, pose: 'sit', scale: 0.8, cfg: kid() });
  for (const x of [-470.5, -469.5, -452.5, -451.5]) agents.push({ kind: 'static', x, z: BZ0 - 0.75, facing: Math.PI, pose: 'sit', scale: 0.8, cfg: kid() });
  for (const x of [-470, -462, -446]) agents.push({ kind: 'static', x, z: FZ0 - 1.4, facing: 0, pose: 'cheer', scale: 0.8, cfg: kid() });
  b.crowds.push({ id: 'gss-kubwa', cx: GX, cz: -205, radius: 85, agents });
}

// =====================================================================
// 3. YOUR POS STAND — Garki pavement beside POS Babe (POS Agent)
// =====================================================================
function posStand(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'pos-stand');
  const k = new Kit(world);
  const PX = -31, PZ = 135.4;
  const OPAY = 0x1dc48a;
  k.floor(PX - 3.6, 133.3, PX + 3.6, 138.4, 0.05, 0xb8b2a6);
  // Table with a printed skirt.
  k.box(PX, 0.72, PZ, 1.6, 0.05, 0.8, 0xf4f4f4);
  for (const [dx, dz] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]] as const) k.box(PX + dx, 0, PZ + dz, 0.05, 0.72, 0.05, 0x888888);
  world.addBox(PX - 0.82, PZ - 0.42, PX + 0.82, PZ + 0.42, 0.8);
  k.box(PX, 0.25, PZ - 0.41, 1.6, 0.47, 0.02, OPAY);
  sign(g, 'OPay POS', PX, 0.48, PZ - 0.43, Math.PI, 1.56, 0.44, { bg: '#1dc48a', fg: '#ffffff', sub: 'Withdrawal • Transfer' });
  // POS machine, cash, phone, calculator, receipt book.
  k.box(PX - 0.35, 0.77, PZ + 0.05, 0.17, 0.06, 0.3, 0x1a1a1a);
  glow(g, PX - 0.35, 0.83, PZ + 0.09, 0.12, 0.005, 0.1, 0x7cf0b8, 0.8);
  k.box(PX - 0.35, 0.77, PZ - 0.14, 0.06, 0.02, 0.12, 0xffffff);
  for (let i = 0; i < 3; i++) k.box(PX + 0.15 + i * 0.17, 0.77, PZ + 0.05, 0.15, 0.04 + i * 0.03, 0.07, [0x8c6a4a, 0x4f7a8a, 0x7a4f6a][i]);
  k.box(PX + 0.62, 0.77, PZ + 0.15, 0.08, 0.01, 0.15, 0x111111);
  k.box(PX + 0.62, 0.77, PZ - 0.15, 0.1, 0.02, 0.15, 0x5b5f66);
  // Big umbrella.
  umbrella(k, PX + 1.0, PZ + 0.15, 2.5, 2.4, OPAY, 0xffffff, true);
  // Signboard on two posts, facing the road.
  const SX = PX + 2.6, SZ = 135.2;
  for (const s of [-1, 1]) k.cyl(SX + s * 0.95, 0, SZ, 0.05, 0.05, 2.4, 0x444444, 6, 2.4);
  sign2(g, 'OPay POS', SX, 1.75, SZ, Math.PI, 2.1, 1.25, { bg: '#1dc48a', fg: '#ffffff', sub: 'Withdrawal • Transfer • Airtime' });
  sign2(g, 'CHARGES: ₦100 PER ₦5K', SX, 0.9, SZ - 0.02, Math.PI, 1.9, 0.32, { bg: '#ffffff', fg: '#0f6b3a' });
  // Your plastic chair, two for waiting customers, a cooler of pure water, power bank.
  plasticChair(k, PX - 0.85, PZ + 1.35, Math.PI, 0xc0262d);
  plasticChair(k, PX - 2.6, PZ - 0.3, HALF, 0x2a64c9);
  plasticChair(k, PX - 2.6, PZ + 0.6, HALF, 0x2a64c9);
  k.box(PX + 1.7, 0, PZ + 1.3, 0.6, 0.45, 0.4, 0x2a64c9, 0.5);
  k.box(PX + 1.7, 0.45, PZ + 1.3, 0.62, 0.06, 0.42, 0xffffff);
  k.box(PX - 1.5, 0, PZ + 0.9, 0.4, 0.3, 0.3, 0x333333, 0.3);
  k.flush(g);
  b.crowds.push({
    id: 'pos-stand', cx: PX, cz: PZ, radius: 55,
    agents: [
      { kind: 'static', x: PX - 0.2, z: PZ - 1.05, facing: 0, pose: 'normal', cfg: { outfit: 'kaftan', headwear: 'kufi' } },
      { kind: 'static', x: PX + 0.7, z: PZ - 1.7, facing: -0.3, pose: 'phone' },
      { kind: 'static', x: PX + 1.5, z: PZ - 2.1, facing: -0.5, pose: 'normal', cfg: { outfit: 'iroBuba', hair: 'gele', headwear: 'none', facialHair: 'none' } },
      { kind: 'static', x: PX - 2.6, z: PZ - 0.3, facing: HALF, pose: 'sit' },
    ],
  });
}

// =====================================================================
// 4. YOUR FABRIC SHOP — Wuse Market north strip (Market Trader)
// =====================================================================
function fabricShop(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'fabric-shop');
  const k = new Kit(world);
  const rng = mulberry32(504);
  const SX = -221.5, FZ = 144.5, BZ = 149.5;
  const WOOD = 0x6b4a2b;
  const FAB = [0xc0262d, 0xe8a317, 0x0f8a4b, 0x123e7c, 0x6c2c91, 0xf26b1d, 0x00a6a6, 0xd94f8c, 0xffffff, 0x7a1f3d, 0x2a64c9, 0xd4a62a];
  k.floor(SX - 4.6, FZ - 3.5, SX + 4.6, BZ + 0.3, 0.05, 0x9a948a);
  // Walls (painted blue outside), zinc roof, tarp awning on poles.
  k.box(SX, 0, BZ - 0.1, 9, 2.9, 0.2, WOOD, true);
  for (const s of [-1, 1]) k.box(SX + s * 4.4, 0, (FZ + BZ) / 2, 0.2, 2.9, BZ - FZ, 0x2f6fb0, true);
  k.geo(tbox(9.8, 0.06, 6.4, SX, 3.05, (FZ + BZ) / 2, 0, 0.08), 0x9aa1a8);
  for (let i = 0; i < 4; i++) k.geo(tbox(0.9 + rng(), 0.07, 1 + rng() * 2, SX - 4 + rng() * 8, 3.07, FZ + 1 + rng() * 3.5, 0, 0.08), 0x8c5a2b);
  k.geo(tbox(9.4, 0.04, 2.6, SX, 2.72, FZ - 1.25, 0, 0.22), 0x2a64c9);
  for (const s of [-1, 1]) k.cyl(SX + s * 4.4, 0, FZ - 2.5, 0.05, 0.05, 2.45, 0x555555, 6, 2.45);
  // Signboard over the front.
  k.box(SX, 3.15, FZ - 0.15, 6.4, 1.1, 0.1, 0x3a2418);
  sign(g, 'YOUR SHOP', SX, 3.7, FZ - 0.22, Math.PI, 6.2, 1.0, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Oga/Madam ______ Fabrics • Ankara • Lace • Aso-ebi' });
  // Counter with folded fabric; shelves on the back wall; upright rolls.
  k.box(SX - 1.3, 0, FZ + 0.4, 5.6, 0.95, 0.7, 0x8a6a4a, true);
  const folds = new BoxField();
  for (let i = 0; i < 7; i++) {
    const n = 2 + Math.floor(rng() * 4);
    for (let j = 0; j < n; j++) folds.add(SX - 3.7 + i * 0.6, 0.95 + j * 0.09, FZ + 0.4, 0.52, 0.085, 0.45, pick(rng, FAB));
  }
  for (let r = 0; r < 3; r++) {
    k.box(SX, 0.8 + r * 0.65, BZ - 0.55, 8.4, 0.05, 0.7, WOOD);
    for (let i = 0; i < 14; i++) {
      const n = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) folds.add(SX - 3.9 + i * 0.6, 0.85 + r * 0.65 + j * 0.1, BZ - 0.55, 0.52, 0.095, 0.5, pick(rng, FAB));
    }
  }
  folds.build(g);
  for (let i = 0; i < 7; i++) k.cyl(SX + 4.0, 0, FZ + 0.9 + i * 0.5, 0.13, 0.13, 1.5 + rng() * 0.5, pick(rng, FAB), 10);
  for (let i = 0; i < 4; i++) k.geo(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 10).rotateZ(HALF).translate(SX + 0.85, 1.09 + Math.floor(i / 2) * 0.26, FZ + 0.4 + (i % 2 ? 0.15 : -0.15) * (i < 2 ? 1 : 0)), pick(rng, FAB));
  // Hanging wax-print fabrics along the front rail.
  k.box(SX, 2.72, FZ - 0.05, 8.6, 0.06, 0.06, 0x444444);
  const prints: [string, string, string, number][] = [
    ['#c0262d', '#e8a317', '#123e7c', 0], ['#123e7c', '#f2e6c9', '#e8a317', 1], ['#0f8a4b', '#e8a317', '#7a1f3d', 0],
    ['#6c2c91', '#f26b1d', '#ffffff', 1], ['#e8a317', '#7a1f3d', '#0f8a4b', 0], ['#00a6a6', '#ffffff', '#c0262d', 1],
  ];
  const xs = [-3.9, -2.95, 1.4, 2.35, 3.3, -0.4];
  prints.forEach(([bg, fg, ac, kind], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.5), new THREE.MeshLambertMaterial({ map: ankaraTexture(bg, fg, ac, kind), side: THREE.DoubleSide }));
    m.position.set(SX + xs[i], 1.95, FZ - 0.1);
    m.rotation.y = (rng() - 0.5) * 0.25;
    m.castShadow = true;
    g.add(m);
  });
  // A low stool by the entrance.
  k.cyl(SX + 3.4, 0, FZ - 1.3, 0.2, 0.22, 0.42, 0x8a6a4a, 10, 0.45);
  k.flush(g);
  b.crowds.push({
    id: 'fabric-shop', cx: SX, cz: FZ, radius: 60,
    agents: [
      { kind: 'static', x: SX + 3.4, z: FZ - 1.3, facing: -HALF, pose: 'sit', cfg: { outfit: 'jersey', headwear: 'cap', facialHair: 'none' }, scale: 0.9 },
      { kind: 'static', x: SX - 2.6, z: FZ - 1.1, facing: 0, pose: 'normal', cfg: { outfit: 'iroBuba', hair: 'gele', headwear: 'none', facialHair: 'none', build: 'heavy' } },
      { kind: 'static', x: SX - 3.4, z: FZ - 1.6, facing: 0.5, pose: 'phone', cfg: { outfit: 'abaya', hair: 'hijab', headwear: 'none', facialHair: 'none' } },
    ],
  });
}

// =====================================================================
// 5. TSANGAYA — Qur'anic school by Wuse Market (Almajiri)
// =====================================================================
function tsangaya(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'tsangaya');
  const k = new Kit(world);
  const fire = new Lights();
  const rng = mulberry32(505);
  const TX = -237, Z0 = 209, Z1 = 217, X0 = TX - 4.5, X1 = TX + 4.5;
  // Mats.
  k.floor(X0 + 0.4, Z0 + 0.4, X1 - 0.4, Z1 - 0.4, 0.05, 0xc9a35a);
  for (let z = Z0 + 1; z < Z1 - 0.4; z += 1.1) k.floor(X0 + 0.4, z, X1 - 0.4, z + 0.12, 0.055, 0xa8813a);
  // Poles + rusty zinc roof (lower at the back).
  for (const x of [X0 + 0.2, TX, X1 - 0.2]) {
    k.cyl(x, 0, Z0 + 0.2, 0.08, 0.1, 2.7, 0x6b4a2b, 6, 2.7);
    k.cyl(x, 0, Z1 - 0.2, 0.08, 0.1, 2.35, 0x6b4a2b, 6, 2.35);
  }
  k.box(TX, 2.6, Z0 + 0.2, 9.4, 0.12, 0.12, 0x6b4a2b);
  k.box(TX, 2.25, Z1 - 0.2, 9.4, 0.12, 0.12, 0x6b4a2b);
  k.geo(tbox(10, 0.05, 9.2, TX, 2.55, (Z0 + Z1) / 2, 0, 0.045), 0x8f969c);
  for (let i = 0; i < 7; i++) k.geo(tbox(0.8 + rng() * 1.5, 0.06, 0.6 + rng() * 2, X0 + rng() * 9, 2.57 - (rng() - 0.5) * 0.3, Z0 + 1 + rng() * 6.5, 0, 0.045), pick(rng, [0x8c5a2b, 0x7a4a24, 0x9a6a3a]));
  // Low benches for the boys, stool for Mallam.
  const rows = [212.6, 214.8];
  for (const z of rows) for (const x of [TX - 2.2, TX + 2.2]) k.box(x, 0, z, 3, 0.3, 0.35, 0x7a5534, 0.32);
  k.box(TX, 0, Z0 + 1.3, 0.7, 0.42, 0.5, 0x5a3a24, 0.45);
  k.geo(tbox(0.04, 1.6, 0.04, TX + 0.7, 0.78, Z0 + 1.1, 0, 0, 0.2), 0x5a3a24); // cane
  // Allo boards: wooden slates with ink lines (one on each boy's lap, more leaning on the back rail).
  const allo = (x: number, y: number, z: number, ry: number, rx: number) => {
    const m = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeRotationX(rx));
    const parts: [THREE.BufferGeometry, number][] = [
      [new THREE.BoxGeometry(0.32, 0.5, 0.03), 0xb08850],
      [new THREE.BoxGeometry(0.1, 0.12, 0.03).translate(0, 0.3, 0), 0xb08850],
    ];
    for (let j = 0; j < 5; j++) parts.push([new THREE.BoxGeometry(0.22 - (j % 2) * 0.05, 0.015, 0.005).translate(0, 0.17 - j * 0.08, 0.018), 0x1a1410]);
    for (const [geo, c] of parts) k.geo(geo.applyMatrix4(m), c);
  };
  const boys: [number, number][] = [];
  for (const z of rows) for (const x of [TX - 3.2, TX - 1.2, TX + 1.2, TX + 3.2]) boys.push([x, z]);
  boys.splice(5, 1);
  for (const [x, z] of boys) allo(x, 0.55, z - 0.32, 0, -0.5);
  for (let i = 0; i < 6; i++) allo(X0 + 1 + i * 0.45, 0.6, Z1 - 0.4, Math.PI, -0.25);
  allo(TX - 0.5, 0.75, Z0 + 1.6, Math.PI, -0.5);
  // Plastic kettles (buta) and begging bowls.
  const kettle = (x: number, z: number, c: number) => {
    k.cyl(x, 0, z, 0.1, 0.14, 0.26, c, 10);
    k.cyl(x, 0.26, z, 0.05, 0.09, 0.06, c, 10);
    k.geo(new THREE.CylinderGeometry(0.015, 0.03, 0.24, 6).rotateZ(-0.9).translate(x + 0.16, 0.2, z), c);
    k.box(x - 0.15, 0.12, z, 0.03, 0.18, 0.04, c);
  };
  [0x2a64c9, 0x0f8a4b, 0xe8a317, 0xc0262d, 0x00a6a6].forEach((c, i) => kettle(X1 - 0.6, Z0 + 1 + i * 0.4, c));
  for (let i = 0; i < 5; i++) k.cyl(X0 + 0.7 + (i % 3) * 0.42, i < 3 ? 0 : 0.12, Z0 + 0.8 + (i < 3 ? 0 : 0.2), 0.17, 0.11, 0.12, pick(rng, [0xe8a317, 0xc0262d, 0x2a64c9, 0xf2f2f2]), 12);
  // Rolled sleeping mats.
  for (let i = 0; i < 3; i++) k.geo(new THREE.CylinderGeometry(0.15, 0.15, 1.3, 10).rotateZ(HALF).translate(X1 - 1.5, 0.15 + i * 0.28, Z1 - 0.55), pick(rng, [0xc9a35a, 0x8a5a2b, 0x2f6f2a]));
  // Fire for night reading (wutar karatu) + firewood.
  const FXp = TX + 1.5, FZp = Z1 + 2;
  for (let i = 0; i < 8; i++) k.sphere(FXp + Math.cos((i / 8) * Math.PI * 2) * 0.5, 0.08, FZp + Math.sin((i / 8) * Math.PI * 2) * 0.5, 0.12, 0x6f6b64, 0.7, 6);
  for (let i = 0; i < 3; i++) k.geo(tbox(0.9, 0.09, 0.09, FXp, 0.1, FZp, (i * Math.PI) / 3), 0x3a2418);
  fire.geo(new THREE.ConeGeometry(0.3, 0.6, 6).translate(FXp, 0.4, FZp));
  world.addCircle(FXp, FZp, 0.6, 0.4);
  for (let i = 0; i < 6; i++) k.geo(tbox(1.4, 0.1, 0.1, TX - 2.5, 0.06 + Math.floor(i / 3) * 0.1, FZp - 0.2 + (i % 3) * 0.12, 0), 0x5a3a24);
  world.addBox(TX - 3.25, FZp - 0.3, TX - 1.75, FZp + 0.2, 0.3);
  // Neem tree for shade, hand-painted sign facing the road.
  k.tree(X0 - 1.6, Z1 + 3, 1.3);
  for (const s of [-1, 1]) k.cyl(X0 - 1.4, 0, Z0 - 1.2 + s * 1.2, 0.05, 0.05, 2.2, 0x5a3a24, 6, 2.2);
  sign2(g, 'TSANGAYA', X0 - 1.4, 1.75, Z0 - 1.2, -HALF, 2.6, 0.8, { bg: '#f2e6c9', fg: '#0f6b3a', sub: "Makarantar Allo • Qur'anic school" });
  k.flush(g);
  fire.flush(b, g, 0xff8a2a, 0x8c3a1a, 2.6);

  const almajiri = (): Partial<CharacterConfig> => ({
    outfit: 'jalabiya', headwear: 'kufi', hair: 'bald', facialHair: 'none', shoes: 'sandals', primary: pick(rng, [0, 1, 12, 13, 16]),
    bag: false, watch: false, chain: false, shades: false, specs: false,
  });
  const agents: AgentSpec[] = [
    { kind: 'static', x: TX, z: Z0 + 1.3, facing: 0, pose: 'sit', cfg: { outfit: 'kaftan', primary: 0, secondary: 1, headwear: 'kufi', facialHair: 'beard', hairColor: 4, build: 'slim', bag: false, watch: false, chain: false, shades: false, specs: true } },
    { kind: 'static', x: X0 + 1, z: Z0 - 2.8, facing: -HALF, pose: 'normal', scale: 0.75, cfg: almajiri() },
    { kind: 'static', x: X0 + 1.9, z: Z0 - 3.6, facing: -HALF - 0.5, pose: 'normal', scale: 0.72, cfg: almajiri() },
  ];
  for (const [x, z] of boys) agents.push({ kind: 'static', x, z, facing: Math.PI, pose: 'sit', scale: 0.75, cfg: almajiri() });
  b.crowds.push({ id: 'tsangaya', cx: TX, cz: 212, radius: 60, agents });
}

// =====================================================================
// 6. FCTA SECRETARIAT — Central Area (FCT Minister)
// =====================================================================
function fcta(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'fcta');
  const k = new Kit(world);
  const win = new Lights();
  const lit = new Lights();
  const X0 = 324, X1 = 365, Z0 = 8.5, Z1 = 62, CX = 345;
  const BZ0 = 36, BZ1 = 56, BX0 = 328, BX1 = 362;
  const CREAM = 0xefe9dc;
  const GREEN = 0x1f6b3a;

  // Grounds: lawn, forecourt drive, red carpet.
  k.floor(X0, Z0, X1, Z1, 0.03, 0x6f9a45);
  k.floor(X0 + 1, 13, X1 - 1, 22.5, 0.04, 0x3d3e41);
  k.floor(CX - 4, Z0 - 3.5, CX + 4, 13, 0.04, 0x3d3e41);
  k.floor(BX0 - 2, 22.5, BX1 + 2, BZ0, 0.04, 0xd9d4c5);
  k.floor(CX - 1.3, 21, CX + 1.3, BZ0, 0.06, 0x9a1b2a);

  // Main block, central tower, green federal trims.
  k.box(CX, 0, (BZ0 + BZ1) / 2, BX1 - BX0, 16, BZ1 - BZ0, CREAM, true);
  k.box(CX, 16, (BZ0 + BZ1) / 2, BX1 - BX0 + 0.6, 0.7, BZ1 - BZ0 + 0.6, GREEN);
  k.box(CX, 16.7, 46, 13, 6, 14, CREAM, 22.7);
  k.box(CX, 22.7, 46, 13.6, 0.7, 14.6, GREEN);
  // Window bays (green glass by day, lit at night) between white fins.
  for (let f = 0; f < 4; f++) {
    const y = 1.0 + f * 3.7;
    for (let x = BX0 + 1.5; x < BX1 - 1; x += 3) {
      if (f === 0 && Math.abs(x - CX) < 6) continue;
      win.box(x, y, BZ0 - 0.04, 2.3, 2.0, 0.08);
      win.box(x, y, BZ1 + 0.04, 2.3, 2.0, 0.08);
    }
    for (let z = BZ0 + 1.5; z < BZ1 - 1; z += 3) {
      win.box(BX0 - 0.04, y, z, 0.08, 2.0, 2.3);
      win.box(BX1 + 0.04, y, z, 0.08, 2.0, 2.3);
    }
  }
  for (let x = BX0; x <= BX1 + 0.01; x += 3) k.box(x, 0, BZ0 - 0.2, 0.3, 16, 0.4, 0xffffff);
  for (let f = 0; f < 2; f++) for (let x = CX - 5; x <= CX + 5; x += 2.5) win.box(x, 17.6 + f * 2.5, 38.96, 1.8, 1.6, 0.08);
  // Facade sign band.
  k.box(CX, 14.6, BZ0 - 0.45, 30, 1.3, 0.2, GREEN);
  sign(g, 'FEDERAL CAPITAL TERRITORY ADMINISTRATION', CX, 15.25, BZ0 - 0.58, Math.PI, 29.4, 1.15, { bg: '#1f6b3a', fg: '#ffffff', w: 2048, h: 80 });
  // Portico: columns, slab, glass doors, steps.
  for (let i = 0; i < 6; i++) k.cyl(CX - 6.5 + i * 2.6, 0, BZ0 - 4.2, 0.42, 0.48, 7.5, 0xf6f1e4, 14, 7.5);
  k.box(CX, 7.5, BZ0 - 2.3, 16, 0.8, 4.8, 0xf4f0e6);
  k.box(CX, 8.3, BZ0 - 2.3, 16.4, 0.3, 5.2, GREEN);
  sign(g, 'Office of the Honourable Minister', CX, 7.9, BZ0 - 4.72, Math.PI, 13, 0.7, { bg: '#f4f0e6', fg: '#1f6b3a', w: 1024, h: 56 });
  k.box(CX, 0.05, BZ0 - 0.05, 6.4, 3.8, 0.1, 0x1b2833);
  for (const x of [CX - 1.6, CX, CX + 1.6]) k.box(x, 0.05, BZ0 - 0.12, 0.06, 3.8, 0.06, 0xc9ccd1);
  lit.box(CX, 3.9, BZ0 - 0.15, 6.4, 0.08, 0.1);
  k.box(CX, 0, BZ0 - 1.2, 14, 0.12, 2.4, 0xd9d4c5);
  k.box(CX, 0, BZ0 - 2.6, 15, 0.06, 5.2, 0xe4dfd2);
  for (let i = 0; i < 3; i++) lit.box(CX - 5 + i * 5, 7.42, BZ0 - 2.3, 1.2, 0.06, 1.2);
  // Flags on either side of the carpet, hedge beds.
  for (const [x, cols] of [[CX - 6, [0x0f8a4b, 0xffffff, 0x0f8a4b]], [CX - 9, [0x0f8a4b, 0xffffff, 0x0f8a4b]], [CX + 6, [0xffffff, 0x1f6b3a, 0xffffff]], [CX + 9, [0x0f8a4b, 0xffffff, 0x0f8a4b]]] as const) {
    flagPole(k, x, 27, 9, cols as unknown as [number, number, number]);
  }
  for (const s of [-1, 1]) {
    k.box(CX + s * 7.5, 0, 27, 6, 0.55, 2.4, 0x2f6f2a, 0.55);
    for (let i = 0; i < 6; i++) k.sphere(CX + s * 7.5 - 2.5 + i, 0.6, 27 + (i % 2 ? 0.6 : -0.6), 0.18, pick(mulberry32(i + 11), [0xc0262d, 0xe8a317, 0xffffff]), 1, 6);
  }
  // Fence + gatehouse + raised boom barrier.
  const fence = (x0: number, z0: number, x1: number, z1: number) => {
    k.wall(x0, z0, x1, z1, 1.0, 0xe6dfcf, 0.4);
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    k.box((x0 + x1) / 2, 2.0, (z0 + z1) / 2, horiz ? len : 0.08, 0.08, horiz ? 0.08 : len, 0x1a1a1a);
    for (let t = 0; t <= len; t += 0.5) k.box(horiz ? Math.min(x0, x1) + t : (x0 + x1) / 2, 1.0, horiz ? (z0 + z1) / 2 : Math.min(z0, z1) + t, 0.04, 1.0, 0.04, 0x1a1a1a);
  };
  fence(X0, Z0 - 0.2, CX - 4.5, Z0 + 0.2);
  fence(CX + 4.5, Z0 - 0.2, X1, Z0 + 0.2);
  fence(X0 - 0.2, Z0, X0 + 0.2, Z1);
  fence(X1 - 0.2, Z0, X1 + 0.2, Z1);
  fence(X0, Z1 - 0.2, X1, Z1 + 0.2);
  for (const s of [-1, 1]) k.box(CX + s * 4.9, 0, Z0, 0.8, 2.8, 0.8, 0xe6dfcf, true);
  sign2(g, 'FCTA', CX - 4.9, 2.1, Z0 - 0.42, Math.PI, 0.75, 0.5, { bg: '#1f6b3a' });
  k.box(CX - 9, 0, Z0 + 2.4, 3.6, 2.8, 3, CREAM, true);
  k.box(CX - 9, 2.8, Z0 + 2.4, 4.2, 0.25, 3.6, GREEN);
  k.box(CX - 7.15, 1.0, Z0 + 2.4, 0.05, 1.1, 2, 0x1b2833);
  sign(g, 'SECURITY CHECK', CX - 9, 2.45, Z0 + 0.88, Math.PI, 2.4, 0.4, { bg: '#123e7c' });
  k.box(CX + 4.3, 0, Z0 + 0.9, 0.5, 1.1, 0.5, 0xc0262d, true);
  for (let i = 0; i < 6; i++) k.geo(new THREE.BoxGeometry(0.6, 0.12, 0.12).translate(-0.3 - i * 0.6, 0, 0).rotateZ(-1.25).translate(CX + 4.3, 1.15, Z0 + 0.9), i % 2 ? 0xffffff : 0xc0262d);
  // Monument sign by the gate.
  k.box(CX + 12, 0, Z0 + 2, 9, 1.8, 0.6, 0xd9d4c5, true);
  sign2(g, 'FEDERAL CAPITAL TERRITORY ADMINISTRATION', CX + 12, 1.05, Z0 + 1.68, Math.PI, 8.6, 1.4, { bg: '#1f6b3a', fg: '#ffffff', sub: 'Office of the Honourable Minister', w: 1024, h: 168 });
  // Convoy: police escort + black SUVs, flashing lights.
  parkedCars(g, world, [
    { x: 331, z: 17.8, heading: -HALF, color: 0xeeeeee },
    { x: 337.5, z: 17.8, heading: -HALF, color: 0x0d0d0d },
    { x: CX, z: 17.8, heading: -HALF, color: 0x0d0d0d, model: 'benz' },
    { x: 352.5, z: 17.8, heading: -HALF, color: 0x0d0d0d },
    { x: 359, z: 17.8, heading: -HALF, color: 0x0d0d0d },
  ]);
  k.box(331, 1.95, 17.8, 0.4, 0.05, 1.4, 0x222222);
  const red = glow(g, 331, 2.0, 17.4, 0.3, 0.14, 0.5, 0xff2020, 1.3);
  const blue = glow(g, 331, 2.0, 18.2, 0.3, 0.14, 0.5, 0x2050ff, 1.3);
  b.animators.push((t) => {
    const on = Math.floor(t * 4) % 2 === 0;
    red.visible = on;
    blue.visible = !on;
  });
  sign(g, 'POLICE', 331, 1.05, 18.82, 0, 1.4, 0.3, { bg: '#123e7c' });
  sign(g, 'POLICE', 331, 1.05, 16.78, Math.PI, 1.4, 0.3, { bg: '#123e7c' });
  for (const s of [-1, 1]) k.box(CX - 2.15, 0.9, 17.8 + s * 0.35, 0.04, 0.35, 0.02, 0x999999);
  k.box(CX - 2.35, 1.2, 17.45, 0.02, 0.2, 0.3, 0x0f8a4b);
  // Lamp posts.
  for (const x of [X0 + 3, X1 - 3]) for (const z of [12, 32]) {
    k.cyl(x, 0, z, 0.08, 0.11, 5, 0x333333, 6, 5);
    lit.box(x, 5, z, 0.6, 0.3, 0.6);
  }
  k.flush(g);
  win.flush(b, g, 0xffe7b0, 0x2f5a4a, 1.3);
  lit.flush(b, g, 0xfff1c4, 0xdddddd, 2);

  const guard: Partial<CharacterConfig> = { outfit: 'suit', primary: ci(0x1f6b3a), secondary: ci(0x1f6b3a), headwear: 'cap', hair: 'lowcut', facialHair: 'none', shades: false, bag: false };
  const dss: Partial<CharacterConfig> = { outfit: 'suit', primary: ci(0x111111), secondary: ci(0x111111), headwear: 'none', hair: 'lowcut', shades: true, build: 'heavy', bag: false };
  const aide: Partial<CharacterConfig> = { outfit: 'senator', primary: ci(0xffffff), secondary: ci(0x0f8a4b), headwear: 'fila' };
  b.crowds.push({
    id: 'fcta', cx: CX, cz: 25, radius: 80,
    agents: [
      { kind: 'static', x: CX - 3.4, z: Z0 + 1.2, facing: Math.PI, pose: 'normal', cfg: guard },
      { kind: 'static', x: CX + 3.4, z: Z0 + 1.6, facing: Math.PI, pose: 'normal', cfg: guard },
      { kind: 'static', x: CX - 4, z: BZ0 - 5.6, facing: Math.PI, pose: 'normal', cfg: guard },
      { kind: 'static', x: CX + 4, z: BZ0 - 5.6, facing: Math.PI, pose: 'normal', cfg: guard },
      { kind: 'static', x: CX - 2.3, z: 20, facing: 0.3, pose: 'normal', cfg: dss },
      { kind: 'static', x: CX + 2.3, z: 20, facing: -0.3, pose: 'normal', cfg: dss },
      { kind: 'static', x: 333.5, z: 20.2, facing: 0.4, pose: 'phone', cfg: dss },
      { kind: 'static', x: 331, z: 15.4, facing: Math.PI, pose: 'normal', cfg: { outfit: 'suit', primary: ci(0x111111), secondary: ci(0x123e7c), headwear: 'cap' } },
      { kind: 'static', x: 355, z: 24, facing: -2.6, pose: 'phone', cfg: aide },
      { kind: 'static', x: 336, z: 31, facing: 2.5, pose: 'phone', cfg: aide },
      { kind: 'static', x: 337.2, z: 30.2, facing: -0.8, pose: 'normal', cfg: { outfit: 'suit', primary: ci(0x123e7c), hair: 'hijab', headwear: 'none', facialHair: 'none' } },
    ],
  });
}

// =====================================================================
// 7. Federal Ministry of Wahala (Landmarks.ts) — give it a front door (Civil Servant)
// =====================================================================
function ministryDoor(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'ministry-door');
  const k = new Kit(world);
  const Z = 52;
  k.floor(293, Z, 307, Z + 4.5, 0.05, 0xd9d4c5);
  k.box(300, 0, Z + 0.06, 3.6, 3, 0.12, 0x1b2833);
  k.box(300, 0, Z + 0.1, 0.06, 3, 0.06, 0xc9ccd1);
  k.box(300, 3.2, Z + 1.6, 7, 0.3, 3.2, 0x0f6b3a);
  for (const x of [297, 303]) k.cyl(x, 0, Z + 3, 0.16, 0.16, 3.2, 0xf4f0e6, 10, 3.2);
  sign(g, 'MAIN ENTRANCE • VISITORS REPORT HERE', 300, 3.35, Z + 3.22, 0, 6.6, 0.4, { bg: '#0f6b3a', w: 1024, h: 62 });
  k.bench(305.5, Z + 2, HALF, 0x7a5534);
  k.flush(g);
  b.crowds.push({
    id: 'ministry-door', cx: 300, cz: Z + 3, radius: 50,
    agents: [
      { kind: 'static', x: 305.5, z: Z + 1.4, facing: -HALF, pose: 'sit', cfg: { outfit: 'kaftan', headwear: 'kufi' } },
      { kind: 'static', x: 305.5, z: Z + 2.6, facing: -HALF, pose: 'sit', cfg: { outfit: 'iroBuba', hair: 'gele', headwear: 'none', facialHair: 'none' } },
      { kind: 'static', x: 295.4, z: Z + 2.2, facing: 0.4, pose: 'phone', cfg: { outfit: 'senator', primary: ci(0x8c5a2b), headwear: 'none' } },
    ],
  });
}

/** A proper workplace for every role that doesn't already have one. */
export function buildWorkspaces(world: CollisionWorld): LocationBuild {
  const b = newBuild('workspaces');
  techHub(world, b);
  school(world, b);
  posStand(world, b);
  fabricShop(world, b);
  tsangaya(world, b);
  fcta(world, b);
  ministryDoor(world, b);
  return b;
}
