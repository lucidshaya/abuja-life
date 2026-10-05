import { h, show } from './dom';

export interface CardInfo {
  id: string;
  username: string;
  /** "Tech Bro", "Student"… */
  role: string | null;
  roleColor: string;
  place: string;
  /** Metres from you. */
  dist: number;
  driving: boolean;
  dancing: boolean;
}

/**
 * The pop-up you get when you hover over (or tap) another player:
 * who they are, plus Message, Send money and Wave.
 */
export class PlayerCard {
  readonly root = h('div#pcard.pc.hidden', { role: 'dialog', 'aria-label': 'Player' });
  private head = h('div.pc-head');
  private sub = h('div.pc-sub');
  private actions = h('div.pc-actions');
  /** Who the card is for (null = closed). */
  id: string | null = null;
  /** Pinned = opened by click/tap/E (stays until closed); otherwise it follows the mouse hover. */
  pinned = false;
  /** Mouse is over the card itself (keep a hover card open while moving onto its buttons). */
  hovered = false;
  onMessage: (id: string) => void = () => {};
  onMoney: (id: string) => void = () => {};
  onWave: (id: string) => void = () => {};
  onClose: () => void = () => {};
  onClick: () => void = () => {};
  private waveBtn: HTMLButtonElement;

  constructor() {
    const btn = (cls: string, icon: string, label: string, run: () => void) =>
      h('button.pc-btn.' + cls, {
        type: 'button',
        onclick: (e: Event) => {
          e.stopPropagation();
          this.onClick();
          if (this.id) run();
        },
      }, h('span.pc-ic', { text: icon }), h('span', { text: label })) as HTMLButtonElement;
    this.actions.append(
      btn('msg', '💬', 'Message', () => this.onMessage(this.id!)),
      btn('money', '₦', 'Send money', () => this.onMoney(this.id!)),
      (this.waveBtn = btn('wave', '👋🏾', 'Wave', () => this.onWave(this.id!))),
    );
    const close = h('button.pc-x', { type: 'button', 'aria-label': 'Close', onclick: (e: Event) => { e.stopPropagation(); this.hide(); } }, '✕');
    this.root.append(close, this.head, this.sub, this.actions);
    this.root.addEventListener('pointerenter', () => (this.hovered = true));
    this.root.addEventListener('pointerleave', () => (this.hovered = false));
    // Clicks on the card must not reach the game (pointer lock, look drags).
    for (const ev of ['pointerdown', 'mousedown', 'touchstart'] as const) this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    document.body.append(this.root);
  }

  get open(): boolean {
    return this.id !== null;
  }

  show(info: CardInfo, pinned: boolean): void {
    const same = this.id === info.id;
    this.id = info.id;
    this.pinned = pinned || (same && this.pinned);
    this.head.innerHTML = '';
    this.head.append(
      h('span.pc-av', { style: `background:${info.roleColor}`, text: info.username.slice(0, 2).toUpperCase() }),
      h('span.pc-who', {}, h('span.pc-name', { text: '@' + info.username }), h('span.pc-role', { text: info.role ?? 'Abuja resident' })),
    );
    const doing = info.driving ? '🚗 Driving' : info.dancing ? '💃🏾 Dancing' : '🚶🏾 Walking around';
    this.sub.textContent = `${doing} • ${info.place} • ${Math.round(info.dist)} m away`;
    this.root.classList.toggle('pinned', this.pinned);
    show(this.root, true);
  }

  /** Keep the card next to the player on screen (desktop); phones use a bottom sheet (CSS). */
  place(sx: number, sy: number): void {
    const w = this.root.offsetWidth || 280;
    const hh = this.root.offsetHeight || 150;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, sx - w / 2));
    const y = Math.max(8, Math.min(window.innerHeight - hh - 8, sy - hh - 18));
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
  }

  waved(on: boolean): void {
    this.waveBtn.disabled = on;
    this.waveBtn.lastElementChild!.textContent = on ? 'Waved!' : 'Wave';
  }

  hide(): void {
    if (!this.id) return;
    this.id = null;
    this.pinned = false;
    this.hovered = false;
    this.waved(false);
    show(this.root, false);
    this.onClose();
  }
}
