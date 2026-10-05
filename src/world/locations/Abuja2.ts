import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import { carModelGeometry, type CarModel } from '../../player/Vehicle';
import type { AgentSpec } from '../Crowd';
import { NPC_SPOTS } from '../MapData';
import { normalizeGeo, paint } from '../Materials';
import { BoxField, Kit, THREE, fountain, glow, newBuild, nightMat, sign, waterMat, type LocationBuild } from './kit';
import type { QuickItem, QuickZone } from './QuickPlaces';

/*
 * Ten more real Abuja places, stylised low-poly. Plots (x east, z south):
 *   Farm City            Wuse 2        x 48..112,   z 48..112   (+ interior 1700..1750, -40..0)
 *   Banex Plaza          Wuse 2        x -112..-10, z 46..112
 *   Transcorp Hilton     Maitama       x 10..112,   z -362..-258 (+ lobby 1700..1760, 60..100)
 *   Unity Fountain       Maitama       x 10..112,   z -240..-138
 *   National Assembly    Three Arms    x 386..552,  z -106..79
 *   Silverbird Galleria  Central       x 296..362,  z 70..112
 *   Wonderland           Garki         x 12..110,   z 262..360
 *   Jabi Motor Park      Utako         x -362..-260, z 138..240
 *   National Stadium     Airport Road  x -590..-420, z 268..400
 *   Nnamdi Azikiwe Airport (west)      x -910..-640, z -95..405
 */

const HALF = Math.PI / 2;
const STONE = 0xd9d0bc;
const PAVE = 0xe2dccd;
const HEDGE = 0x2f6f2a;
const GLASS = 0x2c4a5e;
const SIGN_COLS = [0xc0262d, 0x123e7c, 0xe8a317, 0x0f8a4b, 0x6c2c91, 0xf26b1d, 0x2a64c9, 0xffffff, 0xd94f8c];

type Build = LocationBuild;

function sub(b: Build, name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  b.group.add(g);
  return g;
}

/** Collects geometry that glows at night (windows, bulbs, neon) into one mesh. */
class Lights {
  private geos: THREE.BufferGeometry[] = [];
  box(x: number, y: number, z: number, w: number, h: number, d: number, ry = 0): this {
    this.geos.push(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y + h / 2, z));
    return this;
  }
  ball(x: number, y: number, z: number, r: number): this {
    this.geos.push(new THREE.SphereGeometry(r, 6, 4).translate(x, y, z));
    return this;
  }
  geo(g: THREE.BufferGeometry): this {
    this.geos.push(g);
    return this;
  }
  flush(b: Build, parent: THREE.Object3D, color: number, day = 0x8a8a8a, strength = 1.6): THREE.Mesh | null {
    if (!this.geos.length) return null;
    const mat = nightMat(color, day, strength);
    b.glowMats.push(mat);
    const m = new THREE.Mesh(mergeGeometries(this.geos), mat);
    parent.add(m);
    this.geos.forEach((g) => g.dispose());
    this.geos = [];
    return m;
  }
}

const vc = (geo: THREE.BufferGeometry, color: number) => normalizeGeo(paint(geo, color));

/** Many always-lit boxes (ceiling lights, stage lamps) merged into one unlit mesh. */
function glowBoxes(g: THREE.Object3D, boxes: [number, number, number, number, number, number, number][], intensity = 1): void {
  if (!boxes.length) return;
  const geos = boxes.map(([x, y, z, w, h, d, c]) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), new THREE.Color(c).multiplyScalar(intensity)));
  g.add(new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
  geos.forEach((x) => x.dispose());
}

function vcMesh(list: THREE.BufferGeometry[]): THREE.Mesh {
  const m = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = true;
  m.receiveShadow = true;
  list.forEach((g) => g.dispose());
  return m;
}

interface Parked { x: number; z: number; heading: number; color: number; model?: CarModel; taxi?: boolean }

/** Parked cars, one instanced mesh per model, with colliders. */
function parkedCars(g: THREE.Object3D, world: CollisionWorld, cars: Parked[]): void {
  const groups = new Map<string, Parked[]>();
  for (const c of cars) {
    const key = `${c.model ?? 'corolla'}|${c.taxi ? 1 : 0}`;
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(c);
    const along = Math.abs(Math.sin(c.heading)) > 0.5;
    world.addBox(c.x - (along ? 2.3 : 1), c.z - (along ? 1 : 2.3), c.x + (along ? 2.3 : 1), c.z + (along ? 1 : 2.3), 1.5);
  }
  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: 0x555555 });
  for (const [key, list] of groups) {
    const [model, taxi] = key.split('|');
    const isTaxi = taxi === '1';
    const mesh = new THREE.InstancedMesh(carModelGeometry(model as CarModel, isTaxi ? 0x1f9a4f : 0xffffff, true, isTaxi), mat, list.length);
    list.forEach((c, i) => {
      mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.heading, 0)), new THREE.Vector3(1, 1, 1)));
      if (!isTaxi) mesh.setColorAt(i, new THREE.Color(c.color));
    });
    mesh.castShadow = true;
    mesh.computeBoundingSphere();
    g.add(mesh);
  }
}

/** Plaques for many short labels in one texture (one draw call). */
function labelAtlas(names: string[], bg: string, fg: string): THREE.Texture {
  const rowH = 40;
  const w = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = rowH * names.length;
  const g = c.getContext('2d')!;
  names.forEach((n, i) => {
    const y = i * rowH;
    g.fillStyle = bg;
    g.fillRect(0, y, w, rowH);
    g.strokeStyle = '#d4a62a';
    g.lineWidth = 3;
    g.strokeRect(2, y + 2, w - 4, rowH - 4);
    g.fillStyle = fg;
    g.font = '800 24px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(n.toUpperCase(), w / 2, y + rowH / 2 + 1, w - 14);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function atlasPlane(i: number, n: number, w: number, h: number, x: number, y: number, z: number, ry: number): THREE.BufferGeometry {
  const p = new THREE.PlaneGeometry(w, h);
  const uv = p.attributes.uv;
  for (let j = 0; j < uv.count; j++) uv.setY(j, 1 - (i + 1) / n + uv.getY(j) / n);
  return p.rotateY(ry).translate(x, y, z);
}

/** Nigerian flag (green-white-green) on a pole at (x, z). */
function flagPole(k: Kit, x: number, z: number, h = 9, cols: [number, number, number] = [0x0f8a4b, 0xffffff, 0x0f8a4b]): void {
  k.cyl(x, 0, z, 0.07, 0.09, h, 0xdddddd, 6, h);
  k.sphere(x, h + 0.1, z, 0.13, 0xd4a62a, 1, 6);
  for (let j = 0; j < 3; j++) k.box(x + 0.4 + j * 0.62, h - 1.6, z, 0.62, 1.3, 0.04, cols[j]);
}

function umbrella(k: Kit, x: number, z: number, y: number, r: number, color: number): void {
  k.cyl(x, 0, z, 0.04, 0.04, y, 0x555555, 6);
  k.cone(x, y, z, r, r * 0.35, color, 8);
}

/** Simple sign on two posts (with colliders). Faces +z when ry = 0. */
function postSign(g: THREE.Object3D, k: Kit, text: string, x: number, z: number, ry: number, w: number, h: number, y: number, opts: Parameters<typeof sign>[8] = {}): void {
  const ox = Math.cos(ry) * (w / 2 - 0.2);
  const oz = -Math.sin(ry) * (w / 2 - 0.2);
  for (const s of [-1, 1]) k.cyl(x + ox * s, 0, z + oz * s, 0.08, 0.08, y + h / 2, 0x444444, 6, y + h / 2);
  sign(g, text, x, y, z, ry, w, h, opts);
  sign(g, text, x - Math.sin(ry) * 0.04, y, z - Math.cos(ry) * 0.04, ry + Math.PI, w, h, opts);
}

// =====================================================================
// 1. FARM CITY — 24-hour restaurant, bar & lounge, Kashim Ibrahim Way, Wuse 2
// =====================================================================
function farmCity(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'farmcity');
  const k = new Kit(world);
  const rng = mulberry32(301);
  const glaze = new Lights();
  const bulbs = new Lights();
  const neon = new Lights();
  const red = new Lights();
  const CREAM = 0xf1e6cf;
  const TERRA = 0x8a3b1f;
  const agents: AgentSpec[] = [];

  // ---- Grounds & hedges ----
  k.floor(48, 48, 112, 112, 0.03, 0x5f9a42);
  for (let i = 0; i < 8; i++) k.floor(49, 79 + i * 4, 111, 81 + i * 4, 0.032, 0x68a64a);
  k.floor(48, 72, 112, 78, 0.05, 0xcdbf9f); // terrace
  k.floor(85, 78, 93, 112, 0.05, 0xcdbf9f); // path from the gate
  k.wall(48, 48, 112, 49, 1.2, HEDGE, 1);
  k.wall(48, 49, 49, 112, 1.2, HEDGE, 1);
  k.wall(111, 49, 112, 112, 1.2, HEDGE, 1);
  k.wall(49, 111, 84, 112, 1.2, HEDGE, 1);
  k.wall(94, 111, 111, 112, 1.2, HEDGE, 1);
  // Gate arch facing Kashim Ibrahim Way junction.
  for (const x of [83.4, 94.6]) k.box(x, 0, 111.5, 1.2, 4, 1.2, TERRA, true);
  k.box(89, 4, 111.5, 12.4, 0.8, 1, TERRA);
  sign(g, 'FARM CITY', 89, 5.15, 112.06, 0, 9, 1.4, { bg: '#1d5a2a', fg: '#ffe08a', sub: 'Restaurant • Bar • Lounge • Open 24/7' });
  sign(g, 'WELCOME TO FARM CITY', 89, 5.15, 110.94, Math.PI, 9, 1.4, { bg: '#1d5a2a', fg: '#ffe08a', sub: 'Chop • Drink • Enjoy' });
  // Street name sign on the corner.
  k.cyl(113.3, 0, 113.3, 0.06, 0.06, 3.1, 0x555555, 6, 3.1);
  sign(g, 'KASHIM IBRAHIM WAY', 113.36, 2.8, 113.3, HALF, 3.4, 0.5, { bg: '#0f6b3a', sub: 'Wuse II' });
  sign(g, 'KASHIM IBRAHIM WAY', 113.24, 2.8, 113.3, -HALF, 3.4, 0.5, { bg: '#0f6b3a', sub: 'Wuse II' });

  // ---- Main building (two storeys, terrace canopy) ----
  k.box(89, 0, 61, 38, 4.4, 22, CREAM, true); // x 70..108, z 50..72
  glaze.box(79, 0.4, 72.05, 16, 3, 0.1);
  glaze.box(99, 0.4, 72.05, 16, 3, 0.1);
  k.box(89, 0, 72.07, 3, 3.3, 0.1, 0x3a2418); // door
  glow(g, 89, 0.1, 72.13, 2.4, 2.9, 0.03, 0xffc77a, 0.55);
  k.box(89, 4.4, 62.5, 40, 0.45, 25, 0xd8ccb2); // canopy slab over the terrace
  for (const x of [71, 80, 98, 107]) k.cyl(x, 0, 74.4, 0.22, 0.22, 4.4, 0xf3efe6, 10, true);
  k.box(89, 4.85, 60, 34, 3.6, 18, 0xe8dcc6, true);
  glaze.box(89, 5.4, 69.05, 30, 2.2, 0.1);
  k.box(89, 8.45, 60, 34.6, 0.5, 18.6, TERRA);
  // Rooftop sign.
  for (const x of [83, 95]) k.box(x, 8.95, 66, 0.25, 1.6, 0.25, 0x333333);
  sign(g, 'FARM CITY', 89, 10.6, 66.2, 0, 14, 2.6, { bg: '#1d5a2a', fg: '#ffe08a', sub: 'Restaurant • Bar & Lounge • Game Arcade' });
  neon.box(89, 9.2, 66.32, 14.4, 0.14, 0.14);
  neon.box(89, 11.92, 66.32, 14.4, 0.14, 0.14);
  sign(g, 'FARM CITY  •  RESTAURANT  •  BAR  •  LOUNGE', 89, 4.62, 75.02, 0, 22, 0.42, { bg: '#1d5a2a', fg: '#ffe08a' });
  sign(g, 'OPEN 24 HRS', 95.5, 3.55, 74.85, 0, 3.2, 0.8, { bg: '#c0262d', fg: '#ffffff' });
  red.box(95.5, 3.1, 74.9, 3.4, 0.08, 0.08);
  red.box(95.5, 3.98, 74.9, 3.4, 0.08, 0.08);
  for (const x of [84, 94]) {
    k.cyl(x, 0, 75.6, 0.35, 0.3, 0.6, 0x7a5534, 10, 0.6); // planters by the door
    k.sphere(x, 1.0, 75.6, 0.55, 0x3f7f2f, 1, 8);
  }

  // ---- Garden tables under string lights ----
  for (const x of [55, 63, 71, 79]) {
    for (const z of [84, 93, 102]) {
      k.cyl(x, 0, z, 0.08, 0.1, 0.72, 0x333333, 6);
      k.cyl(x, 0.72, z, 0.75, 0.75, 0.06, 0xf3efe6, 14);
      world.addCircle(x, z, 0.8, 0.8);
      if ((x + z) % 2 === 0) umbrella(k, x, z, 2.45, 1.9, pick(rng, [0x1d5a2a, 0xe8a317, 0xffffff, 0xc0262d]));
      for (const s of [-1, 1]) {
        const cx = x + s * 1.15;
        k.box(cx, 0, z, 0.5, 0.45, 0.5, 0x6b4a2b);
        k.box(cx + s * 0.22, 0.45, z, 0.06, 0.5, 0.5, 0x6b4a2b);
        if (rng() < 0.62) agents.push({ kind: 'static', x: cx, z, facing: s > 0 ? -HALF : HALF, pose: 'sit' });
      }
    }
  }
  for (const z of [80.5, 89, 97.5, 106]) {
    for (const x of [50.5, 83]) k.cyl(x, 0, z, 0.07, 0.09, 3.4, 0x333333, 6, 3.4);
    k.box(66.75, 3.25, z, 32.5, 0.03, 0.03, 0x222222);
    for (let x = 51.5; x < 82.5; x += 1.45) bulbs.ball(x, 3.15, z, 0.09);
  }

  // ---- Live band stage ----
  k.box(103, 0, 85, 14, 0.12, 9, 0x3a2a20);
  k.box(103, 0, 80.6, 14, 4.6, 0.3, 0x1a1a1a, true);
  for (const x of [96.2, 109.8]) k.cyl(x, 0, 89.3, 0.15, 0.15, 4.8, 0x8a8a8a, 6, 4.8);
  k.box(103, 4.7, 89.3, 14, 0.3, 0.3, 0x8a8a8a);
  glowBoxes(g, [0xff3df0, 0x3dd8ff, 0xfff23d, 0x6cff3d, 0xff7a3d].map((c, i) => [98 + i * 2.5, 4.3, 89.1, 0.4, 0.35, 0.4, c]));
  for (const x of [96.9, 109.1]) k.box(x, 0, 88.6, 1.1, 2.2, 1, 0x111111, true);
  k.cyl(103, 0.12, 82.7, 0.5, 0.5, 0.55, 0xc0262d, 12);
  for (const s of [-1, 1]) k.cyl(103 + s, 0.12, 83.3, 0.28, 0.28, 0.45, 0xdddddd, 10);
  k.cyl(101.6, 0.12, 82.4, 0.02, 0.02, 1.2, 0x333333, 4);
  k.cyl(101.6, 1.32, 82.4, 0.36, 0.36, 0.03, 0xd4a62a, 12);
  k.cyl(103, 0.12, 81.95, 0.25, 0.22, 0.45, 0x222222, 8); // drum stool
  world.addCircle(103, 82.8, 1.1, 1);
  k.box(99.5, 0.9, 83.4, 1.3, 0.1, 0.4, 0x111111);
  for (const s of [-1, 1]) k.box(99.5 + s * 0.5, 0.12, 83.4, 0.06, 0.8, 0.3, 0x333333);
  k.cyl(103, 0.12, 87.6, 0.02, 0.02, 1.5, 0x333333, 4);
  sign(g, 'LIVE BAND NIGHT', 103, 3.4, 80.78, 0, 8, 1.3, { bg: '#1a0a24', fg: '#ffd76a', sub: 'Highlife • Afrobeats • Fuji • Every night' });
  const band = { outfit: 'senator' as const, primary: 7, secondary: 11 };
  agents.push(
    { kind: 'static', x: 103, z: 82.0, facing: 0, pose: 'sit', cfg: band },
    { kind: 'static', x: 99.8, z: 86.2, facing: 0, pose: 'dance', cfg: band },
    { kind: 'static', x: 103, z: 87.0, facing: 0, pose: 'cheer', cfg: { outfit: 'asoebi', primary: 8, secondary: 2, hair: 'gele', headwear: 'none', facialHair: 'none' } },
    { kind: 'static', x: 106.2, z: 86.2, facing: 0, pose: 'dance', cfg: band },
    { kind: 'static', x: 99.5, z: 82.7, facing: 0, pose: 'normal', cfg: band },
  );
  for (let i = 0; i < 9; i++) agents.push({ kind: 'static', x: 98.5 + (i % 5) * 2.4 + (i > 4 ? 1.2 : 0), z: 93 + Math.floor(i / 5) * 3 + rng() * 0.8, facing: Math.PI, pose: i % 3 === 0 ? 'cheer' : 'dance' });

  // ---- Pepper soup gazebo ----
  k.cyl(58, 0, 60, 5.5, 5.6, 0.12, 0xcdbf9f, 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.cyl(58 + Math.cos(a) * 5, 0, 60 + Math.sin(a) * 5, 0.14, 0.14, 3, 0x6b4a2b, 6, 3);
  }
  k.cone(58, 3, 60, 6.6, 2.6, 0xc9a35a, 10);
  k.cyl(58, 0, 60, 1.5, 1.5, 1.0, 0x6b4a2b, 14, 1.0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const x = 58 + Math.cos(a) * 2.5;
    const z = 60 + Math.sin(a) * 2.5;
    k.cyl(x, 0, z, 0.22, 0.2, 0.45, 0x8c5a2b, 8);
    if (i % 2 === 0) agents.push({ kind: 'static', x, z, facing: Math.atan2(58 - x, 60 - z), pose: 'sit' });
  }
  sign(g, 'PEPPERSOUP • ASUN • NKWOBI', 58, 2.55, 65.25, 0, 4.4, 0.55, { bg: '#7a2e1e', fg: '#ffe08a' });
  for (const [x, z] of [[52.5, 107.5], [107.5, 107.5], [52.5, 75.5]] as const) k.tree(x, z, 1, true);
  k.flush(g);
  glaze.flush(b, g, 0xffcf8a, GLASS, 1.3);
  bulbs.flush(b, g, 0xffd27a, 0xf3ead2, 2.4);
  neon.flush(b, g, 0x5dff8a, 0x2f6f3a, 2.2);
  red.flush(b, g, 0xff4040, 0x8a2020, 2.4);

  // Waiters weaving between the tables, people on the terrace.
  agents.push(
    { kind: 'wander', rect: { x0: 50, z0: 73, x1: 69, z1: 77 }, count: 3 },
    { kind: 'wander', rect: { x0: 85.5, z0: 79, x1: 92.5, z1: 108 }, count: 3, carry: 'bag' },
    { kind: 'wander', rect: { x0: 58.6, z0: 86, x1: 59.4, z1: 100 }, count: 1, cfg: { outfit: 'suit', primary: 0, secondary: 11 } },
    { kind: 'wander', rect: { x0: 74.6, z0: 86, x1: 75.4, z1: 100 }, count: 1, cfg: { outfit: 'suit', primary: 0, secondary: 11 } },
    { kind: 'static', x: 63, z: 74.5, facing: 0, pose: 'phone' },
  );
  b.crowds.push({ id: 'farmcity', cx: 80, cz: 82, radius: 95, agents });

  farmCityInterior(world, b);
}

/** Farm City lounge interior: bar, dining, game arcade and a small stage. */
function farmCityInterior(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'farmcity-in');
  const k = new Kit(world);
  const rng = mulberry32(311);
  const X0 = 1700, X1 = 1750, Z0 = -40, Z1 = 0, H = 6;
  const WALLC = 0x5a4030;
  k.floor(X0, Z0, X1, Z1, 0.01, 0x4a3022);
  for (let x = X0; x < X1; x += 1.25) k.floor(x, Z0, x + 0.05, Z1, 0.012, 0x3a2418);
  k.wall(X0 - 1, Z0 - 1, X1 + 1, Z0, H, WALLC, 1);
  k.wall(X0 - 1, Z0, X0, Z1, H, WALLC, 1);
  k.wall(X1, Z0, X1 + 1, Z1, H, WALLC, 1);
  k.wall(X0 - 1, Z1, 1723, Z1 + 1, H, WALLC, 1);
  k.wall(1727, Z1, X1 + 1, Z1 + 1, H, WALLC, 1);
  k.box(1725, 3.2, Z1 + 0.5, 4, H - 3.2, 1, WALLC);
  world.addBox(1723, Z1, 1727, Z1 + 0.4, 4);
  glow(g, 1725, 0, Z1 + 0.25, 3.8, 3.1, 0.06, 0x9fd0a0, 0.8);
  // Green wainscot band.
  k.box((X0 + X1) / 2, 0, Z0 + 0.03, X1 - X0, 1.2, 0.06, 0x1d5a2a);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(52, 42).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2a1c14 }));
  ceil.position.set(1725, H, -20);
  g.add(ceil);
  const ceilLights: [number, number, number, number, number, number, number][] = [];
  for (let x = 1706; x < 1748; x += 8) for (let z = -34; z < -2; z += 8) ceilLights.push([x, H - 0.12, z, 1.6, 0.08, 1.6, 0xffe2b0]);
  glowBoxes(g, ceilLights, 0.9);

  // Bar (west wall).
  k.box(1704.7, 0, -22, 1.0, 1.15, 24, 0x3a2418, true);
  k.box(1704.7, 1.15, -22, 1.3, 0.08, 24.2, 0xd4a62a);
  glow(g, 1705.22, 0.25, -22, 0.04, 0.3, 23.5, 0x7cff8a, 0.7);
  k.box(1700.5, 0, -22, 0.8, 4.2, 24, 0x2a1a12);
  const bottles = new BoxField();
  for (let r = 0; r < 4; r++) for (let i = 0; i < 44; i++) bottles.add(1700.95, 0.6 + r * 0.95, -32.8 + i * 0.5, 0.15, 0.45, 0.15, pick(rng, [0x5a2a10, 0x0f6b3a, 0xd4a62a, 0xffffff, 0x2a64c9, 0xc0262d]));
  bottles.build(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0));
  glow(g, 1700.92, 0.4, -22, 0.03, 3.8, 23, 0xffb36b, 0.35);
  for (let z = -32.5; z <= -11; z += 2.5) if (Math.abs(z + 22) > 1.4) k.cyl(1706.2, 0, z, 0.22, 0.18, 0.75, 0xd4a62a, 8);
  sign(g, 'FARM CITY BAR', 1700.95, 4.75, -22, HALF, 6, 1, { bg: '#1d5a2a', fg: '#ffe08a' });

  // Game arcade (north wall).
  const screens: THREE.Mesh[] = [];
  const marquees: [number, number, number, number, number, number, number][] = [];
  [1710, 1714, 1718, 1730, 1734, 1738].forEach((x, i) => {
    k.box(x, 0, -38.3, 1.5, 2.1, 1.3, [0x1a1a6a, 0x6a1a1a, 0x1a5a2a, 0x3a1a6a, 0x111111, 0x6a4a1a][i], true);
    k.box(x, 0.95, -37.4, 1.4, 0.12, 0.5, 0x222222);
    screens.push(glow(g, x, 1.1, -37.62, 1.1, 0.8, 0.04, 0x3dd8ff, 1));
    marquees.push([x, 1.85, -37.62, 1.3, 0.22, 0.04, [0xff3df0, 0xfff23d, 0x6cff3d, 0xff7a3d, 0x3dd8ff, 0xff3d6a][i]]);
  });
  glowBoxes(g, marquees, 1.2);
  // Claw machine.
  k.box(1744, 0, -37.6, 2, 0.9, 2, 0xd94f8c, true);
  const clawGlass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 1.9), new THREE.MeshPhongMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35 }));
  clawGlass.position.set(1744, 1.6, -37.6);
  g.add(clawGlass);
  for (let i = 0; i < 9; i++) k.sphere(1743.4 + (i % 3) * 0.6, 1.0, -38.2 + Math.floor(i / 3) * 0.6, 0.24, pick(rng, [0xc0262d, 0xe8a317, 0x2a64c9, 0xd94f8c, 0x6cff3d]), 1, 6);
  k.box(1744, 2.3, -37.6, 2, 0.4, 2, 0xd94f8c);
  // Pool table.
  k.box(1716, 0, -31, 3, 0.85, 1.6, 0x5a3a24, true);
  k.box(1716, 0.85, -31, 2.7, 0.04, 1.3, 0x0f6b3a);
  sign(g, 'GAME ARCADE', 1724, 4.4, -38.94, 0, 8, 1.2, { bg: '#1a0a24', fg: '#3dd8ff', sub: 'FIFA • Fighting games • Racing • Claw machine' });
  b.animators.push((t) => {
    screens.forEach((s, i) => (s.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.15 + i * 0.17) % 1, 0.8, 0.45 + Math.sin(t * 3 + i) * 0.08));
  });

  // Dining tables.
  const agents: AgentSpec[] = [];
  for (const x of [1714, 1720.5, 1727, 1733.5]) {
    for (const z of [-24, -16, -8]) {
      k.box(x, 0, z, 1.4, 0.75, 0.9, 0x6b4a2b, 0.8);
      for (const s of [-1, 1]) {
        k.box(x, 0, z + s * 0.95, 0.5, 0.45, 0.45, 0x2a1a12);
        if (rng() < 0.55) agents.push({ kind: 'static', x, z: z + s * 0.95, facing: s > 0 ? Math.PI : 0, pose: 'sit' });
      }
    }
  }
  // Lounge sofas (south-east).
  k.box(1747.5, 0, -7, 1.0, 0.45, 8, 0x7a1f3d, 0.9);
  k.box(1748.1, 0.45, -7, 0.3, 0.6, 8, 0x7a1f3d);
  k.box(1742, 0, -10.6, 8, 0.45, 1.0, 0x7a1f3d, 0.9);
  k.box(1742, 0.45, -11.2, 8, 0.6, 0.3, 0x7a1f3d);
  k.box(1742.5, 0, -6.5, 3, 0.42, 1.6, 0x2a1a12, true);
  agents.push(
    { kind: 'static', x: 1747.4, z: -9, facing: -HALF, pose: 'sit', cfg: { shades: true } },
    { kind: 'static', x: 1747.4, z: -5, facing: -HALF, pose: 'sit' },
    { kind: 'static', x: 1740, z: -10.5, facing: 0, pose: 'sit' },
    { kind: 'static', x: 1744, z: -10.5, facing: 0, pose: 'sit' },
  );
  // Stage (east wall).
  k.box(1746, 0, -25, 7, 0.12, 12, 0x2a2a2a);
  for (const z of [-31.5, -18.5]) k.box(1748.6, 0, z, 1, 2, 1, 0x111111, true);
  glow(g, 1749.9, 3.6, -25, 0.05, 0.1, 11, 0xd94fff, 1);
  sign(g, 'LIVE MUSIC', 1749.9, 4.6, -25, -HALF, 5, 0.9, { bg: '#1a0a24', fg: '#ff7af5' });
  const band = { outfit: 'senator' as const, primary: 7, secondary: 11 };
  agents.push(
    { kind: 'static', x: 1747.5, z: -27, facing: -HALF, pose: 'dance', cfg: band },
    { kind: 'static', x: 1747.5, z: -23, facing: -HALF, pose: 'dance', cfg: band },
    { kind: 'static', x: 1745.4, z: -25, facing: -HALF, pose: 'cheer', cfg: band },
    { kind: 'wander', rect: { x0: 1737, z0: -31, x1: 1741, z1: -19 }, count: 4 },
    { kind: 'wander', rect: { x0: 1708, z0: -35, x1: 1711.5, z1: -5 }, count: 2, cfg: { outfit: 'suit', primary: 0, secondary: 11 } },
    { kind: 'static', x: 1712, z: -35, facing: Math.PI, pose: 'normal' },
    { kind: 'static', x: 1734, z: -35, facing: Math.PI, pose: 'normal' },
    { kind: 'static', x: 1706.6, z: -30, facing: -HALF, pose: 'phone' },
    { kind: 'static', x: 1706.6, z: -15, facing: -HALF, pose: 'normal' },
  );
  // Plants.
  for (const [x, z] of [[1702, -2], [1748, -38], [1702, -38], [1748, -14]] as const) {
    k.cyl(x, 0, z, 0.45, 0.35, 0.7, 0x8c5a2b, 10, 0.8);
    k.sphere(x, 1.3, z, 0.75, 0x3f7f2f, 1.2, 8);
  }
  sign(g, 'FARM CITY LOUNGE', 1725, 4.6, Z1 - 0.06, Math.PI, 7, 1, { bg: '#1d5a2a', fg: '#ffe08a', sub: 'Thank you for coming • Open 24 hrs' });
  k.flush(g);
  b.crowds.push({ id: 'farmcity-in', cx: 1725, cz: -20, radius: 55, agents });
}

