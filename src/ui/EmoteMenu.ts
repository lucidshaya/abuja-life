import { EMOTES, type EmoteId } from '../player/Character';
import { h, show } from './dom';

/** Dance picker: Egwu Abuja, Step Pass, Shaku Shaku, Zanku, Buga. Keys 1–5 or tap. */
export class EmoteMenu {
  readonly root = h('div#emotes.hidden');
  onPick: (id: EmoteId) => void = () => {};
  onClick: () => void = () => {};

  constructor(parent: HTMLElement) {
    parent.append(this.root);
    for (const ev of ['pointerdown', 'touchstart'] as const) this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  }

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(touch: boolean): void {
    this.root.innerHTML = '';
    this.root.append(h('div.em-title', { text: touch ? 'Pick a dance 💃🏾' : 'Pick a dance 💃🏾  (1–5 · B to close)' }));
    const row = h('div.em-row');
    EMOTES.forEach((e, i) => {
      const b = h('button.em-btn', { type: 'button', title: e.desc },
        touch ? null : h('kbd', { text: String(i + 1) }),
        h('span.em-name', { text: e.name }),
        h('span.em-desc', { text: e.desc }),
      );
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.onClick();
        this.pick(i);
      });
      row.append(b);
    });
    this.root.append(row);
    show(this.root, true);
  }

  pick(i: number): boolean {
    const e = EMOTES[i];
    if (!this.open || !e) return false;
    this.close();
    this.onPick(e.id);
    return true;
  }

  close(): void {
    show(this.root, false);
  }
}
