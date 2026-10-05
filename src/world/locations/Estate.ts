import type { CollisionWorld } from '../../core/Collision';
import { ESTATE, PLOTS } from '../../player/Home';
import type { AgentSpec } from '../Crowd';
import { Kit, THREE, newBuild, nightMat, sign, type LocationBuild } from './kit';

/** Your house's window lights: the game switches them off when the prepaid meter runs out. */
export const HOME_LIGHTS = { mat: null as THREE.MeshLambertMaterial | null };

const ROOF_COLORS = [0x8c3a2b, 0x5b5f66, 0x1f3f7a];
const MY_ROOF = 0x0f6b3a;

/** Per-house parts that change with who lives where: your roof, HOME sign, meter, lit windows and name plates. */
export const ESTATE_VIEW = {
  windows: [] as THREE.Mesh[],
  roofs: [] as THREE.Mesh[],
  mineParts: [] as THREE.Group[],
  plates: [] as { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; text: string }[],
  otherWin: null as THREE.Material | null,
  mine: -1,
  /** Show plot `i` as your house. */
  setMine(i: number): void {
    if (i === this.mine) return;
    this.mine = i;
    this.windows.forEach((m, k) => (m.material = k === i && HOME_LIGHTS.mat ? HOME_LIGHTS.mat : this.otherWin!));
    this.roofs.forEach((m, k) => (m.material as THREE.MeshLambertMaterial).color.setHex(k === i ? MY_ROOF : ROOF_COLORS[k % 3]));
    this.mineParts.forEach((g, k) => (g.visible = k === i));
  },
  /** Name plates by the compound gates: "@username", or "TO LET". */
  setNames(names: (string | null)[]): void {
    this.plates.forEach((p, k) => {
      const text = names[k] ? '@' + names[k] : 'TO LET';
      if (text === p.text) return;
      p.text = text;
      drawPlate(p.canvas, text, k === this.mine);
      p.tex.needsUpdate = true;
    });
  },
};