// =====================================================================
// 2. BANEX PLAZA — phone & electronics plaza, Wuse 2
// =====================================================================
function banex(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'banex');
  const k = new Kit(world);
  const rng = mulberry32(302);
  const shops = new Lights();
  const wins = new Lights();
  const X0 = -104, X1 = -18, Z1 = 78;
  k.floor(-112, 46, -10, 112, 0.035, 0x8e8c86);
  for (let x = -106; x <= -15; x += 6.5) k.floor(x - 0.08, 97, x + 0.08, 107, 0.04, 0xf0f0f0);
  k.floor(-112, 78, -10, 86, 0.045, 0xc9c3b4);
  // Plaza block (4 floors).
  k.box(-61, 0, 65, X1 - X0, 15, 26, 0xe6dfcf, true);
  k.box(-61, 15, 65, X1 - X0 + 0.6, 0.7, 26.6, 0x123e7c);
  for (const y of [4.3, 7.9, 11.5]) k.box(-61, y, Z1 + 0.06, X1 - X0, 0.3, 0.14, 0xcfc4ac);
  for (let i = 0; i < 20; i++) {
    const x = X0 + 2.15 + i * 4.3;
    if (Math.abs(x + 61) < 2.5) {
      k.box(x, 0, Z1 + 0.05, 3.8, 3.6, 0.1, 0x1b2833); // main entrance
      continue;
    }
    shops.box(x, 0.1, Z1 + 0.06, 3.6, 2.6, 0.06);
    k.box(x, 2.85, Z1 + 0.1, 3.9, 0.8, 0.15, pick(rng, SIGN_COLS));
    for (const y of [5, 8.6, 12.2]) {
      if (rng() < 0.6) wins.box(x, y, Z1 + 0.06, 3.2, 1.8, 0.06);
      else k.box(x, y, Z1 + 0.05, 3.2, 1.8, 0.06, GLASS);
      if (rng() < 0.45) k.box(x, y + 1.9, Z1 + 0.12, 3.6, 0.5, 0.12, pick(rng, SIGN_COLS));
    }
  }
  const texts: [number, string, string][] = [
    [1, 'PHONES & ACCESSORIES', '#c0262d'], [4, 'LAPTOP WORLD', '#123e7c'], [7, 'SCREEN REPAIR 1HR', '#e8a317'],
    [12, 'UK USED • BRAND NEW', '#0f8a4b'], [15, 'POWER BANKS & CHARGERS', '#6c2c91'], [18, 'SIM • AIRTIME • DATA', '#f26b1d'],
  ];
  for (const [i, t, bg] of texts) sign(g, t, X0 + 2.15 + i * 4.3, 3.25, Z1 + 0.19, 0, 3.9, 0.8, { bg, fg: '#ffffff' });
  // Covered walkway.
  k.box(-61, 3.75, 80.2, X1 - X0, 0.25, 4.4, 0x2a64c9);
  for (let i = 0; i <= 10; i++) if (i !== 5) k.cyl(X0 + i * 8.6, 0, 82, 0.2, 0.2, 3.75, 0xdddddd, 8, true);
  // Big roof sign.
  for (const x of [-70, -52]) k.box(x, 15.7, 76, 0.3, 1.2, 0.3, 0x333333);
  sign(g, 'BANEX PLAZA', -61, 18.2, 76.2, 0, 24, 3.2, { bg: '#123e7c', fg: '#ffffff', sub: 'Phones • Laptops • Accessories • Repairs' });
  const neon = new Lights();
  neon.box(-61, 16.5, 76.35, 24.2, 0.14, 0.14);
  // Street sign on the corner.
  k.cyl(-11, 0, 113.3, 0.06, 0.06, 3.1, 0x555555, 6, 3.1);
  sign(g, 'AMINU KANO CRESCENT', -11, 2.8, 113.36, 0, 3.4, 0.5, { bg: '#0f6b3a', sub: 'Wuse II' });
  sign(g, 'AMINU KANO CRESCENT', -11, 2.8, 113.24, Math.PI, 3.4, 0.5, { bg: '#0f6b3a', sub: 'Wuse II' });

  // Hawker umbrellas with phone tables.
  const phones = new BoxField();
  const agents: AgentSpec[] = [];
  const UMB = [0xffcc00, 0xc0262d, 0x0f8a4b, 0x2a64c9];
  [-100, -90, -80, -70, -60, -50, -40, -30].forEach((x, i) => {
    k.box(x, 0, 88, 1.6, 0.85, 0.8, 0x6b4a2b, true);
    for (let j = 0; j < 6; j++) phones.add(x - 0.6 + (j % 3) * 0.6, 0.86, 87.8 + Math.floor(j / 3) * 0.4, 0.22, 0.04, 0.36, pick(rng, [0x111111, 0x2a64c9, 0xd4a62a, 0xc0262d, 0xffffff]));
    umbrella(k, x, 88, 2.5, 1.8, UMB[i % 4]);
    agents.push({ kind: 'static', x, z: 86.8, facing: 0, pose: i % 2 ? 'phone' : 'normal', cfg: { outfit: 'jersey', primary: pick(rng, [3, 4, 7, 11]), headwear: 'cap' } });
  });
  phones.build(g);
  // Parked cars.
  const cars: Parked[] = [];
  for (let j = 0; j < 14; j++) {
    const x = -102.75 + j * 6.5;
    if (Math.abs(x + 61) < 6 || rng() > 0.7) continue;
    cars.push({ x, z: 102, heading: rng() < 0.5 ? 0 : Math.PI, color: pick(rng, [0xe9e9e9, 0x111111, 0x8a8f96, 0x1f3f7a, 0x7a1f1f, 0xc9c2b0]), model: pick(rng, ['corolla', 'benz', 'suv'] as const) });
  }
  parkedCars(g, world, cars);
  k.flush(g);
  shops.flush(b, g, 0xfff0d0, 0x3a3f45, 1.3);
  wins.flush(b, g, 0xffe6b0, GLASS, 1.1);
  neon.flush(b, g, 0x7ab8ff, 0x2a4a7a, 2.4);
  agents.push(
    { kind: 'wander', rect: { x0: -103, z0: 82.7, x1: -19, z1: 86.5 }, count: 9, carry: 'bag' },
    { kind: 'wander', rect: { x0: -104, z0: 90.5, x1: -18, z1: 96.5 }, count: 6 },
    { kind: 'static', x: -75, z: 84, facing: Math.PI, pose: 'phone' },
    { kind: 'static', x: -47, z: 84.5, facing: 0, pose: 'phone' },
  );
  b.crowds.push({ id: 'banex', cx: -61, cz: 86, radius: 95, agents });
}

