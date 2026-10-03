import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import type { AgentSpec } from '../Crowd';
import { BoxField, Kit, THREE, fountain, newBuild, nightMat, sign, waterMat, type LocationBuild } from './kit';

const STONE = 0xd9d0bc;
const PAVE = 0xe2dccd;

/** Millennium Park: x 136..364, z -364..-136 (south entrance at x=250). */
export function buildPark(world: CollisionWorld): LocationBuild {
  const b = newBuild('park');
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(88);
  const X0 = 136, X1 = 364, Z0 = -364, Z1 = -136;
  const CX = 250;

  // ---------------- Ground, hedges, entrance ----------------
  k.floor(X0, Z0, X1, Z1, 0.015, 0x5fb446);
  for (let i = 0; i < 12; i++) k.floor(X0, Z0 + i * 19, X1, Z0 + i * 19 + 9.5, 0.018, 0x66bd4c);
  const hedge = 0x2f7a2a;
  k.wall(X0, Z0, X1, Z0 + 1.2, 1.3, hedge, 1.2);
  k.wall(X0, Z0, X0 + 1.2, Z1, 1.3, hedge, 1.2);
  k.wall(X1 - 1.2, Z0, X1, Z1, 1.3, hedge, 1.2);
  k.wall(X0, Z1 - 1.2, 238, Z1, 1.3, hedge, 1.2);
  k.wall(262, Z1 - 1.2, X1, Z1, 1.3, hedge, 1.2);
  for (const x of [239, 261]) {
    k.box(x, 0, Z1 - 1.5, 2.2, 6.5, 2.2, 0xf3efe6, true);
    k.cone(x, 6.5, Z1 - 1.5, 1.6, 1.4, 0x0f8a4b, 4, Math.PI / 4);
  }
  const arch = new THREE.TorusGeometry(11, 0.5, 8, 24, Math.PI).translate(CX, 5.2, Z1 - 1.5);
  k.geo(arch, 0x0f8a4b);
  sign(g, 'MILLENNIUM PARK', CX, 6.2, Z1 - 0.9, 0, 12, 1.6, { bg: '#0f8a4b', sub: "Abuja's garden of unity • Open daily" });
  sign(g, 'MILLENNIUM PARK', CX, 6.2, Z1 - 2.1, Math.PI, 12, 1.6, { bg: '#0f8a4b', sub: 'Thank you for visiting' });

  // ---------------- Paths ----------------
  k.floor(236, -172, 264, Z1, 0.04, PAVE); // entrance plaza
  k.floor(238, -340, 244, -172, 0.04, PAVE); // west avenue
  k.floor(256, -340, 262, -172, 0.04, PAVE); // east avenue
  k.disc(CX, -250, 23, 0.045, PAVE, 1, 1, 48);
  k.floor(150, -252, 350, -248, 0.04, PAVE); // cross path
  for (const [x0, z0, x1, z1] of [[148, -352, 352, -348], [148, -152, 352, -148], [148, -352, 152, -148], [348, -352, 352, -148]]) k.floor(x0, z0, x1, z1, 0.042, 0xc9b28a);

  // ---------------- Water channel, cascades, bridges ----------------
  const water = waterMat();
  const channel = (za: number, zb: number) => {
    const len = zb - za;
    const zc = (za + zb) / 2;
    k.box(245.6, 0, zc, 0.8, 0.6, len, STONE);
    k.box(254.4, 0, zc, 0.8, 0.6, len, STONE);
    k.floor(246, za, 254, zb, 0.02, 0x2a6f8f);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(8, len).rotateX(-Math.PI / 2), water);
    w.position.set(CX, 0.32, zc);
    g.add(w);
    for (let z = za + 6; z < zb - 3; z += 13) {
      k.box(CX, 0, z, 8, 0.45, 0.6, STONE);
      k.box(CX, 0.33, z + 0.45, 8, 0.05, 0.4, 0xffffff);
    }
  };
  channel(-232, -172);
  channel(-316, -268);
  // Colliders with gaps for the two bridges (z=-200, z=-295).
  for (const [za, zb] of [[-232, -201.6], [-198.4, -172], [-316, -296.6], [-293.4, -268]]) world.addBox(245.2, za, 254.8, zb, 0.6);
  for (const z of [-200, -295]) {
    k.box(CX, 0, z, 11, 0.4, 3.2, 0xbfa77e);
    for (const s of [-1, 1]) k.box(CX, 0.4, z + s * 1.55, 12, 0.7, 0.12, 0xf3efe6);
  }
  // Central fountain.
  k.cyl(CX, 0, -250, 14, 14.4, 0.75, STONE, 48, 0.75);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(13.4, 48).rotateX(-Math.PI / 2), water);
  pool.position.set(CX, 0.62, -250);
  g.add(pool);
  k.cyl(CX, 0.6, -250, 3, 3.6, 1, STONE, 24);
  k.cyl(CX, 1.6, -250, 0.7, 0.9, 3, STONE, 16);
  k.cyl(CX, 4.6, -250, 2, 1.2, 0.4, STONE, 20);
  fountain(g, b.animators, CX, -250, 5, 0, 1, 4.5);
  fountain(g, b.animators, CX, -250, 0.7, 9, 12, 2.5);
  // North pond with lily pads and an island.
  k.disc(CX, -330, 31, 0.05, STONE, 1, 15 / 31);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), water);
  pond.scale.set(30, 1, 14);
  pond.position.set(CX, 0.12, -330);
  g.add(pond);
  world.add({ kind: 'ellipse', x: CX, z: -330, rx: 29.5, rz: 13.5, h: 0.5 });
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2;
    const r = 0.3 + rng() * 0.6;
    k.disc(CX + Math.cos(a) * 26 * r, -330 + Math.sin(a) * 12 * r, 0.8, 0.15, 0x2f8a35, 1, 1, 8);
  }
  k.disc(CX + 12, -332, 4, 0.16, 0x5fb446);
  k.tree(CX + 12, -332, 1.1, true, false);

  // ---------------- Gazebos ----------------
  for (const [gx, gz] of [[180, -200], [320, -300]] as const) {
    k.cyl(gx, 0, gz, 5.2, 5.4, 0.3, STONE, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.cyl(gx + Math.cos(a) * 4.6, 0.3, gz + Math.sin(a) * 4.6, 0.18, 0.18, 3, 0xffffff, 8, 3.3);
    }
    k.cone(gx, 3.3, gz, 6, 2.6, 0x7a2e1e, 8, Math.PI / 8);
    k.cyl(gx, 0.3, gz, 2.2, 2.2, 0.45, 0x7a5534, 8, 0.75);
  }

  // ---------------- Playground ----------------
  const PG = { x0: 308, z0: -196, x1: 334, z1: -176 };
  k.floor(PG.x0, PG.z0, PG.x1, PG.z1, 0.05, 0xd9c79a);
  for (const x of [312, 319]) {
    k.rbox(x, 0, -194, 0.15, 3.2, 0.15, 0, 0xc0262d);
    k.rbox(x, 0, -190, 0.15, 3.2, 0.15, 0, 0xc0262d);
  }
  k.box(315.5, 3.1, -192, 8, 0.15, 0.15, 0xc0262d);
  world.addBox(311.8, -194.2, 319.2, -189.8, 3);
  const swings: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Group();
    s.position.set(313.5 + i * 2, 3.1, -192);
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.3, 0.04), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    rope.position.y = -1.15;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.3), new THREE.MeshLambertMaterial({ color: 0xe8a317 }));
    seat.position.y = -2.3;
    s.add(rope, seat);
    g.add(s);
    swings.push(s);
  }
  b.animators.push((t) => swings.forEach((s, i) => (s.rotation.x = Math.sin(t * 2.2 + i * 1.7) * 0.5)));
  k.box(327, 0, -191, 1.6, 2.4, 1.6, 0x2a64c9, true);
  k.geo(new THREE.BoxGeometry(4.6, 0.25, 1.2).rotateZ(-0.5).translate(329.4, 1.25, -191), 0xe8a317);
  const merry = new THREE.Group();
  merry.position.set(325, 0.3, -181);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 16), new THREE.MeshLambertMaterial({ color: 0xc0262d }));
  merry.add(disc);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshLambertMaterial({ color: 0xffe14a }));
    bar.position.set(Math.cos((i * Math.PI) / 2) * 1.6, 0.6, Math.sin((i * Math.PI) / 2) * 1.6);
    merry.add(bar);
  }
  g.add(merry);
  world.addCircle(325, -181, 2, 1);
  b.animators.push((_t, dt) => (merry.rotation.y += dt * 1.2));
  const seesaw = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 0.35), new THREE.MeshLambertMaterial({ color: 0x0f8a4b }));
  seesaw.position.set(314, 0.55, -180);
  g.add(seesaw);
  k.box(314, 0, -180, 0.3, 0.5, 0.3, 0x555555, 0.6);
  b.animators.push((t) => (seesaw.rotation.z = Math.sin(t * 1.6) * 0.22));

  // ---------------- Picnics, wedding shoot, vendors, horse ----------------
  const mats: [number, number, number][] = [[180, -300, 0xc0262d], [200, -320, 0x2a64c9], [300, -222, 0xe8a317], [168, -232, 0xd94f8c]];
  for (const [x, z, c] of mats) {
    k.floor(x - 1.8, z - 1.8, x + 1.8, z + 1.8, 0.06, c);
    for (let i = 0; i < 4; i++) k.floor(x - 1.8 + i * 0.9, z - 1.8, x - 1.6 + i * 0.9, z + 1.8, 0.065, 0xffffff);
    k.box(x, 0.06, z, 0.6, 0.4, 0.4, 0x8c5a2b);
    k.box(x + 0.8, 0.06, z - 0.6, 0.5, 0.45, 0.35, 0x2a64c9);
  }
  // Flower arch for the pre-wedding shoot.
  const flowerArch = new THREE.TorusGeometry(1.8, 0.18, 8, 16, Math.PI).rotateY(Math.PI / 2).translate(199, 0, -250);
  k.geo(flowerArch, 0xffffff);
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * Math.PI;
    k.sphere(199, Math.sin(a) * 1.8, -250 + Math.cos(a) * 1.8, 0.22, pick(rng, [0xd94f8c, 0xffffff, 0xe8a317, 0xc0262d]), 1, 6);
  }
  k.cyl(208, 0, -251.5, 0.4, 0.05, 1.5, 0xc9c9c9, 8); // reflector stand
  k.box(208, 1.5, -251.5, 1.2, 1.2, 0.05, 0xd4a62a);
  // Ice cream cart.
  k.box(268, 0.35, -152, 1.6, 1, 1, 0xffffff, 1.4);
  k.box(268, 1.35, -152, 1.6, 0.1, 1, 0x2a64c9);
  for (const s of [-1, 1]) k.cyl(268 + s * 0.6, 0, -151.4, 0.35, 0.35, 0.1, 0x111111, 10);
  k.cyl(268, 1.35, -152, 0.04, 0.04, 1.4, 0x555555, 6);
  k.cone(268, 2.75, -152, 1.3, 0.5, 0xe8a317, 8);
  sign(g, 'ICE CREAM • YOGHURT • ZOBO', 268, 1.85, -151.45, 0, 1.6, 0.35, { bg: '#2a64c9' });
  // Balloon seller's bunch.
  for (let i = 0; i < 9; i++) {
    const bxp = 232 + Math.sin(i * 2.1) * 0.6;
    const bzp = -151 + Math.cos(i * 1.7) * 0.6;
    k.cyl(232, 0, -151, 0.01, 0.01, 2.6 + (i % 3) * 0.3, 0xffffff, 3);
    k.sphere(bxp, 2.8 + (i % 3) * 0.3, bzp, 0.3, pick(rng, [0xc0262d, 0xe8a317, 0x2a64c9, 0x0f8a4b, 0xd94f8c]), 1.2, 8);
  }
  // Horse.
  const horse = new THREE.Group();
  const brown = new THREE.MeshLambertMaterial({ color: 0x6b3f1f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 2), brown);
  body.position.y = 1.3;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), brown);
  neck.position.set(0, 1.9, 0.9);
  neck.rotation.x = 0.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.7), brown);
  head.position.set(0, 2.3, 1.3);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.3), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  mane.position.set(0, 2, 0.75);
  mane.rotation.x = 0.5;
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.7), new THREE.MeshLambertMaterial({ color: 0xc0262d }));
  saddle.position.set(0, 1.75, 0);
  horse.add(body, neck, head, mane, saddle);
  for (const [x, z] of [[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.8], [0.3, -0.8]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), brown);
    leg.position.set(x, 0.47, z);
    horse.add(leg);
  }
  horse.position.set(305.5, 0, -326);
  horse.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  g.add(horse);
  world.addBox(305, -327, 306, -325, 2);
  b.animators.push((t) => {
    head.rotation.x = Math.sin(t * 0.8) * 0.15;
    horse.rotation.y = Math.sin(t * 0.2) * 0.1;
  });

  // ---------------- Trees, flowers, benches, lamps ----------------
  for (let z = -335; z < -160; z += 11) {
    if (Math.abs(z + 250) < 26) continue;
    k.tree(234, z, 0.9, z % 22 === 0);
    k.tree(266, z + 5, 0.9, z % 22 !== 0);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.2 || Math.abs(Math.cos(a)) < 0.2) continue;
    k.tree(CX + Math.cos(a) * 26, -250 + Math.sin(a) * 26, 1, true);
  }
  const clusters: [number, number][] = [[160, -170], [205, -175], [160, -270], [215, -285], [290, -175], [340, -240], [335, -330], [165, -335], [290, -270], [210, -215]];
  for (const [cx, cz] of clusters) for (let i = 0; i < 4; i++) k.tree(cx + Math.cos(i * 1.7) * 5, cz + Math.sin(i * 1.7) * 5, 0.8 + (i % 3) * 0.25, i === 3);
  const flowers = new BoxField();
  const FLW = [0xd94f8c, 0xffe14a, 0xc0262d, 0x6c2c91, 0xffffff, 0xf26b1d];
  const bed = (x0: number, z0: number, x1: number, z1: number) => {
    k.floor(x0, z0, x1, z1, 0.05, 0x5a3a24);
    world.addBox(x0, z0, x1, z1, 0.4);
    for (let x = x0 + 0.3; x < x1; x += 0.6) for (let z = z0 + 0.3; z < z1; z += 0.6) flowers.add(x, 0.05, z, 0.35, 0.3 + rng() * 0.2, 0.35, FLW[(((Math.floor(x * 1.3) + Math.floor(z * 0.7)) % FLW.length) + FLW.length) % FLW.length]);
  };
  bed(230, -170, 236, -156);
  bed(264, -170, 270, -156);
  for (const z of [-215, -285]) {
    bed(226, z - 4, 234, z + 4);
    bed(266, z - 4, 274, z + 4);
  }
  bed(196, -248, 202, -244);
  flowers.build(g);
  for (let z = -330; z <= -180; z += 25) {
    if (Math.abs(z + 250) < 30) continue;
    k.bench(236.5, z, Math.PI / 2);
    k.bench(263.5, z, Math.PI / 2);
  }
  for (const x of [190, 310]) {
    k.bench(x, -246.6, 0);
    k.bench(x, -253.4, Math.PI);
  }
  const lampMat = nightMat(0xffe0a0, 0xdddddd, 1.8);
  b.glowMats.push(lampMat);
  const lampGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 24);
  let li = 0;
  for (let z = -330; z <= -175 && li < 24; z += 22) {
    for (const x of [236.5, 263.5]) {
      if (li >= 24) break;
      k.cyl(x, 0, z + 11, 0.07, 0.1, 3.6, 0x333333, 6, 3.6);
      lamps.setMatrixAt(li++, new THREE.Matrix4().makeTranslation(x, 3.8, z + 11));
    }
  }
  lamps.count = li;
  g.add(lamps);

  k.flush(g);

  // ---------------- People ----------------
  const ring: [number, number][] = [];
  for (let i = 0; i < 16; i++) ring.push([CX + Math.cos((i / 16) * Math.PI * 2) * 18.5, -250 + Math.sin((i / 16) * Math.PI * 2) * 18.5]);
  const agents: AgentSpec[] = [
    { kind: 'loop', path: [[150, -150], [350, -150], [350, -350], [150, -350]], count: 6, speed: 3.3, cfg: { outfit: 'jersey', headwear: 'cap' } },
    { kind: 'loop', path: ring, count: 6, speed: 1.1 },
    { kind: 'wander', rect: { x0: 239, z0: -228, x1: 243, z1: -175 }, count: 3 },
    { kind: 'wander', rect: { x0: 257, z0: -228, x1: 261, z1: -175 }, count: 3, carry: 'balloon' },
    { kind: 'wander', rect: { x0: 239, z0: -315, x1: 243, z1: -272 }, count: 2 },
    { kind: 'wander', rect: { x0: 257, z0: -315, x1: 261, z1: -272 }, count: 2 },
    { kind: 'wander', rect: { x0: 240, z0: -170, x1: 262, z1: -156 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: 156, z0: -345, x1: 168, z1: -250 }, count: 3 },
    { kind: 'wander', rect: { x0: 332, z0: -290, x1: 344, z1: -205 }, count: 3 },
    { kind: 'wander', rect: { x0: 272, z0: -238, x1: 296, z1: -205 }, count: 3, carry: 'balloon' },
    { kind: 'wander', rect: { x0: 309, z0: -188, x1: 323, z1: -177 }, count: 5, scale: 0.6, speed: 1.8 },
    { kind: 'static', x: 199.2, z: -248.6, facing: Math.PI / 2, pose: 'normal', cfg: { outfit: 'asoebi', primary: 0, secondary: 0, pattern: 'plain', hair: 'gele', headwear: 'none', facialHair: 'none' } },
    { kind: 'static', x: 208.5, z: -252.3, facing: -Math.PI / 2, pose: 'normal' },
    { kind: 'static', x: 232.6, z: -151.6, facing: 0, pose: 'normal', cfg: { outfit: 'kaftan', primary: 14, headwear: 'cap' } },
  ];
  for (const [x, z] of mats) {
    agents.push({ kind: 'static', x: x - 1, z: z + 0.9, facing: Math.PI, pose: 'sit' });
    agents.push({ kind: 'static', x: x + 1, z: z + 0.9, facing: Math.PI, pose: 'sit' });
    agents.push({ kind: 'static', x: x, z: z - 1.2, facing: 0, pose: 'sit', scale: 0.7 });
  }
  for (const [x, z, f] of [[190, -246.2, Math.PI], [310, -253.8, 0], [236.2, -205, Math.PI / 2]] as const) agents.push({ kind: 'static', x, z, facing: f, pose: 'sit' });
  b.crowds.push({ id: 'park', cx: CX, cz: -250, radius: 230, agents });
  return b;
}
