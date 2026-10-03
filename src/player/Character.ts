import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLOTH_COLORS, HAIR_COLORS, SKIN_TONES, type CharacterConfig, type Pattern } from './CharacterConfig';

/**
 * Low-poly stylized character built from primitives. Each body segment is a
 * single merged mesh with vertex colours, so a whole person costs ~5 draw
 * calls. Fabric patterns come from one small canvas texture per outfit: plain
 * parts sample a reserved white corner of it.
 */

const WHITE_UV = 0.04;

function colorize(geo: THREE.BufferGeometry, color: number, patterned: boolean): THREE.BufferGeometry {
  const g = geo.index ? geo : geo;
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    if (patterned && uv) {
      out[i * 2] = 0.15 + 0.85 * uv.getX(i);
      out[i * 2 + 1] = 0.85 * uv.getY(i);
    } else {
      out[i * 2] = WHITE_UV;
      out[i * 2 + 1] = 1 - WHITE_UV;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(out, 2));
  if (!g.index) {
    const idx: number[] = [];
    for (let i = 0; i < n; i++) idx.push(i);
    g.setIndex(idx);
  }
  return g;
}

const patternCache = new Map<string, THREE.Texture>();

export function patternTexture(pattern: Pattern, c1: number, c2: number): THREE.Texture | null {
  if (pattern === 'plain') return null;
  const key = `${pattern}-${c1}-${c2}`;
  const hit = patternCache.get(key);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const a = '#' + c1.toString(16).padStart(6, '0');
  const b = '#' + c2.toString(16).padStart(6, '0');
  g.fillStyle = a;
  g.fillRect(0, 0, S, S);
  g.fillStyle = b;
  g.strokeStyle = b;
  if (pattern === 'circles') {
    for (let y = 0; y < S; y += 32) {
      for (let x = (y / 32) % 2 ? 16 : 0; x < S + 16; x += 32) {
        g.beginPath();
        g.arc(x, y + 16, 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = a;
        g.beginPath();
        g.arc(x, y + 16, 5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = b;
      }
    }
  } else if (pattern === 'diamonds') {
    for (let y = 0; y < S; y += 24) {
      for (let x = 0; x < S; x += 24) {
        g.beginPath();
        g.moveTo(x + 12, y + 1);
        g.lineTo(x + 23, y + 12);
        g.lineTo(x + 12, y + 23);
        g.lineTo(x + 1, y + 12);
        g.closePath();
        g.fill();
      }
    }
  } else if (pattern === 'waves') {
    g.lineWidth = 6;
    for (let y = 0; y < S + 20; y += 20) {
      g.beginPath();
      for (let x = 0; x <= S; x += 4) g.lineTo(x, y + Math.sin(x / 12) * 6);
      g.stroke();
    }
  } else if (pattern === 'stripes') {
    for (let x = 0; x < S; x += 28) {
      g.fillRect(x, 0, 10, S);
      g.globalAlpha = 0.5;
      g.fillRect(x + 14, 0, 3, S);
      g.globalAlpha = 1;
    }
  }
  // Reserved white corner for plain parts (uv ≈ top-left).
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 30, 30);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  patternCache.set(key, t);
  return t;
}

const matCache = new Map<string, THREE.MeshLambertMaterial>();

function materialFor(cfg: CharacterConfig): THREE.MeshLambertMaterial {
  const tex = patternTexture(cfg.pattern, CLOTH_COLORS[cfg.primary], CLOTH_COLORS[cfg.secondary]);
  const key = tex ? tex.uuid : 'plain';
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex });
    matCache.set(key, m);
  }
  return m;
}

interface Parts {
  torso: THREE.BufferGeometry[];
  armL: THREE.BufferGeometry[];
  armR: THREE.BufferGeometry[];
  legL: THREE.BufferGeometry[];
  legR: THREE.BufferGeometry[];
}

const HIP_Y = 0.92;
const SHOULDER_Y = 1.44;
const HEAD_Y = 1.67;
const HEAD_R = 0.125;

function cyl(rt: number, rb: number, h: number, seg = 10): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rt, rb, h, seg);
}