// =====================================================================
// 3. TRANSCORP HILTON — white tower, porte-cochère, flags, pool, Maitama
// =====================================================================
function hilton(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'hilton');
  const k = new Kit(world);
  const rng = mulberry32(303);
  const wins = new Lights();
  const lobby = new Lights();
  const lamps = new Lights();
  const ASPH = 0x7c7c78;
  k.floor(10, -362, 112, -258, 0.03, 0x66a447);
  k.floor(40, -296, 50, -256, 0.05, ASPH);
  k.floor(82, -296, 92, -256, 0.05, ASPH);
  k.floor(40, -306, 92, -294, 0.05, ASPH);
  k.floor(26, -308, 106, -306, 0.055, STONE);
  for (const [x0, x1] of [[10, 40], [50, 82], [92, 112]] as const) k.wall(x0, -259, x1, -258.2, 1, HEDGE, 0.8);
  // Fountain island in the driveway loop.
  k.cyl(66, 0, -277, 7.5, 7.8, 0.6, STONE, 32, 0.6);
  const pool1 = new THREE.Mesh(new THREE.CircleGeometry(7, 32).rotateX(-HALF), waterMat());
  pool1.position.set(66, 0.5, -277);
  g.add(pool1);
  k.cyl(66, 0.5, -277, 1.2, 1.6, 1.4, STONE, 16);
  fountain(g, b.animators, 66, -277, 1.9, 0.3, 5, 3.6);
  fountain(g, b.animators, 66, -277, 0.6, 4.5, 10, 1.6);

  // Tower: long white slab with end wings.
  const TW = 0xfafafa;
  k.box(66, 0, -330, 64, 46, 16, TW, true);
  for (const x of [30, 102]) k.box(x, 0, -330, 8, 42, 24, 0xf2f0ea, true);
  k.box(66, 46, -330, 66, 2.2, 17, 0xffffff);
  k.box(66, 48.2, -332, 20, 3, 8, 0xdedede);
  for (let f = 0; f < 11; f++) {
    const y = 9 + f * 3.4;
    for (const z of [-321.65, -338.35]) k.box(66, y - 0.3, z, 64, 0.25, 0.7, 0xffffff);
    for (let c = 0; c < 26; c++) {
      const x = 35.7 + c * 2.42;
      for (const z of [-321.94, -338.06]) {
        if (rng() < 0.7) wins.box(x, y, z, 1.7, 1.9, 0.1);
        else k.box(x, y, z, 1.7, 1.9, 0.1, 0x3d5a73);
      }
    }
    if (f < 10) for (const wx of [30, 102]) for (let c = 0; c < 3; c++) {
      if (rng() < 0.7) wins.box(wx - 2.4 + c * 2.4, y, -317.94, 1.5, 1.8, 0.1);
      else k.box(wx - 2.4 + c * 2.4, y, -317.94, 1.5, 1.8, 0.1, 0x3d5a73);
    }
  }
  sign(g, 'TRANSCORP HILTON', 66, 47.1, -321.45, 0, 26, 2, { bg: '#ffffff', fg: '#1b1b1b' });
  // Podium + lobby glazing.
  k.box(66, 0, -314, 76, 7, 16, 0xf4f0e8, true);
  k.box(66, 7, -314, 77, 0.5, 17, 0xc9b27a);
  lobby.box(47, 0.3, -305.94, 29, 5.6, 0.1);
  lobby.box(85, 0.3, -305.94, 29, 5.6, 0.1);
  k.box(66, 0, -305.95, 5.6, 4.2, 0.08, 0x8a6a3a);
  glow(g, 66, 0.1, -305.9, 4.8, 3.9, 0.04, 0xffe2a8, 0.8);
  // Curved porte-cochère.
  k.geo(new THREE.CylinderGeometry(13, 13, 0.6, 28, 1, false, -HALF, Math.PI).translate(66, 5.9, -306), 0xffffff);
  k.geo(new THREE.CylinderGeometry(13.05, 13.05, 0.22, 28, 1, true, -HALF, Math.PI).translate(66, 6.25, -306), 0xc9b27a);
  for (const x of [58, 74]) k.cyl(x, 0, -299, 0.45, 0.45, 5.6, 0xffffff, 12, true);
  sign(g, 'TRANSCORP HILTON', 66, 7.05, -296.5, 0, 12, 1.5, { bg: '#1b1b1b', fg: '#e8d39a', sub: 'ABUJA' });
  const carpet = 0x7a1f3d;
  k.floor(63.5, -306, 68.5, -300, 0.06, carpet);
  // Flags along the front.
  const flagCols: [number, number, number][] = [[0x0f8a4b, 0xffffff, 0x0f8a4b], [0x123e7c, 0xffffff, 0xc0262d], [0xc0262d, 0xffffff, 0x0f8a4b], [0x111111, 0xe8a317, 0xc0262d]];
  [22, 30, 56, 62.5, 69.5, 76, 100, 108].forEach((x, i) => flagPole(k, x, -262, 9, i % 3 === 0 ? flagCols[0] : flagCols[i % 4]));
  // Pool behind the tower.
  k.floor(36, -362, 98, -343, 0.04, 0xe8e0cc);
  k.box(66, 0, -353, 41, 0.45, 13, 0xffffff);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(40, 12).rotateX(-HALF), waterMat());
  pool.position.set(66, 0.47, -353);
  g.add(pool);
  world.addBox(45.5, -359.5, 86.5, -346.5, 0.45);
  for (let i = 0; i < 6; i++) {
    const z = -360 + i * 2.6;
    k.box(40.5, 0, z, 2.0, 0.4, 0.9, 0xffffff);
    k.box(39.6, 0.4, z, 0.3, 0.5, 0.9, 0xffffff);
    if (i % 2 === 0) umbrella(k, 42.5, z + 1.3, 2.3, 1.5, 0xf4f0e8);
  }
  k.box(94, 0, -356, 5, 2.6, 4, 0x8c5a2b, true);
  k.cone(94, 2.6, -356, 4, 1.6, 0xc9a35a, 8);
  sign(g, 'POOL BAR', 94, 2.0, -353.95, 0, 3, 0.6, { bg: '#3a2418', fg: '#e8d39a' });
  // Gardens & lamps.
  for (let z = -350; z <= -270; z += 16) {
    k.tree(16, z, 1, true);
    k.tree(109, z, 0.9, true);
  }
  for (const [x, z] of [[36, -268], [96, -268], [20, -300], [112 - 6, -300]] as const) k.tree(x, z, 1.1, false);
  for (const [x, z] of [[38, -300], [94, -300], [38, -280], [94, -280], [53, -265], [79, -265]] as const) {
    k.cyl(x, 0, z, 0.07, 0.1, 4, 0x333333, 6, 4);
    lamps.ball(x, 4.2, z, 0.3);
  }
  k.flush(g);
  wins.flush(b, g, 0xffe2a8, 0x3d5a73, 1.4);
  lobby.flush(b, g, 0xffe8c0, GLASS, 1.4);
  lamps.flush(b, g, 0xffe0a0, 0xdddddd, 1.8);

  const doorman = { outfit: 'suit' as const, primary: 11, secondary: 16, headwear: 'cap' as const };
  const agents: AgentSpec[] = [
    { kind: 'static', x: 61.5, z: -304.4, facing: 0, pose: 'normal', cfg: doorman },
    { kind: 'static', x: 70.5, z: -304.4, facing: 0, pose: 'normal', cfg: doorman },
    { kind: 'wander', rect: { x0: 40, z0: -304.5, x1: 56, z1: -301 }, count: 3, carry: 'bag', cfg: { outfit: 'suit' } },
    { kind: 'wander', rect: { x0: 76, z0: -304.5, x1: 92, z1: -301 }, count: 2, carry: 'bag' },
    { kind: 'static', x: 40.5, z: -357.4, facing: HALF, pose: 'sit' },
    { kind: 'static', x: 40.5, z: -352.2, facing: HALF, pose: 'sit', cfg: { shades: true } },
    { kind: 'wander', rect: { x0: 48, z0: -345.5, x1: 84, z1: -343.5 }, count: 3 },
    { kind: 'static', x: 18, z: -300, facing: HALF, pose: 'phone', cfg: { outfit: 'agbada', primary: 0, headwear: 'fila', shades: true } },
  ];
  b.crowds.push({ id: 'hilton', cx: 66, cz: -305, radius: 95, agents });
  hiltonLobby(world, b);
}

function hiltonLobby(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'hilton-in');
  const k = new Kit(world);
  const X0 = 1700, X1 = 1760, Z0 = 60, Z1 = 100, H = 8;
  const WALLC = 0xe9e0cc;
  for (let x = X0; x < X1; x += 4) for (let z = Z0; z < Z1; z += 4) k.floor(x, z, x + 4, z + 4, 0.01, ((x - X0) / 4 + (z - Z0) / 4) % 2 ? 0xd9cfbd : 0xf4efe4);
  k.wall(X0 - 1, Z0 - 1, X1 + 1, Z0, H, WALLC, 1);
  k.wall(X0 - 1, Z0, X0, Z1, H, WALLC, 1);
  k.wall(X1, Z0, X1 + 1, Z1, H, WALLC, 1);
  k.wall(X0 - 1, Z1, 1728, Z1 + 1, H, WALLC, 1);
  k.wall(1732, Z1, X1 + 1, Z1 + 1, H, WALLC, 1);
  k.box(1730, 3.6, Z1 + 0.5, 4, H - 3.6, 1, WALLC);
  world.addBox(1728, Z1, 1732, Z1 + 0.4, 4);
  glow(g, 1730, 0, Z1 + 0.25, 3.8, 3.5, 0.06, 0xdfeeff, 0.9);
  for (const [x0, z0, x1, z1] of [[X0, Z0 + 0.04, X1, Z0 + 0.1], [X0, Z1 - 0.1, X1, Z1 - 0.04]] as const) k.box((x0 + x1) / 2, 3, (z0 + z1) / 2, x1 - x0, 0.15, 0.06, 0xd4a62a);
  k.box(X0 + 0.07, 3, (Z0 + Z1) / 2, 0.06, 0.15, Z1 - Z0, 0xd4a62a);
  k.box(X1 - 0.07, 3, (Z0 + Z1) / 2, 0.06, 0.15, Z1 - Z0, 0xd4a62a);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(62, 42).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2ece0 }));
  ceil.position.set(1730, H, 80);
  g.add(ceil);
  const ceilLights: [number, number, number, number, number, number, number][] = [];
  for (let x = 1708; x < 1756; x += 12) for (const z of [66, 94]) ceilLights.push([x, H - 0.1, z, 2, 0.06, 2, 0xfff4dc]);
  glowBoxes(g, ceilLights, 0.9);
  // Rug and chandelier.
  k.floor(1721, 71, 1739, 89, 0.015, 0xc9a96e);
  k.floor(1722, 72, 1738, 88, 0.018, 0x7a1f3d);
  k.cyl(1730, 5.9, 80, 0.05, 0.05, 2.1, 0xd4a62a, 6);
  k.geo(new THREE.TorusGeometry(2, 0.07, 6, 32).rotateX(HALF).translate(1730, 5.8, 80), 0xd4a62a);
  const crystals: THREE.BufferGeometry[] = [];
  for (const [r, y, n] of [[2, 5.65, 24], [1.35, 5.3, 16], [0.7, 4.95, 8]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      crystals.push(new THREE.OctahedronGeometry(0.14, 0).scale(1, 1.8, 1).translate(1730 + Math.cos(a) * r, y, 80 + Math.sin(a) * r));
    }
  }
  crystals.push(new THREE.SphereGeometry(0.35, 10, 8).translate(1730, 4.6, 80).toNonIndexed());
  const chand = new THREE.Mesh(mergeGeometries(crystals), new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }));
  g.add(chand);
  // Columns.
  for (const [x, z] of [[1716, 70], [1744, 70], [1716, 90], [1744, 90]] as const) {
    k.cyl(x, 0, z, 0.6, 0.6, H, 0xf2ede2, 16, true);
    k.cyl(x, 0, z, 0.8, 0.8, 0.4, 0xd4a62a, 16);
    k.cyl(x, H - 0.4, z, 0.8, 0.6, 0.4, 0xd4a62a, 16);
  }
  // Reception.
  k.box(1730, 0, 63.2, 14, 1.15, 0.8, 0x5a3a24, true);
  k.box(1730, 1.15, 63.2, 14.2, 0.08, 1.0, 0xf2ede2);
  k.box(1730, 0, 60.15, 16, 6, 0.3, 0x3a2418);
  sign(g, 'TRANSCORP HILTON ABUJA', 1730, 4.2, 60.32, 0, 10, 1.3, { bg: '#3a2418', fg: '#e8d39a', sub: 'Reception • Concierge' });
  // Lounge armchairs.
  const agents: AgentSpec[] = [];
  for (const cz of [75, 92]) {
    k.box(1708, 0, cz, 2, 0.45, 1.2, 0x3a2418, true);
    for (const [dx, dz, f] of [[-2, 0, HALF], [2, 0, -HALF], [0, -1.8, 0], [0, 1.8, Math.PI]] as const) {
      const x = 1708 + dx;
      const z = cz + dz;
      k.box(x, 0, z, 1.0, 0.45, 1.0, 0x2f5a5a, 0.9);
      k.box(x - Math.sin(f) * 0.45, 0.45, z - Math.cos(f) * 0.45, Math.abs(Math.sin(f)) > 0.5 ? 0.2 : 1.0, 0.6, Math.abs(Math.sin(f)) > 0.5 ? 1.0 : 0.2, 0x2f5a5a);
      if ((dx + dz + cz) % 3 !== 0) agents.push({ kind: 'static', x, z, facing: f, pose: 'sit', cfg: { outfit: pick(mulberry32(x * 7 + z), ['suit', 'agbada', 'senator', 'asoebi'] as const) } });
    }
  }
  // Lobby bar.
  k.box(1754.5, 0, 80, 1.0, 1.15, 14, 0x3a2418, true);
  k.box(1754.5, 1.15, 80, 1.3, 0.08, 14.2, 0xf2ede2);
  k.box(1759.5, 0, 80, 0.8, 4, 14, 0x2a1a12);
  glow(g, 1759.05, 0.6, 80, 0.04, 3.2, 13, 0xffb36b, 0.4);
  sign(g, 'LOBBY BAR', 1759.05, 5.2, 80, -HALF, 5, 0.9, { bg: '#3a2418', fg: '#e8d39a' });
  for (const [x, z] of [[1702, 62], [1758, 62], [1702, 98], [1758, 98], [1724, 98], [1736, 98]] as const) {
    k.cyl(x, 0, z, 0.5, 0.4, 0.8, 0xd4a62a, 10, 0.9);
    k.sphere(x, 1.5, z, 0.85, 0x3f7f2f, 1.3, 8);
  }
  k.box(1739, 0, 95, 1.0, 1.7, 0.6, 0xd4a62a); // luggage trolley
  k.box(1739, 0.3, 95, 0.8, 0.6, 0.5, 0x7a1f3d);
  k.flush(g);
  agents.push(
    { kind: 'static', x: 1725, z: 62, facing: 0, pose: 'normal', cfg: { outfit: 'suit', primary: 11, secondary: 16, hair: 'braids', facialHair: 'none', headwear: 'none' } },
    { kind: 'static', x: 1735, z: 62, facing: 0, pose: 'phone', cfg: { outfit: 'suit', primary: 11, secondary: 16 } },
    { kind: 'static', x: 1757.2, z: 80, facing: -HALF, pose: 'normal', cfg: { outfit: 'suit', primary: 11, secondary: 0 } },
    { kind: 'wander', rect: { x0: 1722, z0: 68, x1: 1738, z1: 92 }, count: 5, carry: 'bag', cfg: { outfit: 'suit' } },
    { kind: 'static', x: 1752.4, z: 76, facing: HALF, pose: 'phone' },
    { kind: 'static', x: 1752.4, z: 84, facing: HALF, pose: 'normal', cfg: { outfit: 'agbada', primary: 0, headwear: 'fila' } },
  );
  b.crowds.push({ id: 'hilton-in', cx: 1730, cz: 80, radius: 60, agents });
}

// =====================================================================
// 4. UNITY FOUNTAIN — fountain ringed by 36 states + FCT pillars, Maitama
// =====================================================================
const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja',
];

