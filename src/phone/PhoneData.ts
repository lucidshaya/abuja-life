/**
 * Pure data + rules for the in-game phone: contacts, texts, bank history.
 * No DOM here so it can be unit tested.
 */

export interface Msg {
  id: string;
  from: string;
  text: string;
  day: number;
  hour: number;
  read: boolean;
}

export interface Tx {
  id: string;
  label: string;
  amount: number;
  day: number;
  hour: number;
}

export interface Mail {
  id: string;
  from: string;
  subject: string;
  body: string;
  day: number;
  hour: number;
  read: boolean;
}

export interface PhoneState {
  messages: Msg[];
  mail: Mail[];
  txs: Tx[];
  wallpaper: number;
  hideBalance: boolean;
  /** Game day of the last morning text, so each day gets one. */
  lastMorningDay: number;
  lastGroupHour: number;
}

export function newPhoneState(): PhoneState {
  return { messages: [], mail: [], txs: [], wallpaper: 0, hideBalance: false, lastMorningDay: 0, lastGroupHour: 0 };
}

export function parsePhone(raw: unknown): PhoneState {
  const base = newPhoneState();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<PhoneState>;
  const arr = <T>(v: unknown, ok: (x: T) => boolean): T[] => (Array.isArray(v) ? (v as T[]).filter(ok) : []);
  return {
    messages: arr<Msg>(o.messages, (m) => !!m && typeof m.text === 'string' && typeof m.from === 'string').slice(-150),
    mail: arr<Mail>(o.mail, (m) => !!m && typeof m.subject === 'string' && typeof m.body === 'string' && typeof m.from === 'string').slice(-80),
    txs: arr<Tx>(o.txs, (t) => !!t && typeof t.amount === 'number' && typeof t.label === 'string').slice(-150),
    wallpaper: typeof o.wallpaper === 'number' ? o.wallpaper : 0,
    hideBalance: !!o.hideBalance,
    lastMorningDay: typeof o.lastMorningDay === 'number' ? o.lastMorningDay : 0,
    lastGroupHour: typeof o.lastGroupHour === 'number' ? o.lastGroupHour : 0,
  };
}

export interface Contact {
  id: string;
  name: string;
  color: string;
  /** Flag needed to have this number (undefined = from the start). */
  unlock?: string;
  callLines: string[];
  /** Special call action. */
  action?: 'taxi';
  /** Sending this person money earns clout. */
  transferClout?: number;
  transferReply?: string;
}

export const CONTACTS: Contact[] = [
  { id: 'mummy', name: 'Mummy ❤️', color: '#d94f8c', callLines: ['Hello my child! You don chop?', 'Abeg take care of yourself for that Abuja. And when you go bring wife/husband come house?'], transferClout: 3, transferReply: 'God bless you my child! You go marry this year in Jesus name 🙏🏾' },
  { id: 'uncle', name: 'Uncle Emeka', color: '#123e7c', callLines: ['Ehen! How Abuja dey treat you?', 'Remember: no go Area 1 roundabout for rush hour. Na advice from experience.'], transferClout: 2, transferReply: 'Ah! You don dey send me money? Abuja don bless you o 😄' },
  { id: 'danladi', name: 'Danladi (One-Way Taxi)', color: '#1f9a4f', callLines: ['Hello! Na Danladi. Where you dey? I fit come carry you anywhere for ₦2,500.'], action: 'taxi', transferClout: 1, transferReply: 'Thank you boss! Anytime you need ride, call me.' },
  { id: 'nkechi', name: 'Mama Nkechi (Wuse Market)', color: '#e8a317', unlock: 'met:market', callLines: ['Customer! New aso-ebi fabric don land. Come before e finish!'], transferClout: 1, transferReply: 'Thank you my customer! I go keep the best fabric for you.' },
  { id: 'funmi', name: 'Aunty Funmi', color: '#7a1f3d', unlock: 'met:owambe', callLines: ['My darling! Thank you for coming to my party. Next one na my daughter wedding, start saving for aso-ebi!'] },
  { id: 'musa', name: 'Mallam Musa (Suya)', color: '#8c5a2b', unlock: 'met:suya', callLines: ['Lafiya! Suya go ready by 4pm. I go keep the best part for you.'] },
  { id: 'posbabe', name: 'Blessing (POS) 😊', color: '#6c2c91', unlock: 'posNumber', callLines: ['Hiii! I dey close by 7pm. Make we go Jabi Lake later?'], transferClout: 3, transferReply: 'Awww thank you 🥰 You too sweet!' },
  { id: 'bigjoe', name: 'Big Joe (The Cage)', color: '#1a0a24', unlock: 'cageRegular', callLines: ['My guy! Tonight we dey open from 9pm. I don put your name for guest list.'] },
  { id: 'okafor', name: 'Dr. Okafor', color: '#5a3a24', unlock: 'met:lecturer', callLines: ['Who is this? ... Ah, my student. Your assignment is due tomorrow. No excuses.'] },
  { id: 'kola', name: 'Kola (Estate Agent)', color: '#123e7c', unlock: 'met:agent', callLines: ['Boss! Another plot don show for Guzape. Only ₦90 million now. Price dey go up!'] },
];

