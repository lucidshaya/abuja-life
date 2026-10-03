import * as THREE from 'three';
import type { Dynamic } from '../core/Collision';
import { mulberry32 } from '../core/rng';
import { Character } from '../player/Character';
import { CLOTH_COLORS, defaultCharacter, randomCharacter, type CharacterConfig } from '../player/CharacterConfig';
import { NPC_SPOTS, ROADS, type NpcLook, type NpcSpot, type RoadSeg } from './MapData';

const ci = (hex: number) => Math.max(0, CLOTH_COLORS.indexOf(hex));

export function lookConfig(look: NpcLook): CharacterConfig {
  const base = defaultCharacter();
  const L: Record<NpcLook, Partial<CharacterConfig>> = {
    vio: { outfit: 'suit', primary: ci(0x123e7c), secondary: ci(0x111111), headwear: 'cap', hair: 'lowcut', build: 'heavy', skin: 1 },
    mallam: { outfit: 'kaftan', primary: ci(0xffffff), secondary: ci(0xf2e6c9), headwear: 'kufi', facialHair: 'beard', skin: 2 },
    mama: { outfit: 'asoebi', primary: ci(0xe8a317), secondary: ci(0x1f6b3a), pattern: 'circles', hair: 'gele', facialHair: 'none', headwear: 'none', build: 'heavy', skin: 3 },
    bigman: { outfit: 'agbada', primary: ci(0xffffff), secondary: ci(0xe8a317), pattern: 'plain', headwear: 'fila', shades: true, build: 'heavy', skin: 1 },
    clerk: { outfit: 'senator', primary: ci(0x8c5a2b), secondary: ci(0xf2e6c9), headwear: 'none', hair: 'bald', skin: 2 },
    pastor: { outfit: 'suit', primary: ci(0x111111), secondary: ci(0xc0262d), headwear: 'none', hair: 'lowcut', skin: 0 },
    uncle: { outfit: 'senator', primary: ci(0x123e7c), secondary: ci(0xe8a317), headwear: 'fila', facialHair: 'goatee', build: 'heavy', skin: 2 },
    guard: { outfit: 'suit', primary: ci(0x1f6b3a), secondary: ci(0x1f6b3a), headwear: 'cap', hair: 'lowcut', skin: 1 },
    boatman: { outfit: 'jersey', primary: ci(0x0f8a4b), headwear: 'cap', skin: 0, build: 'slim' },
    driver: { outfit: 'kaftan', primary: ci(0x5b5f66), secondary: ci(0x111111), headwear: 'cap', skin: 1, build: 'slim' },
    pos: { outfit: 'ankara', primary: ci(0x6c2c91), secondary: ci(0xe8a317), pattern: 'diamonds', hair: 'braids', headwear: 'none', facialHair: 'none', skin: 4 },
    aunty: { outfit: 'asoebi', primary: ci(0xe8a317), secondary: ci(0x7a1f3d), pattern: 'waves', hair: 'gele', headwear: 'none', facialHair: 'none', build: 'heavy', skin: 3 },
    mallguard: { outfit: 'suit', primary: ci(0x111111), secondary: ci(0x111111), headwear: 'cap', build: 'heavy', skin: 1 },
    cashier: { outfit: 'jersey', primary: ci(0xc0262d), hair: 'braids', facialHair: 'none', headwear: 'none', skin: 3 },
    promo: { outfit: 'ankara', primary: ci(0xd94f8c), secondary: ci(0xffffff), pattern: 'circles', hair: 'braids', facialHair: 'none', headwear: 'none', skin: 4 },
    chef: { outfit: 'jersey', primary: ci(0xffffff), headwear: 'kufi', build: 'heavy', skin: 2 },
    phoneguy: { outfit: 'jersey', primary: ci(0x123e7c), headwear: 'cap', shades: true, build: 'slim', skin: 1 },
    uniguard: { outfit: 'suit', primary: ci(0x5b5f66), secondary: ci(0x111111), headwear: 'cap', skin: 0 },
    lecturer: { outfit: 'senator', primary: ci(0x8c5a2b), secondary: ci(0xe8a317), hair: 'bald', facialHair: 'beard', shades: true, skin: 1 },
    librarian: { outfit: 'kaftan', primary: ci(0x6c2c91), secondary: ci(0xffffff), hair: 'hijab', facialHair: 'none', headwear: 'none', skin: 3 },
    cafmama: { outfit: 'asoebi', primary: ci(0xf26b1d), secondary: ci(0x0f8a4b), pattern: 'diamonds', hair: 'gele', facialHair: 'none', headwear: 'none', build: 'heavy', skin: 2 },
    captain: { outfit: 'jersey', primary: ci(0x0f8a4b), headwear: 'none', hair: 'lowcut', build: 'slim', skin: 0 },
    sugguy: { outfit: 'senator', primary: ci(0xffffff), secondary: ci(0x0f8a4b), headwear: 'fila', skin: 2 },
    photographer: { outfit: 'jersey', primary: ci(0x111111), headwear: 'cap', skin: 1 },
    groom: { outfit: 'agbada', primary: ci(0x1f6b3a), secondary: ci(0xe8a317), pattern: 'plain', headwear: 'fila', skin: 2 },
    icecream: { outfit: 'jersey', primary: ci(0x2a64c9), headwear: 'cap', skin: 0 },
    horseman: { outfit: 'kaftan', primary: ci(0xf2e6c9), secondary: ci(0x8c5a2b), headwear: 'kufi', facialHair: 'beard', skin: 1 },
    picnic: { outfit: 'ankara', primary: ci(0x0f8a4b), secondary: ci(0xe8a317), pattern: 'waves', headwear: 'none', skin: 3 },
    bouncer: { outfit: 'suit', primary: ci(0x111111), secondary: ci(0x111111), hair: 'bald', shades: true, build: 'heavy', height: 'tall', skin: 0 },
    bartender: { outfit: 'suit', primary: ci(0x111111), secondary: ci(0xc0262d), hair: 'afro', skin: 2 },
    dj: { outfit: 'jersey', primary: ci(0x6c2c91), headwear: 'cap', shades: true, hair: 'dreads', skin: 1 },
    agent: { outfit: 'suit', primary: ci(0x123e7c), secondary: ci(0xe8a317), hair: 'lowcut', skin: 2 },
    none: {},
  };
  return { ...base, facialHair: 'none', ...L[look] };
}