function unity(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'unity');
  const k = new Kit(world);
  const rng = mulberry32(304);
  const lamps = new Lights();
  const candles = new Lights();
  const CX = 64, CZ = -190;
  k.floor(10, -240, 112, -138, 0.03, 0x67a648);
  k.disc(CX, CZ, 34.5, 0.035, 0xb5533c, 1, 1, 64);
  k.disc(CX, CZ, 31, 0.04, 0x67a648, 1, 1, 64);
  k.disc(CX, CZ, 27, 0.045, PAVE, 1, 1, 64);
  k.disc(CX, CZ, 21.5, 0.05, 0xcfc6b4, 1, 1, 64);
  k.floor(61, -164, 67, -137, 0.042, PAVE);
  k.floor(61, -243, 67, -216, 0.042, PAVE);
  k.floor(90, -193, 113, -187, 0.042, PAVE);
  k.floor(10, -193, 38, -187, 0.042, PAVE);
  // Pool + fountain.
  k.cyl(CX, 0, CZ, 15, 15.4, 0.8, STONE, 48, 0.8);
  const water = new THREE.Mesh(new THREE.CircleGeometry(14.4, 48).rotateX(-HALF), waterMat());
  water.position.set(CX, 0.66, CZ);
  g.add(water);
  k.cyl(CX, 0.6, CZ, 2.6, 3.2, 1.0, STONE, 20);
  k.cyl(CX, 1.6, CZ, 0.6, 0.8, 2.4, STONE, 12);
  k.cyl(CX, 4.0, CZ, 1.8, 0.9, 0.35, STONE, 16);
  k.cyl(CX, 4.35, CZ, 0.3, 0.4, 1.4, 0x0f8a4b, 10);
  fountain(g, b.animators, CX, CZ, 4.4, 0.4, 6, 6);
  fountain(g, b.animators, CX, CZ, 0.66, 10, 20, 3.2);
  fountain(g, b.animators, CX, CZ, 0.66, 5.5, 10, 4.2);
  // 37 pillars with state names.
  const N = STATES.length;
  const R = 18.5;
  const labels: THREE.BufferGeometry[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + HALF;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = CX + ca * R;
    const pz = CZ + sa * R;
    const ry = Math.atan2(ca, sa);
    k.rbox(px, 0.05, pz, 1.2, 0.5, 1.2, ry, STONE);
    k.rbox(px, 0.05, pz, 0.9, 6.2, 0.9, ry, 0xf6f3ec);
    k.rbox(px, 6.25, pz, 1.15, 0.35, 1.15, ry, i === N - 1 ? 0xd4a62a : 0x0f8a4b);
    k.rbox(px + ca * 0.5, 2.19, pz + sa * 0.5, 1.6, 0.44, 0.1, ry, 0xd4a62a);
    world.addCircle(px, pz, 0.62, 6.5);
    labels.push(atlasPlane(i, N, 1.5, 0.38, px + ca * 0.56, 2.41, pz + sa * 0.56, ry));
  }
  const lbl = new THREE.Mesh(mergeGeometries(labels), new THREE.MeshBasicMaterial({ map: labelAtlas(STATES, '#0f6b3a', '#ffffff'), toneMapped: false }));
  g.add(lbl);
  // Entrance sign.
  k.box(50, 0, -149.6, 9, 1.4, 0.8, STONE, true);
  sign(g, 'UNITY FOUNTAIN', 50, 0.85, -149.16, 0, 8.4, 1.0, { bg: '#0f6b3a', fg: '#ffffff', sub: '36 States + FCT • One Nigeria' });
  // Benches, lamps, trees.
  for (const [x, z, r] of [[CX - 25, CZ - 6, HALF], [CX - 25, CZ + 6, HALF], [CX + 25, CZ - 6.5, HALF], [CX + 25, CZ + 6.5, HALF], [CX - 13, CZ + 22, 0], [CX + 13, CZ + 22, 0], [CX - 13, CZ - 22, 0], [CX + 13, CZ - 22, 0]] as const) k.bench(x, z, r);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const x = CX + Math.cos(a) * 28.6;
    const z = CZ + Math.sin(a) * 28.6;
    k.cyl(x, 0, z, 0.08, 0.11, 4, 0x333333, 6, 4);
    lamps.ball(x, 4.2, z, 0.32);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.17;
    if (Math.abs(Math.cos(a)) < 0.18 || Math.abs(Math.sin(a)) < 0.18) continue;
    k.tree(CX + Math.cos(a) * 41, CZ + Math.sin(a) * 41, 0.9 + rng() * 0.4, i % 4 === 0);
  }
  // Candlelight vigil spot (north side of the plaza).
  k.box(CX + 3.5, 0, -214.6, 1.3, 1.7, 0.1, 0x111111);
  k.box(CX + 3.5, 0.5, -214.5, 1.0, 0.8, 0.05, 0xf2e6c9);
  for (let j = 0; j < 24; j++) {
    const x = CX - 1.2 + (j % 12) * 0.45;
    const z = -213.4 + Math.floor(j / 12) * 0.5;
    k.cyl(x, 0.05, z, 0.05, 0.05, 0.22, 0xf3efe6, 6);
    candles.ball(x, 0.33, z, 0.05);
  }
  const flowers = new BoxField();
  for (let j = 0; j < 14; j++) flowers.add(CX + 2.3 + rng() * 2.4, 0.05, -213.9 + rng() * 1, 0.25, 0.22, 0.25, pick(rng, [0xffffff, 0xd94f8c, 0xffe14a, 0xc0262d]));
  flowers.build(g);
  // Peaceful placards (south-west lawn).
  for (const [x, t] of [[33, 'PEACE & UNITY'], [40, 'ONE NIGERIA']] as const) {
    k.cyl(x, 0, -147.5, 0.04, 0.04, 2.2, 0x6b4a2b, 4);
    sign(g, t, x, 2.5, -147.45, 0, 1.8, 0.7, { bg: '#ffffff', fg: '#0f6b3a' });
  }
  k.flush(g);
  lamps.flush(b, g, 0xffe0a0, 0xdddddd, 1.8);
  candles.flush(b, g, 0xffa040, 0xffd890, 3);

  const ring = (r: number, n: number): [number, number][] => Array.from({ length: n }, (_, i) => [CX + Math.cos((i / n) * Math.PI * 2) * r, CZ + Math.sin((i / n) * Math.PI * 2) * r] as [number, number]);
  const agents: AgentSpec[] = [
    { kind: 'loop', path: ring(32.7, 28), count: 7, speed: 3.2, cfg: { outfit: 'jersey', headwear: 'cap' } },
    { kind: 'loop', path: ring(24, 24), count: 5, speed: 1.0 },
    { kind: 'wander', rect: { x0: 61.5, z0: -162, x1: 66.5, z1: -140 }, count: 2 },
    { kind: 'static', x: CX - 2, z: -212.2, facing: Math.PI, pose: 'normal', cfg: { outfit: 'kaftan', primary: 0 } },
    { kind: 'static', x: CX + 0.5, z: -211.8, facing: Math.PI, pose: 'phone' },
    { kind: 'static', x: CX + 2.5, z: -212.3, facing: Math.PI, pose: 'normal', cfg: { outfit: 'abaya', primary: 11 } },
  ];
  for (let i = 0; i < 6; i++) agents.push({ kind: 'static', x: 30 + i * 2.4, z: -149 + (i % 2) * 1.2, facing: 0, pose: i % 2 ? 'cheer' : 'normal' });
  agents.push({ kind: 'static', x: CX - 4, z: -168, facing: Math.PI, pose: 'phone', cfg: { outfit: 'asoebi', hair: 'gele', headwear: 'none', facialHair: 'none' } });
  b.crowds.push({ id: 'unity', cx: CX, cz: CZ, radius: 100, agents });
}

// =====================================================================
// 5. NATIONAL ASSEMBLY — Three Arms Zone: green dome, colonnade, mace
// =====================================================================
function assembly(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'assembly');
  const k = new Kit(world);
  const rng = mulberry32(305);
  const wins = new Lights();
  const lamps = new Lights();
  const CX = 470;
  const W = 0xf4f1ea;
  const GREEN = 0x1f8a4b;
  k.floor(386, -106, 552, 79, 0.03, 0x76a24e);
  k.floor(420, 0, 520, 66, 0.05, 0xe4ddcc);
  k.floor(424, 14, 458, 60, 0.055, 0x5f9a42);
  k.floor(482, 14, 516, 60, 0.055, 0x5f9a42);
  k.floor(455, 66, 485, 80, 0.05, 0xd9d2c2);
  k.floor(390, 67, 550, 77, 0.045, 0xc9c3b4);
  // Perimeter fence with the main gate.
  const FENCE = 0xe8e2d4;
  k.wall(390, -104.2, 550, -103.8, 2.4, FENCE, 0.4);
  k.wall(389.8, -104, 390.2, 66, 2.4, FENCE, 0.4);
  k.wall(549.8, -104, 550.2, 66, 2.4, FENCE, 0.4);
  k.wall(390, 65.8, 455, 66.2, 2.4, FENCE, 0.4);
  k.wall(485, 65.8, 550, 66.2, 2.4, FENCE, 0.4);
  k.box(422.5, 2.4, 66, 65, 0.15, 0.5, GREEN);
  k.box(517.5, 2.4, 66, 65, 0.15, 0.5, GREEN);
  for (const x of [454.4, 485.6]) {
    k.box(x, 0, 66, 1.4, 4.2, 1.4, W, true);
    k.box(x, 4.2, 66, 1.7, 0.4, 1.7, GREEN);
  }
  for (const x of [450, 490]) {
    k.box(x, 0, 62, 4, 3, 3.5, W, true);
    k.box(x, 3, 62, 4.6, 0.4, 4.1, GREEN);
    glow(g, x, 1.2, 63.78, 2.4, 1, 0.04, 0xbfe3ff, 0.5);
  }
  k.box(456.3, 0, 64.4, 0.25, 1.1, 0.25, 0x333333, true);
  for (let j = 0; j < 7; j++) k.box(456.3, 1.1 + j, 64.4, 0.15, 1, 0.15, j % 2 ? 0xffffff : 0xc0262d);

  // Main building.
  k.box(CX, 0, -40, 80, 14, 60, W, true);
  k.box(CX, 14, -40, 82, 1.2, 62, 0xe2ddd0);
  for (let i = 0; i < 17; i++) {
    const x = 433 + i * 4.5;
    if (Math.abs(x - CX) < 4) continue;
    wins.box(x, 1.5, -9.94, 1.5, 8.5, 0.1);
  }
  for (const x of [429.94, 510.06]) for (let i = 0; i < 12; i++) wins.box(x, 2, -66 + i * 4.8, 0.1, 7.5, 1.5);
  k.box(CX, 0, -9.92, 6, 7.5, 0.12, 0x5a3a24);
  // Drum and the big green dome.
  k.cyl(CX, 15.2, -40, 16, 16.5, 4.5, W, 40);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    k.rbox(CX + Math.cos(a) * 16.3, 15.2, -40 + Math.sin(a) * 16.3, 0.7, 4.5, 0.4, Math.atan2(Math.cos(a), Math.sin(a)), 0xe2ddd0);
  }
  k.geo(new THREE.SphereGeometry(16, 36, 12, 0, Math.PI * 2, 0, HALF).scale(1, 0.82, 1).translate(CX, 19.7, -40), GREEN);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.geo(new THREE.TorusGeometry(16.05, 0.12, 4, 24, HALF).scale(1, 0.82, 1).rotateY(a).translate(CX, 19.7, -40), 0x17703a);
  }
  k.cyl(CX, 32.6, -40, 1.6, 2, 2.6, W, 12);
  k.sphere(CX, 35.6, -40, 1.3, GREEN, 1, 10);
  k.cyl(CX, 36.6, -40, 0.06, 0.06, 4.5, 0x888888, 6);
  for (let j = 0; j < 3; j++) k.box(CX + 0.35 + j * 0.55, 39.6, -40, 0.55, 1.1, 0.04, j === 1 ? 0xffffff : 0x0f8a4b);
  // Colonnade, entablature, steps.
  k.box(CX, 0, -3.5, 84, 0.06, 13, 0xe9e4d8);
  k.box(CX, 0.06, -5, 82, 0.06, 10, 0xe2ddd0);
  k.box(CX, 0.12, -6.5, 80, 0.06, 7, 0xe9e4d8);
  for (let i = 0; i < 13; i++) k.cyl(434 + i * 6, 0.18, -6, 0.75, 0.85, 11.8, 0xffffff, 14, 12);
  k.box(CX, 11.95, -6.8, 80, 1.6, 6.4, 0xffffff);
  k.box(CX, 13.55, -6.8, 81, 0.4, 7, 0xe2ddd0);
  sign(g, 'NATIONAL ASSEMBLY', CX, 12.75, -3.52, 0, 26, 1.4, { bg: '#f4f1ea', fg: '#1f5a2a' });
  // Wings: Senate (red dome) and House of Representatives (green dome).
  for (const [x, dome, label, bg] of [[413, 0x9a3b2a, 'SENATE', '#7a1f1f'], [527, GREEN, 'HOUSE OF REPRESENTATIVES', '#1f5a2a']] as const) {
    k.box(x, 0, -42, 34, 10, 40, 0xf0ece2, true);
    k.box(x, 10, -42, 35, 0.8, 41, 0xe2ddd0);
    k.geo(new THREE.SphereGeometry(7, 20, 8, 0, Math.PI * 2, 0, HALF).scale(1, 0.6, 1).translate(x, 10.8, -42), dome);
    for (let i = 0; i < 6; i++) wins.box(x - 12.5 + i * 5, 1.5, -21.94, 2, 5.5, 0.1);
    sign(g, label, x, 8, -21.9, 0, label.length > 10 ? 15 : 8, 1.1, { bg, fg: '#ffffff' });
  }
  // The Mace sculpture.
  k.box(CX, 0, 48, 4, 1.4, 4, STONE, true);
  k.box(CX, 1.4, 48, 3, 0.4, 3, 0xcfc6b4);
  k.cyl(CX, 1.8, 48, 0.32, 0.45, 6.6, 0xd4a62a, 12);
  for (let j = 0; j < 4; j++) k.cyl(CX, 2.6 + j * 1.5, 48, 0.5, 0.5, 0.18, 0xb8902a, 12);
  k.sphere(CX, 9.2, 48, 1.3, 0xd4a62a, 1.1, 14);
  k.cyl(CX, 10.3, 48, 1.0, 0.5, 0.8, 0xd4a62a, 10);
  k.box(CX, 11.1, 48, 0.25, 1.0, 0.25, 0xd4a62a);
  k.box(CX, 11.4, 48, 0.9, 0.25, 0.25, 0xd4a62a);
  sign(g, 'THE MACE • AUTHORITY OF THE LEGISLATURE', CX, 0.75, 50.05, 0, 3.8, 0.5, { bg: '#3a2418', fg: '#e8d39a' });
  // Flags & lamps on the plaza.
  for (const x of [432, 508]) for (const z of [16, 28, 40, 52]) flagPole(k, x, z, 10);
  for (const x of [459, 481]) {
    for (let z = 10; z <= 60; z += 12.5) {
      k.cyl(x, 0, z, 0.08, 0.11, 4.5, 0x333333, 6, 4.5);
      lamps.ball(x, 4.7, z, 0.3);
    }
  }
  // Outside the gate: monument sign, protesters' placards, press van.
  k.box(420, 0, 71, 14, 1.6, 0.8, STONE, true);
  sign(g, 'NATIONAL ASSEMBLY COMPLEX', 420, 0.95, 71.45, 0, 13, 1.0, { bg: '#1f5a2a', fg: '#ffffff', sub: 'Three Arms Zone • Abuja' });
  const placards: [number, number, string, string][] = [
    [433, 75.4, '#ENDBADGOVERNANCE', '#c0262d'], [437.5, 75.8, 'WE WANT LIGHT!', '#123e7c'],
    [444, 75.4, 'FUEL PRICE DON TOO MUCH', '#111111'], [448.5, 75.8, 'JOBS FOR YOUTHS', '#0f6b3a'],
  ];
  for (const [x, z, t, bg] of placards) {
    k.cyl(x, 0, z, 0.04, 0.04, 2.3, 0x6b4a2b, 4);
    sign(g, t, x, 2.55, z + 0.05, 0, 2.0, 0.75, { bg: '#ffffff', fg: bg });
  }
  k.box(524, 0, 72.5, 2.2, 2.5, 5.5, 0xffffff, true);
  k.box(524, 0, 75.3, 2.0, 1.2, 0.1, 0x1b2833);
  sign(g, 'NAIJA NEWS 24', 525.12, 1.6, 72.5, HALF, 4.4, 0.9, { bg: '#c0262d', fg: '#ffffff', sub: 'Live from the National Assembly' });
  k.box(524, 2.5, 71.5, 0.2, 1.2, 0.2, 0x888888);
  k.sphere(524, 3.9, 71.5, 0.5, 0xffffff, 0.4, 8);
  for (const x of [500, 506]) {
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2;
      k.geo(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4).rotateX(0.25).rotateY(a).translate(x + 1.4 + Math.sin(a) * 0.2, 0.72, 75.5 + Math.cos(a) * 0.2), 0x222222);
    }
    k.box(x + 1.4, 1.45, 75.5, 0.25, 0.25, 0.45, 0x111111);
  }
  for (let i = 0; i < 6; i++) k.tree(395 + i * 6, -98 + (i % 2) * 4, 1, i % 2 === 0);
  for (let i = 0; i < 6; i++) k.tree(545 - i * 6, -98 + (i % 2) * 4, 1, i % 2 === 1);
  for (const z of [10, 30, 50]) {
    k.tree(398, z, 1.1, false);
    k.tree(542, z, 1.1, false);
  }
  k.flush(g);
  wins.flush(b, g, 0xffe6b8, 0x5a6e7e, 1.3);
  lamps.flush(b, g, 0xffe0a0, 0xdddddd, 1.8);

  const soldier = { outfit: 'suit' as const, primary: 2, secondary: 2, headwear: 'cap' as const, hair: 'lowcut' as const };
  const agents: AgentSpec[] = [
    { kind: 'static', x: 457.5, z: 68, facing: 0, pose: 'normal', cfg: soldier },
    { kind: 'static', x: 482.5, z: 68, facing: 0, pose: 'normal', cfg: soldier },
    { kind: 'static', x: 452.5, z: 64.5, facing: 0, pose: 'phone', cfg: soldier },
    { kind: 'static', x: 487.5, z: 64.5, facing: 0, pose: 'normal', cfg: soldier },
    { kind: 'wander', rect: { x0: 460.5, z0: 6, x1: 479.5, z1: 43 }, count: 5, carry: 'bag', cfg: { outfit: 'senator' } },
    { kind: 'static', x: 466, z: 2, facing: 0, pose: 'phone', cfg: { outfit: 'agbada', primary: 0, secondary: 8, headwear: 'fila' } },
    { kind: 'static', x: 476, z: 2.5, facing: Math.PI, pose: 'normal', cfg: { outfit: 'senator', primary: 4, headwear: 'fila' } },
    { kind: 'static', x: 501.5, z: 74, facing: Math.PI, pose: 'normal', cfg: { outfit: 'jersey', primary: 11, headwear: 'cap' } },
    { kind: 'static', x: 507.5, z: 74, facing: Math.PI, pose: 'phone' },
    { kind: 'static', x: 512, z: 73.4, facing: -0.6, pose: 'phone', cfg: { outfit: 'suit', primary: 5 } },
  ];
  for (let i = 0; i < 12; i++) agents.push({ kind: 'static', x: 431 + (i % 6) * 3.4 + rng() * 0.6, z: 73.6 + Math.floor(i / 6) * 1.7, facing: Math.PI + (rng() - 0.5) * 0.6, pose: i % 3 === 2 ? 'normal' : 'cheer' });
  b.crowds.push({ id: 'assembly', cx: CX, cz: 30, radius: 120, agents });
}

