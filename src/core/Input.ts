/**
 * One input layer for keyboard + mouse, gamepad and touch. Gameplay code only
 * reads abstract actions and axes, never raw devices.
 */

export type Action =
  | 'forward' | 'back' | 'left' | 'right'
  | 'sprint' | 'jump' | 'interact' | 'vehicle'
  | 'map' | 'pause' | 'horn' | 'camera' | 'mute' | 'phone' | 'dance' | 'give' | 'cursor'
  | 'choice1' | 'choice2' | 'choice3' | 'choice4';

export type Device = 'keyboard' | 'touch' | 'gamepad';

export type Bindings = Record<Action, string[]>;

export const REBINDABLE: Action[] = ['forward', 'back', 'left', 'right', 'sprint', 'jump', 'interact', 'vehicle', 'map', 'horn', 'camera', 'mute', 'phone', 'dance', 'give', 'cursor'];

export const ACTION_LABELS: Record<Action, string> = {
  forward: 'Move forward / Accelerate',
  back: 'Move back / Brake',
  left: 'Move left / Steer left',
  right: 'Move right / Steer right',
  sprint: 'Sprint / Nitro',
  jump: 'Jump / Handbrake',
  interact: 'Talk / Interact',
  vehicle: 'Enter / exit car',
  map: 'City map',
  pause: 'Pause',
  horn: 'Horn (pom pom!)',
  camera: 'Reset camera',
  mute: 'Mute / unmute sound',
  phone: 'Phone',
  dance: 'Dance / emotes',
  give: 'Give cash to someone',
  cursor: 'Free the mouse (click quick actions)',
  choice1: 'Dialogue choice 1',
  choice2: 'Dialogue choice 2',
  choice3: 'Dialogue choice 3',
  choice4: 'Dialogue choice 4',
};

export const DEFAULT_BINDINGS: Bindings = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE', 'Enter'],
  vehicle: ['KeyF'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  horn: ['KeyH'],
  camera: ['KeyC'],
  mute: ['KeyN'],
  phone: ['KeyQ'],
  dance: ['KeyB'],
  give: ['KeyG'],
  cursor: ['KeyT'],
  choice1: ['Digit1', 'Numpad1'],
  choice2: ['Digit2', 'Numpad2'],
  choice3: ['Digit3', 'Numpad3'],
  choice4: ['Digit4', 'Numpad4'],
};

export function mergeBindings(custom: Partial<Bindings> | undefined): Bindings {
  const out = {} as Bindings;
  for (const a of Object.keys(DEFAULT_BINDINGS) as Action[]) {
    const c = custom?.[a];
    out[a] = Array.isArray(c) && c.length > 0 ? c.slice() : DEFAULT_BINDINGS[a].slice();
  }
  return out;
}

export function actionsForCode(bindings: Bindings, code: string): Action[] {
  const out: Action[] = [];
  for (const a of Object.keys(bindings) as Action[]) if (bindings[a].includes(code)) out.push(a);
  return out;
}

/** Bind `code` as the primary key for `action`, removing it from any other rebindable action. */
export function rebind(bindings: Bindings, action: Action, code: string): Bindings {
  const next = mergeBindings(bindings);
  for (const a of REBINDABLE) next[a] = next[a].filter((c) => c !== code);
  const rest = next[action].filter((c) => c !== code).slice(0, 1);
  next[action] = [code, ...rest];
  return next;
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  const map: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', ShiftLeft: 'Shift',
    ShiftRight: 'RShift', ControlLeft: 'Ctrl', ControlRight: 'RCtrl', AltLeft: 'Alt', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab',
  };
  return map[code] ?? code;
}

/** Combine digital keys and analog sources into a clamped move vector. */
export function combineMove(keys: { f: boolean; b: boolean; l: boolean; r: boolean }, analogX: number, analogY: number): { x: number; y: number } {
  let x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0) + analogX;
  let y = (keys.f ? 1 : 0) - (keys.b ? 1 : 0) + analogY;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

const PAD_DEADZONE = 0.16;

function deadzone(v: number): number {
  if (Math.abs(v) < PAD_DEADZONE) return 0;
  return (v - Math.sign(v) * PAD_DEADZONE) / (1 - PAD_DEADZONE);
}

export class Input {
  bindings: Bindings;
  sensitivity = 1;
  invertY = false;
  device: Device = 'keyboard';
  onDeviceChange: ((d: Device) => void) | null = null;
  /** When false, gameplay actions are ignored (menus, typing). */
  enabled = true;

  private held = new Set<Action>();
  private pressed = new Set<Action>();
  private virtualHeld = new Set<Action>();
  private lookX = 0;
  private lookY = 0;
  private analogX = 0;
  private analogY = 0;
  private padX = 0;
  private padY = 0;
  private padLookX = 0;
  private padLookY = 0;
  private padButtons: boolean[] = [];
  private rebindCb: ((code: string) => void) | null = null;
  private dragging = false;
  private canvas: HTMLElement;

