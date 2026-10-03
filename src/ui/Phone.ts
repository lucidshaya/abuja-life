import { BILLS, TRANSFER_FEE, unlockedContacts, type Contact, type Msg, type PhoneState } from '../phone/PhoneData';
import { formatClock } from '../world/DayNight';
import { $, h, naira, show } from './dom';

export interface PhoneHost {
  state: PhoneState;
  money: () => number;
  hour: () => number;
  day: () => number;
  flags: () => ReadonlySet<string>;
  playerName: () => string;
  trackName: () => string;
  muted: () => boolean;
  musicVolume: () => number;
  quality: () => string;
  transfer: (c: Contact, amount: number) => string | null;
  payBill: (id: string) => string | null;
  call: (c: Contact) => void;
  toggleMute: () => void;
  setMusicVolume: (v: number) => void;
  setQuality: (q: 'auto' | 'low' | 'medium' | 'high') => void;
  openMap: () => void;
  openTravel: () => void;
  openSettings: () => void;
  save: () => void;
  click: () => void;
}

type Screen = 'home' | 'bank' | 'transfer' | 'bills' | 'messages' | 'thread' | 'contacts' | 'call' | 'music' | 'maps' | 'settings';

const WALLPAPERS = [
  'linear-gradient(160deg, #0f8a4b 0%, #08321d 60%, #041a0f 100%)',
  'linear-gradient(160deg, #2a64c9 0%, #123e7c 55%, #0a1f40 100%)',
  'linear-gradient(160deg, #f26b1d 0%, #7a1f3d 60%, #2a0a18 100%)',
  'linear-gradient(160deg, #6c2c91 0%, #2a0f3d 60%, #0f0418 100%)',
];

const APPS: { id: Screen; name: string; color: string; glyph: string }[] = [
  { id: 'bank', name: 'OkPay', color: '#16b464', glyph: '₦' },
  { id: 'messages', name: 'Messages', color: '#2a9df4', glyph: '✉' },
  { id: 'contacts', name: 'Contacts', color: '#f2a516', glyph: '☎' },
  { id: 'music', name: 'Music', color: '#e8364f', glyph: '♫' },
  { id: 'maps', name: 'Maps', color: '#0f8a4b', glyph: '⌖' },
  { id: 'settings', name: 'Settings', color: '#5b5f66', glyph: '⚙' },
];

/** The in-game smartphone. */
export class Phone {
  private root = $('phone');
  private frame = h('div.ph-frame');
  private screenEl = h('div.ph-screen');
  private status = h('div.ph-status');
  private body = h('div.ph-body');
  private screen: Screen = 'home';
  private thread: string | null = null;
  private transferTo: Contact | null = null;
  private calling: Contact | null = null;
  private toast = '';
  onClose: () => void = () => {};

  constructor(private host: PhoneHost) {
    const homeBar = h('button.ph-homebar', { type: 'button', 'aria-label': 'Home', onclick: () => this.go('home') });
    const close = h('button.ph-close', { type: 'button', 'aria-label': 'Put phone away', onclick: () => this.close() }, '✕');
    this.screenEl.append(this.status, this.body, homeBar);
    this.frame.append(h('div.ph-notch'), this.screenEl);
    this.root.append(h('div.ph-backdrop', { onclick: () => this.close() }), this.frame, close);
  }

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  unread(): number {
    return this.host.state.messages.filter((m) => !m.read).length;
  }

  show(screen: Screen = 'home'): void {
    this.screen = screen;
    show(this.root, true);
    this.frame.classList.remove('up');
    void this.frame.offsetWidth;
    this.frame.classList.add('up');
    this.render();
  }

  close(): void {
    if (!this.open) return;
    show(this.root, false);
    this.host.save();
    this.onClose();
  }

  /** Back button / Esc: go up one level, or close from home. */
  back(): void {
    const up: Partial<Record<Screen, Screen>> = { bank: 'home', transfer: 'bank', bills: 'bank', messages: 'home', thread: 'messages', contacts: 'home', call: 'contacts', music: 'home', maps: 'home', settings: 'home' };
    const to = up[this.screen];
    if (to) this.go(to);
    else this.close();
  }

  go(s: Screen): void {
    this.host.click();
    this.screen = s;
    this.toast = '';
    this.render();
  }

  refresh(): void {
    if (this.open) this.renderStatus();
  }

  private renderStatus(): void {
    this.status.innerHTML = '';
    this.status.append(
      h('span', { text: formatClock(this.host.hour()).replace(' ', ' ') }),
      h('span.ph-sig', { text: '4G ▮▮▮ ' + (78 - (this.host.day() % 30)) + '%' }),
    );
  }