function buildParts(cfg: CharacterConfig): Parts {
  const skin = SKIN_TONES[cfg.skin] ?? SKIN_TONES[2];
  const hair = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[0];
  const c1 = CLOTH_COLORS[cfg.primary] ?? 0xffffff;
  const c2 = CLOTH_COLORS[cfg.secondary] ?? 0x111111;
  const pat = cfg.pattern !== 'plain';
  const P = (g: THREE.BufferGeometry, color: number, patterned = false) => colorize(g, color, patterned && pat);
  const parts: Parts = { torso: [], armL: [], armR: [], legL: [], legR: [] };
  const T = parts.torso;

  // ---- Head ----
  T.push(P(cyl(0.05, 0.055, 0.12).translate(0, 1.54, 0), skin));
  T.push(P(new THREE.SphereGeometry(HEAD_R, 14, 10).scale(1, 1.12, 1.02).translate(0, HEAD_Y, 0), skin));
  for (const s of [-1, 1]) {
    T.push(P(new THREE.SphereGeometry(0.03, 6, 4).scale(0.6, 1, 1).translate(s * 0.125, HEAD_Y, 0), skin));
    T.push(P(new THREE.BoxGeometry(0.03, 0.022, 0.01).translate(s * 0.045, HEAD_Y + 0.015, 0.12), 0x111111));
    T.push(P(new THREE.BoxGeometry(0.045, 0.012, 0.01).translate(s * 0.045, HEAD_Y + 0.05, 0.118), hair));
  }
  T.push(P(new THREE.BoxGeometry(0.035, 0.05, 0.04).translate(0, HEAD_Y - 0.015, 0.125), new THREE.Color(skin).multiplyScalar(0.85).getHex()));
  T.push(P(new THREE.BoxGeometry(0.06, 0.012, 0.01).translate(0, HEAD_Y - 0.065, 0.115), 0x5a2a20));
  if (cfg.shades) T.push(P(new THREE.BoxGeometry(0.22, 0.045, 0.02).translate(0, HEAD_Y + 0.015, 0.125), 0x0a0a0a));

  // ---- Hair ----
  const top = (sy = 1) => new THREE.SphereGeometry(HEAD_R + 0.012, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, sy, 1.04).translate(0, HEAD_Y + 0.02, -0.005);
  switch (cfg.hair) {
    case 'lowcut':
      T.push(P(top(0.9), hair));
      break;
    case 'afro':
      T.push(P(new THREE.SphereGeometry(0.2, 12, 10).scale(1, 0.85, 1).translate(0, HEAD_Y + 0.09, -0.03), hair));
      break;
    case 'dreads':
      T.push(P(top(1), hair));
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * 0.15 + (k / 8) * Math.PI * 0.7;
        T.push(P(cyl(0.018, 0.015, 0.26, 5).translate(Math.cos(a) * 0.12, HEAD_Y - 0.08, -Math.sin(a) * 0.11), hair));
      }
      break;
    case 'braids':
      T.push(P(top(1), hair));
      T.push(P(new THREE.SphereGeometry(0.07, 8, 6).translate(0, HEAD_Y + 0.12, -0.08), hair));
      for (const s of [-1, 1]) T.push(P(cyl(0.02, 0.016, 0.34, 5).translate(s * 0.09, HEAD_Y - 0.12, -0.08), hair));
      break;
    case 'gele': {
      T.push(P(top(1), hair));
      T.push(P(new THREE.CylinderGeometry(0.17, 0.14, 0.12, 12).translate(0, HEAD_Y + 0.1, -0.01), c2, true));
      T.push(P(new THREE.SphereGeometry(0.2, 12, 8).scale(1.25, 0.6, 0.55).translate(0, HEAD_Y + 0.2, -0.07), c2, true));
      T.push(P(new THREE.ConeGeometry(0.08, 0.2, 6).rotateZ(-0.6).translate(0.16, HEAD_Y + 0.24, -0.02), c2, true));
      break;
    }
    case 'hijab':
      T.push(P(new THREE.SphereGeometry(0.152, 14, 10).scale(1, 1.12, 1).translate(0, HEAD_Y + 0.01, -0.045), c2));
      T.push(P(cyl(0.11, 0.25, 0.2, 14).scale(1, 1, 0.75).translate(0, 1.47, -0.01), c2));
      break;
    case 'bald':
      break;
  }
  if (cfg.hair !== 'gele' && cfg.hair !== 'hijab') {
    if (cfg.headwear === 'fila') T.push(P(cyl(0.13, 0.135, 0.13, 12).rotateZ(0.2).translate(0.02, HEAD_Y + 0.12, -0.01), c2, true));
    if (cfg.headwear === 'kufi') T.push(P(cyl(0.132, 0.135, 0.08, 12).translate(0, HEAD_Y + 0.1, 0), cfg.secondary === cfg.primary ? 0xffffff : c2));
    if (cfg.headwear === 'cap') {
      T.push(P(new THREE.SphereGeometry(0.138, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, HEAD_Y + 0.04, 0), c2));
      T.push(P(new THREE.BoxGeometry(0.2, 0.015, 0.12).translate(0, HEAD_Y + 0.045, 0.16), c2));
    }
  }
  if (cfg.facialHair === 'beard') T.push(P(new THREE.SphereGeometry(0.128, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45).scale(1, 1.15, 1.06).translate(0, HEAD_Y, 0.005), hair));
  if (cfg.facialHair === 'goatee') T.push(P(new THREE.BoxGeometry(0.05, 0.06, 0.03).translate(0, HEAD_Y - 0.11, 0.1), hair));

  // ---- Clothes ----
  const trousers = cfg.outfit === 'jersey' ? 0x2b4a7a : cfg.outfit === 'ankara' ? c2 : cfg.outfit === 'suit' ? c1 : c1;
  T.push(P(new THREE.BoxGeometry(0.34, 0.2, 0.22).translate(0, HIP_Y, 0), trousers));
  let sleeve: 'long' | 'short' | 'wide' = 'long';
  const sleeveColor = c1;
  let sleevePattern = false;
  switch (cfg.outfit) {
    case 'kaftan':
      T.push(P(cyl(0.21, 0.27, 1.1, 14).scale(1, 1, 0.66).translate(0, 0.95, 0), c1));
      T.push(P(new THREE.BoxGeometry(0.04, 0.5, 0.012).translate(0, 1.22, 0.142), c2));
      T.push(P(new THREE.BoxGeometry(0.16, 0.03, 0.012).translate(0, 1.47, 0.12), c2));
      break;
    case 'agbada':
      T.push(P(cyl(0.21, 0.27, 1.1, 14).scale(1, 1, 0.66).translate(0, 0.95, 0), c1));
      T.push(P(cyl(0.3, 0.46, 1.12, 16).scale(1, 1, 0.58).translate(0, 0.92, 0), c1, true));
      T.push(P(new THREE.BoxGeometry(0.26, 0.24, 0.012).translate(0, 1.3, 0.19), c2));
      T.push(P(new THREE.TorusGeometry(0.1, 0.02, 6, 16).rotateX(Math.PI / 2).translate(0, 1.49, 0.02), c2));
      sleeve = 'wide';
      sleevePattern = true;
      break;
    case 'senator':
      T.push(P(cyl(0.21, 0.24, 0.8, 14).scale(1, 1, 0.64).translate(0, 1.1, 0), c1));
      T.push(P(new THREE.BoxGeometry(0.03, 0.42, 0.012).translate(0.06, 1.24, 0.142), c2));
      T.push(P(new THREE.BoxGeometry(0.08, 0.05, 0.012).translate(-0.09, 1.34, 0.138), c2));
      T.push(P(cyl(0.065, 0.07, 0.05, 10).translate(0, 1.5, 0), c1));
      break;
    case 'suit':
      T.push(P(new THREE.BoxGeometry(0.46, 0.66, 0.27).translate(0, 1.17, 0), c1));
      T.push(P(new THREE.BoxGeometry(0.12, 0.3, 0.01).translate(0, 1.33, 0.137), 0xffffff));
      T.push(P(new THREE.BoxGeometry(0.04, 0.28, 0.012).translate(0, 1.3, 0.142), c2));
      break;
    case 'ankara':
      T.push(P(new THREE.BoxGeometry(0.44, 0.6, 0.26).translate(0, 1.2, 0), c1, true));
      sleeve = 'short';
      sleevePattern = true;
      break;
    case 'jersey':
      T.push(P(new THREE.BoxGeometry(0.44, 0.6, 0.26).translate(0, 1.2, 0), c1));
      T.push(P(new THREE.BoxGeometry(0.45, 0.04, 0.27).translate(0, 1.36, 0), 0xffffff));
      T.push(P(new THREE.BoxGeometry(0.14, 0.03, 0.012).translate(0, 1.48, 0.13), 0xffffff));
      sleeve = 'short';
      break;
    case 'asoebi':
      T.push(P(cyl(0.2, 0.33, 1.36, 16).scale(1, 1, 0.72).translate(0, 0.8, 0), c1, true));
      T.push(P(new THREE.BoxGeometry(0.42, 0.1, 0.28).translate(0, 1.0, 0), c2));
      sleevePattern = true;
      break;
  }
  if (!pat) sleevePattern = false;

  // ---- Arms (pivot at shoulder, hanging along -y) ----
  for (const [list, s] of [[parts.armL, 1], [parts.armR, -1]] as const) {
    if (sleeve === 'long') {
      list.push(P(cyl(0.065, 0.055, 0.56, 8).translate(0, -0.27, 0), sleeveColor, sleevePattern));
    } else if (sleeve === 'short') {
      list.push(P(cyl(0.075, 0.07, 0.2, 8).translate(0, -0.08, 0), sleeveColor, sleevePattern));
      list.push(P(cyl(0.05, 0.045, 0.42, 8).translate(0, -0.37, 0), skin));
    } else {
      list.push(P(cyl(0.065, 0.055, 0.56, 8).translate(0, -0.27, 0), c1));
      list.push(P(new THREE.BoxGeometry(0.2, 0.5, 0.32).translate(s * 0.05, -0.27, 0), c1, sleevePattern));
    }
    list.push(P(new THREE.SphereGeometry(0.052, 8, 6).scale(1, 1.2, 0.8).translate(0, -0.6, 0.01), skin));
  }

  // ---- Legs (pivot at hip, hanging along -y) ----
  const shoe = cfg.outfit === 'jersey' ? 0xffffff : cfg.outfit === 'kaftan' || cfg.outfit === 'agbada' ? 0x5a3a24 : 0x161616;
  for (const list of [parts.legL, parts.legR]) {
    list.push(P(cyl(0.085, 0.07, 0.84, 8).translate(0, -0.42, 0), trousers));
    list.push(P(new THREE.BoxGeometry(0.12, 0.08, 0.26).translate(0, -0.87, 0.04), shoe));
  }
  return parts;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  for (const g of list) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  const m = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  return m;
}

