import { BILLS, TRANSFER_FEE, unlockedContacts, type Contact, type Mail, type Msg, type PhoneState } from '../phone/PhoneData';
import { dayLabel, formatClock } from '../world/DayNight';
import type { Social } from '../online/Social';
import type { PlayerRef } from '../online';
import { $, h, naira, show } from './dom';

export interface PhoneHost {
  state: PhoneState;
  money: () => number;
  hour: () => number;
  day: () => number;
  flags: () => ReadonlySet<string>;
  playerName: () => string;
  trackName: () => string;
  nextTrack: () => void;
  /** "⚡ 12 kWh left • Service charge: paid" */
  homeStatus: () => string;
  social: () => Social | null;
  /** Send OPay money to another player by @username. Returns an error or null. */
  sendToPlayer: (username: string, amount: number, note: string) => Promise<string | null>;
  muted: () => boolean;
  musicVolume: () => number;
  quality: () => string;
  transfer: (c: Contact, amount: number) => string | null;
  /** Send to any account by name. */
  sendAny: (name: string, bank: string, amount: number) => string | null;
  /** Ask a contact for money. Returns what they replied. */
  request: (c: Contact, amount: number) => string;
  email: () => string;
  roleName: () => string | null;
  payBill: (id: string) => string | null;
  call: (c: Contact) => void;
  toggleMute: () => void;
  setMusicVolume: (v: number) => void;
  setQuality: (q: 'auto' | 'low' | 'medium' | 'high') => void;
  openMap: () => void;
  openWardrobe: () => void;
  openTravel: () => void;
  openSettings: () => void;
  save: () => void;
  click: () => void;
}

type Screen = 'wardrobe' | 'chats' | 'chat' | 'toplayer' | 'home' | 'bank' | 'transfer' | 'sendany' | 'request' | 'bills' | 'mail' | 'mailview' | 'messages' | 'thread' | 'contacts' | 'call' | 'music' | 'maps' | 'settings';

const WALLPAPERS = [
  'linear-gradient(160deg, #0f8a4b 0%, #08321d 60%, #041a0f 100%)',
  'linear-gradient(160deg, #2a64c9 0%, #123e7c 55%, #0a1f40 100%)',
  'linear-gradient(160deg, #f26b1d 0%, #7a1f3d 60%, #2a0a18 100%)',
  'linear-gradient(160deg, #6c2c91 0%, #2a0f3d 60%, #0f0418 100%)',
];

