import type { Action, Input } from '../core/Input';
import { $, h, show } from './dom';

function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

/**
 * Mobile controls: floating joystick (left), drag anywhere on the right
 * half to turn (no buttons there), action buttons in a column at the left
 * edge. Uses pointer events so multi-touch just works.
 */
export class TouchControls {
  private root = $('touch');
  private stickZone = h('div.stick-zone');
  private lookZone = h('div.look-zone');
  private base = h('div.stick-base.hidden');
  private knob = h('div.stick-knob');
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookIds = new Map<number, { x: number; y: number }>();
  private btns: Record<string, HTMLButtonElement> = {};
  private actionBtn: HTMLButtonElement;
  private hornBtn: HTMLButtonElement;
  private giveBtn: HTMLButtonElement;
  enabled = false;
  /** A quick tap (not a drag) on the game view: used to tap other players. */
  onTap: (x: number, y: number) => void = () => {};
  private taps = new Map<number, { x: number; y: number; t: number }>();

  constructor(private input: Input) {
    this.base.append(this.knob);
    this.stickZone.append(this.base, h('div.stick-hint', { text: 'Drag to move' }));
    const mk = (cls: string, label: string, action: Action, hold: boolean) => {
      const b = h('button.tbtn.' + cls, { type: 'button', 'aria-label': label }, h('span', { text: label })) as HTMLButtonElement;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        b.setPointerCapture(e.pointerId);
        b.classList.add('on');
        buzz();
        if (hold) this.input.virtualHold(action, true);
        else this.input.virtualPress(action);
      };
      const up = (e: PointerEvent) => {
        e.preventDefault();
        b.classList.remove('on');
        if (hold) this.input.virtualHold(action, false);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      this.btns[cls] = b;
      return b;
    };
    // The whole right side is for turning, so every button lives on the left:
    // a column at the left edge (only the ones that apply right now) and the menu row at the top.
    const column = h('div.tleft', {},
      mk('jump', 'Jump', 'jump', true),
      mk('sprint', 'Nitro', 'sprint', true),
      mk('car', 'Car', 'vehicle', false),
      (this.actionBtn = mk('action', 'Talk', 'interact', false)),
      (this.giveBtn = mk('give', 'Give', 'give', false)),
      (this.hornBtn = mk('horn', 'Horn', 'horn', false)),
    );
    const menu = h('div.tmenu', {}, mk('dance', '💃🏾', 'dance', false), mk('map', '🗺️', 'map', false), mk('phone', '📱', 'phone', false), mk('pause', 'II', 'pause', false));
    for (const [k, l] of [['dance', 'Dance'], ['map', 'Map'], ['phone', 'Phone'], ['pause', 'Pause']] as const) this.btns[k].setAttribute('aria-label', l);
    this.root.append(this.lookZone, this.stickZone, column, menu);

    this.stickZone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      this.stickZone.setPointerCapture(e.pointerId);
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.knob.style.transform = 'translate(-50%, -50%)';
      show(this.base, true);
      this.stickZone.classList.add('active');
    });
    this.stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      const R = 56;
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // Drag the base along so the stick never "runs out".
        const over = d - R;
        this.stickOrigin.x += (dx / d) * over;
        this.stickOrigin.y += (dy / d) * over;
        this.base.style.left = `${this.stickOrigin.x}px`;
        this.base.style.top = `${this.stickOrigin.y}px`;
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const nx = dx / R;
      const ny = -dy / R;
      const m = Math.hypot(nx, ny);
      // Small deadzone, then remap so gentle pushes walk and full pushes run.
      const k = m < 0.12 ? 0 : (m - 0.12) / 0.88 / (m || 1);
      this.input.setVirtualMove(nx * k, ny * k);
    });
    const endStick = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      show(this.base, false);
      this.stickZone.classList.remove('active');
      this.input.setVirtualMove(0, 0);
    };
    this.stickZone.addEventListener('pointerup', endStick);
    this.stickZone.addEventListener('pointercancel', endStick);

    this.lookZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.lookZone.setPointerCapture(e.pointerId);
      this.lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    this.lookZone.addEventListener('pointermove', (e) => {
      const last = this.lookIds.get(e.pointerId);
      if (!last) return;
      this.input.addLook((e.clientX - last.x) * 1.7, (e.clientY - last.y) * 1.4);
      last.x = e.clientX;
      last.y = e.clientY;
    });
    const endLook = (e: PointerEvent) => this.lookIds.delete(e.pointerId);
    this.lookZone.addEventListener('pointerup', endLook);
    this.lookZone.addEventListener('pointercancel', endLook);
    for (const zone of [this.lookZone, this.stickZone]) {
      zone.addEventListener('pointerdown', (e) => this.taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }));
      zone.addEventListener('pointerup', (e) => {
        const t = this.taps.get(e.pointerId);
        this.taps.delete(e.pointerId);
        if (t && performance.now() - t.t < 350 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12) this.onTap(e.clientX, e.clientY);
      });
      zone.addEventListener('pointercancel', (e) => this.taps.delete(e.pointerId));
    }
  }

  setPhoneBadge(n: number): void {
    const b = this.btns.phone;
    if (b) b.dataset.badge = n ? String(n) : '';
  }

  setPhoneNudge(on: boolean): void {
    this.btns.phone?.classList.toggle('nudge', on);
  }

  setVisible(on: boolean): void {
    this.enabled = on;
    show(this.root, on);
    if (!on) {
      this.input.setVirtualMove(0, 0);
      this.stickId = null;
      show(this.base, false);
      this.lookIds.clear();
    }
  }

  setContext(inCar: boolean, action: string | null, give: string | null = null, nearCar = false): void {
    show(this.giveBtn, !!give && !inCar);
    // Only show the Car button when there's a car to enter (or you're driving).
    show(this.btns.car, inCar || nearCar);
    if (give) this.giveBtn.querySelector('span')!.textContent = give;
    this.btns.jump.querySelector('span')!.textContent = inCar ? 'Brake' : 'Jump';
    // On foot, pushing the stick all the way already runs; Nitro is for driving.
    show(this.btns.sprint, inCar);
    this.btns.car.querySelector('span')!.textContent = inCar ? 'Exit' : 'Car';
    show(this.hornBtn, inCar);
    show(this.actionBtn, !!action);
    if (action) this.actionBtn.querySelector('span')!.textContent = action;
  }
}
