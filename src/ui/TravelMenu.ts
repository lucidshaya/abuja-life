import { TRAVEL, type TravelSpot } from '../world/locations/Locations';
import { LANDMARKS } from '../world/MapData';
import { $, h, show } from './dom';

export type TravelChoice = TravelSpot | 'gate' | 'stay';
export type TravelMode = 'start' | 'continue' | 'pause' | 'taxi';

interface Pin {
  name: string;
  area: string;
  desc: string;
  color: string;
  featured: boolean;
  badge?: string;
  x: number;
  z: number;
  choice: TravelChoice;
  el: HTMLElement;
}

export type Projector = (x: number, y: number, z: number) => { sx: number; sy: number; visible: boolean };

/**
 * Bird's-eye travel picker: the camera hovers over the whole 3D city and
 * each place gets a pin. Hover (or tap) a pin to see what's there, click to go.
 */
export class TravelMenu {
  private root = $('travel');
  private layer = h('div.tv-pins');
  private card = h('div.tv-card.hidden');
  private pins: Pin[] = [];
  private selected: Pin | null = null;
  private onPick: ((c: TravelChoice) => void) | null = null;
  private touchMode = false;
  onClick: () => void = () => {};

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(mode: TravelMode, onPick: (c: TravelChoice) => void, onBack?: () => void, extra?: { x: number; z: number }, extras: { spot: TravelSpot; badge: string }[] = []): void {
    this.onPick = onPick;
    this.selected = null;
    this.touchMode = document.body.classList.contains('touch-mode');
    const r = this.root;
    r.innerHTML = '';
    this.layer.innerHTML = '';
    this.pins = [];
    const add = (p: Omit<Pin, 'el'>) => {
      const el = h('button.tv-pin' + (p.featured ? '.feat' : '') + (p.badge ? '.special' : ''), { type: 'button', style: `--c:${p.color}`, 'aria-label': p.name },
        h('span.tv-dot', {}, h('span.tv-ring')),
        h('span.tv-label', { text: p.name }),
      );
      const pin: Pin = { ...p, el };
      el.addEventListener('pointerenter', (e) => {
        if ((e as PointerEvent).pointerType !== 'touch') this.select(pin);
      });
      el.addEventListener('pointerdown', (e) => {
        this.touchMode = (e as PointerEvent).pointerType === 'touch';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.touchMode && this.selected !== pin) this.select(pin);
        else this.pick(pin);
      });
      this.layer.append(el);
      this.pins.push(pin);
    };
    add({ name: 'Abuja City Gate', area: 'Expressway', desc: 'The famous gate on the Abuja–Kaduna expressway. Uncle Emeka dey wait.', color: '#0f7a45', featured: false, badge: mode === 'start' ? 'START' : undefined, x: LANDMARKS.cityGate.x, z: LANDMARKS.cityGate.z, choice: 'gate' });
    if (mode === 'continue' && extra) {
      add({ name: 'Continue here', area: 'Where you stopped', desc: 'Pick up right where you left off.', color: '#ffffff', featured: false, badge: 'YOU', x: extra.x, z: extra.z, choice: 'stay' });
    }
    for (const { spot: w, badge } of extras) add({ name: w.name, area: w.area, desc: w.desc, color: w.color, featured: false, badge, x: w.x, z: w.z, choice: w });
    for (const t of TRAVEL) add({ name: t.name, area: t.area, desc: t.desc, color: t.color, featured: t.featured, x: t.pin?.x ?? t.x, z: t.pin?.z ?? t.z, choice: t });

    const title = mode === 'taxi' ? 'Where we dey go, boss?' : 'Where you dey go?';
    const sub = mode === 'taxi' ? 'Danladi go drop you anywhere for ₦2,500. Pick a place on the map.' : this.touchMode ? 'Tap a pin to see the place, then tap Go.' : 'Hover over a place to see it. Click to travel there.';
    const list = h('div.tv-list', {}, ...this.pins.map((p) =>
      h('button.tcard', { type: 'button', style: `--c:${p.color}`, onclick: () => this.pick(p), onmouseenter: () => this.select(p) },
        h('span.tl-dot'), h('span.tl-name', { text: p.name }), p.featured ? h('span.tl-star', { text: '★' }) : p.badge ? h('span.tl-badge', { text: p.badge }) : null,
      )));
    r.append(
      this.layer,
      h('div.tv-top', {},
        h('div', {}, h('div.travel-title', { text: title }), h('div.travel-sub', { text: sub })),
        onBack ? h('button.btn.small', { type: 'button', onclick: () => { this.onClick(); this.hide(); onBack(); } }, mode === 'taxi' ? 'Cancel ride' : 'Back') : null,
      ),
      this.card,
      h('div.tv-side', {}, h('div.travel-label', { text: 'All places  •  ★ = fully built out' }), list),
    );
    show(this.card, false);
    show(r, true);
  }

  private select(p: Pin): void {
    if (this.selected === p) return;
    this.selected = p;
    for (const q of this.pins) q.el.classList.toggle('sel', q === p);
    this.card.innerHTML = '';
    this.card.style.setProperty('--c', p.color);
    this.card.append(
      h('div.tvc-band', {}, h('span', { text: p.area }), p.featured ? h('span.tc-badge', { text: 'FEATURED' }) : p.badge ? h('span.tc-badge', { text: p.badge }) : null),
      h('div.tvc-name', { text: p.name }),
      h('div.tvc-desc', { text: p.desc }),
      h('button.btn.primary.tvc-go', { type: 'button', onclick: () => this.pick(p) }, 'Go there ▸'),
    );
    show(this.card, true);
  }

  private pick(p: Pin): void {
    this.onClick();
    const cb = this.onPick;
    this.hide();
    cb?.(p.choice);
  }

  hide(): void {
    show(this.root, false);
    this.onPick = null;
  }

  /** Position pins over the 3D view each frame. */
  update(project: Projector): void {
    if (!this.open) return;
    for (const p of this.pins) {
      const s = project(p.x, p.featured ? 24 : 14, p.z);
      p.el.style.transform = `translate(${s.sx.toFixed(1)}px, ${s.sy.toFixed(1)}px)`;
      p.el.style.visibility = s.visible ? 'visible' : 'hidden';
    }
    if (this.selected && !this.touchMode) {
      const s = project(this.selected.x, 0, this.selected.z);
      this.card.classList.toggle('left', s.sx > window.innerWidth * 0.55);
    }
  }
}