export function unlockedContacts(flags: ReadonlySet<string>): Contact[] {
  return CONTACTS.filter((c) => !c.unlock || flags.has(c.unlock));
}

/** Texts that arrive the first time a flag is set. */
export const FLAG_TEXTS: Record<string, { from: string; text: string }> = {
  'met:uncle': { from: 'Uncle Emeka', text: 'Welcome to Abuja! I don save Danladi taxi number for your phone. Call am anytime.' },
  posNumber: { from: 'Blessing (POS) 😊', text: 'Hi, na me from the POS stand 😊 No forget to call me o.' },
  cageRegular: { from: 'Big Joe (The Cage)', text: 'You don enter VIP list. Anytime you reach, just show face.' },
  'met:market': { from: 'Mama Nkechi (Wuse Market)', text: 'Customer! I save your number. New stock every Monday!' },
  'met:lecturer': { from: 'Nile University', text: 'REMINDER: Test 2 holds on Friday in LT1. Attendance is compulsory.' },
  sugPresident: { from: 'Nile University', text: 'Congratulations to our new SUG President! Office keys at the Senate building.' },
  fabric: { from: 'Aunty Funmi', text: 'I hear say you don buy fabric. Make sure you sew am before my party o!' },
  landlord: { from: 'Kola (Estate Agent)', text: 'Congratulations on your new land! C of O ready. Welcome to Guzape big boys club.' },
};

const MORNING = [
  'Good morning my child. Pray before you go out. Love, Mummy',
  'Mummy: Abeg eat breakfast today. Don’t go and faint for road.',
  'Mummy: Your cousin Chinedu just bought car. When your own?',
  'Mummy: I dreamt about you last night. Make sure say you dey careful.',
  'Mummy: Call me when you wake. Nothing serious, just wan hear your voice.',
];

const GROUP = [
  'Tunde: Who dey Wuse 2 tonight? Suya on me 🍢',
  'Ada: Kubwa traffic don hold me since 6am 😭',
  'Femi: Guys the light don go again for Gwarinpa 💡❌',
  'Chika: Jabi Lake this Saturday? Boat ride + small chops',
  'Tunde: E get one babe for POS wey no dey give change 😂',
  'Ada: Who go The Cage this weekend? I need guest list 👀',
  'Femi: Abuja fuel price don reach where again?? 🙆🏾‍♂️',
  'Chika: Owambe for Gwarinpa Saturday. Aso-ebi na green and gold',
];

export function morningText(day: number): { from: string; text: string } {
  return { from: 'Mummy ❤️', text: MORNING[day % MORNING.length].replace(/^Mummy: /, '') };
}

