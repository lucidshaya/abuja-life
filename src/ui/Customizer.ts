import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import { Character } from '../player/Character';
import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, LIP_COLORS, OPTIONS, SKIN_TONES, randomCharacter, type CharacterConfig } from '../player/CharacterConfig';
import { $, h, show } from './dom';

type Tab = 'identity' | 'body' | 'face' | 'style';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** Character creator with a live 3D preview on a turntable. */
export class Customizer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private root = $('customizer');
  private panel = h('div.cz-panel');
  private body = h('div.cz-body');
  private char: Character;
  private cfg!: CharacterConfig;
  private tab: Tab = 'identity';
  private spin = 0.4;
  private dragX: number | null = null;
  private zoomFace = false;
  private onDone: ((cfg: CharacterConfig) => void) | null = null;
  private doneBtn = h('button.btn.primary', { type: 'button' }, 'Start Life in Abuja') as HTMLButtonElement;
  private rng = mulberry32(Date.now() & 0xffff);
  onClick: () => void = () => {};

  constructor() {
    this.scene.background = new THREE.Color(0x14301f);
    this.scene.fog = new THREE.Fog(0x14301f, 8, 20);
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x29402c, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 4, 3);
    const rim = new THREE.DirectionalLight(0x8fd1a8, 1.6);
    rim.position.set(-3, 2, -3);
    this.scene.add(key, rim);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 40), new THREE.MeshLambertMaterial({ color: 0x0f8a4b }));
    floor.position.y = -0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
    this.scene.add(floor, ring);
    this.char = new Character(randomCharacter(this.rng));
    this.scene.add(this.char.root);

    const tabNames: Record<Tab, string> = { identity: 'You', body: 'Body', face: 'Face', style: 'Drip' };
    const tabs = h('div.cz-tabs', {}, ...(['identity', 'body', 'face', 'style'] as Tab[]).map((t) =>
      h('button.cz-tab', { type: 'button', 'data-tab': t, onclick: () => { this.onClick(); this.tab = t; this.zoomFace = t === 'face'; this.render(); } }, tabNames[t])));
    const actions = h('div.cz-actions', {},
      h('button.btn', { type: 'button', onclick: () => { this.onClick(); this.randomize(); } }, '🎲 Random'),
      this.doneBtn);
    this.doneBtn.addEventListener('click', () => {
      this.onClick();
      this.onDone?.(this.cfg);
    });
    this.panel.append(h('div.cz-title', { text: 'Create your Abuja character' }), tabs, this.body, actions);
    const stage = h('div.cz-stage', {}, h('div.cz-hint', { text: 'Drag to rotate · tap to zoom face' }));
    stage.addEventListener('pointerdown', (e) => {
      this.dragX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (this.dragX === null) return;
      this.char.root.rotation.y += (e.clientX - this.dragX) * 0.012;
      this.dragX = e.clientX;
      this.spin = 0;
    });
    let downAt = 0;
    stage.addEventListener('pointerdown', () => (downAt = performance.now()));
    stage.addEventListener('pointerup', () => {
      this.dragX = null;
      if (performance.now() - downAt < 220) this.zoomFace = !this.zoomFace;
    });
    this.root.append(stage, this.panel);
  }

  open(cfg: CharacterConfig, mode: 'new' | 'wardrobe', onDone: (cfg: CharacterConfig) => void): void {
    this.cfg = { ...cfg };
    this.onDone = onDone;
    this.tab = mode === 'new' ? 'identity' : 'style';
    this.doneBtn.textContent = mode === 'new' ? 'Start Life in Abuja ▸' : 'Done ✓';
    this.panel.classList.toggle('wardrobe', mode === 'wardrobe');
    this.rebuild();
    this.render();
    show(this.root, true);
  }

  close(): void {
    show(this.root, false);
  }

  private randomize(): void {
    const r = randomCharacter(this.rng);
    this.cfg = { ...r, name: this.cfg.name, background: this.cfg.background };
    this.rebuild();
    this.render();
  }

  private rebuild(): void {
    this.char.build(this.cfg);
  }

  private set<K extends keyof CharacterConfig>(k: K, v: CharacterConfig[K]): void {
    this.cfg[k] = v;
    // Gele/hijab replace any cap.
    if (k === 'hair' && (v === 'gele' || v === 'hijab')) this.cfg.headwear = 'none';
    if (k === 'headwear' && v !== 'none' && (this.cfg.hair === 'gele' || this.cfg.hair === 'hijab')) this.cfg.hair = 'lowcut';
    if (k === 'outfit' && (v === 'ankara' || v === 'asoebi' || v === 'iroBuba') && this.cfg.pattern === 'plain') this.cfg.pattern = 'circles';
    if (k === 'outfit' && v === 'isiagu') this.cfg.pattern = 'lion';
    if (k === 'outfit' && v === 'nysc') {
      this.cfg.headwear = this.cfg.hair === 'gele' || this.cfg.hair === 'hijab' ? 'none' : 'nyscCap';
      this.cfg.shoes = 'boots';
    }
    if (k === 'outfit' && v === 'babariga' && this.cfg.headwear === 'none' && this.cfg.hair !== 'gele' && this.cfg.hair !== 'hijab') this.cfg.headwear = 'zanna';
    if (k === 'outfit' && v === 'abaya' && this.cfg.hair !== 'gele') this.cfg.hair = 'hijab';
    if (k === 'shades' && v) this.cfg.specs = false;
    if (k === 'specs' && v) this.cfg.shades = false;
    this.rebuild();
    this.render();
  }

  private render(): void {
    this.panel.querySelectorAll('.cz-tab').forEach((t) => t.classList.toggle('on', (t as HTMLElement).dataset.tab === this.tab));
    const b = this.body;
    b.innerHTML = '';
    const chips = <K extends keyof CharacterConfig>(label: string, key: K, opts: readonly { id: string; label: string; desc?: string }[]) => {
      const wrap = h('div.cz-group', {}, h('div.cz-label', { text: label }));
      const row = h('div.chips');
      for (const o of opts) {
        row.append(h('button.chip' + (this.cfg[key] === o.id ? '.on' : ''), {
          type: 'button',
          title: o.desc ?? '',
          onclick: () => { this.onClick(); this.set(key, o.id as CharacterConfig[K]); },
        }, o.label));
      }
      wrap.append(row);
      const sel = opts.find((o) => o.id === this.cfg[key]);
      if (sel?.desc) wrap.append(h('div.cz-desc', { text: sel.desc }));
      return wrap;
    };
    const swatches = <K extends 'skin' | 'primary' | 'secondary' | 'hairColor' | 'eyeColor' | 'lips' | 'trousers'>(label: string, key: K, colors: number[]) => {
      const row = h('div.swatches');
      colors.forEach((c, i) => {
        row.append(h('button.sw' + (this.cfg[key] === i ? '.on' : ''), {
          type: 'button',
          style: `background:${hex(c)}`,
          'aria-label': `${label} ${i + 1}`,
          onclick: () => { this.onClick(); this.set(key, i as CharacterConfig[K]); },
        }));
      });
      return h('div.cz-group', {}, h('div.cz-label', { text: label }), row);
    };
    if (this.tab === 'identity') {
      const name = h('input.cz-name', { type: 'text', maxlength: 16, value: this.cfg.name, placeholder: 'Your name', 'aria-label': 'Name' }) as HTMLInputElement;
      name.addEventListener('input', () => (this.cfg.name = name.value.trim() || 'Chidi'));
      b.append(h('div.cz-group', {}, h('div.cz-label', { text: 'Name' }), name));
      b.append(chips('Where you from?', 'background', OPTIONS.background));
    } else if (this.tab === 'body') {
      b.append(swatches('Skin tone', 'skin', SKIN_TONES));
      b.append(chips('Build', 'build', OPTIONS.build));
      b.append(chips('Height', 'height', OPTIONS.height));
      b.append(chips('Hair', 'hair', OPTIONS.hair));
      b.append(swatches('Hair colour', 'hairColor', HAIR_COLORS));
      b.append(chips('Facial hair', 'facialHair', OPTIONS.facialHair));
    } else if (this.tab === 'face') {
      b.append(chips('Face shape', 'face', OPTIONS.face));
      b.append(swatches('Eye colour', 'eyeColor', EYE_COLORS));
      b.append(chips('Eyebrows', 'brows', OPTIONS.brows));
      b.append(swatches('Lip colour', 'lips', LIP_COLORS));
      b.append(chips('Tribal marks', 'marks', OPTIONS.marks));
    } else {
      b.append(chips('Outfit', 'outfit', OPTIONS.outfit));
      b.append(swatches('Main colour', 'primary', CLOTH_COLORS));
      b.append(swatches('Accent / pattern colour', 'secondary', CLOTH_COLORS));
      b.append(chips('Fabric pattern', 'pattern', OPTIONS.pattern));
      b.append(chips('Headwear', 'headwear', OPTIONS.headwear));
      b.append(swatches('Trousers / wrapper colour', 'trousers', CLOTH_COLORS));
      b.append(chips('Shoes', 'shoes', OPTIONS.shoes));
      const toggle = (key: 'shades' | 'specs' | 'watch' | 'chain' | 'bag', label: string) =>
        h('button.chip' + (this.cfg[key] ? '.on' : ''), { type: 'button', onclick: () => { this.onClick(); this.set(key, !this.cfg[key]); } }, label);
      b.append(h('div.cz-group', {}, h('div.cz-label', { text: 'Accessories' }), h('div.chips', {},
        toggle('shades', '😎 Shades'), toggle('specs', '👓 Glasses'), toggle('watch', '⌚ Wristwatch'), toggle('chain', '📿 Gold chain'), toggle('bag', '👜 Side bag'))));
    }
  }

  update(dt: number, w: number, hgt: number): void {
    const desktop = w > hgt * 1.1 && w > 700;
    this.camera.aspect = w / hgt;
    // Shift the character left of centre on wide screens so the panel doesn't cover it.
    const target = this.zoomFace ? new THREE.Vector3(0, 1.6, 0) : new THREE.Vector3(0, 1.0, 0);
    const dist = this.zoomFace ? 1.4 : 4.6;
    const offX = desktop ? (this.zoomFace ? 0.35 : 1.0) : 0;
    const want = new THREE.Vector3(offX, target.y + 0.15, dist);
    this.camera.position.lerp(want, Math.min(1, dt * 6));
    this.camera.lookAt(offX, target.y, 0);
    this.camera.updateProjectionMatrix();
    this.char.root.rotation.y += this.spin * dt;
    this.char.update(dt, 0);
  }
}
