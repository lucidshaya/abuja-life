import * as THREE from 'three';
import { worldUniforms } from './Materials';

interface Key {
  h: number;
  top: number;
  horizon: number;
  sun: number;
  sunI: number;
  hemiI: number;
}

// Harmattan-ish warm haze at dawn/dusk, clear blue midday.
const KEYS: Key[] = [
  { h: 0, top: 0x060b1c, horizon: 0x1a2240, sun: 0x9fb0ff, sunI: 0.35, hemiI: 0.55 },
  { h: 5, top: 0x0b1430, horizon: 0x2a2f52, sun: 0x9fb0ff, sunI: 0.35, hemiI: 0.55 },
  { h: 6.3, top: 0x3b4f86, horizon: 0xf2a65e, sun: 0xffb070, sunI: 0.9, hemiI: 0.55 },
  { h: 8, top: 0x4f8fd6, horizon: 0xe9d6b0, sun: 0xffe2b8, sunI: 1.9, hemiI: 0.85 },
  { h: 12, top: 0x3d84d9, horizon: 0xcfe0ea, sun: 0xfff6e6, sunI: 2.4, hemiI: 1.0 },
  { h: 16, top: 0x4a8bd4, horizon: 0xe6dcc0, sun: 0xffecc8, sunI: 2.1, hemiI: 0.9 },
  { h: 18, top: 0x5a6aa8, horizon: 0xf29a52, sun: 0xff9a4a, sunI: 1.1, hemiI: 0.6 },
  { h: 19.3, top: 0x1c2550, horizon: 0x7a4a6a, sun: 0xff9a7a, sunI: 0.35, hemiI: 0.5 },
  { h: 21, top: 0x070c20, horizon: 0x1c2444, sun: 0x9fb0ff, sunI: 0.35, hemiI: 0.55 },
  { h: 24, top: 0x060b1c, horizon: 0x1a2240, sun: 0x9fb0ff, sunI: 0.35, hemiI: 0.55 },
];

const ca = new THREE.Color();
const cb = new THREE.Color();