function markerTexture(text: string, bg: string, fg: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#1a1a1a';
  g.stroke();
  g.fillStyle = fg;
  g.font = '900 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface EventNpc {
  spot: NpcSpot;
  /** null for interactive objects (marker only). */
  char: Character | null;
  marker: THREE.Sprite;
}

interface Walker {
  char: Character;
  road: RoadSeg;
  side: number;
  t: number;
  dir: number;
  speed: number;
  x: number;
  z: number;
  pause: number;
}

export class Npcs {
  readonly group = new THREE.Group();
  readonly eventNpcs: EventNpc[] = [];
  private walkers: Walker[] = [];
  readonly dynamics: Dynamic[] = [];
  private activeWalkers = 0;
  private rng = mulberry32(4242);
  private roads: RoadSeg[];
  private readyTex = markerTexture('!', '#ffd23a', '#1a1a1a');
  private waitTex = markerTexture('…', '#9a9a9a', '#ffffff');
  cullDist = 110;

  constructor(maxWalkers: number) {
    this.roads = ROADS.filter((r) => r.kind !== 'expressway');
    for (const spot of NPC_SPOTS) {
      const char = spot.look === 'none' ? null : new Character(lookConfig(spot.look));
      if (char) {
        char.root.position.set(spot.x, 0, spot.z);
        char.root.rotation.y = spot.facing;
        this.group.add(char.root);
      }
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.readyTex, depthTest: true, transparent: true }));
      marker.scale.set(0.7, 0.7, 0.7);
      marker.position.set(spot.x, 2.5, spot.z);
      this.group.add(marker);
      this.eventNpcs.push({ spot, char, marker });
    }
    for (let i = 0; i < maxWalkers; i++) {
      const char = new Character(randomCharacter(this.rng), false);
      const road = this.roads[Math.floor(this.rng() * this.roads.length)];
      const w: Walker = { char, road, side: this.rng() < 0.5 ? -1 : 1, t: 0, dir: this.rng() < 0.5 ? -1 : 1, speed: 1.1 + this.rng() * 0.6, x: 0, z: 0, pause: 0 };
      this.walkers.push(w);
      this.group.add(char.root);
    }
    this.setActive(maxWalkers);
  }

  setActive(n: number): void {
    this.activeWalkers = Math.min(n, this.walkers.length);
    this.walkers.forEach((w, i) => (w.char.root.visible = i < this.activeWalkers));
  }

  setShadows(on: boolean): void {
    for (const n of this.eventNpcs) n.char?.setShadow(on);
  }

  private roadLen(r: RoadSeg): number {
    return Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
  }

  private placeWalker(w: Walker, px: number, pz: number): void {
    // Pick a road that passes near the player and drop the walker somewhere along it.
    for (let tries = 0; tries < 12; tries++) {
      const r = this.roads[Math.floor(this.rng() * this.roads.length)];
      const horiz = r.z0 === r.z1;
      const len = this.roadLen(r);
      const sx = Math.min(r.x0, r.x1);
      const sz = Math.min(r.z0, r.z1);
      const proj = horiz ? px - sx : pz - sz;
      const perp = horiz ? Math.abs(pz - r.z0) : Math.abs(px - r.x0);
      if (perp > this.cullDist * 0.7) continue;
      const t = proj + (this.rng() - 0.5) * this.cullDist * 1.2;
      if (t < 5 || t > len - 5) continue;
      w.road = r;
      w.t = t;
      w.side = this.rng() < 0.5 ? -1 : 1;
      w.dir = this.rng() < 0.5 ? -1 : 1;
      return;
    }
  }

  update(dt: number, px: number, pz: number, time: number, cooldownLeft: (eventId: string) => number, night: number): void {
    const cd2 = this.cullDist * this.cullDist;
    for (const n of this.eventNpcs) {
      const dx = n.spot.x - px;
      const dz = n.spot.z - pz;
      const d2 = dx * dx + dz * dz;
      const vis = d2 < cd2 * 1.6;
      if (n.char) n.char.root.visible = vis;
      n.marker.visible = vis;
      if (!vis) continue;
      n.char?.update(dt, 0);
      n.marker.position.y = (n.char ? 2.45 : 1.6) + Math.sin(time * 3 + n.spot.x) * 0.08;
      const ready = cooldownLeft(n.spot.eventId) <= 0;
      const mat = n.marker.material as THREE.SpriteMaterial;
      const tex = ready ? this.readyTex : this.waitTex;
      if (mat.map !== tex) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
      // Turn to face the player when close.
      if (d2 < 36 && n.char) {
        const want = Math.atan2(-dx, -dz);
        n.char.root.rotation.y += Math.atan2(Math.sin(want - n.char.root.rotation.y), Math.cos(want - n.char.root.rotation.y)) * Math.min(1, dt * 5);
      }
    }
    this.dynamics.length = 0;
    // Fewer people out late at night.
    const active = Math.round(this.activeWalkers * (1 - night * 0.5));
    for (let i = 0; i < this.activeWalkers; i++) {
      const w = this.walkers[i];
      const r = w.road;
      const horiz = r.z0 === r.z1;
      const len = this.roadLen(r);
      if (i >= active) {
        w.char.root.visible = false;
        continue;
      }
      let dx = w.x - px;
      let dz = w.z - pz;
      if (w.t === 0 || dx * dx + dz * dz > cd2) {
        this.placeWalker(w, px, pz);
      }
      if (w.pause > 0) w.pause -= dt;
      else {
        w.t += w.dir * w.speed * dt;
        if (this.rng() < dt * 0.02) w.pause = 2 + this.rng() * 4;
      }
      if (w.t < 3 || w.t > len - 3) w.dir = -w.dir;
      w.t = Math.max(3, Math.min(len - 3, w.t));
      const off = r.width / 2 + 1.1;
      const sx = Math.min(r.x0, r.x1);
      const sz = Math.min(r.z0, r.z1);
      w.x = horiz ? sx + w.t : r.x0 + w.side * off;
      w.z = horiz ? r.z0 + w.side * off : sz + w.t;
      dx = w.x - px;
      dz = w.z - pz;
      const vis = dx * dx + dz * dz < cd2;
      w.char.root.visible = vis;
      if (!vis) continue;
      w.char.root.position.set(w.x, 0, w.z);
      const heading = horiz ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : w.dir > 0 ? 0 : Math.PI;
      w.char.root.rotation.y = heading;
      w.char.update(dt, w.pause > 0 ? 0 : w.speed);
      this.dynamics.push({ x: w.x, z: w.z, r: 0.3 });
    }
  }

  /** Walker positions near a point — traffic stops for them. */
  pedestrians(): { x: number; z: number }[] {
    return this.dynamics;
  }
}
