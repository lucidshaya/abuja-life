import type { Action, Bindings, Device } from '../core/Input';
import { keyLabel } from '../core/Input';
import { formatClock } from '../world/DayNight';
import { $, h, naira, show } from './dom';

const PAD_LABEL: Partial<Record<Action, string>> = { interact: 'X', vehicle: 'Y', jump: 'A', sprint: 'B', map: 'View', pause: 'Menu', horn: 'RB' };

export class Hud {
  private root = $('hud');
  private money = h('span.money');
  private clout = h('span.clout');
  private clock = h('span.clock');
  private district = h('div.district-label');
  private prompt = h('div.prompt.hidden');
  private toast = h('div.toast.hidden');
  private feed = h('div.feed');
  private hints = h('div.hints');
  private speedo = h('div.speedo.hidden');
  readonly minimapCanvas = h('canvas.minimap') as HTMLCanvasElement;
  private toastTimer = 0;
  private lastMoney = NaN;
  private lastClout = NaN;
  device: Device = 'keyboard';
  bindings!: Bindings;

  constructor() {
    const stats = h('div.stats', {}, h('div.row', {}, this.money), h('div.row', {}, this.clout, this.clock), this.district);
    this.root.append(stats, h('div.minimap-wrap', {}, this.minimapCanvas), this.toast, this.prompt, this.feed, this.hints, this.speedo);
  }

  setVisible(on: boolean): void {
    show(this.root, on);
  }

  key(a: Action): string {
    if (this.device === 'gamepad') return PAD_LABEL[a] ?? a;
    return keyLabel(this.bindings[a][0] ?? '?');
  }

  setStats(money: number, clout: number, hour: number, day: number): void {
    if (money !== this.lastMoney) {
      if (!Number.isNaN(this.lastMoney)) this.notify((money > this.lastMoney ? '+' : '−') + naira(Math.abs(money - this.lastMoney)), money > this.lastMoney ? 'good' : 'bad');
      this.lastMoney = money;
      this.money.textContent = naira(money);
    }
    if (clout !== this.lastClout) {
      if (!Number.isNaN(this.lastClout)) {
        const d = clout - this.lastClout;
        this.notify(`${d > 0 ? '+' : '−'}${Math.abs(d)} clout`, d > 0 ? 'good' : 'bad');
      }
      this.lastClout = clout;
      this.clout.textContent = `★ ${clout} clout`;
    }
    this.clock.textContent = `Day ${day} · ${formatClock(hour)}`;
  }

  resetDeltas(): void {
    this.lastMoney = NaN;
    this.lastClout = NaN;
  }

  setDistrict(name: string): void {
    this.district.textContent = name;
  }

  showToast(title: string, sub: string): void {
    this.toast.innerHTML = '';
    this.toast.append(h('div.t', { text: title }), h('div.s', { text: sub }));
    show(this.toast, true);
    this.toast.classList.remove('anim');
    void this.toast.offsetWidth;
    this.toast.classList.add('anim');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => show(this.toast, false), 3800);
  }

  setPrompt(action: Action | null, text: string): void {
    if (!action) {
      show(this.prompt, false);
      return;
    }
    this.prompt.innerHTML = '';
    if (this.device !== 'touch') this.prompt.append(h('kbd', { text: this.key(action) }));
    this.prompt.append(h('span', { text }));
    show(this.prompt, true);
  }

  notify(text: string, kind: 'good' | 'bad' | 'info' = 'info'): void {
    const el = h(`div.note.${kind}`, { text });
    this.feed.append(el);
    setTimeout(() => el.remove(), 2600);
    while (this.feed.children.length > 5) this.feed.firstElementChild?.remove();
  }

  setSpeed(kmh: number | null): void {
    if (kmh === null) {
      show(this.speedo, false);
      return;
    }
    show(this.speedo, true);
    this.speedo.innerHTML = `<b>${Math.round(kmh)}</b><span>km/h</span>`;
  }

  updateHints(showHints: boolean, inCar: boolean): void {
    const on = showHints && this.device !== 'touch';
    show(this.hints, on);
    if (!on) return;
    const k = (a: Action) => `<kbd>${this.key(a)}</kbd>`;
    const move = this.device === 'gamepad' ? '<kbd>L</kbd> move <kbd>R</kbd> look' : `${k('forward')}${k('left')}${k('back')}${k('right')} move · mouse look`;
    this.hints.innerHTML = inCar
      ? `${move.replace('move', 'drive')}<br>${k('jump')} handbrake · ${k('sprint')} nitro · ${k('horn')} horn · ${k('vehicle')} exit<br>${k('map')} map · ${k('pause')} pause`
      : `${move}<br>${k('sprint')} run · ${k('jump')} jump · ${k('interact')} talk · ${k('vehicle')} car<br>${k('map')} map · ${k('camera')} camera · ${k('pause')} pause`;
  }
}
