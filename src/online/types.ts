/** Shared shapes for the online layer (accounts, player chat, money, presence). */

export interface Me {
  id: string;
  email: string;
  /** null until the player has claimed a username. */
  username: string | null;
}

export interface PlayerRef {
  id: string;
  username: string;
}

export interface ChatMsg {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  at: number;
}

export interface Transfer {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  amount: number;
  note: string;
  at: number;
}

export interface Conversation {
  with: PlayerRef;
  last: ChatMsg;
}

/** Who lives in your copy of the estate. */
export interface EstateInfo {
  block: number;
  plot: number;
  /** Owner of each house in your block (index = plot), null = empty. */
  neighbours: (PlayerRef | null)[];
}

/**
 * Live messaging between players in the world (positions, waves, knocks).
 * Topics: "cell:x:z" for an area of the map, "p:<id>" for one player's inbox.
 */
export interface WorldTransport {
  join(topic: string, onMsg: (event: string, payload: Record<string, unknown>) => void, onReady?: () => void): void;
  leave(topic: string): void;
  /** Send to a topic you joined. */
  send(topic: string, event: string, payload: Record<string, unknown>): void;
  /** Send to a topic without joining it (another player's inbox). */
  post(topic: string, event: string, payload: Record<string, unknown>): void;
}

export interface OnlineBackend {
  /** 'supabase' = real accounts; 'local' = this device only; 'mock' = test backend shared between tabs. */
  readonly kind: 'supabase' | 'local' | 'mock';
  /** Can players reach each other (chat, money, live count)? */
  readonly live: boolean;
  session(): Promise<Me | null>;
  /** Log in with the email (creating the account the first time). Same email on any device = same account. */
  verify(email: string): Promise<Me>;
  /** The game save attached to this account (null if none yet). */
  loadCloudSave(): Promise<string | null>;
  storeCloudSave(json: string): Promise<void>;
  /** Reserve a username for the signed-in player. Rejects with Error('taken') if someone has it. */
  claimUsername(username: string): Promise<void>;
  signOut(): Promise<void>;
  findUser(username: string): Promise<PlayerRef | null>;
  profiles(ids: string[]): Promise<Record<string, string>>;
  sendMessage(toId: string, body: string): Promise<ChatMsg>;
  history(otherId: string): Promise<ChatMsg[]>;
  conversations(): Promise<Conversation[]>;
  sendMoney(toId: string, amount: number, note: string): Promise<void>;
  /** Collect money other players sent you (each transfer is handed out once). */
  claimTransfers(): Promise<Transfer[]>;
  /** Live events for the signed-in player. */
  listen(handlers: { message: (m: ChatMsg) => void; transfer: () => void }): void;
  /** Join the "who's online" room; calls back with the number of real players online. */
  presence(onCount: (n: number) => void): void;
  /** Your house and neighbours (null = offline: you get the first house). */
  estate(): Promise<EstateInfo | null>;
  /** Live world link for seeing other players (null = offline). */
  transport(): WorldTransport | null;
  /** All-time visits to the game (record = count this visit first). null = not available. */
  visits(record: boolean): Promise<number | null>;
}

export const USERNAME_RE = /^[a-z0-9_]{3,16}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_MESSAGE = 300;
export const MAX_SEND = 5_000_000;

export function cleanUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export function usernameError(u: string): string | null {
  if (u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 16) return 'Username can be at most 16 characters.';
  if (!USERNAME_RE.test(u)) return 'Use only letters, numbers and _ (no spaces).';
  return null;
}

export function emailError(e: string): string | null {
  return EMAIL_RE.test(e.trim()) ? null : 'Enter a valid email address.';
}

/** What the "players online" badge shows: it starts at 10, and every real player after the first adds one. */
export function displayedOnline(real: number): number {
  return 9 + Math.max(1, real);
}

/** "1,234" up to 9,999, then "12K", "1.2M". */
export function formatVisits(n: number): string {
  if (n < 10000) return Math.max(0, Math.floor(n)).toLocaleString('en-NG');
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function cleanMessage(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE);
}