// =====================================================================
// 6. SILVERBIRD GALLERIA — glass-fronted mall + cinema, Central Area
// =====================================================================
function silverbird(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'silverbird');
  const k = new Kit(world);
  const lit = new Lights();
  const neon = new Lights();
  k.floor(296, 70, 362, 112, 0.035, 0xd8d2c4);
  k.box(329, 0, 84, 56, 20, 24, 0x5f6f7e, true);
  k.box(329, 20, 84, 57, 0.8, 25, 0xc9d3db);
  const R = 60;
  const CZc = 96 - Math.sqrt(R * R - 28 * 28);
  const TH = Math.asin(28 / R);
  for (const y of [0.3, 5, 9.7, 14.4]) {
    k.geo(new THREE.CylinderGeometry(R - 0.1, R - 0.1, 0.3, 24, 1, false, -TH, 2 * TH).translate(329, y + 0.15, CZc), 0xe8e8e8);
    lit.box(329, y + 0.4, 96.05, 55.6, 4.2, 0.06);
  }
  k.geo(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.6, 24, 1, false, -TH, 2 * TH).translate(329, 20.1, CZc), 0xc9d3db);
  for (let i = 0; i <= 16; i++) {
    const a = -TH + (2 * TH * i) / 16;
    k.rbox(329 + R * Math.sin(a), 0.3, CZc + R * Math.cos(a), 0.14, 19.5, 0.14, a, 0xb8c4cc);
  }
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 19.5, 24, 1, true, -TH, 2 * TH).translate(329, 10.05, CZc),
    new THREE.MeshPhongMaterial({ color: 0x8fc6e8, transparent: true, opacity: 0.55, shininess: 120, specular: 0xffffff, side: THREE.DoubleSide, depthWrite: false }),
  );
  g.add(glass);
  world.addBox(305, 96, 353, 97.9, 20);
  world.addBox(312, 97.9, 346, 100.4, 20);
  world.addBox(320, 100.4, 338, 102.2, 20);
  k.box(329, 0.3, 102.95, 6, 3.2, 0.1, 0x22303a);
  // Signs.
  for (const x of [316, 342]) k.box(x, 20.4, 99.6, 0.3, 1.2, 0.3, 0x333333);
  sign(g, 'SILVERBIRD GALLERIA', 329, 22.6, 99.8, 0, 30, 3, { bg: '#0d2a4a', fg: '#d8ecff', sub: 'Cinemas • Shopping • Entertainment' });
  neon.box(329, 21.0, 99.95, 30.2, 0.14, 0.14);
  sign(g, 'SILVERBIRD CINEMAS', 357.1, 12, 84, HALF, 20, 2.4, { bg: '#7a0f1f', fg: '#ffffff', sub: 'Now showing • 3D • Premiere nights' });
  sign(g, 'SILVERBIRD GALLERIA', 300.9, 14, 84, -HALF, 18, 2.2, { bg: '#0d2a4a', fg: '#d8ecff' });
  // Movie posters (light boxes).
  const posters: [number, string, string][] = [
    [303, 'OWAMBE WAHALA', '#c0262d'], [309.5, 'LAGOS TO ABUJA', '#123e7c'], [348.5, "THE SENATOR'S WIFE", '#6c2c91'], [355, 'KUBWA TRAFFIC', '#0f6b3a'],
  ];
  for (const [x, t, bg] of posters) {
    k.box(x, 0, 106, 2.4, 3.6, 0.3, 0x222222, true);
    sign(g, t, x, 2.05, 106.17, 0, 2.1, 3.0, { bg, fg: '#ffe08a', sub: 'NOW SHOWING' });
    neon.box(x, 3.6, 106.1, 2.4, 0.08, 0.32);
  }
  // Ticket kiosk, popcorn cart, red carpet.
  k.box(322, 0, 107.5, 2.6, 2.6, 1.8, 0x0d2a4a, true);
  k.box(322, 2.6, 107.5, 3, 0.25, 2.2, 0xc0262d);
  sign(g, 'TICKETS', 322, 3.15, 108.62, 0, 2.4, 0.6, { bg: '#c0262d', fg: '#ffffff' });
  glow(g, 322, 1.1, 108.42, 1.6, 0.8, 0.03, 0xffe8b0, 0.7);
  k.box(340.5, 0.3, 106.2, 1.6, 1.1, 1.0, 0xc0262d, 1.4);
  k.box(340.5, 1.4, 106.2, 1.4, 0.8, 0.9, 0xfff3c0);
  for (const s of [-1, 1]) k.cyl(340.5 + s * 0.6, 0, 106.8, 0.3, 0.3, 0.08, 0x111111, 10);
  sign(g, 'POPCORN', 340.5, 2.45, 106.2, 0, 1.6, 0.4, { bg: '#e8a317', fg: '#7a0f1f' });
  k.floor(326.5, 103, 331.5, 112, 0.05, 0x9a1b2a);
  for (const x of [326, 332]) for (let z = 104; z <= 111; z += 2.33) {
    k.cyl(x, 0, z, 0.06, 0.08, 1, 0xd4a62a, 6);
    if (z + 2.33 <= 111.1) k.box(x, 0.85, z + 1.165, 0.05, 0.05, 2.33, 0x7a0f1f);
  }
  for (const x of [299, 359]) {
    k.cyl(x, 0, 110, 0.08, 0.11, 5, 0x333333, 6, 5);
    lit.box(x, 5, 110, 0.6, 0.3, 0.6);
  }
  k.flush(g);
  lit.flush(b, g, 0xfff0d0, 0x8a96a3, 1.4);
  neon.flush(b, g, 0x9fd8ff, 0x7a8a9a, 2.4);
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: 300, z0: 108.8, x1: 358, z1: 111.6 }, count: 7, carry: 'bag' },
    { kind: 'static', x: 336.2, z: 110.2, facing: -HALF - 0.3, pose: 'phone' },
    { kind: 'static', x: 336.8, z: 105.4, facing: -HALF + 0.4, pose: 'phone' },
    { kind: 'static', x: 325, z: 109.5, facing: HALF, pose: 'cheer' },
    { kind: 'static', x: 324.6, z: 106.2, facing: HALF, pose: 'cheer', cfg: { outfit: 'ankara', hair: 'braids', headwear: 'none', facialHair: 'none' } },
    { kind: 'static', x: 345.5, z: 104.6, facing: 0, pose: 'normal' },
  ];
  b.crowds.push({ id: 'silverbird', cx: 329, cz: 106, radius: 80, agents });
}

// =====================================================================
// 7. WONDERLAND AMUSEMENT PARK — Ferris wheel, carousel, bumper cars
// =====================================================================
function wonderland(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'wonderland');
  const k = new Kit(world);
  const rng = mulberry32(307);
  const bulbs = new Lights();
  const X0 = 12, X1 = 110, Z0 = 262, Z1 = 360;
  const PATH = 0xe3cfa4;
  const CANDY = [0xc0262d, 0xffe14a, 0x2a64c9, 0xd94f8c, 0x0f8a4b, 0xf26b1d];
  k.floor(X0, Z0, X1, Z1, 0.03, 0x74ad4c);
  k.floor(55, Z0, 65, 346, 0.05, PATH);
  k.floor(16, 305, 106, 313, 0.05, PATH);
  k.disc(60, 309, 9, 0.052, PATH);
  k.disc(60, 309, 3, 0.055, 0xd94f8c);
  // Fence + gate.
  const FEN = 0xc0262d;
  k.wall(X0, Z0 - 0.2, 54, Z0 + 0.2, 1.6, FEN, 0.4);
  k.wall(66, Z0 - 0.2, X1, Z0 + 0.2, 1.6, FEN, 0.4);
  k.wall(X0, Z1 - 0.2, X1, Z1 + 0.2, 1.6, FEN, 0.4);
  k.wall(X0 - 0.2, Z0, X0 + 0.2, Z1, 1.6, FEN, 0.4);
  k.wall(X1 - 0.2, Z0, X1 + 0.2, Z1, 1.6, FEN, 0.4);
  for (const x of [53.4, 66.6]) for (let j = 0; j < 6; j++) k.box(x, j, Z0, 1.4, 1, 1.4, CANDY[j % 3], j === 0 ? 6 : false);
  k.geo(new THREE.TorusGeometry(6.6, 0.35, 8, 24, Math.PI).translate(60, 6, Z0), 0xd94f8c);
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    bulbs.ball(60 + Math.cos(a) * 6.6, 6 + Math.sin(a) * 6.6, Z0 - 0.4, 0.14);
  }
  sign(g, 'WONDERLAND AMUSEMENT PARK', 60, 8.0, Z0 - 0.5, Math.PI, 11, 2, { bg: '#6c2c91', fg: '#ffe14a', sub: 'Rides • Games • Candy floss • Fun for everybody' });
  sign(g, 'HAVE FUN!', 60, 8.0, Z0 + 0.5, 0, 6, 1.2, { bg: '#6c2c91', fg: '#ffe14a' });
  k.box(70.5, 0, 266, 3, 2.6, 2.4, 0xe8a317, true);
  k.cone(70.5, 2.6, 266, 2.4, 1.2, 0xc0262d, 4, Math.PI / 4);
  sign(g, 'TICKETS', 68.95, 1.9, 266, -HALF, 2, 0.5, { bg: '#c0262d', fg: '#ffffff' });

  // ---- Ferris wheel ----
  const FX = 85, FY = 15, FZ = 336, FR = 12.5;
  k.box(FX, 0, FZ, 18, 0.5, 9, 0x666666);
  world.addBox(76, 331.5, 94, 340.5, 3);
  for (const zl of [333.2, 338.8]) {
    k.geo(new THREE.BoxGeometry(0.5, 16.6, 0.5).rotateZ(-0.436).translate(FX - 3.5, 7.5, zl), 0xdddddd);
    k.geo(new THREE.BoxGeometry(0.5, 16.6, 0.5).rotateZ(0.436).translate(FX + 3.5, 7.5, zl), 0xdddddd);
  }
  k.geo(new THREE.CylinderGeometry(0.5, 0.5, 6.4, 10).rotateX(HALF).translate(FX, FY, FZ), 0x888888);
  k.box(FX, 0.5, 330.5, 5, 0.3, 2, 0x8c5a2b);
  sign(g, 'WONDER WHEEL', FX, 1.7, 331.4, Math.PI, 5, 0.8, { bg: '#2a64c9', fg: '#ffe14a' });
  const wheel = new THREE.Group();
  wheel.position.set(FX, FY, FZ);
  const wg: THREE.BufferGeometry[] = [];
  for (const dz of [-0.8, 0.8]) {
    wg.push(vc(new THREE.TorusGeometry(FR, 0.18, 6, 48).translate(0, 0, dz), 0xffffff));
    wg.push(vc(new THREE.TorusGeometry(6, 0.12, 6, 32).translate(0, 0, dz), 0xffe14a));
    for (let s = 0; s < 16; s++) wg.push(vc(new THREE.BoxGeometry(0.12, FR, 0.12).translate(0, FR / 2, 0).rotateZ((s / 16) * Math.PI * 2).translate(0, 0, dz), 0xd94f8c));
  }
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * Math.PI * 2;
    wg.push(vc(new THREE.BoxGeometry(0.1, 0.1, 1.8).translate(Math.cos(a) * FR, Math.sin(a) * FR, 0), 0x888888));
  }
  wg.push(vc(new THREE.CylinderGeometry(1, 1, 2, 12).rotateX(HALF), 0xc0262d));
  wheel.add(vcMesh(wg));
  const wl = new Lights();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    for (const dz of [-0.95, 0.95]) wl.ball(Math.cos(a) * FR, Math.sin(a) * FR, dz, 0.12);
  }
  wl.flush(b, wheel, 0xfff0a0, 0xf3ead2, 2.6);
  g.add(wheel);
  const cab = mergeGeometries([
    vc(new THREE.BoxGeometry(1.6, 1.3, 1.4).translate(0, -1.55, 0), 0xffffff),
    vc(new THREE.ConeGeometry(1.15, 0.5, 4).rotateY(Math.PI / 4).translate(0, -0.65, 0), 0xffffff),
    vc(new THREE.BoxGeometry(0.08, 0.8, 0.08).translate(0, -0.4, 0), 0x888888),
    vc(new THREE.BoxGeometry(1.4, 0.5, 1.45).translate(0, -1.35, 0), 0x222222),
  ]);
  const gondolas = new THREE.InstancedMesh(cab, new THREE.MeshLambertMaterial({ vertexColors: true }), 12);
  for (let i = 0; i < 12; i++) gondolas.setColorAt(i, new THREE.Color(CANDY[i % CANDY.length]));
  gondolas.frustumCulled = false;
  g.add(gondolas);
  const m4 = new THREE.Matrix4();
  b.animators.push((t) => {
    const rot = t * 0.12;
    wheel.rotation.z = rot;
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * Math.PI * 2;
      gondolas.setMatrixAt(i, m4.makeTranslation(FX + Math.cos(a) * FR, FY + Math.sin(a) * FR, FZ));
    }
    gondolas.instanceMatrix.needsUpdate = true;
  });

  // ---- Carousel ----
  const CCX = 36, CCZ = 288;
  k.cyl(CCX, 0, CCZ, 6.8, 7, 0.3, STONE, 24, 1.2);
  const carousel = new THREE.Group();
  carousel.position.set(CCX, 0.3, CCZ);
  const cg: THREE.BufferGeometry[] = [
    vc(new THREE.CylinderGeometry(6.4, 6.4, 0.3, 24).translate(0, 0.15, 0), 0xc0262d),
    vc(new THREE.CylinderGeometry(1.2, 1.2, 4, 12).translate(0, 2.2, 0), 0xffe14a),
    vc(new THREE.ConeGeometry(7, 2.2, 16).translate(0, 5.3, 0), 0xd94f8c),
    vc(new THREE.CylinderGeometry(7, 7, 0.6, 16, 1, true).translate(0, 4.0, 0), 0xffe14a),
    vc(new THREE.SphereGeometry(0.4, 8, 6).translate(0, 6.6, 0), 0xffe14a),
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cg.push(vc(new THREE.CylinderGeometry(0.05, 0.05, 3.8, 6).translate(Math.sin(a) * 4.8, 2.2, Math.cos(a) * 4.8), 0xd4a62a));
  }
  carousel.add(vcMesh(cg));
  const cl = new Lights();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    cl.ball(Math.sin(a) * 7.05, 4.0, Math.cos(a) * 7.05, 0.1);
  }
  cl.flush(b, carousel, 0xfff0a0, 0xf3ead2, 2.6);
  g.add(carousel);
  const horseGeo = mergeGeometries([
    vc(new THREE.BoxGeometry(0.45, 0.45, 1.25), 0xffffff),
    vc(new THREE.BoxGeometry(0.28, 0.55, 0.35).rotateX(-0.4).translate(0, 0.35, 0.62), 0xffffff),
    vc(new THREE.BoxGeometry(0.5, 0.12, 0.5).translate(0, 0.28, -0.05), 0xd4a62a),
    ...[[-0.15, 0.45], [0.15, 0.45], [-0.15, -0.45], [0.15, -0.45]].map(([x, z]) => vc(new THREE.BoxGeometry(0.1, 0.55, 0.1).rotateX(z > 0 ? -0.5 : 0.5).translate(x, -0.4, z), 0xffffff)),
  ]);
  const horses = new THREE.InstancedMesh(horseGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), 8);
  for (let i = 0; i < 8; i++) horses.setColorAt(i, new THREE.Color(pick(rng, [0xffffff, 0xf2e6c9, 0x6b3f1f, 0x111111, 0xd9a0c0])));
  horses.frustumCulled = false;
  g.add(horses);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  b.animators.push((t) => {
    const th = t * 0.6;
    carousel.rotation.y = th;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + th;
      pos.set(CCX + Math.sin(a) * 4.8, 0.3 + 1.3 + Math.sin(t * 2.2 + i * 1.3) * 0.35, CCZ + Math.cos(a) * 4.8);
      q.setFromAxisAngle(up, a + HALF);
      horses.setMatrixAt(i, m4.compose(pos, q, one));
    }
    horses.instanceMatrix.needsUpdate = true;
  });

  // ---- Bumper cars ----
  k.floor(72, 272, 100, 296, 0.05, 0x3a3a44);
  k.wall(72, 271.8, 100, 272.2, 0.8, 0xffe14a, 0.4);
  k.wall(72, 295.8, 100, 296.2, 0.8, 0xffe14a, 0.4);
  k.wall(99.8, 272, 100.2, 296, 0.8, 0xffe14a, 0.4);
  k.wall(71.8, 272, 72.2, 278, 0.8, 0xffe14a, 0.4);
  k.wall(71.8, 282, 72.2, 296, 0.8, 0xffe14a, 0.4);
  for (const [x, z] of [[72.3, 272.3], [99.7, 272.3], [72.3, 295.7], [99.7, 295.7]] as const) k.cyl(x, 0, z, 0.18, 0.18, 5, 0x888888, 6, 5);
  k.box(86, 5, 284, 29, 0.4, 25, 0x2a64c9);
  for (let x = 75; x < 100; x += 4) for (let z = 275; z < 295; z += 4) bulbs.ball(x, 4.9, z, 0.12);
  sign(g, 'BUMPER CARS', 71.4, 5.6, 284, -HALF, 8, 1.2, { bg: '#2a64c9', fg: '#ffe14a' });
  const bcGeo = mergeGeometries([
    vc(new THREE.BoxGeometry(1.7, 0.25, 2.3).translate(0, 0.25, 0), 0x222222),
    vc(new THREE.BoxGeometry(1.5, 0.55, 2.0).translate(0, 0.6, 0), 0xffffff),
    vc(new THREE.BoxGeometry(1.1, 0.5, 0.2).translate(0, 1.05, -0.7), 0xffffff),
    vc(new THREE.CylinderGeometry(0.03, 0.03, 4.0, 4).translate(0, 2.9, -0.8), 0x888888),
  ]);
  const NB = 7;
  const bumpers = new THREE.InstancedMesh(bcGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), NB);
  for (let i = 0; i < NB; i++) bumpers.setColorAt(i, new THREE.Color(CANDY[i % CANDY.length]));
  bumpers.frustumCulled = false;
  g.add(bumpers);
  const bpos = (i: number, t: number, out: THREE.Vector3) => {
    const w = 0.35 + (i % 3) * 0.06;
    const ph = i * 0.9;
    return out.set(86 + Math.cos(w * t + ph) * 10 + Math.sin(2.3 * w * t + i) * 2.5, 0, 284 + Math.sin(w * t + ph) * 8 + Math.cos(1.7 * w * t + i * 2) * 2);
  };
  const p2 = new THREE.Vector3();
  b.animators.push((t) => {
    for (let i = 0; i < NB; i++) {
      bpos(i, t, pos);
      bpos(i, t + 0.1, p2);
      q.setFromAxisAngle(up, Math.atan2(p2.x - pos.x, p2.z - pos.z));
      bumpers.setMatrixAt(i, m4.compose(pos, q, one));
    }
    bumpers.instanceMatrix.needsUpdate = true;
  });

  // ---- Free-fall tower ----
  const TX = 32, TZ = 342;
  k.cyl(TX, 0, TZ, 4, 4.2, 0.5, 0x555555, 16, 0.5);
  k.cyl(TX, 0, TZ, 1.4, 1.8, 30, 0xdddddd, 12, 30);
  k.cone(TX, 30, TZ, 2.2, 2.5, 0xc0262d, 12);
  for (let y = 2; y < 30; y += 2) bulbs.ball(TX, y, TZ + 1.65, 0.12);
  const ring = new THREE.Mesh(
    mergeGeometries([vc(new THREE.CylinderGeometry(3.2, 3.2, 1.2, 16).translate(0, 0.6, 0), 0xffe14a), vc(new THREE.CylinderGeometry(3.4, 3.4, 0.2, 16).translate(0, 1.3, 0), 0xc0262d)]),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  ring.position.set(TX, 1, TZ);
  ring.castShadow = true;
  g.add(ring);
  b.animators.push((t) => {
    const u = t % 14;
    ring.position.y = u < 8 ? 1 + (u / 8) * 25 : u < 9.5 ? 26 : u < 10.3 ? 26 - ((u - 9.5) / 0.8) ** 2 * 25 : 1;
  });
  sign(g, 'FREE FALL', TX, 1.0, TZ - 4.25, Math.PI, 3, 0.6, { bg: '#c0262d', fg: '#ffffff' });

  // ---- Candy floss stand, game stalls ----
  k.box(46, 0.3, 301.6, 2, 1, 1.1, 0xffffff, 1.3);
  for (const s of [-1, 1]) k.cyl(46 + s * 1.05, 0, 301.6, 0.04, 0.04, 2.5, 0x888888, 6);
  k.box(46, 2.45, 301.6, 2.4, 0.15, 1.5, 0xd94f8c);
  for (let i = 0; i < 6; i++) {
    k.cyl(45.4 + (i % 3) * 0.6, 1.3, 301.4 + Math.floor(i / 3) * 0.4, 0.015, 0.015, 0.4, 0xffffff, 4);
    k.sphere(45.4 + (i % 3) * 0.6, 1.85, 301.4 + Math.floor(i / 3) * 0.4, 0.25, i % 2 ? 0xffb6dd : 0xa8d8ff, 1, 8);
  }
  sign(g, 'CANDY FLOSS • POPCORN • ZOBO', 46, 0.85, 302.18, 0, 2, 0.4, { bg: '#d94f8c', fg: '#ffffff' });
  for (const z of [322, 330]) {
    k.box(17, 0, z, 3, 2.6, 5, 0xf3efe6, true);
    k.box(18.7, 2.6, z, 1.2, 0.2, 5.4, pick(rng, CANDY));
    for (let i = 0; i < 6; i++) k.sphere(18.2, 1.2 + (i % 2) * 0.6, z - 1.8 + Math.floor(i / 2) * 1.6, 0.28, pick(rng, CANDY), 1, 6);
    sign(g, z === 322 ? 'WIN A TEDDY!' : 'SHOOTING GAME', 18.55, 3.2, z, HALF, 4, 0.7, { bg: '#6c2c91', fg: '#ffe14a' });
  }
  for (const [x, z] of [[24, 270], [100, 352], [48, 352], [104, 312], [18, 350]] as const) k.tree(x, z, 1, (x + z) % 2 === 0);
  for (const [x, z] of [[52, 290], [68, 320], [52, 320]] as const) k.bench(x, z, HALF);
  k.flush(g);
  bulbs.flush(b, g, 0xfff0a0, 0xf3ead2, 2.6);

  const kids = { scale: 0.65 };
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: 56.5, z0: 268, x1: 63.5, z1: 300 }, count: 6, carry: 'balloon', speed: 1.4, ...kids },
    { kind: 'wander', rect: { x0: 18, z0: 306.3, x1: 104, z1: 311.7 }, count: 8 },
    { kind: 'wander', rect: { x0: 18, z0: 306.3, x1: 104, z1: 311.7 }, count: 5, carry: 'balloon', speed: 1.6, ...kids },
    { kind: 'wander', rect: { x0: 56.5, z0: 314, x1: 63.5, z1: 344 }, count: 4 },
    { kind: 'static', x: 80.5, z: 329.6, facing: Math.PI, pose: 'normal', scale: 0.7 },
    { kind: 'static', x: 82, z: 329.6, facing: Math.PI, pose: 'phone' },
    { kind: 'static', x: 83.5, z: 329.6, facing: Math.PI, pose: 'normal', scale: 0.65 },
    { kind: 'static', x: 43, z: 296.5, facing: Math.PI, pose: 'phone' },
    { kind: 'static', x: 28, z: 297, facing: Math.PI, pose: 'cheer', scale: 0.65 },
    { kind: 'static', x: 70.6, z: 285.5, facing: HALF, pose: 'cheer', scale: 0.65 },
    { kind: 'static', x: 20.5, z: 322, facing: -HALF, pose: 'normal' },
    { kind: 'static', x: 20.5, z: 330, facing: -HALF, pose: 'normal', scale: 0.7 },
  ];
  b.crowds.push({ id: 'wonderland', cx: 60, cz: 310, radius: 95, agents });
}