const APPS: { id: Screen; name: string; color: string; glyph: string }[] = [
  { id: 'bank', name: 'OPay', color: '#16b464', glyph: '₦' },
  { id: 'messages', name: 'Messages', color: '#2a9df4', glyph: '💬' },
  { id: 'mail', name: 'Mail', color: '#d93b30', glyph: '✉' },
  { id: 'chats', name: 'Chats', color: '#1faa59', glyph: '💭' },
  { id: 'contacts', name: 'Contacts', color: '#f2a516', glyph: '☎' },
  { id: 'music', name: 'Music', color: '#e8364f', glyph: '♫' },
  { id: 'maps', name: 'Maps', color: '#0f8a4b', glyph: '⌖' },
  { id: 'wardrobe', name: 'Wardrobe', color: '#d4a62a', glyph: '👕' },
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
  private mailOpen: Mail | null = null;
  private requestFrom: Contact | null = null;
  private chatWith: PlayerRef | null = null;
  private sendTo = '';
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

  unreadMail(): number {
    return this.host.state.mail.filter((m) => !m.read).length;
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
    const up: Partial<Record<Screen, Screen>> = { chats: 'home', chat: 'chats', toplayer: 'bank', bank: 'home', transfer: 'bank', sendany: 'bank', request: 'bank', bills: 'bank', mail: 'home', mailview: 'mail', messages: 'home', thread: 'messages', contacts: 'home', call: 'contacts', music: 'home', maps: 'home', settings: 'home' };
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
      case 'sendany': return this.renderSendAny(b);
      case 'request': return this.renderRequest(b);
      case 'mail': return this.renderMail(b);
      case 'chats': return this.renderChats(b);
      case 'chat': return this.renderChat(b);
      case 'toplayer': return this.renderToPlayer(b);
      case 'mailview': return this.renderMailView(b);
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
    const unreadMail = this.unreadMail();
    b.append(
      h('div.ph-clock', {}, h('div.ph-time', { text: formatClock(this.host.hour()) }), h('div.ph-date', { text: `${dayLabel(this.host.day())} • Abuja, FCT` })),
      h('div.ph-grid', {}, ...APPS.map((a) =>
        h('button.ph-app', { type: 'button', onclick: () => (a.id === 'wardrobe' ? (this.host.click(), this.close(), this.host.openWardrobe()) : this.go(a.id)) },
          h('span.ph-icon', { style: `background:${a.color}`, text: a.glyph }, a.id === 'messages' && unread ? h('span.ph-badge', { text: String(unread) }) : a.id === 'mail' && unreadMail ? h('span.ph-badge', { text: String(unreadMail) }) : a.id === 'chats' && (this.host.social()?.unreadTotal ?? 0) ? h('span.ph-badge', { text: String(this.host.social()!.unreadTotal) }) : null),
          h('span.ph-appname', { text: a.name }),
        ))),
      h('div.ph-widget.home', {}, h('span', { text: '🏠 Home' }), h('b.small', { text: this.host.homeStatus() })),
      h('div.ph-widget', {}, h('span', { text: 'OPay balance' }), h('b', { text: this.host.state.hideBalance ? '₦ ••••••' : naira(this.host.money()) })),
    );
  }

  private renderBank(b: HTMLElement): void {
    const st = this.host.state;
    const eye = h('button.ph-eye', { type: 'button', 'aria-label': st.hideBalance ? 'Show balance' : 'Hide balance', onclick: () => { st.hideBalance = !st.hideBalance; this.render(); } }, st.hideBalance ? '👁' : '🙈');
    b.append(
      this.header('OPay', 'home'),
      h('div.bk-card', {},
        h('div.bk-row', {}, h('span', { text: `Hi, ${this.host.playerName()}` }), eye),
        h('div.bk-label', { text: 'Wallet balance' }),
        h('div.bk-bal', { text: st.hideBalance ? '₦ ••••••' : naira(this.host.money()) }),
        h('div.bk-acct', { text: 'Acct: 81' + String(4400000 + this.host.playerName().length * 7919).slice(0, 8) + ' • OPay Digital Services' }),
      ),
      h('div.bk-actions', {},
        h('button.bk-act', { type: 'button', onclick: () => this.go('transfer') }, h('span', { text: '↗' }), 'To contacts'),
        h('button.bk-act', { type: 'button', onclick: () => { this.sendTo = ''; this.go('toplayer'); } }, h('span', { text: '🎮' }), 'To a player'),
        h('button.bk-act', { type: 'button', onclick: () => this.go('sendany') }, h('span', { text: '🏦' }), 'To any account'),
        h('button.bk-act', { type: 'button', onclick: () => { this.requestFrom = null; this.go('request'); } }, h('span', { text: '↙' }), 'Request money'),
        h('button.bk-act', { type: 'button', onclick: () => this.go('bills') }, h('span', { text: '💡' }), 'Airtime & Bills'),
      ),
      this.toastEl(),
      h('div.bk-section', { text: 'Transaction history' }),
      st.txs.length
        ? h('div.bk-list', {}, ...st.txs.slice().reverse().slice(0, 40).map((t) =>
          h('div.bk-tx', {},
            h('div', {}, h('div.bk-txl', { text: t.label }), h('div.bk-txd', { text: `${dayLabel(t.day, true)} • ${formatClock(t.hour)}` })),
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

  /** Message another player (or open a chat with them) by @username. */
  openChatWith(p: PlayerRef): void {
    this.chatWith = p;
    this.go('chat');
  }

  private renderChats(b: HTMLElement): void {
    const social = this.host.social();
    b.append(this.header('Chats', 'home'));
    if (!social?.live) {
      b.append(h('div.ph-empty', { text: 'Player chat turns on when the game server is live.' }));
      return;
    }
    b.append(h('div.ml-addr', {}, h('span', { text: `You are @${social.username ?? ''}` }), h('span.ml-role', { text: `🟢 ${social.online} online` })));
    const q = h('input.ph-input', { type: 'text', placeholder: 'Find a player: @username', maxlength: 17, autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Find a player' }) as HTMLInputElement;
    q.addEventListener('keydown', (e) => e.stopPropagation());
    const status = h('div.ch-status');
    const go = h('button.ph-btn', { type: 'submit' }, 'Chat');
    const form = h('form.ch-find', {}, q, go);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.host.click();
      status.textContent = 'Searching…';
      const p = await social.find(q.value);
      if (!p) status.textContent = 'No player with that username.';
      else if (p.id === social.me?.id) status.textContent = 'Na you be that 😄';
      else this.openChatWith(p);
    });
    const list = h('div.ct-list', {}, h('div.ph-empty', { text: 'Loading chats…' }));
    b.append(form, status, list);
    void social.conversations().then((convs) => {
      if (this.screen !== 'chats') return;
      list.innerHTML = '';
      if (!convs.length) list.append(h('div.ph-empty', { text: 'No chats yet. Find a player by their @username to start.' }));
      for (const c of convs) {
        const n = social.unreadFrom(c.with.id);
        list.append(h('button.ms-row', { type: 'button', onclick: () => this.openChatWith(c.with) },
          h('span.ct-av', { style: `background:${colorFor(c.with.username)}`, text: c.with.username.slice(0, 2).toUpperCase() }),
          h('span.ms-mid', {}, h('span.ms-from', { text: '@' + c.with.username }), h('span.ms-prev', { text: (c.last.fromId === social.me?.id ? 'You: ' : '') + c.last.body })),
          n ? h('span.ph-badge.inline', { text: String(n) }) : null,
        ));
      }
    });
  }

  private renderChat(b: HTMLElement): void {
    const social = this.host.social();
    const p = this.chatWith;
    if (!social || !p) return this.renderChats(b);
    social.markRead(p.id);
    const list = h('div.th-list', {}, h('div.ph-empty', { text: 'Loading…' }));
    const box = h('input.ph-input', { type: 'text', placeholder: `Message @${p.username}`, maxlength: 300, 'aria-label': 'Message' }) as HTMLInputElement;
    box.addEventListener('keydown', (e) => e.stopPropagation());
    const status = h('div.ch-status');
    const send = h('button.ph-btn', { type: 'submit' }, 'Send');
    const form = h('form.ch-send', {}, box, send);
    const draw = (msgs: { fromId: string; body: string; at: number }[]) => {
      list.innerHTML = '';
      if (!msgs.length) list.append(h('div.ph-empty', { text: `Say hi to @${p.username} 👋🏾` }));
      for (const m of msgs) {
        const mine = m.fromId === social.me?.id;
        list.append(h('div.th-bubble' + (mine ? '.mine' : '.them'), {}, h('div', { text: m.body }), h('div.th-time', { text: new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })));
      }
      list.scrollTop = list.scrollHeight;
    };
    const load = () => social.history(p.id).then((msgs) => {
      if (this.screen === 'chat' && this.chatWith === p) draw(msgs);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = box.value;
      box.value = '';
      const err = await social.send(p.id, text);
      status.textContent = err ?? '';
      if (err) box.value = text;
      void load();
    });
    const money = h('button.ch-money', { type: 'button', onclick: () => { this.sendTo = p.username; this.go('toplayer'); } }, '₦ Send money');
    b.append(this.header('@' + p.username, 'chats'), money, list, status, form);
    void load();
  }

  /** New chat message arrived: refresh the open thread. */
  chatArrived(fromId: string): void {
    if (!this.open) return;
    if (this.screen === 'chat' && this.chatWith?.id === fromId) this.render();
    else if (this.screen === 'chats' || this.screen === 'home') this.render();
  }

  private renderToPlayer(b: HTMLElement): void {
    const social = this.host.social();
    b.append(this.header('Send to a player', 'bank'), this.toastEl());
    if (!social?.live) {
      b.append(h('div.ph-empty', { text: 'Player transfers turn on when the game server is live.' }));
      return;
    }
    const to = h('input.ph-input', { type: 'text', placeholder: '@username', maxlength: 17, autocapitalize: 'none', spellcheck: 'false', value: this.sendTo, 'aria-label': 'Player username' }) as HTMLInputElement;
    const amt = h('input.ph-input', { type: 'text', inputmode: 'numeric', placeholder: 'Amount (₦)', maxlength: 9, 'aria-label': 'Amount' }) as HTMLInputElement;
    const note = h('input.ph-input', { type: 'text', placeholder: 'Note (optional)', maxlength: 80, 'aria-label': 'Note' }) as HTMLInputElement;
    for (const el of [to, amt, note]) el.addEventListener('keydown', (e) => e.stopPropagation());
    amt.addEventListener('input', () => (amt.value = amt.value.replace(/\D/g, '')));
    const quick = h('div.tf-amts', {}, ...[1000, 5000, 20000, 100000].map((a) => h('button.tf-amt', { type: 'button', onclick: () => { amt.value = String(a); } }, naira(a))));
    const send = h('button.ph-btn', { type: 'button' }, 'Send money ▸') as HTMLButtonElement;
    send.addEventListener('click', async () => {
      this.host.click();
      send.disabled = true;
      send.textContent = 'Sending…';
      const err = await this.host.sendToPlayer(to.value, parseInt(amt.value, 10) || 0, note.value);
      this.toast = err ?? `Sent ${naira(parseInt(amt.value, 10) || 0)} to @${to.value.replace(/^@/, '').toLowerCase()} ✅`;
      if (!err) this.screen = 'bank';
      this.render();
    });
    b.append(h('div.sa-form', {}, to, amt, quick, note, h('div.bk-txd', { text: `Balance: ${naira(this.host.money())} • Players get it instantly (free)` }), send));
  }

  private renderSendAny(b: HTMLElement): void {
    const banks = ['OPay', 'Moniepoint', 'PalmPay', 'Kuda', 'GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 'UBA'];
    const name = h('input.ph-input', { type: 'text', placeholder: 'Account name (e.g. Musa Ibrahim)', maxlength: 32, 'aria-label': 'Account name' }) as HTMLInputElement;
    const acct = h('input.ph-input', { type: 'text', inputmode: 'numeric', placeholder: '10-digit account number', maxlength: 10, 'aria-label': 'Account number' }) as HTMLInputElement;
    const bank = h('select.ph-input', { 'aria-label': 'Bank' }, ...banks.map((x) => h('option', { value: x, text: x }))) as HTMLSelectElement;
    const amt = h('input.ph-input', { type: 'text', inputmode: 'numeric', placeholder: 'Amount (₦)', maxlength: 9, 'aria-label': 'Amount' }) as HTMLInputElement;
    acct.addEventListener('input', () => (acct.value = acct.value.replace(/\D/g, '')));
    amt.addEventListener('input', () => (amt.value = amt.value.replace(/\D/g, '')));
    // Typing in the phone must not move the player or trigger hotkeys.
    for (const el of [name, acct, amt]) el.addEventListener('keydown', (e) => e.stopPropagation());
    const quick = h('div.tf-amts', {}, ...[500, 2000, 10000, 50000].map((a) => h('button.tf-amt', { type: 'button', onclick: () => { amt.value = String(a); } }, naira(a))));
    const send = h('button.ph-btn', {
      type: 'button',
      onclick: () => {
        const n = name.value.trim();
        const a = parseInt(amt.value, 10) || 0;
        if (n.length < 2) this.toast = 'Enter the account name.';
        else if (acct.value.length !== 10) this.toast = 'Account number must be 10 digits.';
        else if (a < 50) this.toast = 'Minimum transfer na ₦50.';
        else {
          const err = this.host.sendAny(n, bank.value, a);
          this.toast = err ?? `Sent ${naira(a)} to ${n.toUpperCase()} (${bank.value}) ✅`;
          if (!err) this.screen = 'bank';
        }
        this.render();
      },
    }, 'Send money ▸');
    b.append(this.header('Send to any account', 'bank'), this.toastEl(),
      h('div.sa-form', {}, name, acct, bank, amt, quick, h('div.bk-txd', { text: `Fee: ${naira(TRANSFER_FEE)} • Balance: ${naira(this.host.money())}` }), send));
  }

  private renderRequest(b: HTMLElement): void {
    const contacts = unlockedContacts(this.host.flags());
    b.append(this.header('Request money', 'bank'), this.toastEl());
    if (!this.requestFrom) {
      b.append(h('div.bk-section', { text: 'Ask who?' }), h('div.ct-list', {}, ...contacts.map((c) =>
        h('button.ct-row', { type: 'button', onclick: () => { this.host.click(); this.requestFrom = c; this.render(); } }, this.avatar(c), h('span', { text: c.name })))));
      return;
    }
    const c = this.requestFrom;
    b.append(
      h('div.tf-to', {}, this.avatar(c), h('div', {}, h('div.tf-name', { text: c.name }), h('div.bk-txd', { text: 'They go reply your request by text.' }))),
      h('div.tf-amts', {}, ...[1000, 5000, 20000, 100000].map((a) =>
        h('button.tf-amt', {
          type: 'button',
          onclick: () => {
            this.toast = this.host.request(c, a);
            this.requestFrom = null;
            this.render();
          },
        }, naira(a)))),
      h('button.ph-btn.ghost', { type: 'button', onclick: () => { this.requestFrom = null; this.render(); } }, 'Ask someone else'),
    );
  }

  private renderMail(b: HTMLElement): void {
    const mail = this.host.state.mail.slice().reverse();
    const role = this.host.roleName();
    b.append(this.header('Mail', 'home'), h('div.ml-addr', {}, h('span', { text: '✉ ' + this.host.email() }), role ? h('span.ml-role', { text: role }) : null));
    if (!mail.length) {
      b.append(h('div.ph-empty', { text: 'Your inbox is empty.' }));
      return;
    }
    b.append(h('div.ct-list', {}, ...mail.map((m) =>
      h('button.ms-row.ml-row' + (m.read ? '' : '.unread'), { type: 'button', onclick: () => { this.mailOpen = m; this.go('mailview'); } },
        h('span.ct-av', { style: `background:${colorFor(m.from)}`, text: initials(m.from) }),
        h('span.ms-mid', {}, h('span.ms-from', { text: m.from }), h('span.ml-subj', { text: m.subject }), h('span.ms-prev', { text: m.body.replace(/\n+/g, ' ') })),
        h('span.ml-day', { text: dayLabel(m.day, true).slice(0, 3) }),
      ))));
  }

  private renderMailView(b: HTMLElement): void {
    const m = this.mailOpen;
    if (!m) return this.renderMail(b);
    m.read = true;
    b.append(this.header('Mail', 'mail'),
      h('div.ml-view', {},
        h('div.ml-vsubj', { text: m.subject }),
        h('div.ml-vfrom', {}, h('b', { text: m.from }), h('span', { text: ` → ${this.host.email()}` })),
        h('div.bk-txd', { text: `${dayLabel(m.day, true)} • ${formatClock(m.hour)}` }),
        h('div.ml-vbody', {}, ...m.body.split('\n').map((l) => (l ? h('p', { text: l }) : h('br')))),
      ));
  }

  private renderBills(b: HTMLElement): void {
    b.append(this.header('Airtime, Data & Bills', 'bank'), h('div.bk-home', { text: this.host.homeStatus() }), this.toastEl(), h('div.ct-list', {}, ...BILLS.map((bill) =>
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
    const list = h('div.th-list', {}, ...msgs.map((m) => h('div.th-bubble', {}, h('div', { text: m.text }), h('div.th-time', { text: `${dayLabel(m.day, true)} • ${formatClock(m.hour)}` }))));
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
        h('div.mu-ctrls', {},
          h('button.mu-play', { type: 'button', 'aria-label': playing ? 'Pause' : 'Play', onclick: () => { this.host.toggleMute(); this.render(); } }, playing ? '❚❚' : '▶'),
          h('button.mu-play.mu-next', { type: 'button', 'aria-label': 'Next song', onclick: () => { this.host.click(); this.host.nextTrack(); window.setTimeout(() => this.render(), 150); } }, '⏭'),
        ),
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
