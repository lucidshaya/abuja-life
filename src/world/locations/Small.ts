import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import type { AgentSpec } from '../Crowd';
import { BoxField, Kit, THREE, glow, newBuild, nightMat, sign, type LocationBuild } from './kit';

/**
 * The Cage nightclub: exterior in Wuse 2 at (85, -85), interior at
 * x 1400..1446, z 180..216.
 */
export function buildCage(world: CollisionWorld): LocationBuild {
  const b = newBuild('cage');
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(13);

  // ---------- Exterior (Wuse 2) ----------
  k.box(85, 0, -85, 30, 9, 24, 0x1a1a1f, true);
  k.box(85, 9, -85, 30.6, 0.5, 24.6, 0x6c2c91);
  // Cage bars on the facade.
  for (let x = 71; x <= 99; x += 1.4) k.box(x, 0.5, -72.85, 0.12, 8, 0.12, 0x9aa1a8);
  k.box(85, 0, -72.8, 4, 3.2, 0.2, 0x111111);
  const neon = nightMat(0xd94fff, 0x6c2c91, 2.4);
  b.glowMats.push(neon);
  const neonSign = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 0.25), neon);
  neonSign.position.set(85, 8, -72.6);
  g.add(neonSign);
  sign(g, 'THE CAGE', 85, 6.4, -72.6, 0, 10, 2, { bg: '#1a0a24', fg: '#ff7af5', sub: 'Abuja nightlife • Opens 9pm' });
  k.box(80, 0, -70.2, 0.08, 1, 0.08, 0xd4a62a, 1);
  k.box(90, 0, -70.2, 0.08, 1, 0.08, 0xd4a62a, 1);
  k.box(85, 0.9, -70.2, 10, 0.05, 0.05, 0xc0262d); // velvet rope
  k.floor(78, -72.6, 92, -66, 0.06, 0x7a1f3d); // red carpet

  // ---------- Interior ----------
  const X0 = 1400, X1 = 1446, Z0 = 180, Z1 = 216, H = 7;
  k.floor(X0, Z0, X1, Z1, 0.01, 0x15121c);
  k.wall(X0 - 1, Z0 - 1, X1 + 1, Z0, H, 0x221a2e, 1);
  k.wall(X0 - 1, Z0, X0, Z1, H, 0x221a2e, 1);
  k.wall(X1, Z0, X1 + 1, Z1, H, 0x221a2e, 1);
  k.wall(X0 - 1, Z1, 1421, Z1 + 1, H, 0x221a2e, 1);
  k.wall(1425, Z1, X1 + 1, Z1 + 1, H, 0x221a2e, 1);
  k.box(1423, 3, Z1 + 0.5, 4, 4, 1, 0x221a2e);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(48, 38).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0c0a10 }));
  ceil.position.set(1423, H, 198);
  g.add(ceil);
  // Dance floor: animated LED tiles.
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.06, 1.9), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 63);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 63; i++) {
    m.makeTranslation(1415 + (i % 9) * 2, 0.04, 197.5 + Math.floor(i / 9) * 2);
    tiles.setMatrixAt(i, m);
    tiles.setColorAt(i, new THREE.Color(0x000000));
  }
  g.add(tiles);
  const col = new THREE.Color();
  b.animators.push((t) => {
    for (let i = 0; i < 63; i++) {
      const x = i % 9;
      const z = Math.floor(i / 9);
      const wave = Math.sin(t * 4 + x * 0.7 + z * 0.5) * 0.5 + 0.5;
      col.setHSL((t * 0.08 + (x + z) * 0.05) % 1, 0.9, 0.12 + wave * 0.35);
      tiles.setColorAt(i, col);
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  });
  // The cage around the dance floor (with openings).
  for (let i = 0; i <= 18; i++) {
    for (const z of [196.3, 210.7]) if (i < 7 || i > 11) k.cyl(1414 + i, 0, z, 0.06, 0.06, 4, 0x9aa1a8, 6, 4);
  }
  for (let i = 0; i <= 14; i++) for (const x of [1413.6, 1432.4]) if (i < 5 || i > 9) k.cyl(x, 0, 196.3 + i, 0.06, 0.06, 4, 0x9aa1a8, 6, 4);
  k.box(1423, 4, 196.3, 19, 0.15, 0.15, 0x9aa1a8);
  k.box(1423, 4, 210.7, 19, 0.15, 0.15, 0x9aa1a8);
  // Mirror ball + light beams.
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshPhongMaterial({ color: 0xdddddd, shininess: 200, specular: 0xffffff, flatShading: true }));
  ball.position.set(1423, 5.8, 203.5);
  g.add(ball);
  const beams: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 7, 12, 1, true).translate(0, -3.5, 0),
      new THREE.MeshBasicMaterial({ color: [0xff3df0, 0x3dd8ff, 0xfff23d, 0x6cff3d, 0xff7a3d, 0x9b5cff][i], transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.position.set(1408 + i * 6, H - 0.2, 190 + (i % 2) * 20);
    g.add(beam);
    beams.push(beam);
  }
  b.animators.push((t) => {
    ball.rotation.y = t * 0.8;
    beams.forEach((bm, i) => {
      bm.rotation.z = Math.sin(t * 1.3 + i) * 0.6;
      bm.rotation.x = Math.cos(t * 1.1 + i * 2) * 0.5;
    });
  });
  // DJ booth.
  k.box(1423, 0, 182.6, 8, 0.4, 3.4, 0x2b2f33);
  k.box(1423, 0.4, 184, 6, 1.1, 1, 0x111111, 1.5);
  glow(g, 1423, 0.6, 184.52, 5.8, 0.5, 0.04, 0x9b5cff, 1);
  for (const s of [-1, 1]) k.box(1423 + s * 4.5, 0, 182, 1.4, 3, 1.2, 0x0a0a0a, true);
  sign(g, 'DJ SPINALL-ABUJA', 1423, 5.2, 180.1, 0, 8, 1.2, { bg: '#1a0a24', fg: '#3dd8ff' });
  // Bar.
  k.box(1405.5, 0, 198, 1.4, 1.2, 22, 0x3a2418, true);
  glow(g, 1406.25, 0.2, 198, 0.04, 0.3, 21.5, 0xff7a3d, 0.8);
  k.box(1400.8, 0, 198, 0.8, 4.2, 22, 0x1a1218);
  const bottles = new BoxField();
  for (let r = 0; r < 4; r++) for (let i = 0; i < 40; i++) bottles.add(1401.3, 0.6 + r * 0.9, 188 + i * 0.5, 0.15, 0.45, 0.15, pick(rng, [0x5a2a10, 0x0f6b3a, 0xd4a62a, 0xffffff, 0x2a64c9]));
  bottles.build(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0));
  glow(g, 1401.25, 0.5, 198, 0.04, 3.6, 21, 0xffb36b, 0.35);
  for (let i = 0; i < 7; i++) k.cyl(1407.6, 0, 189 + i * 3, 0.3, 0.25, 0.8, 0xd4a62a, 8, 0.9);
  sign(g, 'BAR', 1401.5, 5, 198, Math.PI / 2, 4, 1, { bg: '#3a2418', fg: '#ffd76a' });
  // VIP booth with sparklers.
  k.floor(1434, 184, 1445, 194, 0.03, 0x4a1030);
  k.box(1444, 0, 189, 1.2, 1, 9, 0x7a1f3d, true);
  k.box(1439.5, 0, 184.6, 9, 1, 1.2, 0x7a1f3d, true);
  k.box(1438.5, 0, 189.5, 3, 0.7, 2, 0x111111, true);
  for (let i = 0; i < 4; i++) k.cyl(1437.6 + i * 0.6, 0.7, 189.5, 0.08, 0.08, 0.4, 0xd4a62a, 6);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
  spark.position.set(1438.5, 1.4, 189.5);
  g.add(spark);
  b.animators.push((t) => spark.scale.setScalar(0.8 + Math.random() * 0.8 + Math.sin(t * 30) * 0.2));
  sign(g, 'VIP', 1445.4, 3.5, 189, -Math.PI / 2, 3, 1, { bg: '#d4a62a', fg: '#1a0a24' });
  // Neon strips along the walls.
  for (const z of [180.6, 215.4]) glow(g, 1423, 6.3, z, 44, 0.1, 0.06, 0xd94fff, 1);
  for (const x of [1400.6, 1445.4]) glow(g, x, 6.3, 198, 0.06, 0.1, 34, 0x3dd8ff, 1);
  k.flush(g);

  // ---------- Crowd ----------
  const agents: AgentSpec[] = [];
  for (let i = 0; i < 16; i++) {
    const x = 1416 + (i % 6) * 2.9 + (Math.floor(i / 6) % 2) * 1.2;
    const z = 199 + Math.floor(i / 6) * 3.6;
    agents.push({ kind: 'static', x, z, facing: rng() * Math.PI * 2, pose: 'dance' });
  }
  agents.push({ kind: 'wander', rect: { x0: 1409, z0: 187, x1: 1412, z1: 209 }, count: 4 });
  agents.push({ kind: 'wander', rect: { x0: 1415, z0: 212, x1: 1440, z1: 214.5 }, count: 3 });
  for (const [x, z, f] of [[1443, 187, -Math.PI / 2], [1443, 191, -Math.PI / 2], [1437, 185.4, 0], [1440.5, 185.4, 0]] as const) agents.push({ kind: 'static', x, z, facing: f, pose: 'sit', cfg: { shades: true } });
  for (const z of [190, 196, 202]) agents.push({ kind: 'static', x: 1408.4, z, facing: -Math.PI / 2, pose: 'phone' });
  b.crowds.push({ id: 'cage', cx: 1423, cz: 198, radius: 60, agents });
  return b;
}