export function groupText(seed: number): { from: string; text: string } {
  return { from: 'Wuse Boys & Girls 🇳🇬', text: GROUP[seed % GROUP.length] };
}

export const TRANSFER_FEE = 10;
export const TAXI_FARE = 2500;

export interface BankOp {
  label: string;
  amount: number;
  clout: number;
  /** Text that arrives afterwards. */
  reply?: { from: string; text: string };
  endsBlackout?: boolean;
}

export function transferOp(c: Contact, amount: number): BankOp {
  return {
    label: `Transfer to ${c.name}`,
    amount: -(amount + TRANSFER_FEE),
    clout: c.transferClout ?? 0,
    reply: c.transferReply ? { from: c.name, text: c.transferReply } : undefined,
  };
}

export const BILLS: { id: string; label: string; amount: number; clout: number; reply: { from: string; text: string }; endsBlackout?: boolean }[] = [
  { id: 'airtime', label: 'MTN Airtime', amount: 1000, clout: 0, reply: { from: 'MTN', text: 'You have received ₦1,000 airtime. Dial *310# to check your balance.' } },
  { id: 'data', label: 'MTN Data 5GB', amount: 3500, clout: 1, reply: { from: 'MTN', text: 'Dear customer, your 5GB data plan is now active. Valid for 30 days.' } },
  { id: 'nepa', label: 'AEDC Prepaid Token (25 kWh)', amount: 5000, clout: 1, endsBlackout: true, reply: { from: 'AEDC', text: 'Token: 4821-3390-1176-2045-9933 • 25 kWh. Load am for your meter. Light don come back! 💡' } },
  { id: 'estate', label: 'Estate Service Charge (1 week)', amount: 10000, clout: 1, reply: { from: 'Sunshine Court Estate', text: 'Payment received. Thank you for keeping our estate safe and clean. — Mrs. Okon' } },
  { id: 'dstv', label: 'Cable TV Subscription', amount: 7000, clout: 2, reply: { from: 'Cable TV', text: 'Subscription renewed. Enjoy the Super Eagles match this weekend!' } },
];

export function canAfford(money: number, op: BankOp): boolean {
  return money + op.amount >= 0;
}

let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** How a contact answers "abeg send me money". Pure so it can be tested. */
export function requestReply(c: Contact, amount: number, rng: () => number): { text: string; give: number } {
  const generous: Record<string, number> = { mummy: 0.75, uncle: 0.45, bigjoe: 0.2, posbabe: 0.35, kola: 0.1 };
  const p = (generous[c.id] ?? 0.15) * (amount > 20000 ? 0.4 : amount > 5000 ? 0.75 : 1);
  if (rng() < p) {
    const give = rng() < 0.7 ? amount : Math.max(500, Math.round(amount / 2 / 500) * 500);
    const yes: Record<string, string> = {
      mummy: give < amount ? `I only get small, my child. Manage this one. ❤️` : 'I don send am. Use am well o, no go spend am for nonsense!',
      uncle: give < amount ? 'Na half I fit do o. Times hard.' : 'I don send am. Na loan o, no be dash!',
    };
    return { give, text: yes[c.id] ?? (give < amount ? 'Na this one I get. Manage am.' : 'Done! I don send am. 👍🏾') };
  }
  const no = [
    'Ah, I no get kobo for account. Na salary I dey wait too 😭',
    'Network no dey gree me send am. Try later.',
    'Abeg I dey hold meeting, I go call you back.',
    'Na you suppose dey send me money now! 😂',
    'Hmm… I go see wetin I fit do.',
  ];
  const special: Record<string, string> = {
    mummy: 'My child, I just pay your sister school fees. Next week by God grace.',
    danladi: 'Boss, na me suppose collect money from you o! 😂',
    okafor: 'Is this a joke? See me in my office.',
  };
  return { give: 0, text: special[c.id] && rng() < 0.6 ? special[c.id] : no[Math.floor(rng() * no.length)] };
}
