import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, LIP_COLORS, SKIN_TONES, type CharacterConfig, type Pattern } from './CharacterConfig';

/**
 * Stylized character built from smooth primitives: lathe-shaped torso and
 * clothes, capsule limbs with real elbows and knees, and a detailed face.
 * Each body segment is one merged mesh with vertex colours. Crowd people use
 * the "low" detail level (merged limbs, simpler face) to stay cheap.
 * Fabric patterns come from one small canvas texture per outfit: plain parts
 * sample a reserved white corner of it.
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
  } else if (pattern === 'lion') {
    // Isiagu: repeating lion heads with a mane.
    for (let y = 0; y < S; y += 64) {
      for (let x = (y / 64) % 2 ? 32 : 0; x < S + 32; x += 64) {
        const cx = x;
        const cy = y + 32;
        g.fillStyle = b;
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2;
          g.beginPath();
          g.ellipse(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15, 7, 4, ang, 0, Math.PI * 2);
          g.fill();
        }
        g.beginPath();
        g.arc(cx, cy, 12, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = a;
        g.beginPath();
        g.arc(cx - 4, cy - 3, 2.2, 0, Math.PI * 2);
        g.arc(cx + 4, cy - 3, 2.2, 0, Math.PI * 2);
        g.fill();
        g.fillRect(cx - 3, cy + 4, 6, 2);
      }
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
  const tex = patternTexture(cfg.pattern, CLOTH_COLORS[cfg.primary] ?? 0xffffff, CLOTH_COLORS[cfg.secondary] ?? 0x111111);
  const key = tex ? tex.uuid : 'plain';
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex });
    matCache.set(key, m);
  }
  return m;
}

export type Detail = 'high' | 'low';

export type Pose = 'normal' | 'dance' | 'sit' | 'cheer' | 'phone' | EmoteId;
export type EmoteId = 'egwu' | 'steppass' | 'shaku' | 'zanku' | 'buga';

export const EMOTES: { id: EmoteId; name: string; desc: string }[] = [
  { id: 'egwu', name: 'Egwu Abuja', desc: 'Shoulders shaking, waist whining — the #EgwuAbuja TikTok move' },
  { id: 'steppass', name: 'Step Pass', desc: 'Side step, cross over, pass — 2026 Naija TikTok trend' },
  { id: 'shaku', name: 'Shaku Shaku', desc: 'Arms crossed, wrists flicking, bent-knee shuffle' },
  { id: 'zanku', name: 'Zanku (Legwork)', desc: 'Fast alternating leg kicks — "Zanku!"' },
  { id: 'buga', name: 'Buga', desc: 'Shoulders up, chest out, hands up — "Buga won!"' },
];

interface Parts {
  torso: THREE.BufferGeometry[];
  uaL: THREE.BufferGeometry[];
  uaR: THREE.BufferGeometry[];
  faL: THREE.BufferGeometry[];
  faR: THREE.BufferGeometry[];
  thL: THREE.BufferGeometry[];
  thR: THREE.BufferGeometry[];
  shL: THREE.BufferGeometry[];
  shR: THREE.BufferGeometry[];
}

const HIP_Y = 0.92;
const SHOULDER_Y = 1.44;
const HEAD_Y = 1.67;
const HEAD_R = 0.122;
const UPPER_ARM = 0.29;
const THIGH = 0.45;

function cyl(rt: number, rb: number, h: number, seg = 12): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rt, rb, h, seg);
}

/** Capsule limb hanging down from its pivot (top at y=0). */
function limb(r: number, len: number, seg: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 3, seg).translate(0, -len / 2, 0);
}

/** Smooth body/clothing shell from a [radius, y] profile (front-back squashed). */
function lathe(points: [number, number][], seg: number, z = 0.64): THREE.BufferGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg).scale(1, 1, z);
}

function shade(hex: number, k: number): number {
  return new THREE.Color(hex).multiplyScalar(k).getHex();
}

