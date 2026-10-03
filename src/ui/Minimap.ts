import { DISTRICTS, LANDMARKS, NPC_SPOTS, ROADS, WORLD, type Rect } from '../world/MapData';

const PX = 1.2; // pixels per metre in the cached map image

export interface MapMarker {
  x: number;
  z: number;
  color: string;
  label?: string;
}

/** Pre-rendered top-down map shared by the HUD minimap and the full map. */
export class MapImage {
  readonly canvas: HTMLCanvasElement;

  constructor(buildings: Rect[]) {
    const w = Math.ceil((WORLD.x1 - WORLD.x0) * PX);
    const hgt = Math.ceil((WORLD.z1 - WORLD.z0) * PX);
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = hgt;
    const g = this.canvas.getContext('2d')!;
    const X = (x: number) => (x - WORLD.x0) * PX;
    const Z = (z: number) => (z - WORLD.z0) * PX;
    g.fillStyle = '#a69862';
    g.fillRect(0, 0, w, hgt);
    for (const d of DISTRICTS) {
      g.fillStyle = d.color;
      g.globalAlpha = 0.55;
      g.fillRect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * PX, (d.z1 - d.z0) * PX);
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(245,240,228,0.85)';
    for (const b of buildings) g.fillRect(X(b.x0), Z(b.z0), Math.max(1, (b.x1 - b.x0) * PX), Math.max(1, (b.z1 - b.z0) * PX));
    for (const r of ROADS) {
      g.strokeStyle = r.kind === 'expressway' ? '#2b2c30' : '#3a3b40';
      g.lineWidth = r.width * PX;
      g.lineCap = 'square';
      g.beginPath();
      g.moveTo(X(r.x0), Z(r.z0));
      g.lineTo(X(r.x1), Z(r.z1));
      g.stroke();
    }
    for (const r of ROADS) {
      if (r.kind === 'minor') continue;
      g.strokeStyle = r.kind === 'expressway' ? '#f2c230' : 'rgba(242,194,48,0.7)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(X(r.x0), Z(r.z0));
      g.lineTo(X(r.x1), Z(r.z1));
      g.stroke();
    }
    const L = LANDMARKS;
    g.fillStyle = '#3d8fbf';
    g.beginPath();
    g.ellipse(X(L.lake.x), Z(L.lake.z), L.lake.rx * PX, L.lake.rz * PX, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7d766c';
    for (const rock of [L.zuma, L.aso]) {
      g.beginPath();
      g.arc(X(rock.x), Z(rock.z), rock.r * PX, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#4f8a35';
    g.beginPath();
    g.arc(X(L.area1.x), Z(L.area1.z), L.area1.r * PX, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d4a62a';
    g.beginPath();
    g.arc(X(L.mosque.x), Z(L.mosque.z), 14 * PX, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a6fb5';
    g.fillRect(X(L.church.x - 15), Z(L.church.z - 16), 30 * PX, 36 * PX);
  }

  worldToImg(x: number, z: number): [number, number] {
    return [(x - WORLD.x0) * PX, (z - WORLD.z0) * PX];
  }
}

function arrow(g: CanvasRenderingContext2D, x: number, y: number, ang: number, size: number, fill: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(size, 0);
  g.lineTo(-size * 0.7, size * 0.65);
  g.lineTo(-size * 0.35, 0);
  g.lineTo(-size * 0.7, -size * 0.65);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#111';
  g.stroke();
  g.restore();
}

export class Minimap {
  private g: CanvasRenderingContext2D;
  private size = 0;

  constructor(readonly canvas: HTMLCanvasElement, private img: MapImage) {
    this.g = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const css = this.canvas.clientWidth || 170;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.size = css;
    this.canvas.width = css * dpr;
    this.canvas.height = css * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** radius: metres shown from centre to edge. */
  draw(px: number, pz: number, heading: number, camYaw: number, radius: number, markers: MapMarker[]): void {
    const g = this.g;
    const S = this.size;
    const c = S / 2;
    const scale = c / radius; // css px per metre
    const theta = camYaw - Math.PI;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(c, c, c - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#a69862';
    g.fillRect(0, 0, S, S);
    g.translate(c, c);
    g.rotate(theta);
    const [ix, iz] = this.img.worldToImg(px, pz);
    const k = scale / PX;
    g.scale(k, k);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.img.canvas, -ix, -iz);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = this.canvas.width / S;
    g.scale(dpr, dpr);
    // Markers
    for (const m of markers) {
      const dx = (m.x - px) * scale;
      const dz = (m.z - pz) * scale;
      const rx = dx * Math.cos(theta) - dz * Math.sin(theta);
      const rz = dx * Math.sin(theta) + dz * Math.cos(theta);
      const dist = Math.hypot(rx, rz);
      const max = c - 9;
      const f = dist > max ? max / dist : 1;
      g.beginPath();
      g.arc(c + rx * f, c + rz * f, f < 1 ? 4 : 5.5, 0, Math.PI * 2);
      g.fillStyle = m.color;
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = '#111';
      g.stroke();
      if (m.label && f === 1) {
        g.fillStyle = '#111';
        g.font = '800 8px system-ui';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(m.label, c + rx, c + rz + 0.5);
      }
    }
    arrow(g, c, c, Math.atan2(Math.cos(heading), Math.sin(heading)) + theta, 8, '#ffffff');
    g.restore();
    // North marker on the rim
    const nAng = -Math.PI / 2 + theta + 0; // north is -z → canvas up before rotation
    const nx = c + Math.cos(nAng) * (c - 10);
    const ny = c + Math.sin(nAng) * (c - 10);
    g.beginPath();
    g.arc(nx, ny, 8, 0, Math.PI * 2);
    g.fillStyle = '#0f8a4b';
    g.fill();
    g.fillStyle = '#fff';
    g.font = '900 10px system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', nx, ny + 0.5);
  }
}

/** Full-screen city map (M). */
export class FullMap {
  private g: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement, private img: MapImage) {
    this.g = canvas.getContext('2d')!;
  }

  draw(px: number, pz: number, heading: number, markers: MapMarker[]): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const iw = this.img.canvas.width;
    const ih = this.img.canvas.height;
    const s = Math.min(W / iw, H / ih) * 0.96;
    const ox = (W - iw * s) / 2;
    const oy = (H - ih * s) / 2;
    g.clearRect(0, 0, W, H);
    g.drawImage(this.img.canvas, ox, oy, iw * s, ih * s);
    const P = (x: number, z: number): [number, number] => {
      const [a, b] = this.img.worldToImg(x, z);
      return [ox + a * s, oy + b * s];
    };
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const d of DISTRICTS) {
      const [x, y] = P((d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2);
      g.font = `900 ${Math.max(10, Math.round(14 * s * 1.6))}px system-ui`;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.65)';
      g.strokeText(d.name.toUpperCase(), x, y - 10);
      g.fillStyle = '#fff';
      g.fillText(d.name.toUpperCase(), x, y - 10);
    }
    const labels: [string, number, number][] = [
      ['Zuma Rock', LANDMARKS.zuma.x, LANDMARKS.zuma.z],
      ['Aso Rock', LANDMARKS.aso.x, LANDMARKS.aso.z],
      ['National Mosque', LANDMARKS.mosque.x, LANDMARKS.mosque.z + 20],
      ['Christian Centre', LANDMARKS.church.x, LANDMARKS.church.z + 24],
      ['Eagle Square', LANDMARKS.eagleSquare.x, LANDMARKS.eagleSquare.z],
      ['City Gate', LANDMARKS.cityGate.x, LANDMARKS.cityGate.z - 24],
      ['Area 1', LANDMARKS.area1.x, LANDMARKS.area1.z],
      ['Your Flat', LANDMARKS.home.x, LANDMARKS.home.z - 16],
    ];
    g.font = '700 11px system-ui';
    for (const [t, x, z] of labels) {
      const [a, b] = P(x, z);
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      g.strokeText(t, a, b);
      g.fillStyle = '#ffe9a8';
      g.fillText(t, a, b);
    }
    for (const m of markers) {
      const [a, b] = P(m.x, m.z);
      g.beginPath();
      g.arc(a, b, 6, 0, Math.PI * 2);
      g.fillStyle = m.color;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#111';
      g.stroke();
      if (m.label) {
        g.fillStyle = '#111';
        g.font = '900 8px system-ui';
        g.fillText(m.label, a, b + 0.5);
      }
    }
    const [a, b] = P(px, pz);
    arrow(g, a, b, Math.atan2(Math.cos(heading), Math.sin(heading)), 11, '#ffffff');
  }
}

export function npcMarkers(ready: (eventId: string) => boolean): MapMarker[] {
  return NPC_SPOTS.map((s) => ({ x: s.x, z: s.z, color: ready(s.eventId) ? '#ffd23a' : '#9a9a9a', label: '!' }));
}
