import { h, show } from './dom';

export interface QuickEntry {
  label: string;
  icon: string;
  /** Small grey text under the label (e.g. "ready in 3h"). */
  note?: string;
  accent?: boolean;
}

/**
 * Side panel listing the places inside the location you're in
 * ("Places in Nile University: Library, Go to class, Mama Caf…").
 * Desktop: always open under the minimap, keys 1–9. Mobile: a pill that expands.
 */
export class QuickActions {
  readonly root = h('div#quick.hidden');
  private head = h('button.qa-head', { type: 'button' });
  private list = h('div.qa-list');
  private key = '';
  private collapsed = false;
  private count = 0;
  onPick: (i: number) => void = () => {};
  onClick: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root.append(this.head, this.list);
    parent.append(this.root);
    this.head.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClick();
      this.setCollapsed(!this.collapsed);
    });
    for (const ev of ['pointerdown', 'touchstart'] as const) this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  }

  setCollapsed(on: boolean): void {
    this.collapsed = on;
    this.root.classList.toggle('collapsed', on);
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Show a list (or hide with null). Cheap to call every frame: rebuilds only on change. */
  set(title: string | null, entries: QuickEntry[], touch: boolean): void {
    const key = title === null ? '' : title + '|' + entries.map((e) => e.label + e.note).join('|') + touch;
    if (key === this.key) return;
    const wasHidden = this.key === '';
    this.key = key;
    show(this.root, title !== null);
    if (title === null) return;
    if (wasHidden) this.setCollapsed(touch);
    this.count = entries.length;
    this.head.innerHTML = '';
    this.head.append(h('span.qa-pin', { text: '📍' }), h('span.qa-title', { text: title }), h('span.qa-caret', { text: '▾' }));
    this.list.innerHTML = '';
    if (!touch) this.list.append(h('div.qa-tip', { text: 'Press 1–9 · T frees the mouse' }));
    entries.forEach((e, i) => {
      const b = h('button.qa-item' + (e.accent ? '.accent' : ''), { type: 'button' },
        touch || i > 8 ? null : h('kbd', { text: String(i + 1) }),
        h('span.qa-ic', { text: e.icon }),
        h('span.qa-txt', {}, h('span.qa-label', { text: e.label }), e.note ? h('span.qa-note', { text: e.note }) : null),
      );
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.onClick();
        this.onPick(i);
      });
      this.list.append(b);
    });
  }

  /** Number-key shortcut. Returns true if handled. */
  press(i: number): boolean {
    if (!this.visible || i >= this.count) return false;
    this.onPick(i);
    return true;
  }
}
