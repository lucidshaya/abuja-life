import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { PLOTS_PER_BLOCK, plotFor } from '../player/Home';
import type { ChatMsg, Conversation, EstateInfo, Me, OnlineBackend, PlayerRef, Transfer, WorldTransport } from './types';

interface MsgRow { id: number; from_id: string; to_id: string; body: string; created_at: string }
interface TransferRow { id: number; from_id: string; to_id: string; amount: number; note: string | null; created_at: string; from_username?: string }

const toMsg = (r: MsgRow): ChatMsg => ({ id: String(r.id), fromId: r.from_id, toId: r.to_id, body: r.body, at: Date.parse(r.created_at) });

/** Real accounts on Supabase: email sign-in codes, usernames, player chat, money and presence. See supabase/schema.sql. */
export class SupabaseBackend implements OnlineBackend {
  readonly kind = 'supabase' as const;
  readonly live = true;
  private sb: SupabaseClient;
  private me: Me | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }

  private async uid(): Promise<string> {
    if (this.me) return this.me.id;
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error('signed_out');
    return data.user.id;
  }

  async session(): Promise<Me | null> {
    const { data } = await this.sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return (this.me = null);
    const { data: p, error } = await this.sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
    // Don't mistake a network error for "no username yet" (that would ask a returning player to pick a new one).
    if (error) throw new Error('Could not load your account. Check your connection and try again.');
    this.me = { id: user.id, email: user.email ?? '', username: (p?.username as string | undefined) ?? null };
    return this.me;
  }


  /**
   * Email-only login (no verification, as requested): the email maps to one
   * Supabase account through a password derived from it, so the same email
   * logs into the same account and save on any device.
   */
  async verify(email: string): Promise<Me> {
    const password = await derivePassword(email);
    let res = await this.sb.auth.signInWithPassword({ email, password });
    if (res.error) {
      const up = await this.sb.auth.signUp({ email, password });
      if (up.error) throw new Error(up.error.status === 429 ? 'Too many sign-ups from this network. Try again in a few minutes.' : 'Could not sign in. Check your connection and try again.');
      if (!up.data.session) res = await this.sb.auth.signInWithPassword({ email, password });
    }
    const me = await this.session();
    if (!me) throw new Error('Could not sign in. Try again.');
    return me;
  }

  async loadCloudSave(): Promise<string | null> {
    const id = await this.uid();
    const { data, error } = await this.sb.from('saves').select('data').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.data ? JSON.stringify(data.data) : null;
  }

  async storeCloudSave(json: string): Promise<void> {
    const id = await this.uid();
    const { error } = await this.sb.from('saves').upsert({ id, data: JSON.parse(json), updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  async claimUsername(username: string): Promise<void> {
    const id = await this.uid();
    const { error } = await this.sb.from('profiles').upsert({ id, username }, { onConflict: 'id' });
    if (error) throw new Error(error.code === '23505' ? 'taken' : error.message);
    if (this.me) this.me.username = username;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
    this.me = null;
  }

  async findUser(username: string): Promise<PlayerRef | null> {
    const { data } = await this.sb.from('profiles').select('id, username').eq('username', username).maybeSingle();
    return data ? { id: data.id as string, username: data.username as string } : null;
  }

  async profiles(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const { data } = await this.sb.from('profiles').select('id, username').in('id', ids);
    const out: Record<string, string> = {};
    for (const r of data ?? []) out[r.id as string] = r.username as string;
    return out;
  }

  async sendMessage(toId: string, body: string): Promise<ChatMsg> {
    const from = await this.uid();
    const { data, error } = await this.sb.from('messages').insert({ from_id: from, to_id: toId, body }).select().single();
    if (error) throw new Error(error.message);
    return toMsg(data as MsgRow);
  }

  async history(otherId: string): Promise<ChatMsg[]> {
    const me = await this.uid();
    const { data } = await this.sb
      .from('messages')
      .select('*')
      .or(`and(from_id.eq.${me},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${me})`)
      .order('created_at', { ascending: false })
      .limit(100);
    return ((data ?? []) as MsgRow[]).map(toMsg).reverse();
  }

  async conversations(): Promise<Conversation[]> {
    const me = await this.uid();
    const { data } = await this.sb.from('messages').select('*').or(`from_id.eq.${me},to_id.eq.${me}`).order('created_at', { ascending: false }).limit(300);
    const last = new Map<string, ChatMsg>();
    for (const r of (data ?? []) as MsgRow[]) {
      const other = r.from_id === me ? r.to_id : r.from_id;
      if (!last.has(other)) last.set(other, toMsg(r));
    }
    const names = await this.profiles([...last.keys()]);
    return [...last.entries()].map(([id, m]) => ({ with: { id, username: names[id] ?? 'player' }, last: m }));
  }

  async sendMoney(toId: string, amount: number, note: string): Promise<void> {
    const from = await this.uid();
    const { error } = await this.sb.from('transfers').insert({ from_id: from, to_id: toId, amount, note });
    if (error) throw new Error(error.message);
  }

  async claimTransfers(): Promise<Transfer[]> {
    const { data, error } = await this.sb.rpc('claim_transfers');
    if (error || !data) return [];
    return (data as TransferRow[]).map((r) => ({ id: String(r.id), fromId: r.from_id, fromName: r.from_username ?? 'player', toId: r.to_id, amount: r.amount, note: r.note ?? '', at: Date.parse(r.created_at) }));
  }

  listen(h: { message: (m: ChatMsg) => void; transfer: () => void }): void {
    void this.uid().then((me) => {
      this.sb
        .channel('inbox:' + me)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_id=eq.${me}` }, (p) => h.message(toMsg(p.new as MsgRow)))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfers', filter: `to_id=eq.${me}` }, () => h.transfer())
        .subscribe();
    }).catch(() => {});
  }

  presence(onCount: (n: number) => void): void {
    const key = this.me?.id ?? 'guest-' + Math.random().toString(36).slice(2);
    const ch = this.sb.channel('online-players', { config: { presence: { key } } });
    ch.on('presence', { event: 'sync' }, () => onCount(Object.keys(ch.presenceState()).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void ch.track({ at: Date.now() });
      });
  }

  /** All-time visit counter (supabase/schema.sql: record_visit / visit_count). */
  async visits(record: boolean): Promise<number | null> {
    const { data, error } = await this.sb.rpc(record ? 'record_visit' : 'visit_count');
    if (error || data === null || data === undefined) return null;
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  }

  /** Houses go by sign-up order: your position among all players picks your block and plot. */
  async estate(): Promise<EstateInfo | null> {
    const id = await this.uid();
    const { data: mine, error } = await this.sb.from('profiles').select('created_at').eq('id', id).maybeSingle();
    if (error || !mine) return null;
    const { count, error: e2 } = await this.sb.from('profiles').select('id', { count: 'exact', head: true }).lt('created_at', mine.created_at as string);
    if (e2 || count === null) return null;
    const { block, plot } = plotFor(count);
    const { data: rows, error: e3 } = await this.sb
      .from('profiles')
      .select('id, username')
      .order('created_at', { ascending: true })
      .range(block * PLOTS_PER_BLOCK, block * PLOTS_PER_BLOCK + PLOTS_PER_BLOCK - 1);
    if (e3) return null;
    const neighbours = Array.from({ length: PLOTS_PER_BLOCK }, (_, i) => {
      const r = rows?.[i];
      return r ? { id: r.id as string, username: r.username as string } : null;
    });
    return { block, plot, neighbours };
  }

  private world: WorldTransport | null = null;

  /** Realtime broadcast channels (no database writes): positions per map area plus a personal inbox. */
  transport(): WorldTransport {
    if (this.world) return this.world;
    const chans = new Map<string, RealtimeChannel>();
    this.world = {
      join: (topic, onMsg, onReady) => {
        if (chans.has(topic)) return;
        const ch = this.sb.channel('w:' + topic, { config: { broadcast: { self: false, ack: false } } });
        ch.on('broadcast', { event: '*' }, (m) => onMsg(m.event, (m.payload ?? {}) as Record<string, unknown>));
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') onReady?.();
        });
        chans.set(topic, ch);
      },
      leave: (topic) => {
        const ch = chans.get(topic);
        if (!ch) return;
        chans.delete(topic);
        void this.sb.removeChannel(ch);
      },
      send: (topic, event, payload) => {
        const ch = chans.get(topic);
        if (ch?.state === 'joined') void ch.send({ type: 'broadcast', event, payload });
      },
      post: (topic, event, payload) => {
        const ch = this.sb.channel('w:' + topic);
        void ch.httpSend(event, payload).catch(() => {}).finally(() => void this.sb.removeChannel(ch));
      },
    };
    return this.world;
  }
}

async function derivePassword(email: string): Promise<string> {
  const bytes = new TextEncoder().encode('abuja-life/v1/' + email.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return 'al1-' + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
