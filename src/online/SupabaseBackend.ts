import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatMsg, Conversation, Me, OnlineBackend, PlayerRef, Transfer } from './types';

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
    const { data: p } = await this.sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
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
    const { data } = await this.sb.from('saves').select('data').eq('id', id).maybeSingle();
    return data?.data ? JSON.stringify(data.data) : null;
  }

  async storeCloudSave(json: string): Promise<void> {
    const id = await this.uid();
    await this.sb.from('saves').upsert({ id, data: JSON.parse(json), updated_at: new Date().toISOString() }, { onConflict: 'id' });
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
}

async function derivePassword(email: string): Promise<string> {
  const bytes = new TextEncoder().encode('abuja-life/v1/' + email.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return 'al1-' + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