export class Character {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private phase = Math.random() * 10;
  private t = Math.random() * 10;
  /** Wave the arms while talking. */
  talking = false;

  constructor(cfg: CharacterConfig, castShadow = true) {
    this.root.add(this.body);
    this.armL.position.set(0.27, SHOULDER_Y, 0);
    this.armR.position.set(-0.27, SHOULDER_Y, 0);
    this.legL.position.set(0.1, HIP_Y, 0);
    this.legR.position.set(-0.1, HIP_Y, 0);
    this.body.add(this.armL, this.armR, this.legL, this.legR);
    this.build(cfg, castShadow);
  }

  build(cfg: CharacterConfig, castShadow = true): void {
    for (const m of this.meshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
    this.meshes = [];
    const parts = buildParts(cfg);
    const mat = materialFor(cfg);
    const mk = (geos: THREE.BufferGeometry[], parent: THREE.Object3D) => {
      const mesh = new THREE.Mesh(merge(geos), mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = false;
      parent.add(mesh);
      this.meshes.push(mesh);
    };
    mk(parts.torso, this.body);
    mk(parts.armL, this.armL);
    mk(parts.armR, this.armR);
    mk(parts.legL, this.legL);
    mk(parts.legR, this.legR);
    const width = cfg.build === 'slim' ? 0.9 : cfg.build === 'heavy' ? 1.22 : 1;
    const height = cfg.height === 'short' ? 0.92 : cfg.height === 'tall' ? 1.08 : 1;
    this.root.scale.set(width, height, width * (cfg.build === 'heavy' ? 1.12 : 1));
  }

  setShadow(on: boolean): void {
    for (const m of this.meshes) m.castShadow = on;
  }

  /** speed in m/s; airborne → tuck legs. */
  update(dt: number, speed: number, airborne = false): void {
    this.t += dt;
    const moving = speed > 0.2;
    if (moving) this.phase += dt * (3 + speed * 1.7);
    const amp = Math.min(0.9, speed * 0.17);
    const sw = Math.sin(this.phase);
    if (airborne) {
      this.legL.rotation.x = -0.6;
      this.legR.rotation.x = 0.3;
      this.armL.rotation.x = -2.4;
      this.armR.rotation.x = -2.4;
      this.armL.rotation.z = 0.3;
      this.armR.rotation.z = -0.3;
      this.body.position.y = 0;
      return;
    }
    const k = Math.min(1, dt * 12);
    this.legL.rotation.x += (sw * amp - this.legL.rotation.x) * k;
    this.legR.rotation.x += (-sw * amp - this.legR.rotation.x) * k;
    let aL = -sw * amp * 0.8;
    let aR = sw * amp * 0.8;
    let zL = 0.06;
    let zR = -0.06;
    if (this.talking && !moving) {
      aL = -0.5 + Math.sin(this.t * 3) * 0.35;
      aR = -0.2 + Math.sin(this.t * 2.3 + 1) * 0.2;
      zL = 0.25;
    }
    this.armL.rotation.x += (aL - this.armL.rotation.x) * k;
    this.armR.rotation.x += (aR - this.armR.rotation.x) * k;
    this.armL.rotation.z += (zL - this.armL.rotation.z) * k;
    this.armR.rotation.z += (zR - this.armR.rotation.z) * k;
    this.body.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.04 * Math.min(1, speed / 3) : Math.sin(this.t * 2) * 0.006;
    this.body.rotation.x = moving ? Math.min(0.15, speed * 0.02) : 0;
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    this.root.removeFromParent();
  }
}
