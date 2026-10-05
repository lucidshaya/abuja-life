import type { CollisionWorld } from '../../core/Collision';
import { HOUSE } from '../../player/Home';
import { Kit, THREE, glow, newBuild, sign, type LocationBuild } from './kit';

/** Furniture meshes by id (hidden until bought), plus the starter foam mattress. */
export const HOUSE_MESHES: Record<string, THREE.Group> = {};

/**
 * Inside your house: living room, bedroom corner and kitchen. Starts nearly
 * empty (foam mattress, plastic chair, laptop); furniture you buy appears.
 */
export function buildHouse(world: CollisionWorld): LocationBuild {
  const b = newBuild('house');
  const g = b.group;
  const k = new Kit(world);
  const { x0, z0, x1, z1, door } = HOUSE;
  const H = 3.4;
  const WALL = 0xf4eee2;
  k.floor(x0, z0, x1, z1, 0.01, 0xd9d2c4);
  for (let x = x0; x < x1; x += 1.2) k.floor(x, z0, x + 0.04, z1, 0.015, 0xc2baa9);
  k.wall(x0 - 1, z0 - 1, x1 + 1, z0, H, WALL, 1);
  k.wall(x0 - 1, z0, x0, z1, H, WALL, 1);
  k.wall(x1, z0, x1 + 1, z1, H, WALL, 1);
  k.wall(x0 - 1, z1, door.x - 2, z1 + 1, H, WALL, 1);
  k.wall(door.x + 2, z1, x1 + 1, z1 + 1, H, WALL, 1);
  k.box(door.x, 2.4, z1 + 0.5, 4, H - 2.4, 1, WALL);
  world.addBox(door.x - 2, z1, door.x + 2, z1 + 0.4, 4); // solid door: walking into it takes you outside
  k.box(door.x, 0, z1 + 0.25, 1.6, 2.3, 0.1, 0x5a3a24);
  // Bedroom partition with a doorway.
  k.wall(x0, 250.8, 1468, 251.2, H, WALL);
  k.wall(1471.5, 250.8, 1477, 251.2, H, WALL);
  k.wall(1476.8, z0, 1477.2, 246, H, WALL);
  // Ceiling + lights.
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 2, z1 - z0 + 2).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xfbf8f2 }));
  ceil.position.set((x0 + x1) / 2, H, (z0 + z1) / 2);
  g.add(ceil);
  for (const [x, z] of [[1468, 245], [1476, 257], [1485, 245]]) glow(g, x, H - 0.08, z, 0.8, 0.06, 0.8, 0xfff4d6, 1);
  // Always there: wardrobe, kitchen counter + gas cooker, small table, plastic chair, laptop.
  k.box(1473.75, 0, 240.9, 4.5, 2.4, 1.2, 0x8c5a2b, true);
  k.box(1473.75, 1.2, 241.52, 0.05, 1, 0.02, 0x3a2418);
  k.box(1485, 0, 240.7, 7, 0.95, 1.2, 0xe8e0d0, true);
  k.box(1485, 0.95, 240.7, 7.2, 0.06, 1.3, 0x5b5f66);
  k.box(1487, 1.01, 240.6, 0.7, 0.12, 0.7, 0x222222);
  k.box(1488, 0, 260, 1.4, 0.75, 0.8, 0x7a5534, true);
  k.box(1488, 0.75, 259.95, 0.6, 0.03, 0.42, 0x2b2f33);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.36), new THREE.MeshBasicMaterial({ color: 0x8ec7ff, toneMapped: false }));
  screen.position.set(1488, 0.97, 260.15);
  screen.rotation.x = -0.25;
  screen.rotation.y = Math.PI;
  g.add(screen);
  k.box(1488, 0, 261.3, 0.5, 0.45, 0.5, 0x2a64c9); // plastic chair
  k.box(1488, 0.45, 261.55, 0.5, 0.5, 0.06, 0x2a64c9);
  sign(g, 'JUMIA • Shop furniture', 1488, 1.55, 260.45, Math.PI, 1.3, 0.3, { bg: '#f68b1e' });
  k.flush(g);

  // ---- Furniture (hidden until bought) ----
  const item = (id: string, build: (kk: Kit, gg: THREE.Group) => void) => {
    const gg = new THREE.Group();
    gg.name = 'furniture:' + id;
    const kk = new Kit(world); // colliders for these are added by the game when bought
    build(kk, gg);
    kk.flush(gg, { cast: false });
    gg.visible = false;
    g.add(gg);
    HOUSE_MESHES[id] = gg;
  };
  item('mattress', (kk) => {
    kk.box(1466, 0, 245, 3, 0.25, 5, 0xe9e1cf);
    kk.box(1466, 0.25, 243, 1.2, 0.15, 0.6, 0xffffff);
  });
  item('bed', (kk) => {
    kk.box(1466, 0, 245, 7, 0.45, 7, 0x5a3a24);
    kk.box(1466, 0.45, 245.2, 6.6, 0.35, 6.4, 0xf3efe6);
    kk.box(1466, 0.8, 246, 6.6, 0.08, 4.6, 0x7a1f3d);
    kk.box(1464.2, 0.8, 242.7, 1.6, 0.25, 0.8, 0xffffff);
    kk.box(1467.8, 0.8, 242.7, 1.6, 0.25, 0.8, 0xffffff);
    kk.box(1466, 0, 241.7, 7.2, 1.8, 0.3, 0x3a2418);
  });
  item('couch', (kk) => {
    kk.box(1462.2, 0, 256, 2.4, 0.45, 7, 0x3a2418);
    kk.box(1461.4, 0.45, 256, 0.8, 0.7, 7, 0x3a2418);
    kk.box(1462.4, 0.45, 252.9, 2, 0.4, 0.8, 0x3a2418);
    kk.box(1462.4, 0.45, 259.1, 2, 0.4, 0.8, 0x3a2418);
    for (const z of [254, 256, 258]) kk.box(1462.5, 0.45, z, 1.6, 0.18, 1.8, 0x5a3a24);
  });
  item('tv', (kk, gg) => {
    kk.box(1491.1, 0, 255.5, 1, 0.6, 6, 0x2b2f33);
    kk.box(1491.6, 1.1, 255.5, 0.1, 1.6, 2.9, 0x111111);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.45), new THREE.MeshBasicMaterial({ color: 0x2f7bd6, toneMapped: false }));
    scr.position.set(1491.53, 1.9, 255.5);
    scr.rotation.y = -Math.PI / 2;
    gg.add(scr);
  });
  item('ps5', (kk) => {
    kk.box(1491.1, 0.6, 253.6, 0.5, 0.45, 0.2, 0xf5f5f5);
    kk.box(1489.5, 0.5, 255.5, 0.3, 0.06, 0.2, 0xffffff);
  });
  item('fridge', (kk) => {
    kk.box(1490.5, 0, 241.75, 2.2, 2.1, 2.3, 0xd7dadf);
    kk.box(1489.38, 0.4, 241.2, 0.05, 1.4, 0.05, 0x777777);
    kk.box(1489.38, 0.4, 242.3, 0.05, 1.4, 0.05, 0x777777);
  });
  item('table', (kk) => {
    kk.box(1484.5, 0.75, 247, 4.2, 0.08, 2.8, 0x7a5534);
    for (const [x, z] of [[1482.7, 245.9], [1486.3, 245.9], [1482.7, 248.1], [1486.3, 248.1]]) kk.box(x, 0, z, 0.12, 0.75, 0.12, 0x5a3a24);
    for (const x of [1483.2, 1485.8]) for (const z of [244.9, 249.1]) kk.box(x, 0, z, 0.5, 0.48, 0.5, 0x8c5a2b);
    kk.box(1484.5, 0.83, 247, 0.8, 0.2, 0.8, 0xe8a317);
  });
  item('rug', (kk) => {
    kk.floor(1468, 253, 1482, 260.5, 0.03, 0x8c1f2b);
    kk.floor(1468.8, 253.8, 1481.2, 259.7, 0.035, 0xb5403a);
  });
  item('plants', (kk) => {
    for (const [x, z] of [[1478, 262.8], [1461, 250], [1491, 250], [1474, 263]]) {
      kk.cyl(x, 0, z, 0.35, 0.28, 0.5, 0xb36b3a, 10);
      kk.sphere(x, 1.0, z, 0.55, 0x2f7a2a, 1.2, 8);
    }
  });
  item('art', (kk, gg) => {
    kk.box(1476, 1.2, 251.32, 2.6, 1.6, 0.06, 0xd4a62a);
    sign(gg, 'ME IN AGBADA', 1476, 2, 251.4, 0, 2.3, 1.3, { bg: '#0f6b3a', fg: '#ffd76a', sub: 'Odogwu • Abuja' });
    kk.box(1460.06, 1.2, 247, 0.06, 1.2, 2, 0x2a64c9);
  });
  item('shelf', (kk) => {
    kk.box(1479, 0, 251.35, 3, 2.2, 0.5, 0x6b4a2b);
    for (const y of [0.5, 1.1, 1.7]) for (let i = 0; i < 6; i++) kk.box(1477.8 + i * 0.45, y, 251.4, 0.3, 0.45, 0.35, [0xc0262d, 0x123e7c, 0xe8a317, 0x0f8a4b][i % 4]);
  });
  item('ac', (kk) => {
    kk.box(1476, 2.6, 263.6, 2.2, 0.6, 0.35, 0xf5f5f5);
    kk.box(1466, 2.6, 240.25, 2.2, 0.6, 0.35, 0xf5f5f5);
  });
  item('gen', (kk) => {
    kk.box(1490.5, 0, 262.3, 1.6, 1, 1.6, 0xc0262d);
    kk.box(1490.5, 1, 262.3, 1, 0.15, 0.6, 0x222222);
  });
  item('chandelier', (kk, gg) => {
    kk.cyl(1476, H - 0.9, 257, 0.9, 0.4, 0.7, 0xd4a62a, 10);
    glow(gg, 1476, H - 1.2, 257, 0.9, 0.3, 0.9, 0xfff2c8, 1.4);
  });
  item('solar', (kk, gg) => {
    kk.box(1461, 0, 262.5, 1, 1.8, 1.6, 0x2b2f33);
    glow(gg, 1461.52, 1.2, 262.5, 0.02, 0.15, 0.4, 0x59e28f, 1);
  });
  HOUSE_MESHES.mattress.visible = true;
  return b;
}