// =====================================================================
// 8. JABI MOTOR PARK — interstate buses, ticket booths, touts, mai shayi
// =====================================================================
function bus(k: Kit, x: number, z: number, coaster: boolean, body: number, stripe: number, rack: boolean): void {
  const L = coaster ? 7 : 5.2;
  const H = coaster ? 2.75 : 2.25;
  const W = coaster ? 2.15 : 1.95;
  k.box(x, 0.35, z, W, H - 0.35, L, body);
  k.box(x, 0.35 + (H - 0.35) * 0.48, z - 0.2, W + 0.04, (H - 0.35) * 0.32, L - 0.9, 0x1b2833);
  k.box(x, 0.75, z, W + 0.05, 0.22, L - 0.2, stripe);
  k.box(x, 1.1, z + L / 2 + 0.01, W - 0.3, 0.85, 0.05, 0x1b2833);
  for (const s of [-1, 1]) k.box(x + s * 0.65, 0.6, z + L / 2 + 0.03, 0.3, 0.15, 0.05, 0xfff2c0);
  for (const wz of [z - L / 2 + 1, z + L / 2 - 1]) for (const s of [-1, 1]) k.box(x + s * (W / 2 - 0.12), 0, wz, 0.3, 0.7, 0.7, 0x161616);
  if (rack) {
    k.box(x, H, z - 0.4, W - 0.3, 0.08, L * 0.55, 0x333333);
    k.box(x - 0.3, H + 0.08, z - 0.6, 0.8, 0.5, 1.2, 0x2a64c9);
    k.box(x + 0.3, H + 0.08, z + 0.6, 0.7, 0.4, 1.0, 0xc0262d);
  }
  k.world.addBox(x - W / 2, z - L / 2, x + W / 2, z + L / 2, H);
}

function motorPark(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'motorpark');
  const k = new Kit(world);
  const rng = mulberry32(308);
  const lit = new Lights();
  k.floor(-362, 138, -260, 240, 0.04, 0x8f8b84);
  for (let i = 0; i < 40; i++) {
    const x = -355 + rng() * 90;
    const z = 142 + rng() * 94;
    k.disc(x, z, 0.6 + rng() * 1.2, 0.045, 0x6f6b64, 1, 0.6 + rng() * 0.8, 10);
  }
  // Block wall with the vehicle gate (north) and a footpath gap to Wuse Market (east).
  const WALL = 0xd9cdb5;
  k.wall(-362, 137.8, -313, 138.2, 1.8, WALL, 0.4);
  k.wall(-287, 137.8, -260, 138.2, 1.8, WALL, 0.4);
  k.wall(-362.2, 138, -361.8, 240, 1.8, WALL, 0.4);
  k.wall(-362, 239.8, -260, 240.2, 1.8, WALL, 0.4);
  k.wall(-260.2, 138, -259.8, 196, 1.8, WALL, 0.4);
  k.wall(-260.2, 204, -259.8, 240, 1.8, WALL, 0.4);
  for (const x of [-313, -287]) k.box(x, 0, 138, 1.6, 6, 1.6, 0x1f9a4f, true);
  k.box(-300, 6, 138, 27.6, 1.0, 1.2, 0xf3efe6);
  sign(g, 'JABI MOTOR PARK', -300, 7.5, 137.3, Math.PI, 18, 2, { bg: '#1f9a4f', fg: '#ffffff', sub: 'Interstate • Kaduna • Lagos • Jos • Kano • Enugu' });
  sign(g, 'SAFE JOURNEY', -300, 7.5, 138.7, 0, 12, 1.6, { bg: '#1f9a4f', fg: '#ffffff', sub: 'Pray before you travel • No over-speeding' });
  // Ticket booths along the west wall.
  const dests = ['KADUNA • KANO', 'LAGOS • IBADAN', 'JOS • BAUCHI', 'ENUGU • ONITSHA', 'MAIDUGURI • YOLA'];
  dests.forEach((d, i) => {
    const z = 156 + i * 16;
    k.box(-355.5, 0, z, 5, 3, 6, 0xf3efe6, true);
    k.box(-355.5, 3, z, 5.6, 0.3, 6.6, [0xc0262d, 0x123e7c, 0x0f8a4b, 0xe8a317, 0x6c2c91][i]);
    lit.box(-352.96, 1.0, z, 0.06, 1.2, 2.4);
    sign(g, d, -352.95, 3.8, z, HALF, 5.4, 0.9, { bg: ['#c0262d', '#123e7c', '#0f8a4b', '#e8a317', '#6c2c91'][i], fg: '#ffffff', sub: 'TICKETS • LUXURY BUS' });
  });
  // Rows of Hiace buses and Coasters.
  const rows: [number, string, string, string][] = [
    [161, 'KADUNA', 'Loading • ₦9,000', '#c0262d'], [183, 'LAGOS', 'Night bus • ₦32,000', '#123e7c'],
    [205, 'JOS', 'Loading • ₦11,000', '#0f8a4b'], [227, 'KANO', 'Loading • ₦14,000', '#e8a317'],
  ];
  for (const [rz, dest, sub2, bg] of rows) {
    for (let j = 0; j < 21; j++) {
      const x = -341 + j * 3.1;
      if (rng() < 0.12) continue;
      const coaster = rng() < 0.3;
      bus(k, x, rz, coaster, pick(rng, [0xf2f2f2, 0xf2f2f2, 0xe8dcc0, 0xdfe6ec]), pick(rng, [0x2a64c9, 0x0f8a4b, 0xc0262d, 0xe8a317]), rng() < 0.45);
    }
    for (const s of [-1, 1]) k.cyl(-345 + s * 1.6, 0, rz - 4.4, 0.08, 0.08, 3.6, 0x444444, 6, 3.6);
    sign(g, dest, -345, 3.25, rz - 4.4, Math.PI, 3.6, 1.1, { bg, fg: '#ffffff', sub: sub2 });
    sign(g, dest, -345, 3.25, rz - 4.36, 0, 3.6, 1.1, { bg, fg: '#ffffff', sub: sub2 });
  }
  // Food vendors (east strip).
  k.box(-268, 0, 189.6, 2.4, 0.85, 0.8, 0x6b4a2b, true);
  k.cyl(-268.7, 0.85, 189.6, 0.18, 0.2, 0.35, 0x9aa1a8, 8);
  k.cyl(-267.6, 0.85, 189.6, 0.15, 0.15, 0.25, 0xd4a62a, 8);
  for (let i = 0; i < 4; i++) k.box(-267.2 + i * 0.12, 0.85, 189.4, 0.1, 0.12, 0.35, 0xe8c27a);
  umbrella(k, -268, 189.6, 2.6, 2, 0x2a64c9);
  k.bench(-268, 193.6, 0);
  sign(g, 'MAI SHAYI • TEA & BREAD', -268, 3.0, 188.9, Math.PI, 3.2, 0.5, { bg: '#2a64c9', fg: '#ffffff' });
  for (const [z, label, c] of [[165, 'ROASTED CORN & UBE', 0xe8a317], [214, 'SUYA • KILISHI', 0xc0262d]] as const) {
    k.box(-268, 0, z, 1.8, 0.9, 1.0, 0x333333, true);
    for (let i = 0; i < 5; i++) k.box(-268.6 + i * 0.3, 0.9, z, 0.12, 0.08, 0.6, 0xe8a317);
    umbrella(k, -268, z, 2.5, 1.8, c);
    sign(g, label, -268, 3.0, z - 0.6, Math.PI, 3, 0.45, { bg: '#111111', fg: '#ffe08a' });
  }
  k.box(-268, 0, 233, 6, 3, 5, 0xc9d1d6, true);
  sign(g, 'PUBLIC TOILET ₦100', -268, 2.3, 230.45, Math.PI, 4, 0.6, { bg: '#123e7c', fg: '#ffffff' });
  // Green-and-white Abuja cabs waiting by the gate.
  parkedCars(g, world, [
    { x: -338, z: 146, heading: 0, color: 0, taxi: true },
    { x: -333, z: 146, heading: 0, color: 0, taxi: true },
    { x: -328, z: 146, heading: Math.PI, color: 0, taxi: true },
  ]);
  for (const [x, z] of [[-350, 145], [-275, 145], [-350, 236], [-275, 236]] as const) {
    k.cyl(x, 0, z, 0.08, 0.12, 6, 0x555555, 6, 6);
    lit.box(x, 6, z, 0.8, 0.25, 0.4);
  }
  k.flush(g);
  lit.flush(b, g, 0xffe6a0, 0xbfc6cc, 1.8);

  const tout = { outfit: 'jersey' as const, primary: 9, headwear: 'cap' as const };
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: -340, z0: 166, x1: -280, z1: 177.5 }, count: 5, cfg: tout },
    { kind: 'wander', rect: { x0: -340, z0: 188.5, x1: -280, z1: 199.5 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: -340, z0: 210.5, x1: -280, z1: 221.5 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: -345, z0: 140.5, x1: -276, z1: 154.5 }, count: 6, carry: 'bag' },
    { kind: 'wander', rect: { x0: -351, z0: 150, x1: -347, z1: 232 }, count: 3, carry: 'bag' },
  ];
  for (const [rz] of rows) for (let i = 0; i < 2; i++) agents.push({ kind: 'static', x: -330 + i * 30 + rng() * 6, z: rz + 4.3, facing: rng() * 6, pose: 'cheer', cfg: tout });
  for (let i = 0; i < 4; i++) agents.push({ kind: 'static', x: -349.5, z: 162 + i * 18, facing: -HALF, pose: 'sit' });
  agents.push(
    { kind: 'static', x: -268.6, z: 193.5, facing: Math.PI, pose: 'sit' },
    { kind: 'static', x: -267.4, z: 193.5, facing: Math.PI, pose: 'sit', cfg: { outfit: 'kaftan' } },
    { kind: 'static', x: -269.6, z: 165, facing: HALF, pose: 'normal', cfg: { outfit: 'iroBuba', hair: 'gele', headwear: 'none', facialHair: 'none' } },
    { kind: 'static', x: -269.6, z: 214, facing: HALF, pose: 'normal', cfg: { outfit: 'kaftan', headwear: 'kufi' } },
    { kind: 'static', x: -294, z: 141.5, facing: Math.PI, pose: 'cheer', cfg: tout },
  );
  b.crowds.push({ id: 'motorpark', cx: -310, cz: 190, radius: 95, agents });
}