/** Guzape Hills: a few hillside mansions and a viewpoint, x 383..556, z 133..380. */
export function buildGuzape(world: CollisionWorld): LocationBuild {
  const b = newBuild('guzape');
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(21);
  // The hills behind (decorative).
  for (const [x, z, r, h] of [[605, 240, 58, 38], [592, 345, 50, 28], [615, 150, 48, 24]] as const) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5e8f3c, flatShading: true }));
    hill.scale.set(r, h, r * 0.9);
    hill.position.set(x, -1, z);
    hill.receiveShadow = true;
    g.add(hill);
    world.addCircle(x, z, r * 0.95, h);
  }
  sign(g, 'GUZAPE HILLS', 400, 4, 240, Math.PI / 2, 9, 1.6, { bg: '#1f5a2a', sub: 'Luxury living • Plots available' });
  for (const s of [-1, 1]) k.box(400, 0, 240 + s * 4, 0.3, 4, 0.3, 0x333333, true);
  // Mansions on plinths.
  const plots: [number, number][] = [[440, 175], [500, 175], [440, 320], [505, 315]];
  for (const [x, z] of plots) {
    k.box(x, 0, z, 34, 1.2, 30, 0xcfc4ad, 1.2);
    const c = pick(rng, [0xffffff, 0xf2ece0, 0xe8e2d6]);
    k.box(x, 1.2, z, 18, 8, 14, c, true);
    k.box(x - 3, 9.2, z, 11, 5, 11, c, true);
    k.box(x, 14.2, z, 20, 0.5, 16, 0x24476b);
    k.box(x + 6, 1.2, z + 8.5, 6, 0.3, 4, 0x2f8fc0); // pool
    for (const s of [-2, 2]) k.cyl(x + s, 1.2, z + 7.5, 0.3, 0.3, 7, 0xffffff, 10);
    k.wall(x - 17, z - 15, x + 17, z - 14.6, 2.6, 0xd9cdb5);
    k.wall(x - 17, z - 15, x - 16.6, z + 15, 2.6, 0xd9cdb5);
    k.wall(x + 16.6, z - 15, x + 17, z + 15, 2.6, 0xd9cdb5);
    for (const t of [-12, 12]) k.tree(x + t, z + 11, 1, true);
  }
  // Viewpoint deck.
  k.floor(462, 142, 478, 154, 0.05, 0x8c6a3a);
  k.box(470, 0, 141.8, 16, 1, 0.15, 0x5a3a24, 1);
  k.cyl(470, 0, 146, 0.12, 0.12, 1.3, 0x333333, 6);
  k.cyl(470, 1.3, 146.3, 0.12, 0.08, 0.6, 0x111111, 8);
  k.bench(465, 151, Math.PI);
  k.bench(475, 151, Math.PI);
  for (let i = 0; i < 10; i++) k.tree(395 + i * 16, 370 - (i % 2) * 6, 1 + (i % 3) * 0.2, i % 3 === 0);
  k.flush(g);
  b.crowds.push({
    id: 'guzape', cx: 470, cz: 250, radius: 160,
    agents: [
      { kind: 'wander', rect: { x0: 455, z0: 244, x1: 535, z1: 256 }, count: 3, cfg: { outfit: 'senator', shades: true } },
      { kind: 'static', x: 466, z: 149.5, facing: Math.PI, pose: 'phone' },
    ],
  });
  return b;
}
