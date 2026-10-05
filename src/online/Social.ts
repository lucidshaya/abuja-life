import { MAX_SEND, cleanMessage, cleanUsername, displayedOnline, type ChatMsg, type Conversation, type Me, type OnlineBackend, type PlayerRef } from './types';

/**
 * Game-side glue for the online layer: who you are, player chats with unread
 * counts, money between players and the online counter.
 */
export class Social {
  me: Me | null = null;
  realOnline = 1;
  private unread = new Map<string, number>();
  private names = new Map<string, string>();
  private started = false;
  onChange: () => void = () => {};
  onMessage: (m: ChatMsg, from: string) => void = () => {};
  /** A player sent you money: credit it in the game. */
  onMoney: (amount: number, from: string, note: string) => void = () => {};

  constructor(readonly backend: OnlineBackend) {}

  get live(): boolean {
    return this.backend.live;
  }

  get username(): string | null {
    return this.me?.username ?? null;
  }

  get online(): number {
    return displayedOnline(this.realOnline);
  }

  get unreadTotal(): number {
    let n = 0;
    for (const v of this.unread.values()) n += v;
    return n;
  }

  unreadFrom(id: string): number {
    return this.unread.get(id) ?? 0;
  }

  markRead(id: string): void {
    if (!this.unread.has(id)) return;
    this.unread.delete(id);
    this.onChange();
  }

  /** Call once the player is signed in with a username. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.backend.presence((n) => {
      this.realOnline = n;
      this.onChange();
    });
    if (!this.live) return;
    this.backend.listen({
      message: (m) => void this.incoming(m),
      transfer: () => void this.collect(),
    });
    void this.collect();
  }

  private async incoming(m: ChatMsg): Promise<void> {
    const from = await this.nameOf(m.fromId);
    this.unread.set(m.fromId, (this.unread.get(m.fromId) ?? 0) + 1);
    this.onMessage(m, from);
    this.onChange();
  }

  async nameOf(id: string): Promise<string> {
    const hit = this.names.get(id);
    if (hit) return hit;
    const map = await this.backend.profiles([id]).catch(() => ({} as Record<string, string>));
    const n = map[id] ?? 'player';
    this.names.set(id, n);
    return n;
  }

  /** Pick up money other players sent while you were away (or just now). */
  async collect(): Promise<void> {
    const list = await this.backend.claimTransfers().catch(() => []);
    for (const t of list) {
      this.names.set(t.fromId, t.fromName);
      this.onMoney(t.amount, t.fromName, t.note);
    }
  }

  async find(raw: string): Promise<PlayerRef | null> {
    const u = cleanUsername(raw);
    if (!u) return null;
    const p = await this.backend.findUser(u).catch(() => null);
    if (p) this.names.set(p.id, p.username);
    return p;
  }

  async conversations(): Promise<Conversation[]> {
    const list = await this.backend.conversations().catch(() => []);
    for (const c of list) this.names.set(c.with.id, c.with.username);
    return list;
  }

  history(id: string): Promise<ChatMsg[]> {
    return this.backend.history(id).catch(() => []);
  }

  /** Returns an error message, or null when sent. */
  async send(toId: string, raw: string): Promise<string | null> {
    const body = cleanMessage(raw);
    if (!body) return 'Type a message first.';
    if (toId === this.me?.id) return 'You no fit chat yourself 😅';
    try {
      await this.backend.sendMessage(toId, body);
      return null;
    } catch {
      return 'Message no send. Check your network.';
    }
  }

  /** Checks only; the game deducts the money when this returns null. */
  validateSend(to: PlayerRef | null, amount: number, balance: number): string | null {
    if (!this.live) return 'Player transfers need the online server.';
    if (!to) return 'No player with that username.';
    if (to.id === this.me?.id) return 'You no fit send money to yourself.';
    if (!Number.isFinite(amount) || amount < 50) return 'Minimum transfer na ₦50.';
    if (amount > MAX_SEND) return 'Maximum per transfer na ₦5,000,000.';
    if (amount > balance) return 'Insufficient balance.';
    return null;
  }

  async sendMoney(to: PlayerRef, amount: number, note: string): Promise<string | null> {
    try {
      await this.backend.sendMoney(to.id, Math.floor(amount), note.slice(0, 80));
      return null;
    } catch {
      return 'Transfer failed. Your money is safe; try again.';
    }
  }

  async signOut(): Promise<void> {
    await this.backend.signOut().catch(() => {});
    this.me = null;
  }
}