// =====================================================================
// 9. MOSHOOD ABIOLA NATIONAL STADIUM — oval bowl on Airport Road
// =====================================================================
function stadium(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'stadium');
  const k = new Kit(world);
  const rng = mulberry32(309);
  const flood = new Lights();
  const CX = -505, CZ = 342;
  const RXI = 58, RZI = 33, RXO = 80, RZO = 55;
  const TIERS = 6, N = 64;
  const W = 0xffffff;
  // Plaza, infield, track, pitch.
  k.floor(CX - 62, 268, CX + 62, CZ - RZO + 2, 0.05, 0xcfc8b8);
  k.disc(CX, CZ, 1, 0.032, 0x4f9a3a, RXI + 1, RZI + 1, 64);
  const TR = 0xb5533c;
  k.floor(CX - 26, CZ - 28, CX + 26, CZ + 28, 0.04, TR);
  for (const s of [-1, 1]) k.disc(CX + s * 26, CZ, 28, 0.04, TR, 1, 1, 32);
  for (const o of [24.9, 26.9]) for (const s of [-1, 1]) k.floor(CX - 26, CZ + s * o - 0.06, CX + 26, CZ + s * o + 0.06, 0.042, W);
  k.floor(CX - 26, CZ - 22, CX + 26, CZ + 22, 0.045, 0x3f8f35);
  for (const s of [-1, 1]) k.disc(CX + s * 26, CZ, 22, 0.045, 0x3f8f35, 1, 1, 32);
  for (let i = 0; i < 8; i++) k.floor(CX - 28 + i * 7, CZ - 17, CX - 21 + i * 7, CZ + 17, 0.05, i % 2 ? 0x47a03c : 0x3f9636);
  const line = (x0: number, z0: number, x1: number, z1: number) => k.floor(x0, z0, x1, z1, 0.055, W);
  line(CX - 28, CZ - 17, CX + 28, CZ - 16.85);
  line(CX - 28, CZ + 16.85, CX + 28, CZ + 17);
  line(CX - 28, CZ - 17, CX - 27.85, CZ + 17);
  line(CX + 27.85, CZ - 17, CX + 28, CZ + 17);
  line(CX - 0.08, CZ - 17, CX + 0.08, CZ + 17);
  k.disc(CX, CZ, 5, 0.053, W, 1, 1, 32);
  k.disc(CX, CZ, 4.85, 0.054, 0x47a03c, 1, 1, 32);
  for (const s of [-1, 1]) {
    const gx = CX + s * 28;
    line(Math.min(gx, gx - s * 9), CZ - 10, Math.max(gx, gx - s * 9), CZ - 9.85);
    line(Math.min(gx, gx - s * 9), CZ + 9.85, Math.max(gx, gx - s * 9), CZ + 10);
    line(gx - s * 9 - 0.075, CZ - 10, gx - s * 9 + 0.075, CZ + 10);
    for (const z of [-3.2, 3.2]) k.cyl(gx, 0, CZ + z, 0.07, 0.07, 2.4, W, 6, 2.4);
    k.box(gx, 2.33, CZ, 0.14, 0.14, 6.5, W);
    k.box(gx + s * 0.9, 0, CZ, 0.05, 2.4, 6.4, 0xe6e6e6);
  }
  // Ball.
  k.sphere(CX + 6, 0.2, CZ + 2, 0.2, W, 1, 8);

  // Stands: stepped tiers around an ellipse with tunnels north and south.
  const SEATS = [0x1f8a4b, 0xffffff, 0x1f8a4b, 0xd8d8d8, 0x1f8a4b, 0xcfcac0];
  const fans = new BoxField();
  const gap = (i: number) => i === 48 || i === 16;
  const ell = (rx: number, rz: number, th: number): [number, number] => [CX + rx * Math.cos(th), CZ + rz * Math.sin(th)];
  for (let i = 0; i < N; i++) {
    if (gap(i)) continue;
    const th = (i / N) * Math.PI * 2;
    const thA = th - Math.PI / N;
    const thB = th + Math.PI / N;
    for (let t = 0; t < TIERS; t++) {
      const fm = (t + 0.5) / TIERS;
      const rx = RXI + (RXO - RXI) * fm;
      const rz = RZI + (RZO - RZI) * fm;
      const [ax, az] = ell(rx, rz, thA);
      const [bx, bz] = ell(rx, rz, thB);
      const len = Math.hypot(bx - ax, bz - az) * 1.07;
      const ry = Math.atan2(-(bz - az), bx - ax);
      const h = 1.2 + t * 2.6;
      k.rbox((ax + bx) / 2, 0, (az + bz) / 2, len, h, ((RXO - RXI) / TIERS) * 1.05, ry, SEATS[t]);
      if (t < TIERS - 1) {
        for (let j = 0; j < 4; j++) {
          if (rng() > 0.78) continue;
          const f = (j + 0.5) / 4;
          fans.add(ax + (bx - ax) * f, h, az + (bz - az) * f, 0.42, 0.85, 0.42, rng() < 0.6 ? 0x1f8a4b : rng() < 0.6 ? 0xffffff : pick(rng, [0xc0262d, 0xe8a317, 0x111111, 0x2a64c9]), ry);
        }
      }
    }
    // Back wall with a green band.
    const [ax, az] = ell(RXO + 0.4, RZO + 0.4, thA);
    const [bx, bz] = ell(RXO + 0.4, RZO + 0.4, thB);
    const ry = Math.atan2(-(bz - az), bx - ax);
    const len = Math.hypot(bx - ax, bz - az) * 1.07;
    k.rbox((ax + bx) / 2, 0, (az + bz) / 2, len, 16.6, 1.2, ry, 0xd9d4c6);
    k.rbox((ax + bx) / 2, 16.6, (az + bz) / 2, len, 0.9, 1.4, ry, 0x1f8a4b);
    // Main-stand roof on the west side.
    if (i >= 25 && i <= 39) {
      const [rx0, rz0] = ell(RXI + 13, RZI + 13, thA);
      const [rx1, rz1] = ell(RXI + 13, RZI + 13, thB);
      const rlen = Math.hypot(rx1 - rx0, rz1 - rz0) * 1.08;
      k.rbox((rx0 + rx1) / 2, 18.6, (rz0 + rz1) / 2, rlen, 0.5, 24, ry, 0xe0e4e8);
      if (i % 2 === 1) k.rbox((ax + bx) / 2, 17.5, (az + bz) / 2, 0.6, 1.2, 0.6, ry, 0xb8bec4);
    }
  }
  fans.build(g, new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  // Colliders: a chain of circles along the stand band, plus tunnel walls.
  const RMX = (RXI + RXO) / 2, RMZ = (RZI + RZO) / 2;
  for (let i = 0; i < 76; i++) {
    const th = (i / 76) * Math.PI * 2;
    if (Math.abs(Math.cos(th)) * RMX < 15.5) continue;
    world.addCircle(CX + RMX * Math.cos(th), CZ + RMZ * Math.sin(th), 11.5, 17);
  }
  for (const s of [-1, 1]) {
    world.addBox(CX - 12, s < 0 ? CZ - RZO - 0.5 : CZ + RZI - 0.5, CX - 3.6, s < 0 ? CZ - RZI + 0.5 : CZ + RZO + 0.5, 17);
    world.addBox(CX + 3.6, s < 0 ? CZ - RZO - 0.5 : CZ + RZI - 0.5, CX + 12, s < 0 ? CZ - RZI + 0.5 : CZ + RZO + 0.5, 17);
  }
  // Tunnel portals.
  for (const s of [-1, 1]) {
    const z = CZ + s * (RZO - 1);
    k.box(CX, 8, z, 14, 10, 4, 0xd9d4c6);
    k.box(CX, 17.8, z, 14.4, 0.8, 4.4, 0x1f8a4b);
    for (const x of [-4, 4]) k.box(CX + x, 0, z, 0.8, 8, 4, 0xcfc8b8);
  }
  sign(g, 'MOSHOOD ABIOLA NATIONAL STADIUM', CX, 15.4, CZ - RZO - 1.1, Math.PI, 30, 2.6, { bg: '#0f6b3a', fg: '#ffffff', sub: 'ABUJA • Home of the Super Eagles' });
  sign(g, 'SUPER EAGLES • SOAR!', CX, 12.6, CZ - RZI + 0.2, 0, 10, 1.4, { bg: '#0f6b3a', fg: '#ffffff' });
  // Floodlight towers.
  for (let j = 0; j < 4; j++) {
    const a = Math.PI / 4 + (j * Math.PI) / 2;
    const px = CX + (RXO + 7) * Math.cos(a);
    const pz = CZ + (RZO + 7) * Math.sin(a);
    const dx = CX - px, dz = CZ - pz;
    const ry = Math.atan2(dx, dz);
    k.cyl(px, 0, pz, 0.5, 0.75, 34, 0x9aa1a8, 8, 34);
    k.rbox(px, 33.5, pz, 7.4, 4.2, 0.7, ry, 0x333333);
    const d = Math.hypot(dx, dz);
    flood.box(px + (dx / d) * 0.4, 33.9, pz + (dz / d) * 0.4, 6.8, 3.4, 0.12, ry);
  }
  // Jersey stall and ticket booth on the plaza.
  k.box(-478, 0, 281.5, 3, 0.9, 1, 0x6b4a2b, true);
  for (const x of [-479.4, -476.6]) k.cyl(x, 0, 282.1, 0.05, 0.05, 2.6, 0x888888, 6);
  k.box(-478, 2.6, 281.6, 3.4, 0.15, 2, 0x1f8a4b);
  k.box(-478, 2.2, 282.1, 3, 0.04, 0.04, 0x333333);
  for (let i = 0; i < 5; i++) k.box(-479.2 + i * 0.6, 1.45, 282.1, 0.5, 0.7, 0.06, i % 2 ? 0xffffff : 0x1f8a4b);
  sign(g, 'JERSEYS • FLAGS • VUVUZELA', -478, 3.0, 280.55, Math.PI, 3.4, 0.5, { bg: '#1f8a4b', fg: '#ffffff' });
  k.box(-528, 0, 282, 3, 2.6, 2.2, 0x1f8a4b, true);
  k.box(-528, 2.6, 282, 3.4, 0.25, 2.6, 0xffffff);
  sign(g, 'MATCH TICKETS', -528, 2.2, 280.85, Math.PI, 2.8, 0.55, { bg: '#ffffff', fg: '#1f8a4b' });
  glow(g, -528, 0.9, 280.88, 1.6, 0.8, 0.03, 0xffe8b0, 0.6);
  for (const x of [CX - 50, CX - 25, CX + 25, CX + 50]) {
    k.cyl(x, 0, 270.5, 0.08, 0.11, 5, 0x333333, 6, 5);
    flood.box(x, 5, 270.5, 0.7, 0.25, 0.5);
  }
  k.flush(g);
  flood.flush(b, g, 0xf4f8ff, 0xd8dde3, 2.6);

  const green = { outfit: 'jersey' as const, primary: 3, headwear: 'none' as const };
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: CX - 26, z0: CZ - 15, x1: CX - 2, z1: CZ + 15 }, count: 5, speed: 2.6, cfg: green },
    { kind: 'wander', rect: { x0: CX + 2, z0: CZ - 15, x1: CX + 26, z1: CZ + 15 }, count: 5, speed: 2.6, cfg: { outfit: 'jersey', primary: 0, headwear: 'none' } },
    { kind: 'static', x: CX - 27, z: CZ, facing: HALF, pose: 'normal', cfg: { outfit: 'jersey', primary: 8, headwear: 'none' } },
    { kind: 'static', x: CX + 27, z: CZ, facing: -HALF, pose: 'normal', cfg: { outfit: 'jersey', primary: 11, headwear: 'none' } },
    { kind: 'wander', rect: { x0: CX - 50, z0: 271, x1: CX + 50, z1: 279 }, count: 7, carry: 'bag', cfg: green },
  ];
  // Jogging loop on the track.
  const loop: [number, number][] = [];
  for (let i = 0; i <= 8; i++) loop.push([CX - 26 + (52 * i) / 8, CZ - 25]);
  for (let i = 1; i < 12; i++) {
    const a = -HALF + (i / 12) * Math.PI;
    loop.push([CX + 26 + Math.cos(a) * 25, CZ + Math.sin(a) * 25]);
  }
  for (let i = 0; i <= 8; i++) loop.push([CX + 26 - (52 * i) / 8, CZ + 25]);
  for (let i = 1; i < 12; i++) {
    const a = HALF + (i / 12) * Math.PI;
    loop.push([CX - 26 + Math.cos(a) * 25, CZ + Math.sin(a) * 25]);
  }
  agents.push({ kind: 'loop', path: loop, count: 5, speed: 3.4, cfg: { outfit: 'jersey', primary: 0, headwear: 'cap' } });
  // Front-row fans cheering at pitch level.
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * Math.PI * 2 + 0.04;
    const x = CX + (RXI - 1.4) * Math.cos(th);
    const z = CZ + (RZI - 1.4) * Math.sin(th);
    if (Math.abs(x - CX) < 7) continue;
    agents.push({ kind: 'static', x, z, facing: Math.atan2(CX - x, CZ - z), pose: i % 4 === 3 ? 'dance' : 'cheer', cfg: i % 3 === 0 ? { outfit: 'jersey', primary: 0 } : green });
  }
  b.crowds.push({ id: 'stadium', cx: CX, cz: CZ - 20, radius: 120, agents });
}

// =====================================================================
// 10. NNAMDI AZIKIWE INTERNATIONAL AIRPORT — terminal, tower, runway, planes
// =====================================================================
function airplane(k: Kit, g: THREE.Object3D, x: number, z: number, solid: boolean): void {
  const Y = 3.2, L = 34, R = 2.0;
  const BODY = 0xf6f6f6, TAIL = 0x1b3f8f, STRIPE = 0xc0262d;
  k.geo(new THREE.CylinderGeometry(R, R, L, 16).rotateX(HALF).translate(x, Y, z), BODY);
  k.geo(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, 0, HALF).rotateX(HALF).scale(1, 1, 1.6).translate(x, Y, z + L / 2), BODY);
  k.geo(new THREE.ConeGeometry(R, 7, 16).rotateX(-HALF).translate(x, Y + 0.4, z - L / 2 - 3.5), BODY);
  k.geo(new THREE.BoxGeometry(0.06, 0.35, 0.9).translate(x + R * 0.86, Y + 1.15, z + L / 2 + 0.8), 0x1b2833);
  k.geo(new THREE.BoxGeometry(0.06, 0.35, 0.9).translate(x - R * 0.86, Y + 1.15, z + L / 2 + 0.8), 0x1b2833);
  for (const s of [-1, 1]) {
    k.box(x + s * R * 0.985, Y + 0.25, z - 1, 0.05, 0.32, L - 6, 0x1b2833);
    k.box(x + s * R * 0.99, Y - 0.75, z, 0.05, 0.3, L, STRIPE);
    k.rbox(x + s * 8.1, Y - 1.4, z - 1.2, 16.5, 0.4, 4.6, s * 0.32, BODY);
    k.rbox(x + s * 3.5, Y + 0.5, z - L / 2 - 4.6, 6, 0.3, 2.4, s * 0.38, BODY);
    k.geo(new THREE.CylinderGeometry(0.85, 0.85, 3.4, 12).rotateX(HALF).translate(x + s * 6, Y - 2.0, z + 1.6), 0xb8bcc2);
    k.geo(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 12).rotateX(HALF).translate(x + s * 6, Y - 2.0, z + 3.32), 0x333333);
    k.cyl(x + s * 2.3, 0, z - 1.5, 0.22, 0.22, Y - R + 0.2, 0x333333, 8);
    k.cyl(x + s * 2.3, 0, z - 1.5, 0.45, 0.45, 0.5, 0x161616, 10);
  }
  k.geo(new THREE.BoxGeometry(0.35, 6.2, 4.6).rotateX(-0.42).translate(x, Y + R + 2.4, z - L / 2 - 3.2), TAIL);
  k.geo(new THREE.BoxGeometry(0.4, 1.2, 4.0).rotateX(-0.42).translate(x, Y + R + 0.5, z - L / 2 - 1.9), STRIPE);
  k.cyl(x, 0, z + L / 2 - 3, 0.18, 0.18, Y - R + 0.2, 0x333333, 8);
  k.cyl(x, 0, z + L / 2 - 3, 0.38, 0.38, 0.45, 0x161616, 10);
  for (const s of [-1, 1]) sign(g, 'AIR NAIJA', x + s * (R + 0.03), Y + 0.95, z + 4, s * HALF, 8, 1.1, { bg: '#f6f6f6', fg: '#1b3f8f' });
  if (solid) {
    k.world.addBox(x - R, z - L / 2 - 7, x + R, z + L / 2 + 3, Y + R);
    for (const s of [-1, 1]) k.world.addCircle(x + s * 6, z + 1.6, 1.1, Y - 1);
  }
}

