import type { CollisionWorld } from '../../core/Collision';
import { mulberry32, pick } from '../../core/rng';
import { carModelGeometry, type CarModel } from '../../player/Vehicle';
import type { AgentSpec } from '../Crowd';
import { BoxField, Kit, THREE, fountain, glow, newBuild, nightMat, sign, waterMat, type LocationBuild } from './kit';

/**
 * Jabi Lake Mall interior: x 1400..1540, z -60..40, ceiling at 9 m.
 *   South: entrance + security. Centre: fountain atrium. West: walk-in shops
 *   (cinema, phones, fashion, books, pharmacy) with a gallery above.
 *   North-west: food court. East: ShopRight supermarket. South-east: kids zone.
 */
export function buildMall(world: CollisionWorld): LocationBuild {
  const b = newBuild('mall');
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(31);
  const X0 = 1400, X1 = 1540, Z0 = -60, Z1 = 40, H = 9;
  const WALL = 0xd9d3c7;

  // ---------------- Shell ----------------
  k.floor(X0, Z0, X1, Z1, 0.01, 0xe9e4da);
  k.disc(1450, -2, 15, 0.02, 0xcfc6b4);
  k.disc(1450, -2, 12.5, 0.03, 0xe9e4da);
  k.wall(X0 - 1, Z0 - 1, X1 + 1, Z0, H, WALL, 1);
  k.wall(X0 - 1, Z0, X0, Z1, H, WALL, 1);
  k.wall(X1, Z0, X1 + 1, Z1, H, WALL, 1);
  k.wall(X0 - 1, Z1, 1464, Z1 + 1, H, WALL, 1);
  k.wall(1476, Z1, X1 + 1, Z1 + 1, H, WALL, 1);
  k.box(1470, 4, Z1 + 0.5, 12, H - 4, 1, WALL);
  // Glass entrance doors (you walk through the gap) + mat.
  for (const x of [1465.2, 1474.8]) k.box(x, 0, Z1 + 0.2, 0.3, 4, 0.3, 0x8a9096);
  // Glass doors: solid (walking into them takes you outside).
  world.addBox(1464, Z1, 1476, Z1 + 0.4, 4);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.8, 0.08), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.55, toneMapped: false }));
  doorGlass.position.set(1470, 1.9, Z1 + 0.2);
  g.add(doorGlass);
  sign(g, 'EXIT \u2192 CAR PARK', 1470, 4.4, Z1 - 0.2, Math.PI, 4, 0.6, { bg: '#0f8a4b' });
  k.floor(1465, 34, 1475, 39.5, 0.02, 0x3b3f44);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 2, Z1 - Z0 + 2).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2efe8 }));
  ceiling.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2);
  g.add(ceiling);
  // Skylight over the atrium and ceiling light panels.
  glow(g, 1450, H - 0.15, -2, 30, 0.1, 30, 0xeaf6ff, 1);
  for (let x = 1410; x < 1540; x += 14) for (let z = -52; z < 36; z += 14) if (Math.abs(x - 1450) > 16 || Math.abs(z + 2) > 16) glow(g, x, H - 0.12, z, 3.5, 0.08, 1.2, 0xfff8e6, 0.95);

  // ---------------- Security foyer ----------------
  k.box(1467.2, 0, 32.5, 0.35, 2.4, 0.6, 0x9aa1a8, true);
  k.box(1472.8, 0, 32.5, 0.35, 2.4, 0.6, 0x9aa1a8, true);
  k.box(1470, 2.4, 32.5, 6, 0.35, 0.6, 0x9aa1a8);
  glow(g, 1470, 2.25, 32.8, 1.2, 0.12, 0.05, 0x59e28f);
  k.box(1481, 0, 32, 1.4, 1.1, 0.8, 0x4a4f55, true); // guard podium
  sign(g, 'WELCOME TO JABI LAKE MALL', 1470, 7, 39.4, Math.PI, 14, 1.4, { bg: '#0f4f2a', sub: 'Shop • Eat • Chill • Watch' });

  // ---------------- Atrium ----------------
  k.cyl(1450, 0, -2, 8.6, 8.8, 0.7, 0xcfc6b4, 40, 0.7);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(8, 40).rotateX(-Math.PI / 2), waterMat());
  pool.position.set(1450, 0.62, -2);
  g.add(pool);
  k.cyl(1450, 0.6, -2, 1.6, 2, 1, 0xd9d0bc, 24);
  k.cyl(1450, 1.6, -2, 0.5, 0.5, 2, 0xd9d0bc, 16);
  fountain(g, b.animators, 1450, -2, 2.2, 0, 1, 3.4);
  fountain(g, b.animators, 1450, -2, 0.7, 5.5, 8, 1.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = 1450 + Math.cos(a) * 11.5;
    const z = -2 + Math.sin(a) * 11.5;
    if (i % 2 === 0) k.bench(x, z, Math.abs(Math.cos(a)) > 0.7 ? Math.PI / 2 : 0, 0x6b4a2b);
    else {
      k.cyl(x, 0, z, 0.7, 0.55, 0.9, 0xbfae92, 12, 1);
      k.tree(x, z, 0.55, true, false);
    }
  }
  // Information kiosk + hanging banners.
  k.box(1462, 0, 16, 3, 1.1, 1.6, 0x0f4f2a, true);
  sign(g, 'INFO', 1462, 1.9, 16.81, 0, 1.6, 0.5, { bg: '#0f8a4b' });
  for (const [x, z, t, bg] of [[1440, -16, 'MEGA SALE • 30% OFF', '#c0262d'], [1460, 12, 'SALLAH SPECIALS', '#0f8a4b'], [1438, 12, 'NEW: FOOD COURT', '#e8a317']] as const) {
    sign(g, t, x, 6.5, z, 0, 6, 1.6, { bg });
    k.box(x - 2.8, 7.3, z, 0.04, 1.7, 0.04, 0x888888);
    k.box(x + 2.8, 7.3, z, 0.04, 1.7, 0.04, 0x888888);
  }

  // ---------------- West shops ----------------
  const units: [string, string, string][] = [
    ['ABUJA DRIP', '#111111', 'fashion'],
    ['LAKESIDE CINEMAS', '#6c2c91', 'cinema'],
    ['GADGET PALACE', '#123e7c', 'phones'],
    ['PAGES BOOKSHOP', '#8c5a2b', 'books'],
    ['GLOW PHARMACY', '#0f8a4b', 'pharmacy'],
  ];
  const props = new BoxField();
  const unitLen = 12.8;
  const SX = 1416; // shop front line
  units.forEach(([name, bg, kind], i) => {
    const za = -30 + i * unitLen;
    const zb = za + unitLen;
    const zc = (za + zb) / 2;
    // Divider walls and glass front with a 3 m door.
    k.wall(X0, za - 0.15, SX, za + 0.15, 4.8, 0xcfc8bb, 0.3);
    k.box(SX, 0, za + (zc - 1.5 - za) / 2, 0.2, 3.6, zc - 1.5 - za, 0x9fc3d6, true);
    k.box(SX, 0, zb - (zb - zc - 1.5) / 2, 0.2, 3.6, zb - zc - 1.5, 0x9fc3d6, true);
    k.box(SX, 3.6, zc, 0.4, 1.2, unitLen, 0x2b2f33);
    sign(g, name, SX + 0.25, 4.2, zc, Math.PI / 2, 8, 1, { bg });
    k.floor(X0, za, SX, zb, 0.03, kind === 'cinema' ? 0x3a1d4a : 0xf3efe8);
    glow(g, (X0 + SX) / 2, 4.6, zc, 10, 0.08, 1, 0xffffff, 0.9);
    if (kind === 'fashion') {
      for (let m = 0; m < 4; m++) {
        const x = 1404 + m * 2.8;
        k.cyl(x, 0, za + 2.5, 0.25, 0.3, 0.1, 0x222222);
        k.cyl(x, 0.1, za + 2.5, 0.05, 0.05, 1.0, 0x999999);
        k.box(x, 1.1, za + 2.5, 0.5, 0.7, 0.3, pick(rng, [0xc0262d, 0x0f8a4b, 0xe8a317, 0x6c2c91]), 1.8);
        k.sphere(x, 1.95, za + 2.5, 0.14, 0xe0d6c8);
      }
      for (let r = 0; r < 2; r++) {
        k.box(1406 + r * 5, 0, zc + 2, 3.5, 1.6, 0.1, 0x777777, true);
        for (let c = 0; c < 9; c++) props.add(1404.6 + r * 5 + c * 0.35, 0.5, zc + 2, 0.08, 1.0, 0.5, pick(rng, [0xffffff, 0x111111, 0xc0262d, 0x2a64c9, 0xe8a317, 0x0f8a4b]));
      }
      k.box(1405, 0, zb - 1.5, 3, 1.1, 1, 0x1a1a1a, true); // till
    } else if (kind === 'cinema') {
      k.box(1404, 0, zc, 2, 1.2, 6, 0x6c2c91, true);
      glow(g, 1404, 1.2, zc, 2.05, 0.1, 6.05, 0xffd23a, 0.7);
      for (let p = 0; p < 3; p++) {
        sign(g, ['WAHALA IN WUSE', 'FAST 15', 'AREA 1 DRIFT'][p], X0 + 0.55, 2.4, za + 2.5 + p * 3.8, Math.PI / 2, 2.2, 3, { bg: ['#c0262d', '#111111', '#e8a317'][p], sub: 'NOW SHOWING' });
      }
      k.box(1411, 0, zb - 2.2, 1.6, 2.4, 1.6, 0xd4a62a, true); // popcorn stand
      glow(g, 1411, 2.4, zb - 2.2, 1.5, 0.6, 1.5, 0xfff1c4, 0.8);
    } else if (kind === 'phones') {
      for (let t = 0; t < 3; t++) {
        k.box(1405 + t * 3.5, 0, zc - 1, 2.6, 0.95, 1.2, 0xf2f2f2, true);
        for (let p = 0; p < 5; p++) props.add(1404 + t * 3.5 + p * 0.45, 0.97, zc - 1, 0.25, 0.04, 0.5, 0x111111);
      }
      glow(g, X0 + 0.55, 1.4, zc, 0.1, 2.4, 9, 0x2a64c9, 0.6);
      sign(g, 'ORIGINAL • UK-USED • WARRANTY', X0 + 0.6, 3.1, zc, Math.PI / 2, 8, 0.8, { bg: '#123e7c' });
    } else if (kind === 'books') {
      for (let s = 0; s < 3; s++) {
        k.box(1403 + s * 4.5, 0, za + 1.5, 3.4, 2.4, 0.6, 0x6b4a2b, true);
        for (let row = 0; row < 4; row++) for (let c = 0; c < 10; c++) props.add(1401.6 + s * 4.5 + c * 0.3, 0.2 + row * 0.55, za + 1.85, 0.22, 0.4, 0.05, pick(rng, [0xc0262d, 0x2a64c9, 0x0f8a4b, 0xe8a317, 0x6c2c91, 0xffffff]));
      }
      k.box(1408, 0, zc + 2, 3, 0.8, 1.6, 0x8c5a2b, true);
    } else {
      for (let s = 0; s < 2; s++) {
        k.box(1405 + s * 6, 0, za + 1.3, 4.6, 2.2, 0.6, 0xf5f5f5, true);
        for (let row = 0; row < 4; row++) for (let c = 0; c < 14; c++) props.add(1403 + s * 6 + c * 0.3, 0.25 + row * 0.5, za + 1.65, 0.18, 0.25, 0.1, pick(rng, [0xffffff, 0x0f8a4b, 0x2a64c9, 0xd94f8c]));
      }
      k.box(1407, 0, zb - 1.6, 4, 1.1, 1, 0xffffff, true);
      glow(g, 1407, 3.2, zb - 0.5, 1.2, 1.2, 0.1, 0x18c45a, 1);
    }
  });
  // Gallery level above the shops with a glass rail and upper shop signs.
  k.box(1408.5, 4.8, 2, 17, 0.35, 64, 0xe3ddd0);
  k.box(1417.2, 5.15, 2, 0.12, 1.1, 64, 0xa9cbe0);
  for (const [z, t, bg] of [[-20, 'KIDDIES WORLD', '#d94f8c'], [-2, 'GOLD & GLAM', '#d4a62a'], [16, 'HAIR PALACE', '#c0262d']] as const) sign(g, t, X0 + 0.55, 6.8, z, Math.PI / 2, 7, 1, { bg });
  // Escalator up to the gallery.
  const esc = new THREE.BoxGeometry(13, 0.5, 2).rotateZ(0.36).translate(1424.5, 2.4, -27);
  k.geo(esc, 0x9aa1a8);
  k.box(1424.5, 0, -28.1, 13, 1, 0.12, 0x2b2f33);
  k.box(1424.5, 0, -25.9, 13, 1, 0.12, 0x2b2f33);
  world.addBox(1418, -28.2, 1431, -25.8, 5);

  // ---------------- Food court (NW) ----------------
  const vendors: [string, string, number][] = [['JOLLOF JUNCTION', '#c0262d', 1412], ['CHICKEN KINGDOM', '#e8a317', 1431], ['SHAWARMA SPOT', '#0f8a4b', 1450]];
  for (const [name, bg, x] of vendors) {
    k.box(x, 0, Z0 + 3, 14, 1.1, 1.4, 0x3b3f44, true);
    k.box(x, 1.1, Z0 + 3, 14, 0.08, 1.5, 0xd9d0bc);
    k.box(x, 0, Z0 + 0.6, 14, 4.5, 0.4, 0x2b2f33);
    glow(g, x, 3.0, Z0 + 0.85, 12, 1.4, 0.05, 0xfff1c4, 0.85);
    sign(g, name, x, 4.3, Z0 + 0.9, 0, 10, 1.2, { bg });
    for (let p = 0; p < 4; p++) props.add(x - 5 + p * 3.2, 1.18, Z0 + 3, 1.2, 0.25, 0.8, pick(rng, [0xe8a317, 0xc0262d, 0xf26b1d]));
  }
  k.floor(X0, Z0, 1460, -34, 0.025, 0xd8cfbf);
  const tables: [number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) tables.push([1407 + c * 8.5, -50 + r * 5.5]);
  for (const [x, z] of tables) {
    k.cyl(x, 0, z, 0.9, 0.9, 0.06, 0xffffff, 16);
    k.box(x, 0.72, z, 1.8, 0.06, 1.8, 0xffffff);
    k.cyl(x, 0, z, 0.08, 0.08, 0.72, 0x777777, 6);
    for (const s of [-1, 1]) k.box(x + s * 1.35, 0, z, 0.5, 0.45, 0.5, s > 0 ? 0xc0262d : 0xe8a317);
    world.addBox(x - 1.6, z - 0.9, x + 1.6, z + 0.9, 0.8);
  }

  // ---------------- ShopRight supermarket (east) ----------------
  const SR = { x0: 1480, x1: X1, z0: Z0, z1: 20 };
  k.floor(SR.x0, SR.z0, SR.x1, SR.z1, 0.03, 0xf7f7f4);
  k.wall(SR.x0 - 0.3, SR.z0, SR.x0, -12, H, 0xffffff, 0.3);
  k.wall(SR.x0 - 0.3, 2, SR.x0, SR.z1, H, 0xffffff, 0.3);
  k.wall(SR.x0, SR.z1, SR.x1, SR.z1 + 0.3, H, 0xffffff, 0.3);
  k.box(SR.x0 - 0.15, 4.5, -5, 0.4, H - 4.5, 14, 0xc0262d);
  sign(g, 'ShopRight', SR.x0 - 0.4, 6.4, -5, -Math.PI / 2, 12, 2.4, { bg: '#c0262d', fg: '#ffffff', sub: 'Better and better • Abuja prices' });
  sign(g, 'ShopRight', SR.x0 + 0.2, 6.4, -5, Math.PI / 2, 12, 2.4, { bg: '#c0262d', sub: 'Thank you for shopping!' });
  // Checkouts
  for (const z of [-18, -26, -34, -42]) {
    k.box(1489, 0, z, 1.1, 0.9, 4.2, 0x2b2f33, true);
    k.box(1489, 0.9, z + 0.4, 1, 0.05, 3, 0x111111);
    k.box(1489, 0.9, z - 1.6, 0.6, 0.45, 0.5, 0xdddddd);
    glow(g, 1489, 1.35, z - 1.6, 0.4, 0.28, 0.04, 0x59e28f, 0.9);
    k.cyl(1489, 0, z - 2.4, 0.06, 0.06, 2.6, 0x777777);
    sign(g, String(1 + (-18 - z) / 8), 1489, 2.85, z - 2.4, Math.PI / 2, 0.7, 0.7, { bg: '#c0262d' });
  }
  // Aisles: two shelf runs per row with a cross aisle.
  const PRODUCT = [0xc0262d, 0xe8a317, 0x2a64c9, 0x0f8a4b, 0xffffff, 0xf26b1d, 0x6c2c91, 0x111111, 0xd94f8c, 0x8c5a2b, 0xffe14a];
  const aisleNames = ['RICE • PASTA • INDOMIE', 'DRINKS • JUICE • MALT', 'SNACKS • BISCUITS', 'TOILETRIES • SOAP', 'PROVISIONS • TIN FOOD'];
  [1500, 1507, 1514, 1521, 1528].forEach((sx, row) => {
    for (const [za, zb] of [[-48, -24], [-20, 4]]) {
      const len = zb - za;
      const zc = (za + zb) / 2;
      k.box(sx, 0, zc, 1.6, 0.15, len, 0x3b3f44, true);
      k.box(sx, 0.15, zc, 0.15, 2.4, len, 0xdcdcdc, 2.6);
      for (let lvl = 0; lvl < 4; lvl++) {
        k.box(sx, 0.2 + lvl * 0.6, zc, 1.6, 0.05, len, 0xc9c9c9);
        for (let side = -1; side <= 1; side += 2) {
          let z = za + 0.3;
          while (z < zb - 0.3) {
            const w = 0.25 + rng() * 0.35;
            const hgt = 0.2 + rng() * 0.3;
            const c = PRODUCT[(((row * 3 + lvl + Math.floor(z)) % PRODUCT.length) + PRODUCT.length) % PRODUCT.length];
            props.add(sx + side * 0.5, 0.25 + lvl * 0.6, z + w / 2, 0.5, hgt, w * 0.9, rng() < 0.15 ? pick(rng, PRODUCT) : c);
            z += w + 0.03;
          }
        }
      }
    }
    const ax = sx + 3.5;
    if (row < 5) sign(g, aisleNames[row], ax, 4.2, -22, 0, 5.5, 0.7, { bg: '#c0262d' });
  });
  // Fridges along the back wall.
  k.box(SR.x1 - 0.9, 0, -20, 1.6, 2.6, 72, 0xe8e8e8, true);
  glow(g, SR.x1 - 1.72, 0.25, -20, 0.04, 2.1, 71, 0xdff3ff, 0.9);
  for (let z = -55; z < 15; z += 0.45) for (let lvl = 0; lvl < 4; lvl++) props.add(SR.x1 - 1.4, 0.3 + lvl * 0.5, z, 0.25, 0.35, 0.18, pick(rng, [0xc0262d, 0x0f8a4b, 0x2a64c9, 0xe8a317, 0x111111, 0xf26b1d]));
  sign(g, 'COLD DRINKS • DAIRY • FROZEN', SR.x1 - 1.8, 3.6, -20, -Math.PI / 2, 14, 0.9, { bg: '#123e7c' });
  // Fresh produce tables along the north wall.
  for (let i = 0; i < 5; i++) {
    const x = 1495 + i * 8;
    k.box(x, 0, -56, 6, 0.85, 3, 0x7a5534, true);
    const col = [0xd8261d, 0x2f8f2a, 0xf28a1a, 0xe8d23a, 0x7a4a26][i];
    for (let f = 0; f < 40; f++) k.sphere(x - 2.6 + (f % 10) * 0.58, 0.95 + Math.floor(f / 20) * 0.12, -57.2 + (Math.floor(f / 10) % 2) * 1.2 + (f % 3) * 0.3, i === 4 ? 0.16 : 0.13, col, i === 4 ? 1.6 : 1, 6);
  }
  sign(g, 'FRESH PRODUCE • TOMATOES • PEPPER • YAM', 1511, 4.4, SR.z0 + 0.6, 0, 16, 0.9, { bg: '#0f8a4b' });
  // Bottled water pallets.
  const bottles = new BoxField();
  for (let p = 0; p < 6; p++) {
    const x = 1496 + p * 6.5;
    k.box(x, 0, 14, 4.6, 0.15, 7, 0x8c6a3a, true);
    for (let lx = 0; lx < 5; lx++) for (let lz = 0; lz < 7; lz++) for (let ly = 0; ly < 3 + (p % 3); ly++) bottles.add(x - 1.8 + lx * 0.9, 0.15 + ly * 0.42, 11 + lz * 0.95, 0.8, 0.4, 0.85, ly % 2 ? 0x5fb4e8 : 0x8fd0f2);
  }
  world.addBox(1493, 10.3, 1533, 17.7, 2);
  sign(g, 'TABLE WATER • 75cl x 12', 1512, 3.6, 18.6, Math.PI, 8, 0.9, { bg: '#2a64c9' });
  bottles.build(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0));
  // Trolley bay.
  for (let t = 0; t < 6; t++) {
    k.box(1484, 0.5, 6 + t * 0.6, 0.6, 0.5, 0.9, 0x9aa3ad);
    k.box(1484, 1, 5.6 + t * 0.6, 0.6, 0.05, 0.05, 0xc0262d);
  }
  world.addBox(1483.5, 5, 1484.5, 10, 1.2);

  // ---------------- Kids zone + ATMs (SE) ----------------
  k.floor(1480, 21, X1, Z1, 0.03, 0x2a64c9);
  for (let i = 0; i < 12; i++) k.box(1490 + (i % 6) * 6, 0, 26 + Math.floor(i / 6) * 6, 1.4, 0.6 + (i % 3) * 0.4, 1.4, pick(rng, [0xc0262d, 0xe8a317, 0x0f8a4b, 0xd94f8c]), true);
  const slide = new THREE.BoxGeometry(6, 0.3, 1.4).rotateZ(-0.45).translate(1522, 1.4, 31);
  k.geo(slide, 0xe8a317);
  k.box(1519, 0, 31, 1.6, 2.6, 1.6, 0xc0262d, true);
  sign(g, 'KIDDIES PLAY ZONE', 1510, 4, 20.6, 0, 8, 1, { bg: '#d94f8c' });
  for (let a = 0; a < 3; a++) {
    k.box(1536 + 0, 0, 24 + a * 3, 1.2, 2, 1, 0x3b3f44, true);
    glow(g, 1535.35, 1.2, 24 + a * 3, 0.05, 0.4, 0.6, 0x59a8ff);
  }
  sign(g, 'ATM', 1537, 2.6, 30, -Math.PI / 2, 2, 0.7, { bg: '#123e7c' });

  props.build(g);
  k.flush(g, { cast: false });

  // ---------------- People ----------------
  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: 1422, z0: -24, x1: 1436, z1: 24 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: 1464, z0: -24, x1: 1477, z1: 24 }, count: 4, carry: 'bag' },
    { kind: 'wander', rect: { x0: 1438, z0: -24, x1: 1462, z1: -16 }, count: 3 },
    { kind: 'wander', rect: { x0: 1438, z0: 12, x1: 1460, z1: 28 }, count: 3, carry: 'bag' },
    { kind: 'wander', rect: { x0: 1400.8, z0: -33, x1: 1458, z1: -31.5 }, count: 2 },
    { kind: 'wander', rect: { x0: 1494, z0: 4.8, x1: 1534, z1: 8.6 }, count: 2, carry: 'trolley', speed: 0.9 },
    { kind: 'wander', rect: { x0: 1494, z0: -53, x1: 1534, z1: -49.5 }, count: 2, carry: 'trolley', speed: 0.9 },
    { kind: 'wander', rect: { x0: 1494, z0: -23, x1: 1534, z1: -21 }, count: 2, carry: 'trolley', speed: 0.9 },
    { kind: 'wander', rect: { x0: 1482, z0: 23, x1: 1530, z1: 38 }, count: 4, scale: 0.6, carry: 'balloon', speed: 1.5 },
  ];
  for (const ax of [1503.5, 1510.5, 1517.5, 1524.5]) agents.push({ kind: 'wander', rect: { x0: ax - 1, z0: -46, x1: ax + 1, z1: 2 }, count: 1, carry: 'trolley', speed: 0.8 });
  units.forEach((_, i) => agents.push({ kind: 'wander', rect: { x0: 1401.5, z0: -28 + i * unitLen, x1: 1414.5, z1: -28 + i * unitLen + 2 }, count: 1 }));
  tables.forEach(([x, z], i) => {
    if (i % 3 === 1) return;
    agents.push({ kind: 'static', x: x + 1.35, z, facing: -Math.PI / 2, pose: 'sit' });
    if (i % 2 === 0) agents.push({ kind: 'static', x: x - 1.35, z, facing: Math.PI / 2, pose: 'sit' });
  });
  for (const z of [-26, -34]) agents.push({ kind: 'static', x: 1486.5, z, facing: Math.PI / 2, pose: 'phone' });
  for (const z of [-26, -34, -42]) agents.push({ kind: 'static', x: 1490.6, z, facing: -Math.PI / 2, pose: 'normal', cfg: { outfit: 'jersey', primary: 7, headwear: 'none' } });
  b.crowds.push({ id: 'mall', cx: 1470, cz: -10, radius: 140, agents });
  buildMallExterior(world, b);
  return b;
}