  private header(title: string, back: Screen | null): HTMLElement {
    return h('div.ph-head', {},
      back ? h('button.ph-back', { type: 'button', 'aria-label': 'Back', onclick: () => this.go(back) }, '‹') : h('span'),
      h('span.ph-title', { text: title }),
      h('span'),
    );
  }

  private render(): void {
    this.renderStatus();
    this.screenEl.style.background = WALLPAPERS[this.host.state.wallpaper % WALLPAPERS.length];
    this.screenEl.dataset.screen = this.screen;
    const b = this.body;
    b.innerHTML = '';
    switch (this.screen) {
      case 'home': return this.renderHome(b);
      case 'bank': return this.renderBank(b);
      case 'transfer': return this.renderTransfer(b);
      case 'bills': return this.renderBills(b);
      case 'messages': return this.renderMessages(b);
      case 'thread': return this.renderThread(b);
      case 'contacts': return this.renderContacts(b);
      case 'call': return this.renderCall(b);
      case 'music': return this.renderMusic(b);
      case 'maps': return this.renderMaps(b);
      case 'settings': return this.renderSettings(b);
    }
  }

  private renderHome(b: HTMLElement): void {
    const unread = this.unread();
    b.append(
      h('div.ph-clock', {}, h('div.ph-time', { text: formatClock(this.host.hour()) }), h('div.ph-date', { text: `Day ${this.host.day()} • Abuja, FCT` })),
      h('div.ph-grid', {}, ...APPS.map((a) =>
        h('button.ph-app', { type: 'button', onclick: () => this.go(a.id) },
          h('span.ph-icon', { style: `background:${a.color}`, text: a.glyph }, a.id === 'messages' && unread ? h('span.ph-badge', { text: String(unread) }) : null),
          h('span.ph-appname', { text: a.name }),
        ))),
      h('div.ph-widget', {}, h('span', { text: 'OkPay balance' }), h('b', { text: this.host.state.hideBalance ? '₦ ••••••' : naira(this.host.money()) })),
    );
  }

  private renderBank(b: HTMLElement): void {
    const st = this.host.state;
    const eye = h('button.ph-eye', { type: 'button', 'aria-label': st.hideBalance ? 'Show balance' : 'Hide balance', onclick: () => { st.hideBalance = !st.hideBalance; this.render(); } }, st.hideBalance ? '👁' : '🙈');
    b.append(
      this.header('OkPay', 'home'),
      h('div.bk-card', {},
        h('div.bk-row', {}, h('span', { text: `Hi, ${this.host.playerName()}` }), eye),
        h('div.bk-label', { text: 'Wallet balance' }),
        h('div.bk-bal', { text: st.hideBalance ? '₦ ••••••' : naira(this.host.money()) }),
        h('div.bk-acct', { text: 'Acct: 81' + String(4400000 + this.host.playerName().length * 7919).slice(0, 8) + ' • OkPay Microfinance' }),
      ),
      h('div.bk-actions', {},
        h('button.bk-act', { type: 'button', onclick: () => this.go('transfer') }, h('span', { text: '↗' }), 'Transfer'),
        h('button.bk-act', { type: 'button', onclick: () => this.go('bills') }, h('span', { text: '📶' }), 'Airtime & Data'),
        h('button.bk-act', { type: 'button', onclick: () => this.go('bills') }, h('span', { text: '💡' }), 'Pay Bills'),
      ),
      this.toastEl(),
      h('div.bk-section', { text: 'Transaction history' }),
      st.txs.length
        ? h('div.bk-list', {}, ...st.txs.slice().reverse().slice(0, 40).map((t) =>
          h('div.bk-tx', {},
            h('div', {}, h('div.bk-txl', { text: t.label }), h('div.bk-txd', { text: `Day ${t.day} • ${formatClock(t.hour)}` })),
            h('div.bk-amt' + (t.amount >= 0 ? '.in' : '.out'), { text: (t.amount >= 0 ? '+' : '−') + naira(Math.abs(t.amount)) }),
          )))
        : h('div.ph-empty', { text: 'No transactions yet. Go and spend small money for Abuja!' }),
    );
  }

  private toastEl(): HTMLElement | string {
    return this.toast ? h('div.ph-toast', { text: this.toast }) : '';
  }