function airport(world: CollisionWorld, b: Build): void {
  const g = sub(b, 'airport');
  const k = new Kit(world);
  const lit = new Lights();
  const rwy = new Lights();
  const lamps = new Lights();
  const W = 0xffffff;
  // Forecourt, terminal, curved roof.
  k.floor(-805, 236, -690, 272, 0.05, 0xb0aca2);
  k.floor(-805, 236, -695, 246.5, 0.06, 0xd8d2c4);
  k.box(-750, 0, 216, 100, 14, 40, 0xe9e6de, true);
  const TH = Math.asin(20 / 29);
  k.geo(new THREE.CylinderGeometry(29, 29, 108, 40, 1, true, HALF - TH, 2 * TH).rotateZ(HALF).translate(-750, -7, 216), 0xd7dde3);
  const cap = new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const a = HALF - TH + (2 * TH * i) / 16;
    const zz = 29 * Math.cos(a);
    const yy = 29 * Math.sin(a) - 7;
    if (i === 0) cap.moveTo(zz, yy);
    else cap.lineTo(zz, yy);
  }
  k.geo(new THREE.ShapeGeometry(cap).rotateY(-HALF).translate(-804, 0, 216), 0xc9d1d8);
  k.geo(new THREE.ShapeGeometry(cap).rotateY(HALF).translate(-696, 0, 216), 0xc9d1d8);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(96, 12.4, 0.15).translate(-750, 6.7, 236.12), new THREE.MeshPhongMaterial({ color: 0x8fc6e8, transparent: true, opacity: 0.5, shininess: 120, specular: 0xffffff, depthWrite: false }));
  g.add(glass);
  lit.box(-750, 0.5, 235.98, 96, 12.4, 0.06);
  for (let x = -798; x <= -702; x += 6) k.box(x, 0.5, 236.22, 0.15, 12.4, 0.15, 0x9aa3ad);
  for (const x of [-765, -735, -712]) k.box(x, 0, 236.3, 3.2, 3, 0.1, 0x2b3b48);
  k.box(-750, 6.2, 241, 98, 0.5, 9.6, 0xe0e3e6);
  for (let i = 0; i <= 6; i++) k.cyl(-796 + i * 16, 0, 245, 0.35, 0.35, 6.2, 0xb8bec4, 10, true);
  sign(g, 'NNAMDI AZIKIWE INTERNATIONAL AIRPORT', -750, 7.4, 245.86, 0, 40, 1.8, { bg: '#1b3f8f', fg: '#ffffff', sub: 'ABUJA • FAAN' });
  sign(g, 'DEPARTURES', -765, 5.3, 243.5, 0, 4.4, 0.8, { bg: '#111111', fg: '#ffd23a' });
  sign(g, 'ARRIVALS', -712, 5.3, 243.5, 0, 4.4, 0.8, { bg: '#111111', fg: '#ffd23a' });
  // Desks by the doors.
  k.box(-768.5, 0, 238.2, 2, 1.1, 0.9, 0x1b3f8f, true);
  sign(g, 'AIR NAIJA CHECK-IN', -768.5, 2.0, 238.7, 0, 2.6, 0.5, { bg: '#1b3f8f', fg: '#ffffff' });
  k.box(-738.5, 0, 238.2, 2, 0.9, 0.9, 0x3f4a2f, true);
  sign(g, 'CUSTOMS • IMMIGRATION', -738.5, 1.8, 238.7, 0, 2.6, 0.5, { bg: '#3f4a2f', fg: '#ffffff' });
  k.box(-710.4, 0, 241.5, 0.5, 0.75, 0.3, 0xc0262d);
  k.box(-710.4, 0, 242.2, 0.55, 0.65, 0.3, 0x123e7c);
  k.box(-709.6, 0, 241.8, 0.45, 0.55, 0.28, 0x111111);
  sign(g, 'WELCOME HOME ADA!', -714.5, 1.8, 243.6, 0, 1.8, 0.5, { bg: '#ffffff', fg: '#c0262d' });
  k.cyl(-714.5, 0, 243.55, 0.03, 0.03, 1.55, 0x6b4a2b, 4);
  parkedCars(g, world, [
    { x: -795, z: 249.2, heading: HALF, color: 0, taxi: true },
    { x: -786, z: 249.2, heading: HALF, color: 0, taxi: true },
    { x: -777, z: 249.2, heading: HALF, color: 0, taxi: true },
    { x: -728, z: 249.2, heading: HALF, color: 0, taxi: true },
    { x: -719, z: 249.2, heading: HALF, color: 0x111111, model: 'suv' },
  ]);
  for (const x of [-800, -775, -725, -700]) {
    k.cyl(x, 0, 266, 0.08, 0.12, 7, 0x555555, 6, 7);
    lamps.box(x, 7, 266, 1.2, 0.2, 0.5);
  }
  // Road sign at the start of the airport approach.
  postSign(g, k, "NNAMDI AZIKIWE INT'L AIRPORT", -640, 270, HALF, 7, 1.6, 4.2, { bg: '#0f6b3a', fg: '#ffffff', sub: 'Departures • Arrivals • Cargo' });

  // Apron, planes, jet bridges.
  k.floor(-845, 110, -690, 195.5, 0.04, 0xa8a59c);
  for (const px of [-775, -725]) {
    k.floor(px - 0.15, 115, px + 0.15, 195, 0.045, 0xf2c230);
    airplane(k, g, px, 166, true);
    k.box(px - 4.6, 3.4, 190.5, 2.6, 2.8, 11, 0xcfd3d6);
    k.box(px - 3.2, 3.4, 185.4, 1.2, 2.6, 2.4, 0xbfc4c8);
    k.cyl(px - 4.6, 0, 186.5, 0.22, 0.22, 3.4, 0x555555, 6, 3.4);
  }
  k.box(-745, 0, 150, 2.4, 1.6, 4, 0xe8a317, true); // baggage tug
  k.box(-745, 0, 145, 2, 1.2, 3.2, 0x9aa3ad, true);
  k.box(-760, 0, 135, 3, 2.6, 7, 0xf2f2f2, true); // fuel truck
  k.cyl(-760, 1.4, 133.5, 1.1, 1.1, 0.01, 0xf2f2f2, 12);
  // Control tower.
  k.box(-680, 0, 160, 12, 5, 10, 0xe6e2d8, true);
  k.cyl(-680, 5, 160, 2.2, 2.8, 28, 0xf0ece2, 16, 33);
  k.cyl(-680, 33, 160, 4.5, 3.4, 1.2, 0xd9d4c6, 16);
  lit.geo(new THREE.CylinderGeometry(4.6, 4.6, 3.2, 16, 1, true).translate(-680, 35.8, 160));
  k.cyl(-680, 37.4, 160, 5.2, 5.2, 0.6, 0xd9d4c6, 16);
  k.cyl(-680, 38, 160, 0.1, 0.1, 6, 0x888888, 6);
  glow(g, -680, 44, 160, 0.4, 0.4, 0.4, 0xff2020, 1.4);
  sign(g, 'ABUJA TOWER', -680, 3.4, 165.06, 0, 6, 1, { bg: '#1b3f8f', fg: '#ffffff' });
  // Runway + taxiway.
  k.floor(-905, -95, -875, 405, 0.042, 0x3b3c3f);
  for (let z = -85; z < 395; z += 30) k.floor(-890.3, z, -889.7, z + 15, 0.046, W);
  for (const z0 of [-93, 391]) for (let i = 0; i < 8; i++) k.floor(-903 + i * 3.6, z0, -901.6 + i * 3.6, z0 + 11, 0.046, W);
  for (const x of [-905, -875.4]) k.floor(x, -95, x + 0.4, 405, 0.046, W);
  k.floor(-875, 150, -845, 166, 0.042, 0x55565a);
  k.floor(-875, 157.8, -845, 158.2, 0.046, 0xf2c230);
  for (let z = -90; z <= 400; z += 25) for (const x of [-906.5, -873.5]) rwy.box(x, 0, z, 0.3, 0.3, 0.3);
  k.cyl(-866, 0, 395, 0.06, 0.08, 5, 0xdddddd, 6, 5);
  k.geo(new THREE.ConeGeometry(0.5, 2.6, 10, 1, true).rotateZ(-HALF).translate(-864.6, 4.8, 395), 0xf26b1d);
  k.flush(g);
  lit.flush(b, g, 0xfff0d0, 0x55708a, 1.3);
  rwy.flush(b, g, 0xfff2a0, 0xd8d8c0, 3);
  lamps.flush(b, g, 0xffe0a0, 0xcfcfcf, 1.8);

  // A plane that keeps taking off from the runway.
  const fly = new THREE.Group();
  const kf = new Kit(world);
  airplane(kf, fly, 0, 0, false);
  kf.flush(fly);
  fly.rotation.y = Math.PI;
  g.add(fly);
  b.animators.push((t) => {
    const u = t % 80;
    let s: number, y: number, pitch: number;
    if (u < 25) {
      s = 0.368 * u * u;
      y = 0;
      pitch = 0;
    } else {
      const v = u - 25;
      s = 230 + 18.4 * v * 1.3;
      y = v * 1.5 + v * v * 0.12;
      pitch = Math.min(0.2, v * 0.05);
    }
    const z = 385 - s;
    fly.visible = z > -700 && y < 260;
    fly.position.set(-890, y, z);
    fly.rotation.x = pitch;
  });

  const traveller = { carry: 'trolley' as const };
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: -798, z0: 239.6, x1: -702, z1: 243.8 }, count: 6, carry: 'bag' },
    { kind: 'wander', rect: { x0: -760, z0: 239.6, x1: -742, z1: 243.8 }, count: 3, ...traveller },
    { kind: 'static', x: -713.5, z: 243.9, facing: Math.PI, pose: 'cheer', cfg: { outfit: 'asoebi', hair: 'gele', headwear: 'none', facialHair: 'none' } },
    { kind: 'static', x: -715.3, z: 244.1, facing: Math.PI, pose: 'normal', scale: 0.7 },
    { kind: 'static', x: -790, z: 247, facing: 0, pose: 'phone', cfg: { outfit: 'kaftan', primary: 12, headwear: 'cap' } },
    { kind: 'static', x: -781, z: 247, facing: 0, pose: 'normal', cfg: { outfit: 'kaftan', primary: 12, headwear: 'cap' } },
    { kind: 'static', x: -748, z: 155, facing: 0, pose: 'normal', cfg: { outfit: 'jersey', primary: 9, headwear: 'cap' } },
    { kind: 'static', x: -736, z: 180, facing: Math.PI, pose: 'cheer', cfg: { outfit: 'jersey', primary: 9, headwear: 'cap' } },
  ];
  b.crowds.push({ id: 'airport', cx: -750, cz: 230, radius: 110, agents });
}

/** The ten extra real Abuja places (Farm City, Transcorp Hilton, …). */
export function buildAbuja2(world: CollisionWorld): LocationBuild {
  const b = newBuild('abuja2');
  farmCity(world, b);
  banex(world, b);
  hilton(world, b);
  unity(world, b);
  assembly(world, b);
  silverbird(world, b);
  wonderland(world, b);
  motorPark(world, b);
  stadium(world, b);
  airport(world, b);
  return b;
}

// =====================================================================
// Quick actions
// =====================================================================

/** Stand in front of an NPC spot, facing them. */
function talk(label: string, icon: string, npc: string, dist = 1.8): QuickItem {
  const s = NPC_SPOTS.find((p) => p.id === npc);
  if (!s) throw new Error(`Abuja2: unknown NPC spot ${npc}`);
  return { label, icon, npc, x: s.x + Math.sin(s.facing) * dist, z: s.z + Math.cos(s.facing) * dist, heading: s.facing + Math.PI };
}

const spot = (label: string, icon: string, x: number, z: number, heading: number): QuickItem => ({ label, icon, x, z, heading });

/** Quick-action lists for the places built in this file. */
export const ABUJA2_QUICK: QuickZone[] = [
  {
    id: 'farmcity', name: 'Farm City', rects: [{ x0: 48, z0: 48, x1: 112, z1: 112 }], interiors: ['farmcity'],
    items: [
      talk('Order food & drinks', '🍗', 'fc-waiter'),
      talk('Live band stage', '🎸', 'fc-band'),
      spot('Lounge entrance', '🚪', 89, 76.5, Math.PI),
      talk('Game arcade', '🕹️', 'fc-arcade'),
      talk('Lounge bar', '🍹', 'fc-bar', 2.3),
      spot('Garden tables', '🌿', 67, 88.5, Math.PI),
      spot('Pepper soup gazebo', '🍲', 58, 67.5, Math.PI),
    ],
  },
  {
    id: 'banex', name: 'Banex Plaza', rects: [{ x0: -112, z0: 46, x1: -10, z1: 112 }],
    items: [
      talk('Buy a phone', '📱', 'banex-phone'),
      talk('Fix your screen', '🔧', 'banex-repair'),
      talk('Sell your phone', '💸', 'banex-buyer'),
      spot('Plaza entrance', '🏬', -61, 81, Math.PI),
      spot('Hawker umbrellas', '☂️', -75, 91.5, Math.PI),
      spot('Car park', '🚗', -61, 101, Math.PI),
    ],
  },
  {
    id: 'hilton', name: 'Transcorp Hilton', rects: [{ x0: 10, z0: -362, x1: 112, z1: -258 }], interiors: ['hilton'],
    items: [
      spot('Hotel entrance', '🏨', 66, -301.5, Math.PI),
      talk('Reception (book a room)', '🛎️', 'hilton-reception', 2.4),
      talk('Lobby lounge big men', '💼', 'hilton-bigman'),
      talk('Pool bar', '🏊', 'hilton-pool'),
      spot('Fountain driveway', '⛲', 66, -266.5, Math.PI),
    ],
  },
  {
    id: 'unity', name: 'Unity Fountain', rects: [{ x0: 10, z0: -240, x1: 112, z1: -138 }],
    items: [
      talk('Candlelight vigil', '🕯️', 'unity-vigil'),
      talk('Jog with Coach Fatima', '🏃', 'unity-jog'),
      talk('Snap a picture', '📸', 'unity-photo'),
      spot('Fountain & 37 pillars', '⛲', 70, -167, Math.PI),
      spot('Unity Fountain sign', '🪧', 50, -147, Math.PI),
    ],
  },
  {
    id: 'assembly', name: 'National Assembly', rects: [{ x0: 386, z0: -106, x1: 552, z1: 79 }],
    items: [
      spot('Main gate', '🚧', 470, 72, Math.PI),
      talk('Public gallery (plenary)', '🏛️', 'nass-clerk'),
      talk('Distinguished Senator', '🎩', 'nass-senator'),
      spot('The Mace', '🔱', 470, 53.5, Math.PI),
      talk('Join the protest', '✊', 'nass-protest'),
      talk('Press interview', '🎤', 'nass-press'),
    ],
  },
  {
    id: 'silverbird', name: 'Silverbird Galleria', rects: [{ x0: 296, z0: 70, x1: 362, z1: 112 }],
    items: [
      talk('Buy a movie ticket', '🎬', 'sb-ticket'),
      talk('Popcorn', '🍿', 'sb-popcorn'),
      talk('Nollywood star', '⭐', 'sb-star'),
      spot('Galleria entrance', '🏬', 329, 105, Math.PI),
      spot('Movie posters', '🎞️', 306, 108.5, Math.PI),
    ],
  },
  {
    id: 'wonderland', name: 'Wonderland Amusement Park', rects: [{ x0: 12, z0: 262, x1: 110, z1: 360 }],
    items: [
      spot('Main gate', '🎡', 60, 267, 0),
      talk('Ferris wheel', '🎡', 'wl-ferris'),
      talk('Bumper cars', '🚗', 'wl-bumper'),
      talk('Candy floss', '🍭', 'wl-candy'),
      spot('Carousel', '🎠', 36, 297.5, Math.PI),
      spot('Free-fall tower', '🎢', 32, 334, Math.PI),
    ],
  },
  {
    id: 'motorpark', name: 'Jabi Motor Park', rects: [{ x0: -362, z0: 138, x1: -260, z1: 240 }],
    items: [
      spot('Park gate', '🚌', -300, 146, 0),
      talk('Ticket booth', '🎫', 'jmp-ticket'),
      talk('Agbero (tout)', '📣', 'jmp-tout'),
      talk('Mai shayi (tea)', '🍵', 'jmp-shayi'),
      spot('Kaduna & Lagos buses', '🚐', -310, 175, Math.PI),
      spot('Public toilet', '🚻', -268, 228, Math.PI),
    ],
  },
  {
    id: 'stadium', name: 'National Stadium', rects: [{ x0: -625, z0: 247, x1: -385, z1: 420 }],
    items: [
      spot('Stadium entrance', '🏟️', -505, 283, 0),
      talk('Match tickets', '🎟️', 'st-match'),
      talk('Super Eagles jersey', '👕', 'st-jersey'),
      talk('Jog on the track', '🏃', 'st-coach'),
      spot('Centre circle', '⚽', -505, 336, 0),
    ],
  },
  {
    id: 'airport', name: 'Nnamdi Azikiwe Airport', rects: [{ x0: -920, z0: -115, x1: -625, z1: 420 }],
    items: [
      spot('Terminal forecourt', '🛫', -750, 252, Math.PI),
      talk('Check-in counter', '🧳', 'ap-checkin'),
      talk('Customs & immigration', '🛂', 'ap-customs'),
      talk('Welcome Cousin Ada', '🤗', 'ap-relative'),
      spot('Control tower', '🗼', -680, 175, Math.PI),
      spot('Runway view', '✈️', -866, 172, -HALF),
    ],
  },
];
