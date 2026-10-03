import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../core/Collision';
import { mulberry32, pick, range } from '../core/rng';
import { CAR_SPOTS, DISTRICTS, LANDMARKS, NPC_SPOTS, RESERVED, ROADS, SPAWN, WORLD, onRoad, rectsOverlap, type District, type Rect, type RoadSeg } from './MapData';
import { buildingMaterial, nightGlowMaterial, paint } from './Materials';

export interface CityData {
  group: THREE.Group;
  buildings: Rect[];
  glowMats: THREE.MeshLambertMaterial[];
  /** Additive light pools under street lamps; opacity driven by night. */
  poolMat: THREE.MeshBasicMaterial;
}

interface Inst {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  color: number;
}

class Batch {
  items: Inst[] = [];
  constructor(readonly geo: THREE.BufferGeometry, readonly mat: THREE.Material, readonly shadows = true) {}
  add(i: Partial<Inst> & { x: number; z: number }): void {
    this.items.push({ y: 0, sx: 1, sy: 1, sz: 1, ry: 0, color: 0xffffff, ...i });
  }
  build(): THREE.InstancedMesh | null {
    if (this.items.length === 0) return null;
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      q.setFromEuler(e.set(0, it.ry, 0));
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.sx, it.sy, it.sz));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

/** Unit box with its base at y=0. */
export function unitBox(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
}

/** Gable roof prism: x in [-0.5,0.5], z in [-0.5,0.5], ridge along x at height 1. */
export function prismGeo(): THREE.BufferGeometry {
  const v = [
    // front slope
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    // back slope
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    // gables
    0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function rectGeo(r: Rect, y: number, color: number): THREE.BufferGeometry {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
  return paint(g, color);
}

function roadRect(r: RoadSeg, extra = 0): Rect {
  const hw = r.width / 2 + extra;
  return {
    x0: Math.min(r.x0, r.x1) - (r.x0 === r.x1 ? hw : 0),
    x1: Math.max(r.x0, r.x1) + (r.x0 === r.x1 ? hw : 0),
    z0: Math.min(r.z0, r.z1) - (r.z0 === r.z1 ? hw : 0),
    z1: Math.max(r.z0, r.z1) + (r.z0 === r.z1 ? hw : 0),
  };
}

/** Is (x,z) inside a road other than `self`? Used to skip markings / trees at junctions. */
function inOtherRoad(x: number, z: number, self: RoadSeg, pad = 0): boolean {
  for (const r of ROADS) {
    if (r === self) continue;
    const rr = roadRect(r, pad);
    if (x >= rr.x0 && x <= rr.x1 && z >= rr.z0 && z <= rr.z1) return true;
  }
  return false;
}

function flatMat(opts: THREE.MeshLambertMaterialParameters & { offset?: number }): THREE.MeshLambertMaterial {
  const { offset, ...rest } = opts;
  const m = new THREE.MeshLambertMaterial(rest);
  if (offset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -offset;
    m.polygonOffsetUnits = -offset * 2;
  }
  return m;
}

export function districtLots(d: District): Rect[] {
  if (d.style === 'none' || d.style === 'park') return [];
  const cx = (d.x0 + d.x1) / 2;
  const cz = (d.z0 + d.z1) / 2;
  const xs = [{ p: d.x0, w: 16 }, ...(d.minorRoads ? [{ p: cx, w: 10 }] : []), { p: d.x1, w: 16 }];
  const centreZ = d.id === 'kubwa' || d.id === 'gwarinpa' ? [{ p: cz, w: 22 }] : d.minorRoads ? [{ p: cz, w: 10 }] : [];
  const zs = [{ p: d.z0, w: 16 }, ...centreZ, { p: d.z1, w: 16 }];
  const lots: Rect[] = [];
  const gap = 5;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      lots.push({
        x0: xs[i].p + xs[i].w / 2 + gap,
        x1: xs[i + 1].p - xs[i + 1].w / 2 - gap,
        z0: zs[j].p + zs[j].w / 2 + gap,
        z1: zs[j + 1].p - zs[j + 1].w / 2 - gap,
      });
    }
  }
  return lots;
}

function poolTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildCity(world: CollisionWorld, seed = 2026): CityData {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.name = 'city';
  const buildings: Rect[] = [];
  const glowMats: THREE.MeshLambertMaterial[] = [];

  // ---------- Ground, sidewalks, roads, markings ----------
  const groundGeos: THREE.BufferGeometry[] = [rectGeo({ x0: WORLD.x0 - 600, z0: WORLD.z0 - 600, x1: WORLD.x1 + 600, z1: WORLD.z1 + 600 }, -0.02, 0x9c8f58)];
  for (const d of DISTRICTS) groundGeos.push(rectGeo(d, 0, d.ground));
  for (const d of DISTRICTS) for (const lot of districtLots(d)) groundGeos.push(rectGeo({ x0: lot.x0 - 2, z0: lot.z0 - 2, x1: lot.x1 + 2, z1: lot.z1 + 2 }, 0.01, new THREE.Color(d.ground).multiplyScalar(0.9).getHex()));
  const ground = new THREE.Mesh(mergeGeometries(groundGeos), flatMat({ vertexColors: true }));
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  const walkGeos: THREE.BufferGeometry[] = [];
  const roadGeos: THREE.BufferGeometry[] = [];
  const markGeos: THREE.BufferGeometry[] = [];
  for (const r of ROADS) {
    const inCity = !(r.kind === 'expressway' && Math.min(r.x0, r.x1) < -700);
    walkGeos.push(rectGeo(roadRect(r, r.kind === 'expressway' ? 4 : 3.2), 0.04, r.kind === 'expressway' ? 0xa79a77 : 0xc9c3b4));
    roadGeos.push(rectGeo(roadRect(r), 0.08, r.kind === 'expressway' ? 0x37383b : r.kind === 'major' ? 0x3d3e41 : 0x47484a));
    // Markings
    const horiz = r.z0 === r.z1;
    const len = horiz ? Math.abs(r.x1 - r.x0) : Math.abs(r.z1 - r.z0);
    const sx = Math.min(r.x0, r.x1);
    const sz = Math.min(r.z0, r.z1);
    const lineAt = (offset: number, dash: number, gapLen: number, color: number, thick = 0.18) => {
      for (let t = 0; t < len; t += dash + gapLen) {
        const a = t;
        const b = Math.min(len, t + dash);
        const mid = (a + b) / 2;
        const x = horiz ? sx + mid : r.x0 + offset;
        const z = horiz ? r.z0 + offset : sz + mid;
        if (inOtherRoad(x, z, r, 1)) continue;
        const rect = horiz
          ? { x0: sx + a, x1: sx + b, z0: r.z0 + offset - thick, z1: r.z0 + offset + thick }
          : { x0: r.x0 + offset - thick, x1: r.x0 + offset + thick, z0: sz + a, z1: sz + b };
        markGeos.push(rectGeo(rect, 0.12, color));
      }
    };
    if (r.kind === 'expressway') {
      lineAt(-0.35, 6, 0, 0xf2c230, 0.14);
      lineAt(0.35, 6, 0, 0xf2c230, 0.14);
      for (const o of [-7.3, -3.7, 3.7, 7.3]) lineAt(o, 4, 6, 0xf0f0f0);
      lineAt(-10.4, 6, 0, 0xf0f0f0, 0.12);
      lineAt(10.4, 6, 0, 0xf0f0f0, 0.12);
    } else if (r.kind === 'major') {
      lineAt(0, 6, 0, 0xf2c230, 0.16);
      for (const o of [-4, 4]) lineAt(o, 3, 5, 0xf0f0f0);
    } else lineAt(0, 3, 4, 0xf0f0f0);
    // Zebra crossings near junction ends of major roads inside the city.
    if (inCity && r.kind !== 'expressway') {
      for (const end of [0, len]) {
        for (const dir of [1, -1]) {
          const t = end === 0 ? 14 : len - 14;
          if (dir === -1) continue;
          for (let k = -r.width / 2 + 1; k < r.width / 2 - 0.5; k += 1.4) {
            const x = horiz ? sx + t : r.x0 + k;
            const z = horiz ? r.z0 + k : sz + t;
            if (inOtherRoad(x, z, r, 0)) continue;
            const rect = horiz ? { x0: x - 1.6, x1: x + 1.6, z0: z - 0.35, z1: z + 0.35 } : { x0: x - 0.35, x1: x + 0.35, z0: z - 1.6, z1: z + 1.6 };
            markGeos.push(rectGeo(rect, 0.12, 0xf4f4f4));
          }
        }
      }
    }
  }
  const walks = new THREE.Mesh(mergeGeometries(walkGeos), flatMat({ vertexColors: true, offset: 1 }));
  walks.receiveShadow = true;
  const roads = new THREE.Mesh(mergeGeometries(roadGeos), flatMat({ vertexColors: true, offset: 2 }));
  roads.receiveShadow = true;
  const marks = new THREE.Mesh(mergeGeometries(markGeos), flatMat({ vertexColors: true, offset: 3 }));
  marks.receiveShadow = true;
  group.add(walks, roads, marks);

  // ---------- Buildings ----------
  const box = unitBox();
  const plain = new Batch(box, buildingMaterial());
  const glassy = new Batch(box, buildingMaterial({ glassy: true }));
  const solid = new Batch(box, new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const roofs = new Batch(prismGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const tanks = new Batch(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 10).translate(0, 0.7, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), false);
  const dishes = new Batch(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-1.1).translate(0, 0.6, 0), new THREE.MeshLambertMaterial({ color: 0xdddddd }), false);

  const addBuilding = (x0: number, z0: number, x1: number, z1: number, h: number, color: number, isGlassy = false) => {
    (isGlassy ? glassy : plain).add({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, sx: x1 - x0, sy: h, sz: z1 - z0, color });
    world.addBox(x0, z0, x1, z1, h);
    buildings.push({ x0, z0, x1, z1 });
  };
  const addWall = (x0: number, z0: number, x1: number, z1: number, h: number, color: number) => {
    solid.add({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, sx: Math.max(0.3, x1 - x0), sy: h, sz: Math.max(0.3, z1 - z0), color });
    world.addBox(x0, z0, x1, z1, h);
  };
  const roofTop = (cx: number, cz: number, w: number, d: number, h: number) => {
    if (rng() < 0.75) tanks.add({ x: cx + range(rng, -w / 4, w / 4), y: h, z: cz + range(rng, -d / 4, d / 4), color: rng() < 0.6 ? 0x1c1c1c : 0x2457a8 });
    if (rng() < 0.35) dishes.add({ x: cx + range(rng, -w / 3, w / 3), y: h, z: cz + range(rng, -d / 3, d / 3), ry: rng() * 6 });
  };
  const reserved = (r: Rect) => RESERVED.some((q) => rectsOverlap(q, r));

  for (const d of DISTRICTS) {
    for (const lot of districtLots(d)) {
      const style = d.style;
      const cellSize = style === 'tower' ? 26 : style === 'mixed' ? 21 : style === 'estate' ? 17 : style === 'mansion' ? 34 : style === 'gov' ? 42 : 15;
      const nx = Math.max(1, Math.floor((lot.x1 - lot.x0) / cellSize));
      const nz = Math.max(1, Math.floor((lot.z1 - lot.z0) / cellSize));
      const cw = (lot.x1 - lot.x0) / nx;
      const cd = (lot.z1 - lot.z0) / nz;
      if (style === 'estate') {
        // Low fence around the whole close.
        const fc = 0xd8cbb0;
        if (!reserved(lot)) {
          addWall(lot.x0 - 1.5, lot.z0 - 1.6, lot.x1 + 1.5, lot.z0 - 1.3, 1.8, fc);
          addWall(lot.x0 - 1.5, lot.z1 + 1.3, lot.x1 + 1.5, lot.z1 + 1.6, 1.8, fc);
          addWall(lot.x0 - 1.6, lot.z0 - 1.5, lot.x0 - 1.3, lot.z1 + 1.5, 1.8, fc);
          addWall(lot.x1 + 1.3, lot.z0 - 1.5, lot.x1 + 1.6, (lot.z0 + lot.z1) / 2 - 3, 1.8, fc);
          addWall(lot.x1 + 1.3, (lot.z0 + lot.z1) / 2 + 3, lot.x1 + 1.6, lot.z1 + 1.5, 1.8, fc);
        }
      }
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const c: Rect = { x0: lot.x0 + i * cw, z0: lot.z0 + j * cd, x1: lot.x0 + (i + 1) * cw, z1: lot.z0 + (j + 1) * cd };
          if (reserved(c) || rng() > d.density) continue;
          const ccx = (c.x0 + c.x1) / 2;
          const ccz = (c.z0 + c.z1) / 2;
          const color = pick(rng, d.palette);
          if (style === 'mansion') {
            const wc = pick(rng, [0xeee6d6, 0xd9cdb5, 0xf4f1ea, 0xc7b79a]);
            const m = 1.2;
            addWall(c.x0 + m, c.z0 + m, c.x1 - m, c.z0 + m + 0.35, 2.6, wc);
            addWall(c.x0 + m, c.z1 - m - 0.35, ccx - 2.5, c.z1 - m, 2.6, wc);
            addWall(ccx + 2.5, c.z1 - m - 0.35, c.x1 - m, c.z1 - m, 2.6, wc);
            addWall(c.x0 + m, c.z0 + m, c.x0 + m + 0.35, c.z1 - m, 2.6, wc);
            addWall(c.x1 - m - 0.35, c.z0 + m, c.x1 - m, c.z1 - m, 2.6, wc);
            // Gate
            solid.add({ x: ccx, z: c.z1 - m - 0.17, sx: 5, sy: 2.4, sz: 0.25, color: pick(rng, [0x1d1d1d, 0x6b4a2b, 0x0f4f2a]) });
            world.addBox(ccx - 2.5, c.z1 - m - 0.3, ccx + 2.5, c.z1 - m, 2.4);
            const w = range(rng, 12, 17);
            const dd = range(rng, 10, 14);
            const h = range(rng, d.minH, d.maxH);
            const bx = ccx + range(rng, -2, 2);
            const bz = ccz - 2;
            addBuilding(bx - w / 2, bz - dd / 2, bx + w / 2, bz + dd / 2, h * 0.62, color);
            plain.add({ x: bx - w * 0.12, y: h * 0.62, z: bz, sx: w * 0.62, sy: h * 0.38, sz: dd * 0.8, color });
            roofs.add({ x: bx - w * 0.12, y: h, z: bz, sx: w * 0.7, sy: 2.2, sz: dd * 0.9, color: pick(rng, [0x7a2e1e, 0x3d3d3d, 0x24476b, 0x5a3a24]) });
            // Columns by the door, big man style.
            for (const ox of [-2, 2]) solid.add({ x: bx + ox, z: bz + dd / 2 + 1.2, sx: 0.5, sy: h * 0.6, sz: 0.5, color: 0xffffff });
            solid.add({ x: bx, y: h * 0.6, z: bz + dd / 2 + 0.6, sx: 5, sy: 0.4, sz: 2.4, color: 0xffffff });
          } else if (style === 'estate') {
            const w = Math.min(cw - 4, range(rng, 9, 12));
            const dd = Math.min(cd - 4, range(rng, 8, 11));
            const h = range(rng, d.minH, d.maxH);
            addBuilding(ccx - w / 2, ccz - dd / 2, ccx + w / 2, ccz + dd / 2, h, color);
            roofs.add({ x: ccx, y: h, z: ccz, sx: w + 0.8, sy: range(rng, 1.8, 2.8), sz: dd + 0.8, ry: rng() < 0.5 ? 0 : Math.PI / 2, color: pick(rng, [0x8c2f1f, 0x5b6b2a, 0x2f4f7a, 0x6b3b2a, 0x9a4b2b, 0x3a3a3a]) });
            if (rng() < 0.6) tanks.add({ x: ccx + w / 2 - 1, y: h, z: ccz - dd / 2 + 1, color: rng() < 0.6 ? 0x1c1c1c : 0x2457a8 });
          } else if (style === 'tower') {
            const w = range(rng, 13, Math.min(cw - 4, 21));
            const dd = range(rng, 13, Math.min(cd - 4, 21));
            const tall = rng() < 0.35;
            const h = tall ? range(rng, d.maxH * 0.7, d.maxH) : range(rng, d.minH, d.maxH * 0.6);
            const isGlass = tall || rng() < 0.3;
            if (tall) {
              // Podium + tower.
              addBuilding(ccx - w / 2 - 1.5, ccz - dd / 2 - 1.5, ccx + w / 2 + 1.5, ccz + dd / 2 + 1.5, 7, 0xd9d2c5);
              glassy.add({ x: ccx, y: 7, z: ccz, sx: w * 0.8, sy: h - 7, sz: dd * 0.8, color });
              roofTop(ccx, ccz, w * 0.8, dd * 0.8, h);
            } else {
              addBuilding(ccx - w / 2, ccz - dd / 2, ccx + w / 2, ccz + dd / 2, h, color, isGlass);
              roofTop(ccx, ccz, w, dd, h);
            }
          } else if (style === 'gov') {
            const w = range(rng, 22, Math.min(cw - 4, 34));
            const dd = range(rng, 16, Math.min(cd - 4, 30));
            const h = range(rng, d.minH, d.maxH);
            addBuilding(ccx - w / 2, ccz - dd / 2, ccx + w / 2, ccz + dd / 2, h, color, rng() < 0.4);
            // Green federal trim on top.
            solid.add({ x: ccx, y: h, z: ccz, sx: w + 0.6, sy: 0.8, sz: dd + 0.6, color: 0x1f6b3a });
          } else {
            // mixed / market
            const w = Math.min(cw - 3, range(rng, 9, 17));
            const dd = Math.min(cd - 3, range(rng, 9, 16));
            const h = range(rng, d.minH, d.maxH) * (rng() < 0.2 ? 1.4 : 1);
            addBuilding(ccx - w / 2, ccz - dd / 2, ccx + w / 2, ccz + dd / 2, h, color);
            roofTop(ccx, ccz, w, dd, h);
            if (style === 'market' || rng() < 0.4) {
              // Shop awnings facing the nearest side.
              solid.add({ x: ccx, y: 2.8, z: ccz + dd / 2 + 0.9, sx: w * 0.9, sy: 0.15, sz: 1.8, color: pick(rng, [0xc0262d, 0x1f6b3a, 0x2a64c9, 0xe8a317, 0xf26b1d]) });
            }
          }
        }
      }
    }
  }

  // ---------- Trees & street lights ----------
  const trunks = new Batch(new THREE.CylinderGeometry(0.18, 0.26, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x5a3e2b }));
  const canopies = new Batch(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  const palmGeo = (() => {
    const fronds: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) {
      const f = new THREE.BoxGeometry(0.5, 0.06, 2.6).translate(0, 0, 1.3).rotateX(0.45).rotateY((k / 7) * Math.PI * 2);
      fronds.push(f);
    }
    return mergeGeometries(fronds);
  })();
  const palms = new Batch(palmGeo, new THREE.MeshLambertMaterial({ color: 0x3f7a2a }));
  const poles = new Batch(new THREE.CylinderGeometry(0.09, 0.12, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x55585c }), false);
  const lampMat = nightGlowMaterial(0xffd27a, 0xcfcfcf);
  lampMat.userData.glowStrength = 1.6;
  glowMats.push(lampMat);
  const lamps = new Batch(new THREE.BoxGeometry(1.4, 0.18, 0.4), lampMat, false);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTexture(), color: 0xffc36a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12,
  });
  const pools = new Batch(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, false);

  // Keep spawn, NPCs and parked cars clear so nothing blocks the camera there.
  const keepClear = [{ x: SPAWN.x, z: SPAWN.z, r: 22 }, ...NPC_SPOTS.map((s) => ({ x: s.x, z: s.z, r: 7 })), ...CAR_SPOTS.map((c) => ({ x: c.x, z: c.z, r: 6 }))];
  const addTree = (x: number, z: number, palm = rng() < 0.25) => {
    if (keepClear.some((k) => (k.x - x) ** 2 + (k.z - z) ** 2 < k.r * k.r)) return;
    const h = palm ? range(rng, 6, 9) : range(rng, 2.2, 3.6);
    trunks.add({ x, z, sy: h, sx: palm ? 0.8 : 1, sz: palm ? 0.8 : 1 });
    if (palm) palms.add({ x, y: h, z, ry: rng() * 6, sx: 1.1, sy: 1, sz: 1.1 });
    else {
      const s = range(rng, 1.8, 3);
      canopies.add({ x, y: h + s * 0.6, z, sx: s, sy: s * 0.85, sz: s, ry: rng() * 6, color: pick(rng, [0x3f7f2f, 0x4a8c35, 0x356b28, 0x5c9a3a, 0x2f6a2a]) });
    }
    world.addCircle(x, z, 0.4, h);
  };

  for (const r of ROADS) {
    const horiz = r.z0 === r.z1;
    const len = horiz ? Math.abs(r.x1 - r.x0) : Math.abs(r.z1 - r.z0);
    const sx = Math.min(r.x0, r.x1);
    const sz = Math.min(r.z0, r.z1);
    const city = !(r.kind === 'expressway' && sx < -700);
    const off = r.width / 2 + (r.kind === 'expressway' ? 2.6 : 2);
    const step = r.kind === 'minor' ? 22 : 18;
    for (let t = 8; t < len - 4; t += step + rng() * 6) {
      for (const side of [-1, 1]) {
        if (rng() < (city ? 0.25 : 0.55)) continue;
        const x = horiz ? sx + t : r.x0 + side * off;
        const z = horiz ? r.z0 + side * off : sz + t;
        if (inOtherRoad(x, z, r, 3) || RESERVED.some((q) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1 && q.x1 - q.x0 < 70)) continue;
        if (Math.hypot(x - LANDMARKS.area1.x, z - LANDMARKS.area1.z) < 34) continue;
        addTree(x, z, r.kind === 'major' && rng() < 0.35);
      }
    }
    if (r.kind !== 'minor') {
      let side = 1;
      for (let t = 20; t < len - 10; t += 40) {
        side = -side;
        const loff = r.width / 2 + 0.9;
        const x = horiz ? sx + t : r.x0 + side * loff;
        const z = horiz ? r.z0 + side * loff : sz + t;
        if (inOtherRoad(x, z, r, 2)) continue;
        const ph = 8;
        poles.add({ x, z, sy: ph });
        const lx = horiz ? x : x - side * 0.6;
        const lz = horiz ? z - side * 0.6 : z;
        lamps.add({ x: lx, y: ph, z: lz, ry: horiz ? Math.PI / 2 : 0 });
        pools.add({ x: lx - (horiz ? 0 : side * 2.5), y: 0.16, z: lz - (horiz ? side * 2.5 : 0), sx: 14, sz: 14 });
        world.addCircle(x, z, 0.2, ph);
      }
    }
  }

  // Savanna scrub along the expressway and open ground.
  for (let k = 0; k < 260; k++) {
    const x = range(rng, WORLD.x0 + 10, -630);
    const z = range(rng, WORLD.z0 + 10, WORLD.z1 - 10);
    if (onRoad(x, z, 5)) continue;
    if (Math.hypot(x - LANDMARKS.zuma.x, z - LANDMARKS.zuma.z) < LANDMARKS.zuma.r + 8) continue;
    addTree(x, z, rng() < 0.1);
  }
  // Fill empty districts' outer belts (south of expressway west of Kubwa etc.).
  for (let k = 0; k < 160; k++) {
    const x = range(rng, -620, 540);
    const z = rng() < 0.5 ? range(rng, 382, 415) : range(rng, -415, -382);
    if (onRoad(x, z, 4)) continue;
    addTree(x, z);
  }
  for (let k = 0; k < 120; k++) {
    const x = range(rng, 382, 545);
    const z = range(rng, -140, 415);
    if (onRoad(x, z, 4)) continue;
    addTree(x, z, rng() < 0.2);
  }
  // Southern belt west of Utako (outside main grid) and north of Kubwa row.
  for (let k = 0; k < 140; k++) {
    const x = range(rng, -915, -385);
    const z = range(rng, -118, 415);
    if (onRoad(x, z, 4)) continue;
    addTree(x, z, rng() < 0.15);
  }

  for (const b of [plain, glassy, solid, roofs, tanks, dishes, trunks, canopies, palms, poles, lamps, pools]) {
    const m = b.build();
    if (m) group.add(m);
  }

  return { group, buildings, glowMats, poolMat };
}