  private renderTransfer(b: HTMLElement): void {
    const contacts = unlockedContacts(this.host.flags());
    b.append(this.header('Transfer', 'bank'));
    if (!this.transferTo) {
      b.append(h('div.bk-section', { text: 'Send to' }), h('div.ct-list', {}, ...contacts.map((c) =>
        h('button.ct-row', { type: 'button', onclick: () => { this.host.click(); this.transferTo = c; this.render(); } }, this.avatar(c), h('span', { text: c.name })))));
      return;
    }
    const c = this.transferTo;
    b.append(
      h('div.tf-to', {}, this.avatar(c), h('div', {}, h('div.tf-name', { text: c.name }), h('div.bk-txd', { text: `Fee: ${naira(TRANSFER_FEE)}` }))),
      this.toastEl(),
      h('div.tf-amts', {}, ...[1000, 5000, 10000, 20000].map((a) =>
        h('button.tf-amt', {
          type: 'button',
          disabled: this.host.money() < a + TRANSFER_FEE,
          onclick: () => {
            const err = this.host.transfer(c, a);
            this.toast = err ?? `Sent ${naira(a)} to ${c.name} ✅`;
            this.transferTo = null;
            this.screen = err ? 'transfer' : 'bank';
            this.render();
          },
        }, naira(a)))),
      h('button.ph-btn.ghost', { type: 'button', onclick: () => { this.transferTo = null; this.render(); } }, 'Choose someone else'),
    );
  }

  private renderBills(b: HTMLElement): void {
    b.append(this.header('Airtime, Data & Bills', 'bank'), this.toastEl(), h('div.ct-list', {}, ...BILLS.map((bill) =>
      h('button.ct-row.bill', {
        type: 'button',
        disabled: this.host.money() < bill.amount,
        onclick: () => {
          const err = this.host.payBill(bill.id);
          this.toast = err ?? `${bill.label}: paid ${naira(bill.amount)} ✅`;
          this.render();
        },
      }, h('span.bill-name', { text: bill.label }), h('span.bill-amt', { text: naira(bill.amount) })))));
  }

  private threads(): { from: string; last: Msg; unread: number }[] {
    const map = new Map<string, { from: string; last: Msg; unread: number }>();
    for (const m of this.host.state.messages) {
      const t = map.get(m.from) ?? { from: m.from, last: m, unread: 0 };
      t.last = m;
      if (!m.read) t.unread++;
      map.set(m.from, t);
    }
    return [...map.values()].sort((a, b) => b.last.day - a.last.day || b.last.hour - a.last.hour);
  }

  private renderMessages(b: HTMLElement): void {
    const threads = this.threads();
    b.append(this.header('Messages', 'home'));
    if (!threads.length) {
      b.append(h('div.ph-empty', { text: 'No messages yet.' }));
      return;
    }
    b.append(h('div.ct-list', {}, ...threads.map((t) =>
      h('button.ms-row', { type: 'button', onclick: () => { this.thread = t.from; this.go('thread'); } },
        h('span.ct-av', { style: `background:${colorFor(t.from)}`, text: initials(t.from) }),
        h('span.ms-mid', {}, h('span.ms-from', { text: t.from }), h('span.ms-prev', { text: t.last.text })),
        t.unread ? h('span.ph-badge.inline', { text: String(t.unread) }) : null,
      ))));
  }

  private renderThread(b: HTMLElement): void {
    const from = this.thread ?? '';
    const msgs = this.host.state.messages.filter((m) => m.from === from);
    msgs.forEach((m) => (m.read = true));
    const list = h('div.th-list', {}, ...msgs.map((m) => h('div.th-bubble', {}, h('div', { text: m.text }), h('div.th-time', { text: `Day ${m.day} • ${formatClock(m.hour)}` }))));
    b.append(this.header(from, 'messages'), list);
    requestAnimationFrame(() => (list.scrollTop = list.scrollHeight));
  }

  private avatar(c: Contact): HTMLElement {
    return h('span.ct-av', { style: `background:${c.color}`, text: initials(c.name) });
  }

  private renderContacts(b: HTMLElement): void {
    const list = unlockedContacts(this.host.flags());
    b.append(
      this.header('Contacts', 'home'),
      h('div.ct-list', {}, ...list.map((c) =>
        h('div.ct-row', {}, this.avatar(c), h('span.ct-name', { text: c.name }),
          h('button.ct-call', { type: 'button', 'aria-label': `Call ${c.name}`, onclick: () => { this.calling = c; this.go('call'); } }, '📞'),
        ))),
      h('div.ph-hint', { text: 'Meet more people around Abuja to save their numbers.' }),
    );
  }