function drawPlate(c: HTMLCanvasElement, text: string, mine: boolean): void {
  const x = c.getContext('2d');
  if (!x) return;
  x.fillStyle = mine ? '#0f6b3a' : text === 'TO LET' ? '#8c5a2b' : '#123e7c';
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#ffd76a';
  x.lineWidth = 6;
  x.strokeRect(3, 3, c.width - 6, c.height - 6);
  x.fillStyle = '#ffffff';
  let size = 54;
  x.font = `bold ${size}px system-ui, sans-serif`;
  while (x.measureText(text).width > c.width - 30 && size > 20) x.font = `bold ${(size -= 2)}px system-ui, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 2);
}

/**
 * Sunshine Court Estate, Gwarinpa: a walled estate off the expressway with a
 * gatehouse, estate office, six duplexes (one per player in this copy of the
 * estate, with name plates) and street lights.
 */
export function buildEstate(world: CollisionWorld): LocationBuild {
  const b = newBuild('estate');
  const g = b.group;
  const k = new Kit(world);
  const { x0, z0, x1, z1 } = ESTATE.rect;
  const GX = ESTATE.gate.x;
  const WALL = 0xe6dccb;
  const H = 2.6;

  // Ground: interlocking paving road, lawns.
  k.floor(x0, z0, x1, z1, 0.03, 0x7d9a52);
  k.floor(GX - 4, z0 + 2, GX + 4, z1, 0.045, 0xb9b2a4);
  for (let z = z0 + 4; z < z1; z += 3) k.floor(GX - 4, z, GX + 4, z + 0.12, 0.05, 0xa39b8c);
  k.floor(GX - 4, z1, GX + 4, z1 + 12, 0.045, 0xb9b2a4); // driveway out to the expressway

  // Perimeter wall with the gate gap.
  k.wall(x0, z0, x1, z0 + 0.4, H, WALL);
  k.wall(x0, z0, x0 + 0.4, z1, H, WALL);
  k.wall(x1 - 0.4, z0, x1, z1, H, WALL);
  k.wall(x0, z1 - 0.4, GX - 4.5, z1, H, WALL);
  k.wall(GX + 4.5, z1 - 0.4, x1, z1, H, WALL);
  // Gate posts + arch sign + open sliding gate.
  for (const s of [-1, 1]) k.box(GX + s * 4.9, 0, z1 - 0.2, 0.9, 5.2, 0.9, 0xc9b99a, true);
  k.box(GX, 4.6, z1 - 0.2, 10.6, 0.8, 0.5, 0x0f6b3a);
  sign(g, ESTATE.name.toUpperCase(), GX, 5.0, z1 + 0.1, 0, 9.4, 0.9, { bg: '#0f6b3a', fg: '#ffd76a', sub: 'Gwarinpa • Security conscious estate' });
  k.box(GX - 9, 0, z1 + 0.2, 8, 2.2, 0.12, 0x2b2f33); // gate slid open
  // Gatehouse (west) and estate office (east).
  k.box(GX - 9, 0, z1 - 5, 6, 3, 5, 0xf3ead8, true);
  k.box(GX - 9, 3, z1 - 5, 6.6, 0.3, 5.6, 0x0f6b3a);
  k.box(GX - 5.95, 1.2, z1 - 5, 0.05, 1, 2.4, 0x2e4a63);
  sign(g, 'SECURITY', GX - 5.9, 2.6, z1 - 5, Math.PI / 2, 2.4, 0.5, { bg: '#123e7c' });
  k.box(GX + 10, 0, z1 - 7, 8, 3.4, 7, 0xf1e5c8, true);
  k.box(GX + 10, 3.4, z1 - 7, 8.6, 0.3, 7.6, 0x8c5a2b);
  k.box(GX + 5.95, 0, z1 - 7, 0.1, 2.3, 1.4, 0x5a3a24);
  sign(g, 'ESTATE OFFICE', GX + 5.9, 2.8, z1 - 7, -Math.PI / 2, 3.6, 0.6, { bg: '#8c5a2b', sub: 'Service charge • Complaints' });
  // Speed bump + "no horning" sign.
  k.box(GX, 0, z1 - 12, 8, 0.15, 0.6, 0xe8a317);
  k.box(GX + 4.6, 0, z1 - 14, 0.1, 2, 0.1, 0x777777);
  sign(g, 'NO HORNING • 10 KM/H', GX + 4.6, 2.2, z1 - 14, -Math.PI / 2, 1.8, 0.6, { bg: '#c0262d' });

  // Duplexes: three plots on each side of the estate road. Any of them can be "yours" (see ESTATE_VIEW).
  const windows = nightMat(0xffe7a8, 0x2e4a63, 1.3);
  const homeWin = nightMat(0xfff1c4, 0x2e4a63, 1.5);
  HOME_LIGHTS.mat = homeWin;
  ESTATE_VIEW.otherWin = windows;
  b.glowMats.push(windows, homeWin);
  const palette = [0xfdf6e6, 0xf3ead8, 0xe9d8b4, 0xf1e5c8, 0xdfe7ee, 0xf6e7d2];
  for (const plot of PLOTS) {
    {
      const { side, z: zc, x: hx, front, index: n } = plot;
      const color = palette[n % palette.length];
      const winGeo: THREE.BufferGeometry[] = [];
      const mineG = new THREE.Group();
      // Compound fence with a gate gap on the road side.
      const fx0 = GX + side * 12, fx1 = GX + side * 48;
      const lo = Math.min(fx0, fx1), hi = Math.max(fx0, fx1);
      k.wall(lo, zc - 13, hi, zc - 12.7, 1.8, WALL);
      k.wall(lo, zc + 12.7, hi, zc + 13, 1.8, WALL);
      k.wall(fx0 - 0.15, zc - 13, fx0 + 0.15, zc - 3.5, 1.8, WALL);
      k.wall(fx0 - 0.15, zc + 3.5, fx0 + 0.15, zc + 13, 1.8, WALL);
      k.box(fx0, 0, zc + 3.5 + 0.2, 0.3, 2.2, 0.3, 0x1f3f7a);
      k.floor(Math.min(fx0, front), zc - 3.5, Math.max(fx0, front), zc + 3.5, 0.05, 0xc9c3b4);
      // Two-storey body, balcony, roof, door.
      k.box(hx, 0, zc, 16, 7, 11, color, true);
      k.box(hx, 3.4, zc, 16.4, 0.25, 11.4, 0xd9d0bc);
      const roof = new THREE.Mesh(
        mergeAll([new THREE.BoxGeometry(17, 0.5, 12).translate(hx, 7.25, zc), new THREE.BoxGeometry(9, 1.6, 7).translate(hx + side * 1, 8.3, zc)]),
        new THREE.MeshLambertMaterial({ color: ROOF_COLORS[n % 3] }),
      );
      roof.castShadow = true;
      g.add(roof);
      ESTATE_VIEW.roofs.push(roof);
      k.box(front - side * 0.06, 0, zc, 0.12, 2.5, 1.6, 0x5a3a24);
      k.box(front - side * 0.9, 3.6, zc + 3, 1.6, 0.15, 4, 0xd9d0bc); // balcony
      k.box(front - side * 1.65, 3.75, zc + 3, 0.08, 1, 4, 0x9aa1a8);
      k.cyl(hx - side * 4, 7.5, zc - 3, 0.9, 0.9, 1.8, 0x1a1a1a, 12); // black water tank
      // Windows (lit at night).
      const wl = winGeo;
      for (const y of [1.3, 4.6]) {
        for (const dz of [-3.6, 3.6]) {
          if (y < 2 && Math.abs(dz) < 1) continue;
          wl.push(new THREE.BoxGeometry(0.06, 1.3, 1.6).translate(front - side * 0.02, y + 0.65, zc + dz));
        }
        wl.push(new THREE.BoxGeometry(2, 1.3, 0.06).translate(hx - 3, y + 0.65, zc + 5.52), new THREE.BoxGeometry(2, 1.3, 0.06).translate(hx + 3, y + 0.65, zc - 5.52));
      }
      // Generator house + parked car pad.
      k.box(hx + side * 6, 0, zc - 9.5, 3, 2, 2, 0x8a8f96, true);
      k.floor(front - side * 1, zc - 11, fx0 - side * 0.5, zc - 4.2, 0.055, 0xb3ab9c);
      const face = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      // Only on your house: HOME sign and the prepaid meter beside the door.
      sign(mineG, 'HOME', front - side * 0.08, 2.9, zc, face, 1.6, 0.5, { bg: '#0f6b3a' });
      const meterBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.4), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
      meterBox.position.set(front - side * 0.12, 1.5, zc - 3.5);
      mineG.add(meterBox);
      sign(mineG, 'AEDC PREPAID', front - side * 0.2, 1.95, zc - 3.5, face, 0.8, 0.25, { bg: '#123e7c' });
      mineG.visible = false;
      g.add(mineG);
      ESTATE_VIEW.mineParts.push(mineG);
      const win = new THREE.Mesh(mergeAll(winGeo), windows);
      g.add(win);
      ESTATE_VIEW.windows.push(win);
      // Name plate on the compound gate post, facing the road.
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 112;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.57), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
      plate.position.set(fx0 - side * 0.3, 2.35, zc + 5.2);
      plate.rotation.y = face;
      k.box(fx0 - side * 0.2, 0, zc + 5.2, 0.12, 2.1, 0.12, 0x555a60);
      g.add(plate);
      ESTATE_VIEW.plates.push({ canvas, tex, text: '' });
      k.tree(hx - side * 10, zc + 9, 1.1, true);
      k.tree(hx + side * 10, zc - 1, 0.9);
    }
  }
  ESTATE_VIEW.mine = -1;
  ESTATE_VIEW.setMine(0);
  ESTATE_VIEW.setNames([]);
  // Street lights along the estate road.
  const lamp = nightMat(0xfff1c4, 0xdddddd, 2);
  b.glowMats.push(lamp);
  const bulbs: THREE.BufferGeometry[] = [];
  for (let z = z1 - 18; z > z0 + 6; z -= 20) {
    for (const s of [-1, 1]) {
      k.box(GX + s * 4.8, 0, z, 0.15, 5, 0.15, 0x555a60, 5);
      bulbs.push(new THREE.BoxGeometry(0.5, 0.2, 0.5).translate(GX + s * 4.2, 5, z));
    }
  }
  g.add(new THREE.Mesh(mergeAll(bulbs), lamp));
  k.flush(g);

  // Neighbours: kids playing on the road, mama selling pure water, a man washing his car.
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: GX - 3, z0: z0 + 12, x1: GX + 3, z1: z1 - 18 }, count: 3, scale: 0.75, speed: 1.6 },
    { kind: 'static', x: GX + 13.5, z: -318, facing: -Math.PI / 2, pose: 'sit', cfg: { outfit: 'kaftan', headwear: 'kufi' } },
    { kind: 'static', x: GX - 14, z: -342, facing: Math.PI / 2, pose: 'phone' },
  ];
  b.crowds.push({ id: 'estate', cx: GX, cz: (z0 + z1) / 2, radius: 110, agents });
  return b;
}

function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const geo of list) {
    const gg = geo.index ? geo.toNonIndexed() : geo;
    pos.push(...(gg.getAttribute('position').array as Float32Array));
    nor.push(...(gg.getAttribute('normal').array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
