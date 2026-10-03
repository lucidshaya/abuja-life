import { $, h, show } from './dom';

export interface DialogueChoice {
  text: string;
  locked?: string;
}

export interface DialogueOpts {
  title: string;
  speaker: string;
  lines: string[];
  choices: DialogueChoice[] | null;
  onChoice?: (i: number) => { text: string; tags: { text: string; kind: 'good' | 'bad' | 'info' }[] };
  onClose: () => void;
}

/** Bottom-of-screen conversation panel with typewriter text and numbered choices. */
export class Dialogue {
  private root = $('dialogue');
  private title = h('div.d-title');
  private speaker = h('div.d-speaker');
  private text = h('div.d-text');
  private choicesEl = h('div.d-choices');
  private next = h('button.d-next', { type: 'button' }, 'Continue ▸');
  private opts: DialogueOpts | null = null;
  private lineIdx = 0;
  private full = '';
  private shown = 0;
  private phase: 'lines' | 'choices' | 'outcome' = 'lines';
  private typing = false;
  onClick: (() => void) | null = null;
  keyLabel: (i: number) => string = (i) => String(i + 1);

  constructor() {
    this.root.append(h('div.d-head', {}, this.speaker, this.title), this.text, this.choicesEl, this.next);
    this.next.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClick?.();
      this.advance();
    });
    this.text.addEventListener('click', () => this.advance());
  }

  get open(): boolean {
    return this.opts !== null;
  }

  start(opts: DialogueOpts): void {
    this.opts = opts;
    this.lineIdx = 0;
    this.phase = 'lines';
    this.title.textContent = opts.title;
    this.speaker.textContent = opts.speaker;
    show(this.root, true);
    this.root.classList.remove('pop');
    void this.root.offsetWidth;
    this.root.classList.add('pop');
    this.showLine();
  }

  private setText(t: string): void {
    this.full = t;
    this.shown = 0;
    this.typing = true;
    this.text.textContent = '';
  }

  private showLine(): void {
    if (!this.opts) return;
    this.choicesEl.innerHTML = '';
    this.setText(this.opts.lines[this.lineIdx] ?? '');
    const last = this.lineIdx >= this.opts.lines.length - 1;
    show(this.next, true);
    this.next.textContent = last && !this.opts.choices ? 'Close ✕' : 'Continue ▸';
  }

  private showChoices(): void {
    if (!this.opts?.choices) return;
    this.phase = 'choices';
    show(this.next, false);
    this.choicesEl.innerHTML = '';
    this.opts.choices.forEach((c, i) => {
      const btn = h('button.d-choice', { type: 'button', disabled: !!c.locked }, h('kbd', { text: this.keyLabel(i) }), h('span', { text: c.text }), c.locked ? h('em', { text: `🔒 ${c.locked}` }) : null);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClick?.();
        this.choose(i);
      });
      this.choicesEl.append(btn);
    });
  }

  /** Space / E / tap: finish typing or go to the next step. */
  advance(): void {
    if (!this.opts) return;
    if (this.typing) {
      this.shown = this.full.length;
      this.text.textContent = this.full;
      this.typing = false;
      if (this.phase === 'lines' && this.lineIdx === this.opts.lines.length - 1 && this.opts.choices) this.showChoices();
      return;
    }
    if (this.phase === 'lines') {
      if (this.lineIdx < this.opts.lines.length - 1) {
        this.lineIdx++;
        this.showLine();
      } else if (this.opts.choices) this.showChoices();
      else this.close();
    } else if (this.phase === 'outcome') this.close();
  }

  choose(i: number): void {
    if (!this.opts || this.phase !== 'choices' || !this.opts.choices) return;
    const c = this.opts.choices[i];
    if (!c || c.locked) return;
    const res = this.opts.onChoice?.(i);
    this.phase = 'outcome';
    this.choicesEl.innerHTML = '';
    this.setText(res?.text ?? '');
    if (res?.tags.length) this.choicesEl.append(h('div.d-tags', {}, ...res.tags.map((t) => h(`span.tag.${t.kind}`, { text: t.text }))));
    show(this.next, true);
    this.next.textContent = 'Continue ▸';
  }

  get choosing(): boolean {
    return this.phase === 'choices';
  }

  close(): void {
    const o = this.opts;
    this.opts = null;
    show(this.root, false);
    o?.onClose();
  }

  update(dt: number): void {
    if (!this.typing) return;
    this.shown = Math.min(this.full.length, this.shown + dt * 55);
    this.text.textContent = this.full.slice(0, Math.floor(this.shown));
    if (this.shown >= this.full.length) {
      this.typing = false;
      if (this.phase === 'lines' && this.opts && this.lineIdx === this.opts.lines.length - 1 && this.opts.choices) this.showChoices();
    }
  }
}