  constructor(canvas: HTMLElement, bindings: Bindings) {
    this.canvas = canvas;
    this.bindings = bindings;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => this.clear());
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) this.dragging = true;
      this.setDevice('keyboard');
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('touchstart', () => this.setDevice('touch'), { passive: true });
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestPointerLock(): void {
    if (this.device === 'touch' || this.pointerLocked) return;
    try {
      const r = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch {
      /* not allowed without a gesture; drag-to-look still works */
    }
  }

  exitPointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  setDevice(d: Device): void {
    if (this.device === d) return;
    this.device = d;
    this.onDeviceChange?.(d);
  }

  /** Capture the next key press for remapping. */
  captureNextKey(cb: (code: string) => void): void {
    this.rebindCb = cb;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (this.rebindCb) {
      e.preventDefault();
      const cb = this.rebindCb;
      this.rebindCb = null;
      if (e.code !== 'Escape') cb(e.code);
      else cb('');
      return;
    }
    this.setDevice('keyboard');
    const actions = actionsForCode(this.bindings, e.code);
    if (actions.length > 0 || e.code === 'Tab') e.preventDefault();
    if (e.code === 'Tab') this.pressed.add('pause');
    for (const a of actions) {
      if (!e.repeat) this.pressed.add(a);
      this.held.add(a);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    for (const a of actionsForCode(this.bindings, e.code)) this.held.delete(a);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.pointerLocked || this.dragging) {
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    }
  };

  clear(): void {
    this.held.clear();
    this.virtualHeld.clear();
    this.analogX = this.analogY = 0;
    this.dragging = false;
  }

  // ---- Touch / virtual controls ----
  setVirtualMove(x: number, y: number): void {
    this.analogX = x;
    this.analogY = y;
  }

  addLook(dx: number, dy: number): void {
    this.lookX += dx;
    this.lookY += dy;
  }

  virtualPress(a: Action): void {
    this.pressed.add(a);
  }

  virtualHold(a: Action, on: boolean): void {
    if (on) {
      if (!this.virtualHeld.has(a)) this.pressed.add(a);
      this.virtualHeld.add(a);
    } else this.virtualHeld.delete(a);
  }

  // ---- Queries ----
  isHeld(a: Action): boolean {
    return this.held.has(a) || this.virtualHeld.has(a);
  }

  wasPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** Consume a press so other systems don't also react to it this frame. */
  consume(a: Action): boolean {
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return had;
  }

  move(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    return combineMove(
      { f: this.isHeld('forward'), b: this.isHeld('back'), l: this.isHeld('left'), r: this.isHeld('right') },
      this.analogX + this.padX,
      this.analogY + this.padY,
    );
  }

  /** Look delta in radians for this frame. */
  look(dt: number): { x: number; y: number } {
    const s = 0.0024 * this.sensitivity;
    const padS = 2.6 * this.sensitivity * dt;
    const x = this.lookX * s + this.padLookX * padS;
    let y = this.lookY * s + this.padLookY * padS;
    if (this.invertY) y = -y;
    return this.enabled ? { x, y } : { x: 0, y: 0 };
  }

  /** Poll gamepads; call once per frame before reading input. */
  update(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected) ?? null;
    if (!pad) {
      this.padX = this.padY = this.padLookX = this.padLookY = 0;
      return;
    }
    const ax = (i: number) => deadzone(pad.axes[i] ?? 0);
    this.padX = ax(0);
    this.padY = -ax(1);
    const rt = pad.buttons[7]?.value ?? 0;
    const lt = pad.buttons[6]?.value ?? 0;
    this.padY = Math.max(-1, Math.min(1, this.padY + rt - lt));
    this.padLookX = ax(2) * 1.0;
    this.padLookY = ax(3) * 0.8;
    const map: [number, Action][] = [
      [0, 'jump'], [1, 'sprint'], [2, 'interact'], [3, 'vehicle'], [9, 'pause'], [8, 'map'], [5, 'horn'], [10, 'sprint'], [11, 'camera'],
      [12, 'choice1'], [13, 'choice3'], [14, 'choice2'],
    ];
    let any = Math.abs(this.padX) + Math.abs(this.padY) + Math.abs(this.padLookX) + Math.abs(this.padLookY) > 0;
    for (const [i, a] of map) {
      const down = !!pad.buttons[i]?.pressed;
      const was = !!this.padButtons[i];
      if (down) any = true;
      if (down && !was) {
        this.pressed.add(a);
        this.virtualHeld.add(a);
      } else if (!down && was) this.virtualHeld.delete(a);
      this.padButtons[i] = down;
    }
    if (any) this.setDevice('gamepad');
  }

  /** Call at the very end of each frame. */
  endFrame(): void {
    this.pressed.clear();
    this.lookX = 0;
    this.lookY = 0;
  }
}