function buildParts(cfg: CharacterConfig, detail: Detail): Parts {
  const hi = detail === 'high';
  const SEG = hi ? 18 : 10;
  const LSEG = hi ? 10 : 6;
  const skin = SKIN_TONES[cfg.skin] ?? SKIN_TONES[3];
  const hair = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[0];
  const c1 = CLOTH_COLORS[cfg.primary] ?? 0xffffff;
  const c2 = CLOTH_COLORS[cfg.secondary] ?? 0x111111;
  const khaki = 0xc9a96e;
  const pat = cfg.pattern !== 'plain';
  const P = (g: THREE.BufferGeometry, color: number, patterned = false) => colorize(g, color, patterned && pat);
  const parts: Parts = { torso: [], uaL: [], uaR: [], faL: [], faR: [], thL: [], thR: [], shL: [], shR: [] };
  const T = parts.torso;
  const o = cfg.outfit;

  // ================= Head & face =================
  const faceScale: Record<string, [number, number, number]> = { oval: [1, 1.13, 1.04], round: [1.07, 1.05, 1.06], square: [1.06, 1.08, 1.0] };
  const [fx, fy, fz] = faceScale[cfg.face] ?? faceScale.oval;
  T.push(P(cyl(0.048, 0.056, 0.14, SEG).translate(0, 1.535, 0), skin));
  T.push(P(new THREE.SphereGeometry(HEAD_R, hi ? 20 : 12, hi ? 14 : 8).scale(fx, fy, fz).translate(0, HEAD_Y, 0), skin));
  if (cfg.face === 'square') T.push(P(new THREE.BoxGeometry(0.17, 0.06, 0.15).translate(0, HEAD_Y - 0.085, 0.015), skin));
  const fz0 = HEAD_R * fz; // front of face
  for (const s of [-1, 1]) {
    T.push(P(new THREE.SphereGeometry(0.026, 8, 6).scale(0.45, 1, 0.85).translate(s * HEAD_R * fx * 0.97, HEAD_Y - 0.005, -0.005), skin)); // ears
    if (hi) {
      T.push(P(new THREE.SphereGeometry(0.02, 10, 8).scale(1.25, 0.78, 0.4).translate(s * 0.043, HEAD_Y + 0.012, fz0 - 0.014), 0xf4efe6));
      T.push(P(new THREE.SphereGeometry(0.0105, 8, 6).scale(1, 1, 0.35).translate(s * 0.043, HEAD_Y + 0.012, fz0 - 0.007), EYE_COLORS[cfg.eyeColor] ?? EYE_COLORS[0]));
      T.push(P(new THREE.SphereGeometry(0.005, 6, 4).scale(1, 1, 0.35).translate(s * 0.043, HEAD_Y + 0.012, fz0 - 0.0035), 0x050505));
    } else {
      T.push(P(new THREE.BoxGeometry(0.028, 0.02, 0.01).translate(s * 0.043, HEAD_Y + 0.012, fz0 - 0.004), 0x111111));
    }
    const bw = cfg.brows === 'thick' ? 0.016 : cfg.brows === 'thin' ? 0.007 : 0.011;
    T.push(P(new THREE.BoxGeometry(0.05, bw, 0.012).rotateZ(s * -0.12).translate(s * 0.045, HEAD_Y + 0.045, fz0 - 0.008), hair));
    // Tribal marks.
    const markC = shade(skin, 0.62);
    if (cfg.marks === 'pele' || cfg.marks === 'abaja') {
      const n = 3;
      for (let i = 0; i < n; i++) T.push(P(new THREE.BoxGeometry(cfg.marks === 'abaja' ? 0.05 : 0.03, 0.0035, 0.004).rotateY(s * 0.55).translate(s * 0.078, HEAD_Y - 0.02 - i * 0.012, fz0 - 0.03), markC));
      if (cfg.marks === 'abaja') for (let i = 0; i < 3; i++) T.push(P(new THREE.BoxGeometry(0.0035, 0.04, 0.004).rotateY(s * 0.55).translate(s * (0.065 + i * 0.01), HEAD_Y - 0.06, fz0 - 0.035), markC));
    } else if (cfg.marks === 'zubaya') {
      for (let i = 0; i < 5; i++) T.push(P(new THREE.BoxGeometry(0.003, 0.07, 0.004).rotateZ(s * 0.15).rotateY(s * 0.6).translate(s * (0.06 + i * 0.008), HEAD_Y - 0.03, fz0 - 0.03 - i * 0.004), markC));
    }
  }
  T.push(P(new THREE.SphereGeometry(0.019, 8, 6).scale(1.1, 0.85, 0.8).translate(0, HEAD_Y - 0.024, fz0 - 0.002), shade(skin, 0.9))); // nose
  const lip = LIP_COLORS[cfg.lips] ?? LIP_COLORS[0];
  if (hi) {
    T.push(P(new THREE.CapsuleGeometry(0.0075, 0.03, 2, 6).rotateZ(Math.PI / 2).scale(1, 1, 0.6).translate(0, HEAD_Y - 0.06, fz0 - 0.014), lip));
    T.push(P(new THREE.CapsuleGeometry(0.0085, 0.028, 2, 6).rotateZ(Math.PI / 2).scale(1, 1, 0.6).translate(0, HEAD_Y - 0.073, fz0 - 0.017), shade(lip, 1.1)));
  } else {
    T.push(P(new THREE.BoxGeometry(0.05, 0.014, 0.01).translate(0, HEAD_Y - 0.066, fz0 - 0.008), lip));
  }
  // Eyewear.
  if (cfg.shades) T.push(P(new THREE.BoxGeometry(0.2, 0.042, 0.02).translate(0, HEAD_Y + 0.012, fz0 + 0.004), 0x0a0a0a));
  else if (cfg.specs) {
    for (const s of [-1, 1]) T.push(P(new THREE.TorusGeometry(0.021, 0.0035, 5, 12).translate(s * 0.043, HEAD_Y + 0.012, fz0 + 0.006), 0x1a1a1a));
    T.push(P(new THREE.BoxGeometry(0.03, 0.004, 0.004).translate(0, HEAD_Y + 0.016, fz0 + 0.006), 0x1a1a1a));
  }

  // ================= Hair =================
  const cap = (sy = 1, thetaMax = 0.5) => new THREE.SphereGeometry(HEAD_R + 0.01, hi ? 18 : 10, 8, 0, Math.PI * 2, 0, Math.PI * thetaMax).scale(fx, sy * fy * 0.92, fz * 1.02).translate(0, HEAD_Y + 0.012, -0.006);
  switch (cfg.hair) {
    case 'lowcut':
      T.push(P(cap(0.95, 0.52), hair));
      break;
    case 'fade':
      T.push(P(cap(1.0, 0.3), hair));
      T.push(P(cap(0.9, 0.5), shade(skin, 0.75)));
      break;
    case 'afro':
      T.push(P(new THREE.SphereGeometry(0.19, 14, 12).scale(1, 0.86, 1).translate(0, HEAD_Y + 0.085, -0.03), hair));
      break;
    case 'twists':
      T.push(P(cap(1, 0.52), hair));
      for (let k = 0; k < (hi ? 22 : 10); k++) {
        const a = (k / (hi ? 22 : 10)) * Math.PI * 2;
        const r = 0.08 + (k % 3) * 0.02;
        T.push(P(cyl(0.016, 0.012, 0.09, 5).rotateX(Math.sin(a) * 0.5).rotateZ(-Math.cos(a) * 0.5).translate(Math.cos(a) * r, HEAD_Y + 0.12, Math.sin(a) * r - 0.02), hair));
      }
      break;
    case 'dreads':
      T.push(P(cap(1, 0.52), hair));
      for (let k = 0; k < 11; k++) {
        const a = Math.PI * 0.1 + (k / 10) * Math.PI * 0.8;
        T.push(P(cyl(0.018, 0.014, 0.3, 5).translate(Math.cos(a) * 0.12, HEAD_Y - 0.09, -Math.sin(a) * 0.11), hair));
      }
      break;
    case 'braids':
      T.push(P(cap(1, 0.52), hair));
      T.push(P(new THREE.SphereGeometry(0.068, 10, 8).translate(0, HEAD_Y + 0.12, -0.08), hair));
      for (const s of [-1, 1]) T.push(P(cyl(0.02, 0.015, 0.38, 6).translate(s * 0.09, HEAD_Y - 0.13, -0.08), hair));
      break;
    case 'gele':
      T.push(P(cap(1, 0.52), hair));
      T.push(P(cyl(0.165, 0.138, 0.12, SEG).translate(0, HEAD_Y + 0.1, -0.01), c2, true));
      T.push(P(new THREE.SphereGeometry(0.2, 14, 10).scale(1.3, 0.62, 0.55).translate(0, HEAD_Y + 0.2, -0.07), c2, true));
      T.push(P(new THREE.ConeGeometry(0.08, 0.2, 8).rotateZ(-0.6).translate(0.16, HEAD_Y + 0.24, -0.02), c2, true));
      T.push(P(new THREE.ConeGeometry(0.07, 0.17, 8).rotateZ(0.7).translate(-0.15, HEAD_Y + 0.22, -0.03), c2, true));
      break;
    case 'hijab':
      T.push(P(new THREE.SphereGeometry(0.15, 16, 12).scale(fx, 1.12, 1).translate(0, HEAD_Y + 0.01, -0.045), c2));
      T.push(P(cyl(0.11, 0.26, 0.22, SEG).scale(1, 1, 0.75).translate(0, 1.46, -0.01), c2));
      break;
    case 'bald':
      break;
  }
  if (cfg.hair !== 'gele' && cfg.hair !== 'hijab') {
    const hy = HEAD_Y + 0.1;
    switch (cfg.headwear) {
      case 'fila':
        T.push(P(cyl(0.128, 0.134, 0.13, SEG).rotateZ(0.22).translate(0.02, hy + 0.02, -0.01), c2, true));
        break;
      case 'kufi':
        T.push(P(cyl(0.13, 0.134, 0.08, SEG).translate(0, hy, 0), cfg.secondary === cfg.primary ? 0xffffff : c2));
        break;
      case 'zanna':
        T.push(P(cyl(0.13, 0.135, 0.2, SEG).translate(0, hy + 0.04, 0), c2));
        T.push(P(cyl(0.14, 0.13, 0.04, SEG).translate(0, hy + 0.15, 0), shade(c2, 0.8)));
        T.push(P(new THREE.BoxGeometry(0.05, 0.12, 0.01).translate(0, hy + 0.04, 0.132), c1));
        break;
      case 'redcap':
        T.push(P(cyl(0.132, 0.136, 0.14, SEG).translate(0, hy + 0.02, 0), 0xb3161e));
        T.push(P(new THREE.BoxGeometry(0.01, 0.12, 0.004).rotateZ(0.4).translate(0.09, hy + 0.13, 0.04), 0xffffff));
        break;
      case 'cap':
        T.push(P(new THREE.SphereGeometry(0.136, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, HEAD_Y + 0.04, 0), c2));
        T.push(P(new THREE.BoxGeometry(0.2, 0.014, 0.12).translate(0, HEAD_Y + 0.045, 0.16), c2));
        break;
      case 'nyscCap':
        T.push(P(new THREE.SphereGeometry(0.136, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(0, HEAD_Y + 0.04, 0), khaki));
        T.push(P(new THREE.BoxGeometry(0.2, 0.014, 0.12).translate(0, HEAD_Y + 0.045, 0.16), 0x1f6b3a));
        T.push(P(new THREE.BoxGeometry(0.04, 0.03, 0.01).translate(0, HEAD_Y + 0.09, 0.128), 0x1f6b3a));
        break;
    }
  }
  switch (cfg.facialHair) {
    case 'beard':
      T.push(P(new THREE.SphereGeometry(0.126, 14, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45).scale(fx, 1.15, fz * 1.06).translate(0, HEAD_Y, 0.005), hair));
      break;
    case 'goatee':
      T.push(P(new THREE.BoxGeometry(0.05, 0.06, 0.03).translate(0, HEAD_Y - 0.11, fz0 - 0.02), hair));
      break;
    case 'moustache':
      T.push(P(new THREE.BoxGeometry(0.07, 0.012, 0.012).translate(0, HEAD_Y - 0.045, fz0 - 0.002), hair));
      break;
    case 'stubble':
      T.push(P(new THREE.SphereGeometry(0.124, 14, 8, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.4).scale(fx, 1.13, fz * 1.03).translate(0, HEAD_Y, 0.002), shade(skin, 0.7)));
      break;
  }

  // ================= Clothes (torso) =================
  const robeLike = ['kaftan', 'agbada', 'babariga', 'asoebi', 'abaya', 'jalabiya'].includes(o);
  const trouserDefault =
    o === 'jersey' ? 0x2b4a7a : o === 'nysc' ? khaki : o === 'isiagu' ? 0x111111 : o === 'ankara' ? c2 : o === 'iroBuba' ? c2 : c1;
  const trousers = cfg.trousers >= 0 ? (CLOTH_COLORS[cfg.trousers] ?? trouserDefault) : trouserDefault;
  // Base body shape (shirts use it directly).
  const shirt = (to: number, _color?: number, _patterned = false, r = 1) =>
    lathe([[0.001, to], [0.165 * r, to], [0.17 * r, to + 0.08], [0.155 * r, 1.1], [0.175 * r, 1.26], [0.2 * r, 1.38], [0.185 * r, 1.46], [0.09, 1.5], [0.05, 1.51]], SEG);
  const robe = (hem: number, flare: number, color: number, patterned = false, r = 1) =>
    P(lathe([[0.001, hem], [flare * r, hem], [(flare * 0.85 + 0.17 * 0.15) * r, (hem + 1.0) / 2], [0.18 * r, 1.08], [0.2 * r, 1.3], [0.21 * r, 1.4], [0.19 * r, 1.47], [0.09, 1.51], [0.05, 1.52]], SEG), color, patterned);
  T.push(P(lathe([[0.001, 0.84], [0.165, 0.84], [0.172, 0.95], [0.16, 1.02], [0.001, 1.02]], SEG), trousers)); // hips
  let sleeve: 'long' | 'short' | 'wide' | 'robe' = 'long';
  let sleeveColor = c1;
  let sleevePattern = false;
  switch (o) {
    case 'kaftan':
      T.push(robe(0.4, 0.27, c1));
      T.push(P(new THREE.BoxGeometry(0.035, 0.5, 0.012).translate(0, 1.22, 0.13), c2));
      T.push(P(new THREE.TorusGeometry(0.075, 0.012, 6, 16).rotateX(Math.PI / 2).translate(0, 1.5, 0.01), c2));
      break;
    case 'agbada':
    case 'babariga': {
      T.push(robe(0.4, 0.27, c1));
      const hem = o === 'babariga' ? 0.22 : 0.32;
      T.push(P(lathe([[0.001, hem], [0.47, hem], [0.36, 0.9], [0.31, 1.3], [0.27, 1.46], [0.1, 1.5], [0.05, 1.51]], SEG, 0.56), c1, true));
      if (o === 'babariga') {
        T.push(P(new THREE.CircleGeometry(0.11, 18).translate(0, 1.28, 0.205), c2));
        T.push(P(new THREE.RingGeometry(0.12, 0.14, 18).translate(0, 1.28, 0.206), c2));
      } else T.push(P(new THREE.BoxGeometry(0.26, 0.24, 0.012).translate(0, 1.3, 0.2), c2));
      T.push(P(new THREE.TorusGeometry(0.09, 0.016, 6, 16).rotateX(Math.PI / 2).translate(0, 1.495, 0.02), c2));
      sleeve = 'wide';
      sleevePattern = true;
      break;
    }
    case 'senator':
      T.push(robe(0.66, 0.235, c1));
      T.push(P(new THREE.BoxGeometry(0.028, 0.42, 0.012).translate(0.06, 1.24, 0.13), c2));
      T.push(P(new THREE.BoxGeometry(0.075, 0.05, 0.012).translate(-0.09, 1.34, 0.128), c2));
      T.push(P(cyl(0.062, 0.068, 0.05, 12).translate(0, 1.5, 0), c1));
      break;
    case 'isiagu':
      T.push(P(shirt(0.8, c1, true, 1.04), c1, true));
      T.push(P(new THREE.TorusGeometry(0.075, 0.012, 6, 16).rotateX(Math.PI / 2).translate(0, 1.5, 0.01), 0xd4a62a));
      sleevePattern = true;
      break;
    case 'suit':
      T.push(P(shirt(0.82, c1, false, 1.06), c1));
      T.push(P(new THREE.BoxGeometry(0.11, 0.3, 0.01).translate(0, 1.33, 0.128), 0xffffff));
      T.push(P(new THREE.BoxGeometry(0.035, 0.28, 0.012).translate(0, 1.3, 0.134), c2));
      for (const s of [-1, 1]) T.push(P(new THREE.BoxGeometry(0.05, 0.22, 0.01).rotateZ(s * 0.3).translate(s * 0.07, 1.33, 0.13), shade(c1, 0.8)));
      break;
    case 'ankara':
      T.push(P(shirt(0.82, c1, true, 1.03), c1, true));
      sleeve = 'short';
      sleevePattern = true;
      break;
    case 'jersey':
      T.push(P(shirt(0.84, c1, false, 1.02), c1));
      T.push(P(new THREE.BoxGeometry(0.43, 0.035, 0.27).translate(0, 1.36, 0), 0xffffff));
      T.push(P(new THREE.TorusGeometry(0.07, 0.012, 6, 16).rotateX(Math.PI / 2).translate(0, 1.5, 0.01), 0xffffff));
      sleeve = 'short';
      break;
    case 'asoebi':
      T.push(robe(0.12, 0.33, c1, true));
      T.push(P(new THREE.BoxGeometry(0.4, 0.08, 0.26).translate(0, 1.04, 0), c2));
      sleevePattern = true;
      break;
    case 'iroBuba':
      T.push(P(shirt(0.86, c1, true, 1.06), c1, true)); // buba blouse
      T.push(P(lathe([[0.001, 0.12], [0.22, 0.12], [0.2, 0.6], [0.18, 0.95], [0.001, 0.95]], SEG, 0.72), c2, true)); // iro wrapper
      T.push(P(new THREE.BoxGeometry(0.36, 0.06, 0.24).translate(0, 0.93, 0), c2));
      sleeve = 'short';
      sleevePattern = true;
      break;
    case 'abaya':
      T.push(robe(0.1, 0.3, c1));
      T.push(P(new THREE.BoxGeometry(0.03, 0.9, 0.012).translate(0, 0.95, 0.14), c2));
      break;
    case 'nysc':
      T.push(P(shirt(0.82, khaki, false, 1.06), khaki)); // khaki jacket
      T.push(P(new THREE.BoxGeometry(0.12, 0.34, 0.01).translate(0, 1.3, 0.128), 0xffffff)); // white tee
      T.push(P(new THREE.CircleGeometry(0.03, 10).translate(-0.09, 1.36, 0.13), 0x1f6b3a)); // crest patch
      for (const s of [-1, 1]) T.push(P(new THREE.BoxGeometry(0.06, 0.05, 0.012).translate(s * 0.1, 1.2, 0.128), shade(khaki, 0.85))); // pockets
      sleeveColor = khaki;
      break;
    case 'jalabiya':
      T.push(robe(0.15, 0.25, c1));
      T.push(P(new THREE.BoxGeometry(0.02, 0.25, 0.01).translate(0, 1.36, 0.13), shade(c1, 0.8)));
      sleeve = 'robe';
      break;
  }
  if (!pat) sleevePattern = false;
  // Accessories on the torso.
  if (cfg.chain) T.push(P(new THREE.TorusGeometry(0.085, 0.007, 6, 20).rotateX(Math.PI / 2 - 0.35).translate(0, 1.43, 0.06), 0xd4a62a));
  if (cfg.bag) {
    T.push(P(new THREE.BoxGeometry(0.02, 0.62, 0.012).rotateZ(0.75).translate(0.01, 1.2, 0.135), 0x3a2a1a));
    T.push(P(new THREE.BoxGeometry(0.18, 0.14, 0.06).translate(0.2, 0.93, 0.08), 0x5a3a24));
  }

  // ================= Arms: upper arm + forearm =================
  for (const [ua, fa, s] of [[parts.uaL, parts.faL, 1], [parts.uaR, parts.faR, -1]] as const) {
    const longSleeve = sleeve !== 'short';
    if (sleeve === 'wide') {
      ua.push(P(new THREE.BoxGeometry(0.22, 0.34, 0.34).translate(s * 0.05, -0.15, 0), c1, sleevePattern));
      fa.push(P(new THREE.BoxGeometry(0.22, 0.26, 0.34).translate(s * 0.05, -0.12, 0), c1, sleevePattern));
    }
    ua.push(P(limb(longSleeve ? 0.062 : 0.068, UPPER_ARM, LSEG), sleeveColor, sleevePattern));
    if (!longSleeve) ua.push(P(limb(0.05, UPPER_ARM - 0.02, LSEG).translate(0, -0.02, 0), skin));
    fa.push(P(limb(longSleeve ? 0.056 : 0.046, 0.27, LSEG), longSleeve ? sleeveColor : skin, longSleeve && sleevePattern));
    if (sleeve === 'robe') fa.push(P(cyl(0.065, 0.075, 0.08, LSEG).translate(0, -0.22, 0), sleeveColor));
    // Hand (palm + thumb).
    fa.push(P(new THREE.SphereGeometry(0.046, hi ? 10 : 6, hi ? 8 : 5).scale(0.8, 1.25, 0.6).translate(0, -0.31, 0.005), skin));
    if (hi) fa.push(P(new THREE.CapsuleGeometry(0.013, 0.03, 2, 5).rotateZ(s * 0.6).translate(s * 0.03, -0.29, 0.02), skin));
    if (cfg.watch && s === 1) {
      fa.push(P(cyl(0.05, 0.05, 0.03, 10).translate(0, -0.25, 0), 0x2b2b2b));
      fa.push(P(new THREE.BoxGeometry(0.035, 0.03, 0.012).translate(0, -0.25, 0.048), 0xd4d4d4));
    }
  }

  // ================= Legs: thigh + shin + shoe =================
  const shoeC = cfg.shoes === 'sneakers' ? 0xffffff : cfg.shoes === 'boots' ? 0x3a2414 : cfg.shoes === 'sandals' ? 0x6b4a2b : 0x1c140e;
  for (const [th, sh] of [[parts.thL, parts.shL], [parts.thR, parts.shR]] as const) {
    th.push(P(limb(0.085, THIGH, LSEG), trousers));
    sh.push(P(limb(0.07, 0.43, LSEG), trousers));
    if (robeLike && cfg.shoes === 'sandals') sh.push(P(limb(0.05, 0.1, LSEG).translate(0, -0.34, 0), skin));
    const fy0 = -0.43;
    switch (cfg.shoes) {
      case 'sneakers':
        sh.push(P(new THREE.BoxGeometry(0.11, 0.07, 0.26).translate(0, fy0 - 0.005, 0.045), shoeC));
        sh.push(P(new THREE.BoxGeometry(0.115, 0.025, 0.27).translate(0, fy0 - 0.04, 0.045), 0xe8e8e8));
        sh.push(P(new THREE.BoxGeometry(0.112, 0.02, 0.08).translate(0, fy0 + 0.0, 0.0), c2));
        break;
      case 'boots':
        sh.push(P(cyl(0.07, 0.075, 0.16, LSEG).translate(0, fy0 + 0.04, 0), shoeC));
        sh.push(P(new THREE.BoxGeometry(0.11, 0.075, 0.25).translate(0, fy0 - 0.01, 0.045), shoeC));
        break;
      case 'sandals':
        sh.push(P(new THREE.BoxGeometry(0.1, 0.02, 0.25).translate(0, fy0 - 0.04, 0.045), shoeC));
        sh.push(P(new THREE.BoxGeometry(0.09, 0.035, 0.18).translate(0, fy0 - 0.015, 0.06), skin));
        sh.push(P(new THREE.BoxGeometry(0.1, 0.03, 0.05).translate(0, fy0 - 0.01, 0.07), shoeC));
        break;
      default:
        sh.push(P(new THREE.CapsuleGeometry(0.05, 0.16, 2, 6).rotateX(Math.PI / 2).scale(1.05, 0.75, 1).translate(0, fy0 - 0.012, 0.045), shoeC));
    }
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
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private phase = Math.random() * 10;
  private t = Math.random() * 10;
  /** Wave the arms while talking. */
  talking = false;
  /** Crowd poses and dance emotes. */
  pose: Pose = 'normal';
  /** The look this character was last built with. */
  cfg!: CharacterConfig;

  constructor(cfg: CharacterConfig, castShadow = true, readonly detail: Detail = 'high') {
    this.root.add(this.body);
    this.armL.position.set(0.25, SHOULDER_Y, 0);
    this.armR.position.set(-0.25, SHOULDER_Y, 0);
    this.foreL.position.set(0, -UPPER_ARM, 0);
    this.foreR.position.set(0, -UPPER_ARM, 0);
    this.armL.add(this.foreL);
    this.armR.add(this.foreR);
    this.legL.position.set(0.095, HIP_Y, 0);
    this.legR.position.set(-0.095, HIP_Y, 0);
    this.shinL.position.set(0, -THIGH, 0);
    this.shinR.position.set(0, -THIGH, 0);
    this.legL.add(this.shinL);
    this.legR.add(this.shinR);
    this.body.add(this.armL, this.armR, this.legL, this.legR);
    this.build(cfg, castShadow);
  }

  build(cfg: CharacterConfig, castShadow = true): void {
    this.cfg = cfg;
    for (const m of this.meshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
    this.meshes = [];
    const parts = buildParts(cfg, this.detail);
    const mat = materialFor(cfg);
    const mk = (geos: THREE.BufferGeometry[], parent: THREE.Object3D) => {
      if (!geos.length) return;
      const mesh = new THREE.Mesh(merge(geos), mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = false;
      parent.add(mesh);
      this.meshes.push(mesh);
    };
    mk(parts.torso, this.body);
    if (this.detail === 'high') {
      mk(parts.uaL, this.armL);
      mk(parts.uaR, this.armR);
      mk(parts.faL, this.foreL);
      mk(parts.faR, this.foreR);
      mk(parts.thL, this.legL);
      mk(parts.thR, this.legR);
      mk(parts.shL, this.shinL);
      mk(parts.shR, this.shinR);
    } else {
      // Cheaper: forearm/shin baked into the upper segment (5 draw calls per person).
      const down = (list: THREE.BufferGeometry[], dy: number) => list.map((g) => g.translate(0, dy, 0));
      mk([...parts.uaL, ...down(parts.faL, -UPPER_ARM)], this.armL);
      mk([...parts.uaR, ...down(parts.faR, -UPPER_ARM)], this.armR);
      mk([...parts.thL, ...down(parts.shL, -THIGH)], this.legL);
      mk([...parts.thR, ...down(parts.shR, -THIGH)], this.legR);
    }
    const width = cfg.build === 'slim' ? 0.9 : cfg.build === 'heavy' ? 1.2 : 1;
    const height = cfg.height === 'short' ? 0.93 : cfg.height === 'tall' ? 1.08 : 1;
    this.root.scale.set(width, height, width * (cfg.build === 'heavy' ? 1.12 : 1));
  }

  setShadow(on: boolean): void {
    for (const m of this.meshes) m.castShadow = on;
  }

  get isEmoting(): boolean {
    return EMOTES.some((e) => e.id === this.pose);
  }

  /** speed in m/s; airborne → tuck legs. */
  update(dt: number, speed: number, airborne = false): void {
    this.t += dt;
    const moving = speed > 0.2;
    if (moving) this.phase += dt * (3 + speed * 1.55);
    const amp = Math.min(1.0, speed * 0.16);
    const sw = Math.sin(this.phase);
    if (this.pose !== 'normal' && !moving) {
      this.posed(dt);
      return;
    }
    this.body.rotation.set(0, 0, 0);
    this.body.position.x = 0;
    if (airborne) {
      this.legL.rotation.x = -0.7;
      this.shinL.rotation.x = 1.1;
      this.legR.rotation.x = 0.25;
      this.shinR.rotation.x = 0.4;
      this.armL.rotation.x = -2.3;
      this.armR.rotation.x = -2.3;
      this.foreL.rotation.x = this.foreR.rotation.x = -0.3;
      this.armL.rotation.z = 0.3;
      this.armR.rotation.z = -0.3;
      this.body.position.y = 0;
      return;
    }
    const k = Math.min(1, dt * 14);
    const lerp = (o: THREE.Object3D, axis: 'x' | 'z', v: number) => (o.rotation[axis] += (v - o.rotation[axis]) * k);
    // Legs: thigh swing, knee bends as the leg passes behind.
    lerp(this.legL, 'x', sw * amp);
    lerp(this.legR, 'x', -sw * amp);
    lerp(this.shinL, 'x', moving ? Math.max(0, -Math.sin(this.phase - 0.9)) * amp * 1.5 : 0);
    lerp(this.shinR, 'x', moving ? Math.max(0, Math.sin(this.phase - 0.9)) * amp * 1.5 : 0);
    // Arms: opposite swing, elbows bend more when running.
    let aL = -sw * amp * 0.85;
    let aR = sw * amp * 0.85;
    let zL = 0.07;
    let zR = -0.07;
    let eL = moving ? -0.25 - amp * 0.9 : -0.12;
    let eR = eL;
    if (this.talking && !moving) {
      aL = -0.55 + Math.sin(this.t * 3) * 0.3;
      eL = -0.9 + Math.sin(this.t * 3.4) * 0.3;
      aR = -0.2 + Math.sin(this.t * 2.3 + 1) * 0.15;
      eR = -0.4;
      zL = 0.2;
    }
    lerp(this.armL, 'x', aL);
    lerp(this.armR, 'x', aR);
    lerp(this.armL, 'z', zL);
    lerp(this.armR, 'z', zR);
    lerp(this.foreL, 'x', eL);
    lerp(this.foreR, 'x', eR);
    this.body.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.045 * Math.min(1, speed / 3) : Math.sin(this.t * 2) * 0.005;
    this.body.rotation.x = moving ? Math.min(0.18, speed * 0.02) : 0;
  }

  private posed(dt: number): void {
    const t = this.t;
    const k = Math.min(1, dt * 12);
    const to = (o: THREE.Object3D, x: number, z = 0) => {
      o.rotation.x += (x - o.rotation.x) * k;
      o.rotation.z += (z - o.rotation.z) * k;
    };
    const B = this.body;
    B.position.x = 0;
    B.rotation.z = 0;
    switch (this.pose) {
      case 'dance': {
        const beat = t * 7.4;
        to(this.armL, -2.2 + Math.sin(beat) * 0.6, 0.5 + Math.sin(beat * 0.5) * 0.3);
        to(this.armR, -2.2 + Math.cos(beat) * 0.6, -0.5 - Math.sin(beat * 0.5) * 0.3);
        to(this.foreL, -0.5);
        to(this.foreR, -0.5);
        to(this.legL, Math.max(0, Math.sin(beat)) * 0.35);
        to(this.legR, Math.max(0, -Math.sin(beat)) * 0.35);
        to(this.shinL, Math.max(0, Math.sin(beat)) * 0.5);
        to(this.shinR, Math.max(0, -Math.sin(beat)) * 0.5);
        B.position.y = Math.abs(Math.sin(beat)) * 0.08;
        B.rotation.y = Math.sin(beat * 0.5) * 0.35;
        B.rotation.x = 0;
        break;
      }
      case 'egwu': {
        // Bent knees, hands near the waist, fast shoulder shake and waist whine.
        const beat = t * 7.6;
        to(this.armL, -0.55 + Math.sin(beat * 2) * 0.12, 0.55);
        to(this.armR, -0.55 - Math.sin(beat * 2) * 0.12, -0.55);
        to(this.foreL, -1.6);
        to(this.foreR, -1.6);
        to(this.legL, -0.35, 0.12);
        to(this.legR, -0.35, -0.12);
        to(this.shinL, 0.6);
        to(this.shinR, 0.6);
        B.position.y = -0.07 + Math.abs(Math.sin(beat)) * 0.04;
        B.position.x = Math.sin(beat * 0.5) * 0.06;
        B.rotation.z = Math.sin(beat * 2) * 0.07;
        B.rotation.y = Math.sin(beat * 0.5) * 0.3;
        B.rotation.x = 0.08;
        break;
      }
      case 'steppass': {
        // Step out, cross over, pass back.
        const beat = t * 3.8;
        const s = Math.sin(beat);
        to(this.legL, -0.2 * Math.max(0, s), 0.25 * s);
        to(this.legR, -0.2 * Math.max(0, -s), 0.25 * s);
        to(this.shinL, 0.35 * Math.max(0, s));
        to(this.shinR, 0.35 * Math.max(0, -s));
        to(this.armL, -0.6 - 0.4 * s, 0.3 + 0.3 * s);
        to(this.armR, -0.6 + 0.4 * s, -0.3 + 0.3 * s);
        to(this.foreL, -1.1);
        to(this.foreR, -1.1);
        B.position.x = s * 0.12;
        B.position.y = Math.abs(Math.cos(beat)) * 0.05;
        B.rotation.y = s * 0.25;
        B.rotation.x = 0.05;
        break;
      }
      case 'shaku': {
        // Arms crossed in front, wrists flicking, bent-over shuffle.
        const beat = t * 7.2;
        to(this.armL, -1.25, -0.35 + Math.sin(beat) * 0.15);
        to(this.armR, -1.25, 0.35 - Math.sin(beat) * 0.15);
        to(this.foreL, -0.9 + Math.sin(beat * 2) * 0.35);
        to(this.foreR, -0.9 - Math.sin(beat * 2) * 0.35);
        to(this.legL, -0.4 + Math.sin(beat) * 0.35, 0.1);
        to(this.legR, -0.4 - Math.sin(beat) * 0.35, -0.1);
        to(this.shinL, 0.7);
        to(this.shinR, 0.7);
        B.position.y = -0.08 + Math.abs(Math.sin(beat)) * 0.03;
        B.rotation.x = 0.28;
        B.rotation.y = Math.sin(beat * 0.5) * 0.2;
        break;
      }
      case 'zanku': {
        // Legwork: quick alternating kicks, arms pumping.
        const beat = t * 8.5;
        const s = Math.sin(beat);
        to(this.legL, s > 0 ? -1.0 * s : 0.1, 0.15);
        to(this.legR, s < 0 ? 1.0 * s : 0.1, -0.15);
        to(this.shinL, s > 0 ? 0.2 : 0.5);
        to(this.shinR, s < 0 ? 0.2 : 0.5);
        to(this.armL, -0.9 - s * 0.5, 0.4);
        to(this.armR, -0.9 + s * 0.5, -0.4);
        to(this.foreL, -1.4);
        to(this.foreR, -1.4);
        B.position.y = Math.abs(s) * 0.06;
        B.rotation.y = s * 0.2;
        B.rotation.x = 0.1;
        break;
      }
      case 'buga': {
        // Shoulders up, chest out, hands raised wiggling — "Buga won!"
        const beat = t * 6.4;
        to(this.armL, -2.6 + Math.sin(beat) * 0.2, 0.55 + Math.sin(beat * 2) * 0.12);
        to(this.armR, -2.6 - Math.sin(beat) * 0.2, -0.55 - Math.sin(beat * 2) * 0.12);
        to(this.foreL, -0.6 + Math.sin(beat * 2) * 0.3);
        to(this.foreR, -0.6 - Math.sin(beat * 2) * 0.3);
        to(this.legL, -0.1, 0.1);
        to(this.legR, -0.1, -0.1);
        to(this.shinL, 0.15 + Math.max(0, Math.sin(beat)) * 0.3);
        to(this.shinR, 0.15 + Math.max(0, -Math.sin(beat)) * 0.3);
        B.position.y = Math.max(0, Math.sin(beat)) * 0.05;
        B.position.x = Math.sin(beat * 0.5) * 0.05;
        B.rotation.x = -0.12;
        B.rotation.y = Math.sin(beat * 0.5) * 0.35;
        break;
      }
      case 'sit':
        to(this.legL, -1.5, 0.08);
        to(this.legR, -1.5, -0.08);
        to(this.shinL, 1.5);
        to(this.shinR, 1.5);
        to(this.armL, -0.55, 0.15);
        to(this.armR, -0.45 + Math.sin(t * 1.3) * 0.12, -0.15);
        to(this.foreL, -0.7);
        to(this.foreR, -0.8);
        B.position.y = -0.47;
        B.rotation.x = -0.05;
        B.rotation.y = 0;
        break;
      case 'cheer':
        to(this.armL, -2.8 + Math.sin(t * 6) * 0.25, 0.3);
        to(this.armR, -2.8 + Math.cos(t * 6) * 0.25, -0.3);
        to(this.foreL, -0.3);
        to(this.foreR, -0.3);
        to(this.legL, 0);
        to(this.legR, 0);
        to(this.shinL, 0);
        to(this.shinR, 0);
        B.position.y = Math.max(0, Math.sin(t * 6)) * 0.1;
        B.rotation.y = 0;
        B.rotation.x = 0;
        break;
      case 'phone':
        to(this.armL, -0.9, 0.35);
        to(this.foreL, -1.6);
        to(this.armR, 0.05, -0.06);
        to(this.foreR, -0.1);
        to(this.legL, 0);
        to(this.legR, 0);
        to(this.shinL, 0);
        to(this.shinR, 0);
        B.position.y = Math.sin(t * 2) * 0.005;
        B.rotation.y = 0;
        B.rotation.x = 0.05;
        break;
    }
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    this.root.removeFromParent();
  }
}
