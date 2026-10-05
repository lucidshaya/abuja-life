import { PLOTS_PER_BLOCK } from '../player/Home';
import type { ChatMsg, Conversation, EstateInfo, Me, OnlineBackend, PlayerRef, Transfer, WorldTransport } from './types';

const PROFILE_KEY = 'abuja-life-profile-v1';

function read<T>(k: string, store: Storage | null, d: T): T {
  try {
    const v = store?.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function write(k: string, v: unknown, store: Storage | null): void {
  try {
    store?.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full / blocked */
  }
}
const ls = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};
const ss = (): Storage | null => {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Offline accounts: email + username are kept on this device only and
 * multiplayer is off. Used when the game has no server configured.
 */
export class LocalBackend implements OnlineBackend {
  readonly kind = 'local' as const;
  readonly live = false;

  async session(): Promise<Me | null> {
    return read<Me | null>(PROFILE_KEY, ls(), null);
  }
  async verify(email: string): Promise<Me> {
    // Same email on this device = same profile; a new email starts a new one.
    const prev = read<Me | null>(PROFILE_KEY, ls(), null);
    const accounts = read<Record<string, Me>>('abuja-life-accounts-v1', ls(), {});
    const me: Me = prev && prev.email === email ? prev : accounts[email] ?? { id: 'local-' + uid(), email, username: null };
    write(PROFILE_KEY, me, ls());
    return me;
  }
  async loadCloudSave(): Promise<string | null> {
    const me = await this.session();
    return me ? read<string | null>('abuja-life-acct-save-' + me.id, ls(), null) : null;
  }
  async storeCloudSave(json: string): Promise<void> {
    const me = await this.session();
    if (me) write('abuja-life-acct-save-' + me.id, json, ls());
  }
  async claimUsername(username: string): Promise<void> {
    const me = await this.session();
    if (!me) throw new Error('signed_out');
    const next = { ...me, username };
    write(PROFILE_KEY, next, ls());
    const accounts = read<Record<string, Me>>('abuja-life-accounts-v1', ls(), {});
    accounts[me.email] = next;
    write('abuja-life-accounts-v1', accounts, ls());
  }
  async signOut(): Promise<void> {
    try {
      ls()?.removeItem(PROFILE_KEY);
    } catch {
      /* ignore */
    }
  }
  async findUser(): Promise<PlayerRef | null> {
    return null;
  }
  async profiles(): Promise<Record<string, string>> {
    return {};
  }
  async sendMessage(): Promise<ChatMsg> {
    throw new Error('offline');
  }
  async history(): Promise<ChatMsg[]> {
    return [];
  }
  async conversations(): Promise<Conversation[]> {
    return [];
  }
  async sendMoney(): Promise<void> {
    throw new Error('offline');
  }
  async claimTransfers(): Promise<Transfer[]> {
    return [];
  }
  listen(): void {}
  presence(onCount: (n: number) => void): void {
    onCount(1);
  }
  async estate(): Promise<EstateInfo | null> {
    return null;
  }
  transport(): WorldTransport | null {
    return null;
  }
}

interface MockDb {
  users: Record<string, { email: string; username: string | null; save?: string }>;
  messages: ChatMsg[];
  transfers: (Transfer & { claimed: boolean })[];
}

/**
 * Test backend (open the game with ?mock=1): tabs of the same browser act as
 * different players, sharing one fake server through localStorage and a
 * BroadcastChannel.
 */
export class MockBackend implements OnlineBackend {
  readonly kind = 'mock' as const;
  readonly live = true;
  private chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('abuja-mock') : null;
  private tab = uid();

  private db(): MockDb {
    return read<MockDb>('abuja-mock-db', ls(), { users: {}, messages: [], transfers: [] });
  }
  private save(db: MockDb, event?: unknown): void {
    write('abuja-mock-db', db, ls());
    if (event) this.chan?.postMessage(event);
  }
  private meId(): string | null {
    return read<string | null>('abuja-mock-me', ss(), null);
  }

  async session(): Promise<Me | null> {
    const id = this.meId();
    const u = id ? this.db().users[id] : null;
    return id && u ? { id, email: u.email, username: u.username } : null;
  }
  async verify(email: string): Promise<Me> {
    const db = this.db();
    let id = Object.keys(db.users).find((k) => db.users[k].email === email);
    if (!id) {
      id = 'mock-' + uid();
      db.users[id] = { email, username: null };
      this.save(db);
    }
    write('abuja-mock-me', id, ss());
    return { id, email, username: db.users[id].username };
  }
  async loadCloudSave(): Promise<string | null> {
    const id = this.meId();
    return id ? this.db().users[id]?.save ?? null : null;
  }
  async storeCloudSave(json: string): Promise<void> {
    const id = this.meId();
    const db = this.db();
    if (!id || !db.users[id]) return;
    db.users[id].save = json;
    this.save(db);
  }
  async claimUsername(username: string): Promise<void> {
    const id = this.meId();
    const db = this.db();
    if (!id || !db.users[id]) throw new Error('signed_out');
    if (Object.entries(db.users).some(([k, u]) => k !== id && u.username === username)) throw new Error('taken');
    db.users[id].username = username;
    this.save(db);
  }
  async signOut(): Promise<void> {
    try {
      ss()?.removeItem('abuja-mock-me');
    } catch {
      /* ignore */
    }
  }
  async findUser(username: string): Promise<PlayerRef | null> {
    const db = this.db();
    const id = Object.keys(db.users).find((k) => db.users[k].username === username);
    return id ? { id, username } : null;
  }
  async profiles(ids: string[]): Promise<Record<string, string>> {
    const db = this.db();
    const out: Record<string, string> = {};
    for (const id of ids) if (db.users[id]?.username) out[id] = db.users[id].username!;
    return out;
  }
  async sendMessage(toId: string, body: string): Promise<ChatMsg> {
    const me = this.meId();
    if (!me) throw new Error('signed_out');
    const m: ChatMsg = { id: uid(), fromId: me, toId, body, at: Date.now() };
    const db = this.db();
    db.messages.push(m);
    this.save(db, { type: 'message', m });
    return m;
  }
  async history(otherId: string): Promise<ChatMsg[]> {
    const me = this.meId();
    return this.db().messages.filter((m) => (m.fromId === me && m.toId === otherId) || (m.fromId === otherId && m.toId === me));
  }
  async conversations(): Promise<Conversation[]> {
    const me = this.meId();
    const db = this.db();
    const map = new Map<string, ChatMsg>();
    for (const m of db.messages) if (m.fromId === me || m.toId === me) map.set(m.fromId === me ? m.toId : m.fromId, m);
    return [...map.entries()].map(([id, last]) => ({ with: { id, username: db.users[id]?.username ?? 'player' }, last })).sort((a, b) => b.last.at - a.last.at);
  }
  async sendMoney(toId: string, amount: number, note: string): Promise<void> {
    const me = this.meId();
    if (!me) throw new Error('signed_out');
    const db = this.db();
    db.transfers.push({ id: uid(), fromId: me, fromName: db.users[me]?.username ?? 'player', toId, amount, note, at: Date.now(), claimed: false });
    this.save(db, { type: 'transfer', toId });
  }
  async claimTransfers(): Promise<Transfer[]> {
    const me = this.meId();
    const db = this.db();
    const mine = db.transfers.filter((t) => t.toId === me && !t.claimed);
    mine.forEach((t) => (t.claimed = true));
    if (mine.length) this.save(db);
    return mine;
  }
  listen(h: { message: (m: ChatMsg) => void; transfer: () => void }): void {
    this.chan?.addEventListener('message', (e: MessageEvent) => {
      const me = this.meId();
      const d = e.data as { type: string; m?: ChatMsg; toId?: string; tab?: string };
      if (d.type === 'message' && d.m && d.m.toId === me) h.message(d.m);
      if (d.type === 'transfer' && d.toId === me) {
        // localStorage can reach this tab after the broadcast does: look again shortly after.
        h.transfer();
        window.setTimeout(h.transfer, 800);
      }
    });
  }
  presence(onCount: (n: number) => void): void {
    const seen = new Map<string, number>([[this.tab, Date.now()]]);
    const beat = () => this.chan?.postMessage({ type: 'beat', tab: this.tab });
    this.chan?.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { type: string; tab?: string };
      if (d.type === 'beat' && d.tab) {
        const isNew = !seen.has(d.tab);
        seen.set(d.tab, Date.now());
        if (isNew) beat();
      }
    });
    const tick = () => {
      const now = Date.now();
      seen.set(this.tab, now);
      for (const [k, t] of seen) if (now - t > 7000) seen.delete(k);
      onCount(seen.size);
    };
    beat();
    tick();
    window.setInterval(() => {
      beat();
      tick();
    }, 2000);
  }
  async estate(): Promise<EstateInfo | null> {
    const me = this.meId();
    const ids = Object.keys(this.db().users).filter((k) => this.db().users[k].username);
    const rank = me ? ids.indexOf(me) : -1;
    if (rank < 0) return null;
    const block = Math.floor(rank / PLOTS_PER_BLOCK);
    const db = this.db();
    const neighbours = Array.from({ length: PLOTS_PER_BLOCK }, (_, i) => {
      const id = ids[block * PLOTS_PER_BLOCK + i];
      return id ? { id, username: db.users[id].username! } : null;
    });
    return { block, plot: rank % PLOTS_PER_BLOCK, neighbours };
  }
  transport(): WorldTransport | null {
    const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('abuja-mock-world') : null;
    if (!chan) return null;
    const subs = new Map<string, (event: string, payload: Record<string, unknown>) => void>();
    chan.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { topic: string; event: string; payload: Record<string, unknown> };
      subs.get(d.topic)?.(d.event, d.payload);
    });
    const post = (topic: string, event: string, payload: Record<string, unknown>) => chan.postMessage({ topic, event, payload });
    return {
      join: (topic, onMsg, onReady) => {
        subs.set(topic, onMsg);
        if (onReady) window.setTimeout(onReady, 0);
      },
      leave: (topic) => void subs.delete(topic),
      send: post,
      post,
    };
  }
}
