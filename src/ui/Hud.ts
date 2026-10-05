import type { Action, Bindings, Device } from '../core/Input';
import { keyLabel } from '../core/Input';
import { dayLabel, formatClock } from '../world/DayNight';
import { $, h, naira, show } from './dom';
import { formatVisits } from '../online/types';

const EYE_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 5C6.5 5 2.4 8.6 1 12c1.4 3.4 5.5 7 11 7s9.6-3.6 11-7c-1.4-3.4-5.5-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';

/** "● 11 players online · 👁 1,234": the live count plus all-time visits (hidden until the server has a number). */
export function renderOnline(el: HTMLElement, online: number, visits: number | null): void {
  el.innerHTML = '';
  el.append(h('span.on-count', { text: `${online} players online` }));
  if (visits === null) return;
  const v = h('span.visits', { title: `${visits.toLocaleString('en-NG')} all-time visits`, 'aria-label': `${visits.toLocaleString('en-NG')} all-time visits` });
  v.innerHTML = EYE_SVG;
  v.append(h('span', { text: formatVisits(visits) }));
  el.append(v);
}

const PAD_LABEL: Partial<Record<Action, string>> = { interact: 'X', vehicle: 'Y', jump: 'A', sprint: 'B', map: 'View', pause: 'Menu', horn: 'RB' };

export class Hud {
  private root = $('hud');
  private money = h('span.money');
  private clout = h('span.clout');
  private clock = h('span.clock');
  private role = h('div.role-label.hidden');
  private online = h('div.online-row', { text: '10 players online' });
  private district = h('div.district-label');
  private prompt = h('div.prompt.hidden');
  private toast = h('div.toast.hidden');
  private feed = h('div.feed');
  private hints = h('div.hints');
  private speedo = h('div.speedo.hidden');
  private banner = h('button.push.hidden', { type: 'button' });
  private bannerTimer = 0;
  onBanner: () => void = () => {};
  readonly minimapCanvas = h('canvas.minimap') as HTMLCanvasElement;
  private toastTimer = 0;
  private lastMoney = NaN;
  private lastClout = NaN;
  device: Device = 'keyboard';
  bindings!: Bindings;

  constructor() {
    const stats = h('div.stats', {}, this.role, h('div.bal-label', { text: 'OPay account balance' }), h('div.row', {}, this.money), h('div.row', {}, this.clout, this.clock), this.district, this.online);
    this.root.append(stats, h('div.minimap-wrap', {}, this.minimapCanvas), this.toast, this.prompt, this.feed, this.hints, this.speedo, this.banner);
    this.banner.addEventListener('click', (e) => {
      e.stopPropagation();
      show(this.banner, false);
      this.onBanner();
    });
    this.banner.addEventListener('pointerdown', (e) => e.stopPropagation());
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
    this.clock.textContent = `${dayLabel(day, true)} · ${formatClock(hour)}`;
  }

  resetDeltas(): void {
    this.lastMoney = NaN;
    this.lastClout = NaN;
  }

  setOnline(n: number, visits: number | null = null): void {
    renderOnline(this.online, n, visits);
  }

  setRole(text: string | null, color = '#f2c230'): void {
    show(this.role, !!text);
    this.role.textContent = text ?? '';
    this.role.style.setProperty('--c', color);
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

  /** Phone-style push notification that slides down from the top. */
  push(app: string, color: string, glyph: string, title: string, text: string): void {
    this.banner.innerHTML = '';
    this.banner.append(
      h('span.push-ic', { style: `background:${color}`, text: glyph }),
      h('span.push-mid', {}, h('span.push-app', {}, h('b', { text: app }), h('span', { text: ' • now' })), h('span.push-title', { text: title }), h('span.push-text', { text })),
    );
    show(this.banner, true);
    this.banner.classList.remove('in');
    void this.banner.offsetWidth;
    this.banner.classList.add('in');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => show(this.banner, false), 4200);
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
      : `${move}<br>${k('sprint')} run · ${k('jump')} jump · ${k('interact')} talk · ${k('vehicle')} car<br>${k('dance')} dance · ${k('give')} give cash · ${k('phone')} phone<br>${k('map')} map & teleport · ${k('camera')} camera · ${k('pause')} pause`;
  }
}
