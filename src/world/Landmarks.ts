import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollisionWorld } from '../core/Collision';
import { mulberry32, range } from '../core/rng';
import { LANDMARKS } from './MapData';
import { nightGlowMaterial, normalizeGeo, paint, signTexture } from './Materials';
import { prismGeo } from './CityBuilder';

export interface LandmarkData {
  group: THREE.Group;
  glowMats: THREE.MeshLambertMaterial[];
  /** Things that animate every frame (flags, smoke, boats). */
  animators: ((t: number, dt: number) => void)[];
}

const lambert = (color: number, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

/** Lumpy granite inselberg like Zuma / Aso Rock. */
function rockGeo(seed: number, r: number, h: number, base: number, streak: number): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color(base);
  const cStreak = new THREE.Color(streak);
  const phase = rng() * 10;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const n = 1 + 0.08 * Math.sin(ang * 5 + phase) + 0.05 * Math.sin(ang * 11 + y * 4) + 0.04 * Math.sin(y * 9 + phase);
    if (y < 0) y *= 0.15;
    const dome = y > 0 ? Math.pow(y, 0.8) : y;
    x *= r * n;
    z *= r * n * 0.9;
    y = dome * h;
    pos.setXYZ(i, x, y, z);
    // Vertical dark streaks from rain run-off, like the real rocks.
    const s = Math.max(0, Math.sin(ang * 23 + phase) * 0.5 + Math.sin(ang * 7) * 0.5);
    const c = cBase.clone().lerp(cStreak, s * 0.7 * (y / h));
    c.multiplyScalar(0.85 + rng() * 0.15);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function flagTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 48;
  const g = c.getContext('2d')!;
  g.fillStyle = '#008751';
  g.fillRect(0, 0, 96, 48);
  g.fillStyle = '#ffffff';
  g.fillRect(32, 0, 32, 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLandmarks(world: CollisionWorld): LandmarkData {
  const group = new THREE.Group();
  group.name = 'landmarks';
  const glowMats: THREE.MeshLambertMaterial[] = [];
  const animators: ((t: number, dt: number) => void)[] = [];
  const rng = mulberry32(77);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const sign = (text: string, x: number, y: number, z: number, ry: number, w: number, h: number, opts: Parameters<typeof signTexture>[1] = {}) => {
    const tex = signTexture(text, { w: 512, h: Math.round((512 * h) / w), ...opts });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
    return m;
  };
  const vc = new THREE.MeshLambertMaterial({ vertexColors: true });
  const vcFlat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  // ---------- Zuma Rock ----------
  {
    const z = LANDMARKS.zuma;
    add(rockGeo(5, z.r, z.h, 0x8a8178, 0x3d3a36), vcFlat, z.x, -1, z.z);
    world.addCircle(z.x, z.z, z.r * 0.92, z.h);
    sign('ZUMA ROCK', z.x + 30, 3, z.z + 70, 0, 14, 3.2, { bg: '#5b3a1a', sub: 'Gateway to the FCT' });
    for (const px of [-6.5, 6.5]) add(new THREE.CylinderGeometry(0.15, 0.15, 3).translate(0, 1.5, 0), lambert(0x333333), z.x + 30 + px, 0, z.z + 70);
  }

  // ---------- Aso Rock ----------
  {
    const a = LANDMARKS.aso;
    const geos = [
      rockGeo(9, a.r, a.h, 0x8f8a7c, 0x4b4740),
      rockGeo(13, a.r * 0.65, a.h * 0.7, 0x8a8576, 0x4b4740).translate(-a.r * 0.6, 0, a.r * 0.75),
      rockGeo(21, a.r * 0.55, a.h * 0.55, 0x938e80, 0x4b4740).translate(-a.r * 0.2, 0, -a.r * 0.9),
    ];
    add(mergeGeometries(geos), vcFlat, a.x, -1, a.z);
    world.addCircle(a.x, a.z, a.r * 0.92, a.h);
    world.addCircle(a.x - a.r * 0.6, a.z + a.r * 0.75, a.r * 0.6, a.h);
    world.addCircle(a.x - a.r * 0.2, a.z - a.r * 0.9, a.r * 0.5, a.h);
  }

  // ---------- City Gate on the expressway ----------
  {
    const g = LANDMARKS.cityGate;
    const white = lambert(0xf2efe6);
    const green = lambert(0x0f6b3a);
    for (const side of [-1, 1]) {
      const pz = g.z + side * 15;
      add(new THREE.BoxGeometry(3, 16, 3).translate(0, 8, 0), white, g.x, 0, pz);
      add(new THREE.BoxGeometry(3.4, 1.2, 3.4).translate(0, 16.6, 0), green, g.x, 0, pz);
      world.addBox(g.x - 1.5, pz - 1.5, g.x + 1.5, pz + 1.5, 16);
    }
    add(new THREE.BoxGeometry(2.4, 3.4, 33).translate(0, 18.2, 0), white, g.x, 0, g.z);
    const arch = new THREE.TorusGeometry(15, 0.8, 8, 24, Math.PI).rotateY(Math.PI / 2);
    add(arch, green, g.x, 12, g.z);
    sign('WELCOME TO ABUJA', g.x - 1.25, 18.2, g.z, -Math.PI / 2, 30, 3, { bg: '#0f6b3a', sub: 'Federal Capital Territory • Centre of Unity' });
    sign('KUBWA • GWARINPA • WUSE', g.x + 1.25, 18.2, g.z, Math.PI / 2, 30, 3, { bg: '#0f6b3a', sub: 'Safe journey. Drive carefully.' });
  }

  // ---------- National Mosque ----------
  {
    const m = LANDMARKS.mosque;
    const cream = lambert(0xefe6d2);
    const gold = new THREE.MeshPhongMaterial({ color: 0xd4a62a, shininess: 80, specular: 0x886622 });
    add(new THREE.BoxGeometry(46, 1, 46).translate(0, 0.5, 0), lambert(0xd9d0bc), m.x, 0, m.z);
    add(new THREE.BoxGeometry(34, 12, 34).translate(0, 6, 0), cream, m.x, 0, m.z);
    add(new THREE.CylinderGeometry(12, 12, 5, 24).translate(0, 14.5, 0), cream, m.x, 0, m.z);
    add(new THREE.SphereGeometry(12.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 17, 0), gold, m.x, 0, m.z);
    add(new THREE.ConeGeometry(0.6, 4, 8).translate(0, 31.5, 0), gold, m.x, 0, m.z);
    for (const [ox, oz] of [[-21, -21], [21, -21], [-21, 21], [21, 21]]) {
      add(new THREE.CylinderGeometry(1.4, 1.8, 46, 12).translate(0, 23, 0), cream, m.x + ox, 0, m.z + oz);
      add(new THREE.CylinderGeometry(2.2, 2.2, 1.2, 12).translate(0, 40, 0), lambert(0x0f6b3a), m.x + ox, 0, m.z + oz);
      add(new THREE.ConeGeometry(1.5, 6, 12).translate(0, 49, 0), gold, m.x + ox, 0, m.z + oz);
      world.addCircle(m.x + ox, m.z + oz, 1.9, 46);
    }
    // Arched windows ring.
    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2;
      sign('', m.x + Math.sin(ang) * 17.05, 6, m.z + Math.cos(ang) * 17.05, ang, 20, 7, { bg: '#2c5a4a' });
    }
    world.addBox(m.x - 17, m.z - 17, m.x + 17, m.z + 17, 30);
  }

  // ---------- National Christian Centre ----------
  {
    const c = LANDMARKS.church;
    const white = lambert(0xf5f3ee);
    const blue = new THREE.MeshPhongMaterial({ color: 0x3a6fb5, shininess: 60 });
    add(new THREE.BoxGeometry(44, 1, 50).translate(0, 0.5, 0), lambert(0xd9d0bc), c.x, 0, c.z);
    add(new THREE.BoxGeometry(30, 14, 36).translate(0, 7, 0), white, c.x, 0, c.z + 2);
    // Tall pointed front: a 4-sided pyramid stretched upward.
    const spire = new THREE.ConeGeometry(16, 44, 4, 1).rotateY(Math.PI / 4).translate(0, 22 + 14, 0);
    spire.scale(1, 1, 0.7);
    add(spire, blue, c.x, 0, c.z - 4);
    add(new THREE.BoxGeometry(0.8, 8, 0.8).translate(0, 62, 0), lambert(0xd4a62a), c.x, 0, c.z - 4);
    add(new THREE.BoxGeometry(4.4, 0.8, 0.8).translate(0, 63.5, 0), lambert(0xd4a62a), c.x, 0, c.z - 4);
    world.addBox(c.x - 15, c.z - 16, c.x + 15, c.z + 20, 40);
  }

  // ---------- Eagle Square ----------
  {
    const e = LANDMARKS.eagleSquare;
    add(new THREE.BoxGeometry(90, 0.3, 90).translate(0, 0.15, 0), lambert(0xbfbab0), e.x, 0, e.z, false);
    // Grandstand: stepped seating with green-white canopy.
    const stand = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 2.2), lambert(k % 2 ? 0xe9e5dc : 0xd5d0c4));
      s.position.set(0, 0.5 + k, -k * 2.2);
      s.castShadow = s.receiveShadow = true;
      stand.add(s);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(64, 0.6, 16), lambert(0x0f6b3a));
    canopy.position.set(0, 12, -6);
    canopy.castShadow = true;
    stand.add(canopy);
    for (const px of [-30, -10, 10, 30]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 12), lambert(0xffffff));
      p.position.set(px, 6, 1);
      stand.add(p);
      world.addCircle(e.x + px, e.z + 41, 0.5, 12);
    }
    stand.position.set(e.x, 0, e.z + 42);
    stand.rotation.y = Math.PI;
    group.add(stand);
    world.addBox(e.x - 30, e.z + 42, e.x + 30, e.z + 56, 8);
    // Flagpoles with waving Naija flags.
    const ftex = flagTexture();
    for (let k = 0; k < 5; k++) {
      const fx = e.x - 24 + k * 12;
      const fz = e.z - 38;
      add(new THREE.CylinderGeometry(0.12, 0.15, 14).translate(0, 7, 0), lambert(0xdddddd), fx, 0, fz);
      world.addCircle(fx, fz, 0.3, 14);
      const flagGeo = new THREE.PlaneGeometry(4, 2, 10, 1).translate(2, 0, 0);
      const base = Float32Array.from(flagGeo.attributes.position.array as Float32Array);
      const flag = add(flagGeo, new THREE.MeshLambertMaterial({ map: ftex, side: THREE.DoubleSide }), fx, 12.8, fz, false);
      animators.push((t) => {
        const p = flagGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const x = base[i * 3];
          p.setZ(i, Math.sin(x * 1.6 - t * 5 + k) * 0.18 * (x / 4));
        }
        p.needsUpdate = true;
      });
      flag.rotation.y = 0.3;
    }
    // Eagle statue plinth.
    add(new THREE.CylinderGeometry(3, 3.5, 3, 16).translate(0, 1.5, 0), lambert(0xe9e5dc), e.x, 0, e.z);
    const eagle = new THREE.Group();
    const bronze = new THREE.MeshPhongMaterial({ color: 0x6b4a1c, shininess: 40 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.8, 1.2, 0.8), bronze);
    body.position.y = 4.6;
    eagle.add(body);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.2), bronze);
      wing.position.set(s * 1.9, 5.4, 0);
      wing.rotation.z = s * 0.45;
      eagle.add(wing);
    }
    eagle.position.set(e.x, 0, e.z);
    group.add(eagle);
    world.addCircle(e.x, e.z, 3.5, 6);
  }

  // ---------- Jabi Lake ----------
  {
    const l = LANDMARKS.lake;
    const sand = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), lambert(0xd9c79a));
    sand.scale.set(l.rx + 6, 1, l.rz + 6);
    sand.position.set(l.x, 0.05, l.z);
    sand.receiveShadow = true;
    group.add(sand);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshPhongMaterial({ color: 0x2f7fa3, shininess: 120, specular: 0x88bbdd, transparent: true, opacity: 0.92 }),
    );
    water.scale.set(l.rx, 1, l.rz);
    water.position.set(l.x, 0.12, l.z);
    group.add(water);
    world.add({ kind: 'ellipse', x: l.x, z: l.z, rx: l.rx - 1, rz: l.rz - 1, h: 0.5 });
    // Boats that bob.
    for (let k = 0; k < 4; k++) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 4), lambert([0xc0262d, 0xffffff, 0x2a64c9, 0xe8a317][k]));
      hull.position.y = 0.3;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.5), lambert(0x6b4a2b));
      seat.position.y = 0.6;
      boat.add(hull, seat);
      const ang = (k / 4) * Math.PI * 2 + 0.5;
      const rad = 0.55;
      boat.position.set(l.x + Math.cos(ang) * l.rx * rad, 0.1, l.z + Math.sin(ang) * l.rz * rad);
      boat.rotation.y = ang;
      group.add(boat);
      animators.push((t) => {
        boat.position.y = 0.1 + Math.sin(t * 1.4 + k) * 0.08;
        boat.rotation.z = Math.sin(t * 1.1 + k * 2) * 0.05;
        boat.rotation.y = ang + Math.sin(t * 0.1 + k) * 0.3;
      });
    }
    // Jetty near Baba Boat.
    add(new THREE.BoxGeometry(3, 0.3, 12).translate(0, 0.4, 0), lambert(0x7a5534), l.x, 0, l.z - l.rz + 4);
    // Lakeside mall (fictional).
    const mall = LANDMARKS.jabiMall;
    add(new THREE.BoxGeometry(56, 14, 34).translate(0, 7, 0), new THREE.MeshLambertMaterial({ color: 0xe6e1d6 }), mall.x, 0, mall.z);
    add(new THREE.BoxGeometry(56.2, 6, 0.3).translate(0, 8, 0), new THREE.MeshPhongMaterial({ color: 0x3f6f8f, shininess: 90 }), mall.x, 0, mall.z + 17);
    sign('LAKESIDE MALL', mall.x, 12.4, mall.z + 17.2, 0, 22, 2.6, { bg: '#ffffff', fg: '#0f4f2a' });
    world.addBox(mall.x - 28, mall.z - 17, mall.x + 28, mall.z + 17, 14);
    // Park: benches and trees around the lake.
    const trunkMat = lambert(0x5a3e2b);
    const leaf = new THREE.MeshLambertMaterial({ color: 0x3f8a33, flatShading: true });
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 3, 6).translate(0, 1.5, 0);
    const leafGeo = new THREE.IcosahedronGeometry(2.2, 0);
    const trees: THREE.Matrix4[] = [];
    const leaves: THREE.Matrix4[] = [];
    for (let k = 0; k < 46; k++) {
      const ang = rng() * Math.PI * 2;
      const rad = range(rng, 1.18, 1.5);
      const x = l.x + Math.cos(ang) * l.rx * rad;
      const z = l.z + Math.sin(ang) * l.rz * rad;
      if (Math.abs(x - mall.x) < 32 && Math.abs(z - mall.z) < 21) continue;
      if (x < -360 || x > -140 || z < -110 || z > 110) continue;
      trees.push(new THREE.Matrix4().makeTranslation(x, 0, z));
      leaves.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 4, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.85, 1).multiplyScalar(range(rng, 0.8, 1.3))));
      world.addCircle(x, z, 0.4, 5);
    }
    const ti = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const li = new THREE.InstancedMesh(leafGeo, leaf, leaves.length);
    trees.forEach((m, i) => ti.setMatrixAt(i, m));
    leaves.forEach((m, i) => li.setMatrixAt(i, m));
    ti.castShadow = li.castShadow = true;
    group.add(ti, li);
  }

  // ---------- Wuse Market ----------
  {
    const mk = LANDMARKS.market;
    const geos: THREE.BufferGeometry[] = [];
    const roofCols = [0xc0262d, 0x2a64c9, 0x1f8a4b, 0xe8a317, 0xf26b1d, 0x7a1f3d, 0x00a6a6];
    for (let i = -4; i <= 4; i++) {
      for (let j = -3; j <= 3; j++) {
        if (j === 0) continue; // central walkway
        if (Math.abs(i) <= 0 && Math.abs(j) <= 1) continue;
        const x = mk.x + i * 9;
        const z = mk.z + j * 11;
        if (rng() < 0.12) continue;
        geos.push(paint(new THREE.BoxGeometry(6, 2.2, 5).translate(x, 1.1, z), 0x8a6a4a));
        const roof = prismGeo();
        roof.scale(7, 1.2, 6.2).translate(x, 2.2, z);
        geos.push(normalizeGeo(paint(roof, roofCols[Math.floor(rng() * roofCols.length)])));
        // Goods on display: colourful boxes on the counter.
        for (let g = 0; g < 3; g++) geos.push(paint(new THREE.BoxGeometry(1.2, 0.6, 0.8).translate(x - 2 + g * 2, 1.0, z + 2.9), roofCols[Math.floor(rng() * roofCols.length)]));
        world.addBox(x - 3, z - 2.5, x + 3, z + 3.3, 2.5);
      }
    }
    // Umbrellas.
    for (let k = 0; k < 14; k++) {
      const x = mk.x + range(rng, -40, 40);
      const z = mk.z + range(rng, -2.5, 2.5);
      geos.push(paint(new THREE.CylinderGeometry(0.05, 0.05, 2.4).translate(x, 1.2, z), 0x333333));
      geos.push(paint(new THREE.ConeGeometry(1.4, 0.6, 8).translate(x, 2.5, z), roofCols[k % roofCols.length]));
    }
    add(mergeGeometries(geos.map((g) => normalizeGeo(g))), vc, 0, 0, 0);
    // Arch sign.
    const archX = mk.x - 46;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.6, 6, 0.6).translate(0, 3, 0), lambert(0x333333), archX, 0, mk.z + s * 4);
    sign('WUSE MARKET', archX, 6.5, mk.z, Math.PI / 2, 9, 1.8, { bg: '#c0262d', sub: 'Everything dey here' });
    sign('WUSE MARKET', archX - 0.05, 6.5, mk.z, -Math.PI / 2, 9, 1.8, { bg: '#c0262d', sub: 'Everything dey here' });
  }

  // ---------- Area 1 roundabout ----------
  {
    const a = LANDMARKS.area1;
    add(new THREE.CylinderGeometry(a.r + 13, a.r + 13, 0.1, 40).translate(0, 0.1, 0), new THREE.MeshLambertMaterial({ color: 0x3d3e41, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }), a.x, 0, a.z, false);
    add(new THREE.CylinderGeometry(a.r + 0.6, a.r + 0.8, 0.5, 40).translate(0, 0.25, 0), lambert(0xd8d2c2), a.x, 0, a.z);
    add(new THREE.CylinderGeometry(a.r, a.r, 0.55, 40).translate(0, 0.28, 0), lambert(0x4f8a35), a.x, 0, a.z, false);
    // Obelisk monument + fountain basin.
    add(new THREE.CylinderGeometry(5, 5.5, 1, 24).translate(0, 0.8, 0), lambert(0xe9e5dc), a.x, 0, a.z);
    add(new THREE.CylinderGeometry(4.4, 4.4, 0.2, 24).translate(0, 1.25, 0), new THREE.MeshPhongMaterial({ color: 0x3a8fb5, shininess: 100 }), a.x, 0, a.z);
    add(new THREE.CylinderGeometry(0.6, 1.4, 16, 4).translate(0, 8.5, 0), lambert(0xf5f2ea), a.x, 0, a.z);
    add(new THREE.ConeGeometry(0.85, 2, 4).translate(0, 17.5, 0), lambert(0xd4a62a), a.x, 0, a.z);
    world.addCircle(a.x, a.z, a.r + 0.8, 1);
    sign('AREA 1', a.x + 26, 4, a.z - 26, -Math.PI / 4, 6, 1.6, { bg: '#0f6b3a', sub: 'Horn at your own risk' });
  }

  // ---------- Owambe venue, Gwarinpa ----------
  {
    const o = LANDMARKS.owambe;
    const colors = [0xd4a62a, 0xffffff, 0x7a1f3d, 0xd4a62a, 0xffffff, 0x7a1f3d];
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const x = o.x - 20 + i * 18;
        const z = o.z - 10 + j * 18;
        geos.push(paint(new THREE.BoxGeometry(16, 0.25, 14).translate(x, 4, z), colors[(i + j * 3) % colors.length]));
        const peak = new THREE.ConeGeometry(8, 2, 4).rotateY(Math.PI / 4).translate(x, 5.1, z);
        geos.push(paint(peak, colors[(i + j * 3 + 1) % colors.length]));
        for (const [px, pz] of [[-7.5, -6.5], [7.5, -6.5], [-7.5, 6.5], [7.5, 6.5]]) {
          geos.push(paint(new THREE.CylinderGeometry(0.1, 0.1, 4).translate(x + px, 2, z + pz), 0xdddddd));
          world.addCircle(x + px, z + pz, 0.15, 4);
        }
        // Plastic chairs + tables
        for (let c = 0; c < 10; c++) {
          const cx = x - 5 + (c % 5) * 2.5;
          const cz = z - 3 + Math.floor(c / 5) * 6;
          geos.push(paint(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 10).translate(cx, 0.8, cz), 0xffffff));
          geos.push(paint(new THREE.CylinderGeometry(0.08, 0.08, 0.8).translate(cx, 0.4, cz), 0xffffff));
          for (const s of [-1, 1]) geos.push(paint(new THREE.BoxGeometry(0.5, 0.9, 0.5).translate(cx + s * 1.2, 0.45, cz), c % 2 ? 0xc0262d : 0x2a64c9));
        }
      }
    }
    // DJ stand + speakers
    geos.push(paint(new THREE.BoxGeometry(4, 1.1, 1.6).translate(o.x, 0.55, o.z - 20), 0x1a1a1a));
    for (const s of [-1, 1]) geos.push(paint(new THREE.BoxGeometry(1.2, 2.4, 1).translate(o.x + s * 3.4, 1.2, o.z - 20), 0x111111));
    add(mergeGeometries(geos.map((g) => normalizeGeo(g))), vc, 0, 0, 0);
    world.addBox(o.x - 3.4 - 0.6, o.z - 21, o.x + 4, o.z - 19, 2.4);
    sign("AUNTY FUNMI @ 50", o.x, 6.2, o.z - 24, 0, 10, 2, { bg: '#7a1f3d', fg: '#ffd76a', sub: 'Aso-ebi compulsory. No gate-crashing.' });
    for (const px of [-5, 5]) add(new THREE.CylinderGeometry(0.12, 0.12, 6).translate(0, 3, 0), lambert(0x333333), o.x + px, 0, o.z - 24);
    // Party lights that blink at night.
    const partyMat = nightGlowMaterial(0xff4fd8, 0x884477);
    partyMat.userData.glowStrength = 2;
    glowMats.push(partyMat);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 4), partyMat, 40);
    for (let k = 0; k < 40; k++) bulbs.setMatrixAt(k, new THREE.Matrix4().makeTranslation(o.x - 28 + k * 1.4, 4.4 + Math.sin(k) * 0.2, o.z - 18));
    group.add(bulbs);
    animators.push((t) => {
      partyMat.emissive.setHSL((t * 0.2) % 1, 0.9, 0.55);
    });
  }

  // ---------- Your flat in Wuse 2 ----------
  {
    const h = LANDMARKS.home;
    const wall = lambert(0xe9e1cf);
    add(new THREE.BoxGeometry(18, 7, 12).translate(0, 3.5, 0), lambert(0xf3ead8), h.x, 0, h.z - 6);
    add(new THREE.BoxGeometry(18.6, 0.5, 12.6).translate(0, 7.2, 0), lambert(0x0f6b3a), h.x, 0, h.z - 6);
    add(new THREE.BoxGeometry(2, 2.6, 0.2).translate(0, 1.3, 0), lambert(0x5a3a24), h.x, 0, h.z);
    world.addBox(h.x - 9, h.z - 12, h.x + 9, h.z, 7);
    for (const [x0, z0, x1, z1] of [[-24, -24, 24, -23.6], [-24, -24, -23.6, 24], [23.6, -24, 24, 24], [-24, 23.6, -4, 24], [4, 23.6, 24, 24]]) {
      add(new THREE.BoxGeometry(x1 - x0, 2.4, z1 - z0).translate((x0 + x1) / 2, 1.2, (z0 + z1) / 2), wall, h.x, 0, h.z);
      world.addBox(h.x + x0, h.z + z0, h.x + x1, h.z + z1, 2.4);
    }
    // Blue gate + the iconic black water tank.
    add(new THREE.BoxGeometry(8, 2.2, 0.15).translate(0, 1.1, 0), lambert(0x1f3f7a), h.x, 0, h.z + 23.8);
    add(new THREE.CylinderGeometry(1, 1, 2, 12).translate(0, 8.4, 0), lambert(0x1a1a1a), h.x + 6, 0, h.z - 9);
    sign('HOME', h.x, 5.4, h.z + 0.05, 0, 4, 1, { bg: '#1f3f7a' });
    const bulbMat = nightGlowMaterial(0xfff1c4, 0xdddddd);
    glowMats.push(bulbMat);
    add(new THREE.SphereGeometry(0.25, 8, 6), bulbMat, h.x, 3, h.z + 0.4, false);
  }

  // ---------- Suya joint ----------
  {
    const s = LANDMARKS.suya;
    add(new THREE.BoxGeometry(5, 2.6, 3).translate(0, 1.3, 0), lambert(0x6b4a2b), s.x, 0, s.z);
    add(new THREE.BoxGeometry(6, 0.2, 4).translate(0, 2.8, 0), lambert(0xc0262d), s.x, 0, s.z);
    add(new THREE.BoxGeometry(3.2, 1, 1.2).translate(0, 0.5, 0), lambert(0x2b2b2b), s.x - 4, 0, s.z - 6);
    const coal = nightGlowMaterial(0xff5a1a, 0x8a2a10);
    coal.userData.glowStrength = 2.4;
    coal.emissiveIntensity = 0.6;
    glowMats.push(coal);
    add(new THREE.BoxGeometry(3, 0.08, 1).translate(0, 1.04, 0), coal, s.x - 4, 0, s.z - 6, false);
    world.addBox(s.x - 2.5, s.z - 1.5, s.x + 2.5, s.z + 1.5, 2.6);
    world.addBox(s.x - 5.6, s.z - 6.6, s.x - 2.4, s.z - 5.4, 1);
    sign('MALLAM MUSA SUYA SPOT', s.x, 3.6, s.z + 1.6, 0, 7, 1.3, { bg: '#e8a317', fg: '#3a1a00', sub: 'Since 1999 • Extra yaji available' });
    // Benches
    for (let k = 0; k < 3; k++) {
      add(new THREE.BoxGeometry(3, 0.5, 0.6).translate(0, 0.25, 0), lambert(0x7a5534), s.x + 8 + k * 4, 0, s.z - 4);
      world.addBox(s.x + 6.5 + k * 4, s.z - 4.3, s.x + 9.5 + k * 4, s.z - 3.7, 0.5);
    }
    // Rising smoke puffs.
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.35, depthWrite: false });
    const puffs: THREE.Mesh[] = [];
    for (let k = 0; k < 8; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), smokeMat);
      group.add(p);
      puffs.push(p);
    }
    animators.push((t) => {
      puffs.forEach((p, k) => {
        const life = (t * 0.35 + k / puffs.length) % 1;
        p.position.set(s.x - 4 + Math.sin(k * 3 + t) * 0.4, 1.2 + life * 5, s.z - 6 + Math.cos(k * 2 + t * 0.7) * 0.3);
        p.scale.setScalar(0.6 + life * 2.2);
      });
    });
    const bulbMat = nightGlowMaterial(0xfff1c4, 0xdddddd);
    glowMats.push(bulbMat);
    add(new THREE.SphereGeometry(0.22, 8, 6), bulbMat, s.x, 2.6, s.z + 2, false);
  }

  // ---------- Ministry building (fictional) ----------
  {
    sign('FEDERAL MINISTRY OF WAHALA', 300, 9, 52.2, 0, 16, 2.2, { bg: '#0f6b3a', sub: 'Come back tomorrow • Open 8am – 4pm' });
    add(new THREE.BoxGeometry(30, 18, 14).translate(0, 9, 0), lambert(0xe9e4d8), 300, 0, 45);
    add(new THREE.BoxGeometry(30.4, 1, 14.4).translate(0, 18.5, 0), lambert(0x0f6b3a), 300, 0, 45);
    world.addBox(285, 38, 315, 52, 18);
  }

  // ---------- Billboards with Naija humour ----------
  const boards: [string, string, number, number, number, string][] = [
    ['BUY LAND IN KUBWA', 'No omo-onile wahala • C of O dey', -540, -268, 0, '#1f3f7a'],
    ['MAMA PUT', 'Jollof ₦1,500 • Swallow ₦1,200 • Pomo free', -150, 140, Math.PI / 2, '#c0262d'],
    ['GOD\'S TIME BARBING SALOON', 'Low cut, punk & skin fade', 140, 150, -Math.PI / 2, '#6c2c91'],
    ['NO PARKING', 'Offenders go collect am • FCTA', 40, -140, 0, '#a31515'],
    ['WUSE 2: ENJOYMENT ZONE', 'Pepper soup • Asun • Cold Zobo', 140, -20, -Math.PI / 2, '#e8a317'],
    ['DRIVE WITH SENSE', 'Abuja roads wide, no be racetrack', -400, -265, 0, '#0f6b3a'],
    ['JESUS IS LORD • ALLAHU AKBAR', 'Abuja: Centre of Unity', 360, 140, -Math.PI / 2, '#123e7c'],
  ];
  for (const [title, sub, x, z, ry, bg] of boards) {
    sign(title, x, 6.5, z, ry, 12, 3.6, { bg, sub });
    sign(title, x - Math.sin(ry) * 0.06, 6.5, z - Math.cos(ry) * 0.06, ry + Math.PI, 12, 3.6, { bg, sub });
    const ox = Math.cos(ry) * 4.5;
    const oz = -Math.sin(ry) * 4.5;
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.18, 0.18, 5).translate(0, 2.5, 0), lambert(0x444444), x + ox * s, 0, z + oz * s);
      world.addCircle(x + ox * s, z + oz * s, 0.25, 5);
    }
  }

  return { group, glowMats, animators };
}
