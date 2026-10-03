import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import { carBodyGeometry } from '../../player/Vehicle';
import type { AgentSpec } from '../Crowd';
import { Kit, THREE, glow, newBuild, sign, type LocationBuild } from './kit';

const CREAM = 0xefe6d2;
const MAROON = 0x7a1f3d;
const PATH = 0xcfc8b8;

/**
 * Nile University campus: x -618..-388, z -112..243, gate on the east side at z=60.
 * Plus the Lecture Theatre 1 interior at x 1600..1640, z -20..12.
 */
export function buildNile(world: CollisionWorld): LocationBuild {
  const b = newBuild('nile');
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(55);
  const X0 = -618, X1 = -388, Z0 = -112, Z1 = 243;

  // ---------------- Fence + gate ----------------
  k.floor(X0, Z0, X1, Z1, 0.015, 0x76a24e);
  const fence = 0xe6dcc6;
  k.wall(X0, Z0 - 0.2, X1, Z0 + 0.2, 2.2, fence, 0.4);
  k.wall(X0, Z1 - 0.2, X1, Z1 + 0.2, 2.2, fence, 0.4);
  k.wall(X0 - 0.2, Z0, X0 + 0.2, Z1, 2.2, fence, 0.4);
  k.wall(X1 - 0.2, Z0, X1 + 0.2, 52.5, 2.2, fence, 0.4);
  k.wall(X1 - 0.2, 67.5, X1 + 0.2, Z1, 2.2, fence, 0.4);
  for (const z of [51.5, 68.5]) {
    k.box(X1, 0, z, 2, 7, 2, CREAM, true);
    k.box(X1, 7, z, 2.4, 0.6, 2.4, MAROON);
  }
  k.box(X1, 7.6, 60, 1.6, 1.8, 19, CREAM);
  sign(g, 'NILE UNIVERSITY', X1 + 0.82, 8.5, 60, Math.PI / 2, 14, 1.6, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Knowledge • Integrity • Excellence' });
  sign(g, 'NILE UNIVERSITY', X1 - 0.82, 8.5, 60, -Math.PI / 2, 14, 1.6, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Welcome back, scholars' });
  k.box(-394, 0, 77, 3, 3, 3, 0xd9d0bc, true); // security post
  k.box(-394, 3, 77, 3.6, 0.3, 3.6, MAROON);
  glow(g, -392.45, 1.2, 77, 0.05, 1, 1.6, 0xbfe3ff, 0.6);
  k.box(-392, 0, 64, 0.4, 1.1, 0.4, 0x333333, true);
  k.rbox(-392, 1.15, 60.5, 0.15, 0.15, 7, 0, 0xc0262d);

  // Driveway paving into the quad and walkways.
  const paths: [number, number, number, number][] = [
    [-530, 40, -470, 80], // quad
    [-503, 21, -497, 175], // N-S spine
    [-610, 147, -395, 153], // E-W walk
    [-565, 57, -530, 63], // to engineering/law
    [-470, -48, -464, 40], // to computing
    [-560, -70, -464, -64], // hostels walk
    [-443, 132, -437, 147], // library
    [-523, 131, -517, 147], // LT1
    [-433, 153, -427, 177], // caf
  ];
  for (const [x0, z0, x1, z1] of paths) k.floor(x0, z0, x1, z1, 0.04, PATH);
  k.disc(-500, 60, 9, 0.05, 0xd9d2c2);

  // ---------------- Buildings ----------------
  const building = (x0: number, z0: number, x1: number, z1: number, h: number, color: number, trim = MAROON) => {
    k.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, color, true);
    k.box((x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0 + 0.6, 0.7, z1 - z0 + 0.6, trim);
    // Window bands.
    for (let y = 2; y < h - 1; y += 3.2) {
      k.box((x0 + x1) / 2, y, z1 + 0.02, x1 - x0 - 2, 1.4, 0.06, 0x2e4a63);
      k.box((x0 + x1) / 2, y, z0 - 0.02, x1 - x0 - 2, 1.4, 0.06, 0x2e4a63);
      k.box(x0 - 0.02, y, (z0 + z1) / 2, 0.06, 1.4, z1 - z0 - 2, 0x2e4a63);
      k.box(x1 + 0.02, y, (z0 + z1) / 2, 0.06, 1.4, z1 - z0 - 2, 0x2e4a63);
    }
  };
  // Senate building with columns.
  building(-525, 3, -475, 21, 16, 0xf3ecdc);
  for (let i = 0; i < 9; i++) k.cyl(-521 + i * 5.25, 0, 22.8, 0.55, 0.65, 13, 0xffffff, 12, 13);
  k.box(-500, 13, 23, 46, 1.2, 4, 0xffffff);
  k.box(-500, 0, 25.5, 30, 0.4, 2.5, 0xd9d0bc);
  sign(g, 'SENATE BUILDING', -500, 14.6, 25.05, 0, 14, 1.4, { bg: '#7a1f3d', fg: '#ffd76a' });
  building(-592, -10, -568, 30, 12, 0xe8dcc6);
  sign(g, 'FACULTY OF ENGINEERING', -567.6, 9, 10, Math.PI / 2, 14, 1.3, { bg: '#123e7c' });
  building(-592, 78, -568, 112, 10, 0xe8dcc6);
  sign(g, 'FACULTY OF LAW', -567.6, 7.5, 95, Math.PI / 2, 12, 1.3, { bg: '#111111' });
  building(-462, -71, -428, -49, 12, 0xe2e8ee);
  sign(g, 'FACULTY OF COMPUTING', -445, 9, -48.6, 0, 14, 1.3, { bg: '#0f8a4b' });
  // Library (glassy).
  k.box(-440, 0, 120, 34, 12, 24, 0xdfe7ee, true);
  k.box(-440, 1, 132.05, 32, 10, 0.1, 0x6f9bbf);
  k.box(-440, 12, 120, 34.6, 0.8, 24.6, MAROON);
  sign(g, 'UNIVERSITY LIBRARY', -440, 11, 132.2, 0, 14, 1.3, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Silence is golden' });
  // Lecture Theatre 1.
  building(-533, 109, -507, 131, 10, 0xf0e4cc);
  k.box(-520, 0, 131.1, 4, 3, 0.2, 0x5a3a24);
  sign(g, 'LECTURE THEATRE 1 (LT1)', -520, 6, 131.3, 0, 12, 1.3, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Press E at the door to enter' });
  // Cafeteria + outdoor seating.
  building(-443, 177, -417, 193, 6, 0xf6e9d0, 0xc0262d);
  sign(g, 'MAMA CAF', -430, 4.6, 193.3, 0, 8, 1.2, { bg: '#c0262d', sub: 'Rice & beans • Swallow • Indomie' });
  const cafTables: [number, number][] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) cafTables.push([-439 + c * 6, 201 + r * 6]);
  for (const [x, z] of cafTables) {
    k.cyl(x, 0, z, 0.06, 0.06, 2.4, 0x555555, 6);
    k.cone(x, 2.4, z, 1.8, 0.6, pick(rng, [0xc0262d, 0x0f8a4b, 0xe8a317]), 8);
    k.cyl(x, 0.72, z, 0.8, 0.8, 0.06, 0xffffff, 12);
    k.cyl(x, 0, z, 0.08, 0.08, 0.72, 0x777777, 6);
    world.addCircle(x, z, 0.9, 0.8);
  }
  // Hostels with clothes lines.
  building(-605, -87, -575, -73, 14, 0xf0d9b5);
  sign(g, 'BOYS HOSTEL (BLOCK A)', -590, 11, -72.6, 0, 11, 1.1, { bg: '#123e7c' });
  building(-550, -92, -520, -78, 14, 0xf3d6d6);
  sign(g, 'GIRLS HOSTEL (BLOCK B)', -535, 11, -77.6, 0, 11, 1.1, { bg: '#d94f8c' });
  for (const [x0, z] of [[-604, -66], [-549, -71]] as const) {
    k.box(x0, 0, z, 0.1, 2, 0.1, 0x555555);
    k.box(x0 + 26, 0, z, 0.1, 2, 0.1, 0x555555);
    k.box(x0 + 13, 1.95, z, 26, 0.03, 0.03, 0x333333);
    for (let i = 0; i < 16; i++) k.box(x0 + 1 + i * 1.5, 1.2, z, 0.9, 0.75, 0.04, pick(rng, [0xc0262d, 0xffffff, 0x2a64c9, 0xe8a317, 0x0f8a4b, 0xd94f8c]));
  }
  // Chapel and mosque.
  building(-477, 218, -463, 234, 8, 0xffffff, 0x2a64c9);
  k.box(-470, 8, 226, 0.4, 4, 0.4, 0xd4a62a);
  k.box(-470, 10.5, 226, 2, 0.4, 0.4, 0xd4a62a);
  sign(g, 'CHAPEL OF GRACE', -470, 5, 217.7, Math.PI, 7, 0.9, { bg: '#2a64c9' });
  k.box(-406, 0, 226, 12, 6, 12, 0xf3efe6, true);
  k.sphere(-406, 6, 226, 4.5, 0x0f8a4b, 0.8, 14);
  k.cyl(-398, 0, 220, 0.6, 0.7, 12, 0xf3efe6, 10, 12);
  k.cone(-398, 12, 220, 0.9, 2, 0x0f8a4b, 10);
  sign(g, 'CAMPUS MOSQUE', -406, 4, 219.8, Math.PI, 7, 0.9, { bg: '#0f8a4b' });

  // ---------------- Sports ----------------
  const P = { x0: -575, z0: 175, x1: -505, z1: 215 };
  k.floor(P.x0 - 2, P.z0 - 2, P.x1 + 2, P.z1 + 2, 0.03, 0x3f8f35);
  for (let i = 0; i < 7; i++) k.floor(P.x0 + i * 10, P.z0, P.x0 + i * 10 + 5, P.z1, 0.035, 0x47a03c);
  const line = (x0: number, z0: number, x1: number, z1: number) => k.floor(x0, z0, x1, z1, 0.045, 0xffffff);
  line(P.x0, P.z0, P.x1, P.z0 + 0.15);
  line(P.x0, P.z1 - 0.15, P.x1, P.z1);
  line(P.x0, P.z0, P.x0 + 0.15, P.z1);
  line(P.x1 - 0.15, P.z0, P.x1, P.z1);
  line(-540.08, P.z0, -539.92, P.z1);
  k.disc(-540, 195, 6, 0.04, 0xffffff);
  k.disc(-540, 195, 5.85, 0.046, 0x47a03c);
  for (const gx of [P.x0, P.x1]) {
    for (const z of [191.5, 198.5]) k.cyl(gx, 0, z, 0.08, 0.08, 2.4, 0xffffff, 6, 2.4);
    k.box(gx, 2.35, 195, 0.12, 0.12, 7, 0xffffff);
    line(gx === P.x0 ? gx : gx - 12, 186, gx === P.x0 ? gx + 12 : gx, 186.15);
    line(gx === P.x0 ? gx : gx - 12, 203.85, gx === P.x0 ? gx + 12 : gx, 204);
    line(gx === P.x0 ? gx + 11.85 : gx - 12, 186, gx === P.x0 ? gx + 12 : gx - 11.85, 204);
  }
  for (let r = 0; r < 4; r++) k.box(-540, r * 0.5, 219 + r * 1.2, 60, 0.5, 1.2, r % 2 ? 0xd9d2c2 : 0xc9c2b2, r === 0 ? 0.5 : false);
  world.addBox(-570, 218.4, -510, 223.8, 2);
  sign(g, 'NILE ARENA • FACULTY CUP', -540, 4.4, 224.5, Math.PI, 14, 1.2, { bg: '#7a1f3d', fg: '#ffd76a' });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  g.add(ball);
  let bx = -540, bz = 195, tx = -530, tz = 190;
  b.animators.push((_t, dt) => {
    const dx = tx - bx;
    const dz = tz - bz;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) {
      tx = P.x0 + 4 + Math.random() * (P.x1 - P.x0 - 8);
      tz = P.z0 + 3 + Math.random() * (P.z1 - P.z0 - 6);
    } else {
      const s = Math.min(d, dt * 9);
      bx += (dx / d) * s;
      bz += (dz / d) * s;
    }
    ball.position.set(bx, 0.22 + Math.abs(Math.sin(_t * 5)) * 0.4, bz);
    ball.rotation.x += dt * 8;
  });
  // Basketball court.
  k.floor(-608, 146, -592, 174, 0.035, 0xc96a3a);
  for (const z of [147.5, 172.5]) {
    k.cyl(-600, 0, z, 0.1, 0.1, 3.4, 0x444444, 6, 3.4);
    k.box(-600, 3.2, z + (z < 160 ? 0.5 : -0.5), 1.8, 1.1, 0.08, 0xffffff);
    k.cyl(-600, 3.0, z + (z < 160 ? 1 : -1), 0.25, 0.25, 0.04, 0xf26b1d, 12);
  }

  // ---------------- Quad, trees, benches, flags, parking ----------------
  k.cyl(-500, 0, 60, 3.6, 3.8, 0.5, 0xd9d0bc, 20, 0.5);
  k.tree(-500, 60, 1.6, false);
  for (let i = 0; i < 3; i++) {
    const fx = -515 + i * 4;
    k.cyl(fx, 0, 42, 0.08, 0.1, 10, 0xdddddd, 6, 10);
    k.box(fx + 1, 8.4, 42, 2, 1.2, 0.04, i === 1 ? MAROON : i === 0 ? 0x008751 : 0xffffff);
  }
  for (const [x, z, r] of [[-526, 50, Math.PI / 2], [-526, 70, Math.PI / 2], [-474, 50, Math.PI / 2], [-474, 70, Math.PI / 2], [-512, 78, 0], [-488, 78, 0]] as const) k.bench(x, z, r);
  sign(g, 'SUG ELECTION: VOTE TUNDE! • EXAMS START MONDAY • LOST: MY CGPA', -484, 2.2, 89.5, 0, 6, 1.6, { bg: '#2b2f33' });
  k.box(-484, 0, 89.4, 6.4, 0.1, 0.3, 0x5a3a24);
  for (const s of [-3, 3]) k.box(-484 + s, 0, 89.4, 0.15, 3, 0.15, 0x5a3a24, 3);
  for (let i = 0; i < 26; i++) {
    const x = -610 + i * 8.5;
    if (x > -402) break;
    k.tree(x, 144 - (i % 2) * 0.5, 0.9 + (i % 3) * 0.15, i % 4 === 0);
    if (i % 2 === 0) k.tree(x + 3, 156, 0.8, false);
  }
  for (let z = 30; z < 172; z += 14) {
    k.tree(-507, z, 0.9, z % 28 === 2);
    k.tree(-493, z + 7, 0.9);
  }
  for (let i = 0; i < 14; i++) k.tree(-612 + (i % 2) * 4, -100 + i * 13, 1.1, i % 3 === 0);
  // Parking lot.
  k.floor(-440, 76, -398, 100, 0.03, 0x4a4b4e);
  for (let i = 0; i < 8; i++) k.floor(-438 + i * 5, 88, -437.85 + i * 5, 100, 0.04, 0xffffff);
  const cars = new THREE.InstancedMesh(carBodyGeometry(0xffffff, true), new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 60 }), 5);
  [0, 1, 3, 5, 6].forEach((slot, i) => {
    const x = -435.5 + slot * 5;
    cars.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0, 94));
    cars.setColorAt(i, new THREE.Color(pick(rng, [0xe9e9e9, 0x111111, 0x8a8f96, 0x1f3f7a, 0x7a1f1f])));
    world.addBox(x - 1, 91.8, x + 1, 96.2, 1.5);
  });
  cars.castShadow = true;
  g.add(cars);

  // ---------------- Lecture Theatre 1 interior ----------------
  const L = { x0: 1600, x1: 1640, z0: -20, z1: 12 };
  k.floor(L.x0, L.z0, L.x1, L.z1, 0.01, 0x8c6a4a);
  k.wall(L.x0 - 1, L.z0 - 1, L.x1 + 1, L.z0, 7, 0xe8e0d0, 1);
  k.wall(L.x0 - 1, L.z0, L.x0, L.z1, 7, 0xe8e0d0, 1);
  k.wall(L.x1, L.z0, L.x1 + 1, L.z1, 7, 0xe8e0d0, 1);
  k.wall(L.x0 - 1, L.z1, 1618, L.z1 + 1, 7, 0xe8e0d0, 1);
  k.wall(1622, L.z1, L.x1 + 1, L.z1 + 1, 7, 0xe8e0d0, 1);
  k.box(1620, 3, L.z1 + 0.5, 4, 4, 1, 0xe8e0d0);
  const ltCeil = new THREE.Mesh(new THREE.PlaneGeometry(42, 34).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2efe8 }));
  ltCeil.position.set(1620, 7, -4);
  g.add(ltCeil);
  for (let x = 1606; x < 1640; x += 9) for (let z = -14; z < 10; z += 8) glow(g, x, 6.88, z, 3, 0.08, 1, 0xfff8e6, 0.9);
  k.box(1620, 0, -18.5, 14, 0.3, 4, 0x6b4a2b); // stage
  k.box(1620, 1.2, -19.9, 12, 3.6, 0.1, 0xffffff);
  sign(g, 'THERMODYNAMICS OF JOLLOF RICE — PART 2', 1620, 3.2, -19.8, 0, 11, 2.6, { bg: '#ffffff', fg: '#123e7c', sub: 'Q = m·c·ΔT (pot) + pepper constant' });
  k.box(1626, 0.3, -16.5, 1.4, 1.1, 0.8, 0x5a3a24, true); // lectern
  k.floor(1601, -12, 1639, 11, 0.02, 0x7a5c3e);
  const rows = [-8, -4.8, -1.6, 1.6, 4.8];
  for (const z of rows) {
    for (const [x0, x1] of [[1603, 1617], [1623, 1637]]) {
      k.box((x0 + x1) / 2, 0, z - 0.6, x1 - x0, 0.8, 0.5, 0x5a3a24, true);
      k.box((x0 + x1) / 2, 0, z + 0.4, x1 - x0, 0.45, 0.5, 0x2a3a6a);
    }
  }
  const ltAgents: AgentSpec[] = [];
  rows.forEach((z, r) => {
    for (const x of [1605, 1609.5, 1614, 1626, 1630.5, 1635]) {
      if ((x + r * 3) % 7 < 2) continue;
      ltAgents.push({ kind: 'static', x, z: z + 0.45, facing: Math.PI, pose: r === 4 && x > 1630 ? 'phone' : 'sit' });
    }
  });
  k.flush(g);

  // ---------------- Students ----------------
  const jersey = (primary: number) => ({ outfit: 'jersey' as const, primary, headwear: 'none' as const });
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: -528, z0: 42, x1: -506, z1: 56 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: -494, z0: 64, x1: -472, z1: 78 }, count: 4, carry: 'bag' },
    { kind: 'loop', path: [[-532, 38], [-468, 38], [-468, 82], [-532, 82]], count: 6, speed: 1.3 },
    { kind: 'wander', rect: { x0: -502, z0: 90, x1: -498, z1: 172 }, count: 3, carry: 'bag' },
    { kind: 'wander', rect: { x0: -606, z0: 148.5, x1: -400, z1: 151.5 }, count: 5, carry: 'bag' },
    { kind: 'wander', rect: { x0: -572, z0: 178, x1: -541, z1: 212 }, count: 5, speed: 2.6, cfg: jersey(3) },
    { kind: 'wander', rect: { x0: -539, z0: 178, x1: -508, z1: 212 }, count: 5, speed: 2.6, cfg: jersey(7) },
    { kind: 'wander', rect: { x0: -606, z0: 149, x1: -594, z1: 171 }, count: 3, speed: 2, cfg: jersey(11) },
    { kind: 'wander', rect: { x0: -600, z0: -68, x1: -525, z1: -62 }, count: 3 },
    { kind: 'loop', path: [[-615, -106], [-391, -106], [-391, 239], [-615, 239]], count: 3, speed: 3.2, cfg: { outfit: 'jersey', primary: 0, headwear: 'cap' } },
  ];
  for (let i = 0; i < 10; i++) agents.push({ kind: 'static', x: -566 + i * 5.5, z: 219.6 + (i % 3) * 1.2, facing: Math.PI, pose: 'cheer' });
  cafTables.forEach(([x, z], i) => {
    if (i % 2) agents.push({ kind: 'static', x: x + 1.1, z, facing: -Math.PI / 2, pose: 'sit' });
  });
  for (const [x, z] of [[-526, 51], [-474, 69], [-488, 77.4]] as const) agents.push({ kind: 'static', x, z, facing: 0, pose: 'phone' });
  b.crowds.push({ id: 'campus', cx: -500, cz: 65, radius: 210, agents });
  b.crowds.push({ id: 'lt1', cx: 1620, cz: -4, radius: 70, agents: ltAgents });
  return b;
}