/**
 * Outside Jabi Lake Mall (in the city, by the lake): two-storey mall with the
 * triple-height "tree" atrium entrance facing the car park, a ShopRight anchor,
 * and a lakeside boardwalk with restaurant terraces.
 *   Mall: x -240..-160, z -108..-78. Car park: x -152..-135, z -114..-50.
 */
function buildMallExterior(world: CollisionWorld, b: LocationBuild): void {
  const g = b.group;
  const k = new Kit(world);
  const rng = mulberry32(404);
  const X0 = -240, X1 = -160, Z0 = -108, Z1 = -78, H = 15;
  const CREAM = 0xe9e4da;
  const GREEN = 0x0f4f2a;
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x5f93b8, shininess: 110, specular: 0xbfdfff });

  // ---- Building body: two storeys, floor band, parapet ----
  k.box((X0 + X1) / 2, 0, (Z0 + Z1) / 2, X1 - X0, H, Z1 - Z0, CREAM, true);
  k.box((X0 + X1) / 2, 7.2, (Z0 + Z1) / 2, X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, 0xbfb6a4);
  k.box((X0 + X1) / 2, H, (Z0 + Z1) / 2, X1 - X0 + 0.8, 0.9, Z1 - Z0 + 0.8, GREEN);
  for (let i = 0; i < 6; i++) k.box(X0 + 8 + i * 13, H + 0.9, (Z0 + Z1) / 2 + (i % 2 ? 6 : -6), 4, 1.6, 3, 0xa9adb2); // rooftop AC
  // Glass curtain walls on the lake side and the car park side.
  const glassFace = (x: number, z: number, w: number, d: number, y: number, hgt: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), glassMat);
    m.position.set(x, y + hgt / 2, z);
    g.add(m);
  };
  glassFace((X0 + X1) / 2, Z1 + 0.15, X1 - X0 - 4, 0.2, 0.4, 5.8);
  glassFace((X0 + X1) / 2, Z1 + 0.15, X1 - X0 - 4, 0.2, 8.2, 5.6);
  for (let x = X0 + 2; x <= X1 - 2; x += 2.5) k.box(x, 8, Z1 + 0.45, 0.18, 6.2, 0.6, 0xd9d3c7); // sun fins
  glassFace(X1 + 0.15, -82, 0.2, 6, 0.4, 13.4);
  glassFace(X0 - 0.15, -93, 0.2, 24, 8.2, 5.6);

  // ---- The "tree" atrium main entrance (faces the car park) ----
  const AX0 = -164, AX1 = -154, AZ0 = -101, AZ1 = -85, AH = 21;
  const atriumGlass = new THREE.MeshPhongMaterial({ color: 0x9ccbe8, transparent: true, opacity: 0.32, shininess: 120, specular: 0xffffff, depthWrite: false, side: THREE.DoubleSide });
  const atrium = new THREE.Mesh(new THREE.BoxGeometry(AX1 - AX0, AH, AZ1 - AZ0), atriumGlass);
  atrium.position.set((AX0 + AX1) / 2, AH / 2, (AZ0 + AZ1) / 2);
  atrium.renderOrder = 2;
  g.add(atrium);
  world.addBox(AX0, AZ0, AX1, AZ1, AH);
  for (const [x, z] of [[AX0, AZ0], [AX1, AZ0], [AX0, AZ1], [AX1, AZ1]]) k.box(x, 0, z, 0.5, AH, 0.5, 0x2b2f33);
  for (let y = 7; y < AH; y += 7) {
    k.box(AX1, y, (AZ0 + AZ1) / 2, 0.3, 0.3, AZ1 - AZ0, 0x2b2f33);
    k.box((AX0 + AX1) / 2, y, AZ0, AX1 - AX0, 0.3, 0.3, 0x2b2f33);
    k.box((AX0 + AX1) / 2, y, AZ1, AX1 - AX0, 0.3, 0.3, 0x2b2f33);
  }
  k.box((AX0 + AX1) / 2, AH, (AZ0 + AZ1) / 2, AX1 - AX0 + 1, 0.6, AZ1 - AZ0 + 1, GREEN);
  // The sculptural tree inside the atrium.
  const tx = (AX0 + AX1) / 2, tz = (AZ0 + AZ1) / 2;
  k.cyl(tx, 0, tz, 0.7, 1.1, 11, 0xf3efe6, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.geo(new THREE.CylinderGeometry(0.18, 0.35, 5, 6).translate(0, 2.5, 0).rotateZ(0.7).rotateY(a).translate(tx, 9.5, tz), 0xf3efe6);
    k.sphere(tx + Math.cos(a) * 3.2, 14.2 + (i % 2), tz + Math.sin(a) * 3.2, 2.2, i % 2 ? 0x2f8f3a : 0x4caf50, 0.55, 8);
  }
  k.sphere(tx, 15.6, tz, 2.6, 0x3f9f45, 0.6, 10);
  k.cyl(tx, 0, tz, 2.6, 2.8, 0.6, 0xbfb6a4, 16);
  // Entrance canopy, doors and the big sign.
  k.box(AX1 + 2.5, 4.4, tz, 5, 0.4, 12, GREEN);
  for (const z of [tz - 5.6, tz + 5.6]) k.cyl(AX1 + 4.6, 0, z, 0.18, 0.18, 4.4, 0xdddddd, 8, 4.4);
  glow(g, AX1 + 0.1, 0, tz, 0.08, 3.6, 6, 0xcfeaff, 0.85);
  sign(g, 'JABI LAKE MALL', AX1 + 0.3, 17.5, tz, Math.PI / 2, 14, 2.4, { bg: '#ffffff', fg: '#0f4f2a', sub: 'Shop • Dine • Relax by the lake' });
  sign(g, 'ENTRANCE', AX1 + 4.85, 4.9, tz, Math.PI / 2, 4, 0.7, { bg: '#0f4f2a' });
  // ---- ShopRight anchor (north end of the car-park facade) ----
  k.box(X1 + 0.3, 0, -104.5, 0.6, H + 1.2, 7, 0xc0262d);
  sign(g, 'ShopRight', X1 + 0.7, 11.5, -104.5, Math.PI / 2, 6.6, 2.2, { bg: '#c0262d', sub: 'Better & better' });
  glow(g, X1 + 0.7, 0, -104.5, 0.06, 3.2, 4, 0xcfeaff, 0.8);
  for (let t = 0; t < 7; t++) {
    k.box(-156.5, 0.5, -107 + t * 0.6, 0.6, 0.5, 0.9, 0x9aa3ad);
    k.box(-156.5, 1, -107.4 + t * 0.6, 0.6, 0.05, 0.05, 0xc0262d);
  }
  world.addBox(-157, -107.5, -156, -103, 1.2);
  // Cinema panel on the south-east corner.
  k.box(X1 + 0.3, 8, -81.5, 0.6, 6.5, 6, 0x6c2c91);
  sign(g, 'LAKESIDE CINEMAS', X1 + 0.7, 11.2, -81.5, Math.PI / 2, 5.6, 1.2, { bg: '#6c2c91' });

  // ---- Car park ----
  const CP = { x0: -152, x1: -135, z0: -114, z1: -50 };
  k.floor(-158, CP.z0, CP.x0, CP.z1, 0.05, 0xc9c3b4); // walkway along the facade
  k.floor(CP.x0, CP.z0, CP.x1, CP.z1, 0.06, 0x3a3b3e);
  k.floor(-136.5, -71, -125, -61, 0.065, 0x3a3b3e); // driveway to the road
  const line = (x0: number, z0: number, x1: number, z1: number) => k.floor(x0, z0, x1, z1, 0.07, 0xf2f2f2);
  const bays: { x: number; z: number; heading: number }[] = [];
  for (let z = CP.z0 + 2; z < CP.z1 - 2.6; z += 2.7) {
    if (z > -74 && z < -58) continue; // entry lane
    line(CP.x0, z, CP.x0 + 5.2, z + 0.12);
    line(CP.x1 - 5.2, z, CP.x1, z + 0.12);
    bays.push({ x: CP.x0 + 2.6, z: z + 1.35, heading: Math.PI / 2 }, { x: CP.x1 - 2.6, z: z + 1.35, heading: -Math.PI / 2 });
  }
  for (let z = CP.z0 + 4; z < CP.z1; z += 6) line(-143.62, z, -143.38, z + 2.5); // centre dashes
  for (let i = 0; i < 6; i++) line(-151.6 + i * 0.75, -94.5, -151.2 + i * 0.75, -91.5); // zebra to the door
  sign(g, 'P  CUSTOMER PARKING', -136, 3.2, -75.5, Math.PI / 2, 5, 1.2, { bg: '#123e7c' });
  k.cyl(-136, 0, -75.5, 0.08, 0.08, 2.6, 0x555555, 6, 2.6);
  // Security booth + boom barrier at the entry.
  k.box(-138, 0, -77.5, 2.2, 2.6, 2.2, 0xd9d0bc, true);
  k.box(-138, 2.6, -77.5, 2.8, 0.25, 2.8, GREEN);
  k.box(-138.5, 0.95, -71, 0.15, 0.15, 6, 0xc0262d);
  for (const z of [-114.5, -49.5]) {
    k.box(-143.5, 0, z, 17, 0.4, 1.2, 0xbfb6a4, 0.4);
    for (const x of [-148, -139]) k.tree(x, z, 0.9, true, false);
  }
  const lampMat = nightMat(0xffe0a0, 0xdddddd, 1.8);
  b.glowMats.push(lampMat);
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.2, 0.5), lampMat, 6);
  for (let i = 0; i < 6; i++) {
    const z = CP.z0 + 6 + i * 11;
    k.cyl(-135.6, 0, z, 0.1, 0.13, 7.5, 0x55585c, 6, 7.5);
    lamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-136.3, 7.5, z));
  }
  g.add(lamps);
  // Parked cars (Corollas, Benz, Changan) in ~60% of bays.
  const models: CarModel[] = ['corolla', 'benz', 'suv'];
  const carMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: 0x555555 });
  const byModel: Record<CarModel, { x: number; z: number; heading: number; c: number }[]> = { corolla: [], benz: [], suv: [] };
  for (const bay of bays) {
    if (rng() > 0.62 || (Math.abs(bay.z + 58) < 4 && bay.x < -143) || (Math.abs(bay.z + 93) < 4.5 && bay.x < -143)) continue;
    byModel[pick(rng, models)].push({ ...bay, c: pick(rng, [0xe9e9e9, 0x111111, 0x8a8f96, 0x1f3f7a, 0x7a1f1f, 0xc9c2b0, 0x5b5f66]) });
    world.addBox(bay.x - 2.3, bay.z - 1, bay.x + 2.3, bay.z + 1, 1.5);
  }
  for (const m of models) {
    const list = byModel[m];
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(carModelGeometry(m, 0xffffff, true), carMat, list.length);
    list.forEach((c, i) => {
      mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.heading, 0)), new THREE.Vector3(1, 1, 1)));
      mesh.setColorAt(i, new THREE.Color(c.c));
    });
    mesh.castShadow = true;
    g.add(mesh);
  }

  // ---- Lakeside boardwalk with restaurant terraces ----
  const BZ0 = Z1, BZ1 = -60;
  k.floor(X0, BZ0, X1, BZ1, 0.25, 0x9a7048);
  for (let x = X0; x < X1; x += 1.2) k.floor(x, BZ0, x + 0.06, BZ1, 0.26, 0x7a5534);
  k.box((X0 + X1) / 2, 0, BZ1, X1 - X0, 0.25, 0.3, 0x7a5534);
  for (let x = X0 + 2; x <= X1 - 2; x += 4) k.cyl(x, 0, BZ1 + 0.2, 0.07, 0.07, 1.1, 0x333333, 6);
  k.box((X0 + X1) / 2, 1.05, BZ1 + 0.2, X1 - X0, 0.06, 0.06, 0x333333);
  world.addBox(X0, BZ1 - 0.1, X1, BZ1 + 0.5, 1.1);
  const restaurants: [string, string, number][] = [['LAKE VIEW GRILL', '#0f4f2a', -226], ['JAVA & JOLLOF', '#8c5a2b', -200], ['SUSHI ABUJA', '#c0262d', -176]];
  const tables: [number, number][] = [];
  for (const [name, bg, x] of restaurants) {
    sign(g, name, x, 6.2, Z1 + 0.4, 0, 10, 1.1, { bg });
    for (let i = 0; i < 4; i++) {
      const tx2 = x - 6 + (i % 2) * 6;
      const tz2 = -72 + Math.floor(i / 2) * 6;
      tables.push([tx2, tz2]);
      k.cyl(tx2, 0.25, tz2, 0.06, 0.06, 2.4, 0x555555, 6);
      k.cone(tx2, 2.65, tz2, 1.7, 0.6, pick(rng, [0xffffff, 0xf2e6c9, 0x0f4f2a]), 8);
      k.cyl(tx2, 0.97, tz2, 0.75, 0.75, 0.05, 0xffffff, 12);
      k.cyl(tx2, 0.25, tz2, 0.07, 0.07, 0.72, 0x777777, 6);
      world.addCircle(tx2, tz2, 0.85, 1);
    }
  }
  // String lights along the railing.
  const bulbMat = nightMat(0xfff1c4, 0xdddddd, 2);
  b.glowMats.push(bulbMat);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), bulbMat, 40);
  for (let i = 0; i < 40; i++) bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(X0 + 1 + i * 2, 2.6 + Math.sin(i * 0.8) * 0.15, BZ1 + 0.3));
  g.add(bulbs);
  for (let x = X0 + 1; x <= X1; x += 8) k.cyl(x, 0.25, BZ1 + 0.3, 0.05, 0.05, 2.4, 0x333333, 6);
  k.flush(g);

  const agents: AgentSpec[] = [
    { kind: 'wander', rect: { x0: -146, z0: -110, x1: -141, z1: -78 }, count: 3, carry: 'bag' },
    { kind: 'wander', rect: { x0: -158, z0: -112, x1: -155, z1: -52 }, count: 3, carry: 'trolley', speed: 0.9 },
    { kind: 'wander', rect: { x0: -238, z0: -66, x1: -162, z1: -62.5 }, count: 6 },
    { kind: 'loop', path: [[-238, -64.5], [-162, -64.5], [-162, -63], [-238, -63]], count: 2, speed: 2.8, cfg: { outfit: 'jersey', headwear: 'cap' } },
  ];
  tables.forEach(([x, z], i) => {
    if (i % 3 === 2) return;
    agents.push({ kind: 'static', x: x + 1.05, z, facing: -Math.PI / 2, pose: 'sit' });
    if (i % 2 === 0) agents.push({ kind: 'static', x: x - 1.05, z, facing: Math.PI / 2, pose: 'sit' });
  });
  b.crowds.push({ id: 'mall-out', cx: -185, cz: -85, radius: 160, agents });
}