  private renderCall(b: HTMLElement): void {
    const c = this.calling;
    if (!c) return this.renderContacts(b);
    b.append(
      h('div.cl-wrap', {},
        h('span.ct-av.big', { style: `background:${c.color}`, text: initials(c.name) }),
        h('div.cl-name', { text: c.name }),
        h('div.cl-state', { text: 'On call…' }),
        h('div.cl-lines', {}, ...c.callLines.map((l) => h('div.th-bubble.them', { text: l }))),
        c.action === 'taxi'
          ? h('button.ph-btn', { type: 'button', onclick: () => { this.host.click(); this.close(); this.host.call(c); } }, 'Book a ride (₦2,500) ▸')
          : null,
        h('button.cl-end', { type: 'button', 'aria-label': 'End call', onclick: () => this.go('contacts') }, '📵'),
      ),
    );
  }

  private renderMusic(b: HTMLElement): void {
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.host.musicVolume(), id: 'ph-vol', 'aria-label': 'Music volume' }) as HTMLInputElement;
    vol.addEventListener('input', () => this.host.setMusicVolume(parseFloat(vol.value)));
    const playing = !this.host.muted();
    b.append(
      this.header('Music', 'home'),
      h('div.mu-wrap', {},
        h('div.mu-art' + (playing ? '.spin' : ''), {}, h('span', { text: '♫' })),
        h('div.mu-title', { text: this.host.trackName() }),
        h('div.mu-sub', { text: 'Now playing in Abuja' }),
        h('button.mu-play', { type: 'button', 'aria-label': playing ? 'Pause' : 'Play', onclick: () => { this.host.toggleMute(); this.render(); } }, playing ? '❚❚' : '▶'),
        h('label.mu-vol', {}, h('span', { text: 'Volume' }), vol),
      ),
    );
  }

  private renderMaps(b: HTMLElement): void {
    b.append(
      this.header('Maps', 'home'),
      h('div.mp-wrap', {},
        h('button.ph-btn', { type: 'button', onclick: () => { this.host.click(); this.close(); this.host.openTravel(); } }, '✈ Fast travel'),
        h('button.ph-btn.ghost', { type: 'button', onclick: () => { this.host.click(); this.close(); this.host.openMap(); } }, '🗺 City map'),
        h('div.ph-hint', { text: 'Tip: call Danladi in Contacts for a taxi ride anywhere.' }),
      ),
    );
  }

  private renderSettings(b: HTMLElement): void {
    const st = this.host.state;
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.host.musicVolume(), id: 'ph-set-vol', 'aria-label': 'Music volume' }) as HTMLInputElement;
    vol.addEventListener('input', () => this.host.setMusicVolume(parseFloat(vol.value)));
    const q = this.host.quality();
    b.append(
      this.header('Settings', 'home'),
      h('div.st-list', {},
        h('div.st-row', {}, h('span', { text: 'Sound' }), h('button.st-tog' + (this.host.muted() ? '' : '.on'), { type: 'button', onclick: () => { this.host.toggleMute(); this.render(); } }, this.host.muted() ? 'Off' : 'On')),
        h('div.st-row', {}, h('span', { text: 'Music volume' }), vol),
        h('div.st-row.col', {}, h('span', { text: 'Graphics' }), h('div.st-seg', {}, ...(['auto', 'low', 'medium', 'high'] as const).map((v) =>
          h('button' + (q === v ? '.on' : ''), { type: 'button', onclick: () => { this.host.setQuality(v); this.render(); } }, v[0].toUpperCase() + v.slice(1))))),
        h('div.st-row.col', {}, h('span', { text: 'Wallpaper' }), h('div.st-walls', {}, ...WALLPAPERS.map((w, i) =>
          h('button.st-wall' + (st.wallpaper === i ? '.on' : ''), { type: 'button', style: `background:${w}`, 'aria-label': `Wallpaper ${i + 1}`, onclick: () => { st.wallpaper = i; this.host.save(); this.render(); } })))),
        h('button.ph-btn.ghost', { type: 'button', onclick: () => { this.host.click(); this.close(); this.host.openSettings(); } }, 'All game settings & controls'),
      ),
    );
  }
}

function initials(name: string): string {
  const w = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/);
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? '')).toUpperCase();
}

function colorFor(name: string): string {
  const cols = ['#d94f8c', '#123e7c', '#1f9a4f', '#e8a317', '#7a1f3d', '#6c2c91', '#2a9df4', '#16b464'];
  let s = 0;
  for (const ch of name) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return cols[s % cols.length];
}
