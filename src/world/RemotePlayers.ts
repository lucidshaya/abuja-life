import * as THREE from 'three';
import { Character, type Detail, type Pose } from '../player/Character';
import { carModelGeometry } from '../player/Vehicle';
import { REMOTE_TIMEOUT, type RemoteState } from '../online/WorldNet';

/** How far away other players are drawn, and at most how many. */
const VIEW = 220;
const MAX_SHOWN = 24;

interface Avatar {
  id: string;
  root: THREE.Group;
  char: Character | null;
  lookKey: string;
  car: THREE.Mesh | null;
  carKey: string;
  tag: THREE.Sprite;
  tagText: string;
  hit: THREE.Mesh;
  state: RemoteState;
  /** Shown position (smoothed toward the latest state). */
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Velocity estimated from the last two states, for gliding between updates. */
  vx: number;
  vz: number;
  age: number;
  visible: boolean;
  /** Distance from you this frame. */
  d: number;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hitGeo = new THREE.CylinderGeometry(0.55, 0.55, 2, 8).translate(0, 1, 0);
const carHitGeo = new THREE.BoxGeometry(2.2, 1.7, 4.8).translate(0, 0.85, 0);
const carMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0x666666 });

/** Other real players walking and driving around the city. */
export class RemotePlayers {
  readonly group = new THREE.Group();
  private list = new Map<string, Avatar>();
  /** @username for an id (null while unknown: the avatar waits). */
  name: (id: string) => string | null = () => null;
  detail: Detail = 'high';

  constructor() {
    this.group.name = 'remote-players';
  }

  apply(s: RemoteState): void {
    let a = this.list.get(s.id);
    if (!a) {
      const root = new THREE.Group();
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      tag.scale.set(2.4, 0.5, 1);
      tag.renderOrder = 5;
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.userData.remoteId = s.id;
      root.add(tag, hit);
      root.visible = false;
      this.group.add(root);
      a = { id: s.id, root, char: null, lookKey: '', car: null, carKey: '', tag, tagText: '', hit, state: s, x: s.x, y: s.y, z: s.z, heading: s.heading, vx: 0, vz: 0, age: 0, visible: false, d: Infinity };
      this.list.set(s.id, a);
    } else {
      // Velocity from the change since the last state (clamped so teleports don't fling).
      const dt = Math.max(0.1, a.age);
      const vx = (s.x - a.state.x) / dt;
      const vz = (s.z - a.state.z) / dt;
      const ok = Math.hypot(vx, vz) < 60;
      a.vx = ok ? vx : 0;
      a.vz = ok ? vz : 0;
      if (Math.hypot(s.x - a.x, s.z - a.z) > 40) {
        a.x = s.x;
        a.z = s.z;
      }
      a.state = { ...s, look: s.look ?? a.state.look };
    }
    a.age = 0;
    const look = s.look ?? a.state.look;
    if (look) {
      const key = JSON.stringify(look);
      if (key !== a.lookKey) {
        a.lookKey = key;
        if (a.char) a.char.build(look, false);
        else {
          a.char = new Character(look, false, this.detail);
          a.root.add(a.char.root);
        }
      }
    }
    const carKey = s.car ? `${s.car.model}:${s.car.color}` : '';
    if (carKey !== a.carKey) {
      a.carKey = carKey;
      if (a.car) {
        a.root.remove(a.car);
        a.car.geometry.dispose();
        a.car = null;
      }
      if (s.car) {
        a.car = new THREE.Mesh(carModelGeometry(s.car.model, s.car.color, true), carMat);
        a.root.add(a.car);
      }
      a.hit.geometry = s.car ? carHitGeo : hitGeo;
    }
  }

  remove(id: string): void {
    const a = this.list.get(id);
    if (!a) return;
    this.group.remove(a.root);
    a.char?.dispose();
    a.car?.geometry.dispose();
    (a.tag.material as THREE.SpriteMaterial).map?.dispose();
    a.tag.material.dispose();
    this.list.delete(id);
  }

  clear(): void {
    for (const id of [...this.list.keys()]) this.remove(id);
  }