function sample(hour: number): { top: THREE.Color; horizon: THREE.Color; sun: THREE.Color; sunI: number; hemiI: number } {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (hour - a.h) / (b.h - a.h || 1);
  return {
    top: new THREE.Color().copy(ca.setHex(a.top)).lerp(cb.setHex(b.top), t),
    horizon: new THREE.Color().copy(ca.setHex(a.horizon)).lerp(cb.setHex(b.horizon), t),
    sun: new THREE.Color().copy(ca.setHex(a.sun)).lerp(cb.setHex(b.sun), t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
  };
}

/** 0 at day, 1 at full night. */
export function nightFactor(hour: number): number {
  if (hour >= 7 && hour <= 17.5) return 0;
  if (hour > 17.5 && hour < 19.5) return (hour - 17.5) / 2;
  if (hour > 5 && hour < 7) return 1 - (hour - 5) / 2;
  return 1;
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Game day 1 is a Monday. */
export function weekday(day: number): string {
  return WEEKDAYS[(((Math.floor(day) - 1) % 7) + 7) % 7];
}

/** "Monday" in week 1, "Monday (Wk 2)" after that. */
export function dayLabel(day: number, short = false): string {
  const w = weekday(day);
  const name = short ? w.slice(0, 3) : w;
  const week = Math.floor((Math.floor(day) - 1) / 7) + 1;
  return week > 1 ? `${name} (Wk ${week})` : name;
}

export class DayNight {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  /** Soft moonlit fill so characters never turn into pure silhouettes at night. */
  readonly fill: THREE.AmbientLight;
  readonly sky: THREE.Mesh;
  readonly stars: THREE.Points;
  private skyMat: THREE.ShaderMaterial;
  night = 0;
  /** Indoor lighting override while the player is inside a building. */
  indoor: 'mall' | 'club' | 'hall' | 'dark' | null = null;
  /** Real seconds per in-game hour. */
  secondsPerHour = 60;

  constructor(private scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6b5a3a, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -70;
    cam.right = 70;
    cam.top = 70;
    cam.bottom = -70;
    cam.near = 1;
    cam.far = 400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.fill = new THREE.AmbientLight(0x7d8fc4, 0);
    scene.add(this.hemi, this.sun, this.sun.target, this.fill);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color() },
        horizon: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        sunCol: { value: new THREE.Color() },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 col = mix(horizon, top, pow(max(h, 0.0), 0.55));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunCol * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.25);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    const starGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i < 900; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.9 + 0.08;
      const r = 1300;
      pts.push(Math.cos(u) * Math.cos(v * Math.PI / 2) * r, Math.sin(v * Math.PI / 2) * r, Math.sin(u) * Math.cos(v * Math.PI / 2) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
  }

  /** Update lights & sky for an hour (0-24), centring the sun's shadow box on `focus`. */
  update(hour: number, focus: THREE.Vector3, camera: THREE.PerspectiveCamera): void {
    const camPos = camera.position;
    const s = sample(hour);
    // Sun travels east (+x) to west (-x): rises ~6am, sets ~6:45pm.
    const ang = ((hour - 6.4) / 12.4) * Math.PI;
    const dayDir = new THREE.Vector3(Math.cos(ang), Math.max(Math.sin(ang), -0.3), 0.35).normalize();
    const isDay = Math.sin(ang) > -0.05;
    const dir = isDay ? dayDir : new THREE.Vector3(-0.3, 0.8, -0.5).normalize(); // moonlight
    this.sun.position.copy(focus).addScaledVector(dir, 180);
    this.sun.target.position.copy(focus);
    this.sun.color.copy(s.sun);
    this.sun.intensity = s.sunI;
    this.hemi.intensity = s.hemiI;
    this.hemi.color.copy(s.top).lerp(new THREE.Color(0xffffff), 0.5).lerp(new THREE.Color(0x8fa8ff), nightFactor(hour) * 0.5);
    this.hemi.groundColor.setHex(0x5a4a30).lerp(s.horizon, 0.2);
    this.skyMat.uniforms.top.value.copy(s.top);
    this.skyMat.uniforms.horizon.value.copy(s.horizon);
    this.skyMat.uniforms.sunDir.value.copy(dayDir);
    this.skyMat.uniforms.sunCol.value.copy(s.sun).multiplyScalar(isDay ? 1 : 0);
    // Keep the dome inside the far plane whatever the quality tier's draw distance.
    const k = (camera.far * 0.92) / 1400;
    this.sky.position.copy(camPos);
    this.sky.scale.setScalar(k);
    this.stars.position.copy(camPos);
    this.stars.scale.setScalar(k);
    this.night = nightFactor(hour);
    this.fill.intensity = 0.1 + this.night * 0.9;
    if (this.indoor) {
      // Interiors: fixed artificial light regardless of the time of day.
      this.sun.position.copy(focus).add(new THREE.Vector3(20, 120, 40));
      if (this.indoor === 'dark') {
        // Your house with NEPA gone: only a little light from the windows.
        this.hemi.color.setHex(0x8a94b8);
        this.hemi.groundColor.setHex(0x1a1a24);
        this.hemi.intensity = 0.32;
        this.sun.color.setHex(0x9aa8d0);
        this.sun.intensity = 0.12;
        this.fill.color.setHex(0x404a70);
        this.fill.intensity = 0.15;
      } else if (this.indoor === 'club') {
        this.hemi.color.setHex(0x9b6bff);
        this.hemi.groundColor.setHex(0x301040);
        this.hemi.intensity = 0.9;
        this.sun.color.setHex(0xff7af5);
        this.sun.intensity = 0.35;
        this.fill.color.setHex(0x6a3cff);
        this.fill.intensity = 0.55;
      } else {
        this.hemi.color.setHex(0xfffaf0);
        this.hemi.groundColor.setHex(0xb8a88a);
        this.hemi.intensity = 1.35;
        this.sun.color.setHex(0xffffff);
        this.sun.intensity = 0.9;
        this.fill.color.setHex(0xfff4e0);
        this.fill.intensity = 0.45;
      }
    } else {
      this.fill.color.setHex(0x7d8fc4);
    }
    (this.stars.material as THREE.PointsMaterial).opacity = this.night * 0.9;
    worldUniforms.uNight.value = this.night;
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) fog.color.copy(s.horizon).lerp(s.top, 0.15);
  }
}