  /** Smooth movement, hide players in another "instance" (another estate block, someone's house) or far away. */
  update(dt: number, me: { x: number; z: number; inst: string } | null): void {
    const near: Avatar[] = [];
    for (const a of this.list.values()) {
      a.age += dt;
      if (a.age > REMOTE_TIMEOUT) {
        this.remove(a.id);
        continue;
      }
      const s = a.state;
      // Glide forward with the last known velocity (max ~1 update late), then ease toward it.
      const lead = Math.min(a.age, 0.5);
      const tx = s.x + a.vx * lead;
      const tz = s.z + a.vz * lead;
      const k = Math.min(1, dt * 8);
      a.x += (tx - a.x) * k;
      a.z += (tz - a.z) * k;
      a.y += (s.y - a.y) * k;
      let dh = s.heading - a.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      a.heading += dh * Math.min(1, dt * 10);
      a.d = me ? Math.hypot(a.x - me.x, a.z - me.z) : Infinity;
      const show = !!me && !!a.char && s.inst === me.inst && a.d < VIEW && this.name(a.id) !== null;
      a.visible = show;
      if (show) near.push(a);
      else a.root.visible = false;
    }
    near.sort((p, q) => p.d - q.d);
    near.forEach((a, i) => {
      const on = i < MAX_SHOWN;
      a.root.visible = on;
      a.visible = on;
      if (!on) return;
      a.root.position.set(a.x, a.car ? 0 : a.y, a.z);
      a.root.rotation.y = a.heading;
      const c = a.char!;
      c.root.visible = !a.car;
      if (!a.car) {
        c.pose = a.state.pose as Pose;
        c.update(dt, a.state.speed, a.y > 0.15);
      }
      const name = this.name(a.id)!;
      if (name !== a.tagText) {
        a.tagText = name;
        const m = a.tag.material as THREE.SpriteMaterial;
        m.map?.dispose();
        m.map = nameTexture('@' + name);
        m.needsUpdate = true;
      }
      a.tag.position.y = a.car ? 2.3 : 2.25 * (c.root.scale.y || 1);
    });
  }

  /** Player under the ray (mouse / screen centre / tap). */
  pick(ray: THREE.Raycaster, maxD = 60): string | null {
    const hits: THREE.Object3D[] = [];
    for (const a of this.list.values()) if (a.visible) hits.push(a.hit);
    const r = ray.intersectObjects(hits, false).find((h) => h.distance <= maxD);
    return (r?.object.userData.remoteId as string | undefined) ?? null;
  }

  nearest(x: number, z: number, maxD: number): string | null {
    let best: string | null = null;
    let bd = maxD;
    for (const a of this.list.values()) {
      if (!a.visible) continue;
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bd) {
        bd = d;
        best = a.id;
      }
    }
    return best;
  }

  info(id: string): { id: string; x: number; y: number; z: number; role: string | null; driving: boolean; dancing: boolean } | null {
    const a = this.list.get(id);
    if (!a || !a.visible) return null;
    return { id, x: a.x, y: a.y, z: a.z, role: a.state.role, driving: !!a.car, dancing: a.state.pose !== 'normal' };
  }

  get count(): number {
    let n = 0;
    for (const a of this.list.values()) if (a.visible) n++;
    return n;
  }

  /** Positions for the minimap. */
  dots(): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = [];
    for (const a of this.list.values()) if (a.visible) out.push({ x: a.x, z: a.z });
    return out;
  }
}

function nameTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 108;
  const x = c.getContext('2d')!;
  x.font = 'bold 50px system-ui, sans-serif';
  const w = Math.min(500, x.measureText(text).width + 44);
  const r = 30;
  const x0 = (512 - w) / 2;
  x.fillStyle = 'rgba(8, 40, 22, 0.78)';
  x.beginPath();
  if (x.roundRect) x.roundRect(x0, 22, w, 66, r);
  else x.rect(x0, 22, w, 66);
  x.fill();
  x.fillStyle = '#7cf29a';
  x.beginPath();
  x.arc(x0 + 24, 55, 8, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ffffff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 256 + 8, 57, w - 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
