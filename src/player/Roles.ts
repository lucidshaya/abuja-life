import type { CharacterConfig } from './CharacterConfig';

export type RoleId = 'almajiri' | 'student' | 'corper' | 'pos' | 'driver' | 'trader' | 'civil' | 'techbro' | 'senator' | 'minister';

export interface Role {
  id: RoleId;
  name: string;
  tag: string;
  blurb: string;
  color: string;
  /** Starting OPay balance. */
  money: number;
  clout: number;
  /** Paid every morning at 8am (0 = earn by working). */
  salary: number;
  salaryFrom: string;
  /** Outfit preset applied when the role is picked (the player can still change it later). */
  look: Partial<CharacterConfig>;
  workplace: { name: string; x: number; z: number; heading: number };
  work: { label: string; hours: number; pay: [number, number]; clout: number; lines: string[] };
  perk: string;
  email: { domain: string; welcome: { subject: string; body: string } };
}

export const ROLES: Role[] = [
  {
    id: 'almajiri', name: 'Almajiri', tag: 'Tsangaya pupil', color: '#8c5a2b',
    blurb: 'You study under Mallam at the Tsangaya and beg for sadaka with your bowl. Life hard, but your heart dey strong.',
    money: 300, clout: 0, salary: 0, salaryFrom: '',
    look: { outfit: 'jalabiya', primary: 1, secondary: 13, headwear: 'kufi', shoes: 'sandals', hair: 'bald', facialHair: 'none', watch: false, chain: false, bag: true, shades: false, specs: false },
    workplace: { name: 'Tsangaya, Wuse Market', x: -237, z: 206.5, heading: 0 },
    work: { label: 'Read your Allo, then beg for sadaka at the market', hours: 3, pay: [150, 1500], clout: 1, lines: ['"Sadaka, Allah ya saka!" A kind aunty drop money for your bowl.', 'One oga dash you small change and pure water.', 'Mama Nkechi give you leftover akara and ₦200.'] },
    perk: 'People feel for you: some events give you food and money free.',
    email: { domain: 'tsangaya.abujalife.ng', welcome: { subject: 'Your new Allo board', body: 'Mallam says: read your Qur\'an lesson early, then go to the market. Be respectful and Allah go open doors.' } },
  },
  {
    id: 'student', name: 'Student', tag: 'Nile University', color: '#7a1f3d',
    blurb: '200 level student at Nile University. Lectures, caf runs, assignments and Daddy\'s allowance.',
    money: 15000, clout: 2, salary: 3000, salaryFrom: 'Daddy (allowance)',
    look: { outfit: 'jersey', primary: 3, headwear: 'cap', shoes: 'sneakers', bag: true, watch: true },
    workplace: { name: 'Nile University', x: -402, z: 58, heading: -Math.PI / 2 },
    work: { label: 'Attend lectures & study', hours: 3, pay: [0, 500], clout: 2, lines: ['You attend 2 lectures and copy notes. Your GPA dey smile.', 'Group assignment: you did everything, others will "submit".', 'You study in the library till security pursue you.'] },
    perk: 'Student discounts at Mama Caf and special lecture choices.',
    email: { domain: 'students.nileuniversity.abujalife.ng', welcome: { subject: 'Course registration closes Friday', body: 'Dear student, complete your course registration and pay your hostel fees. Lectures hold in LT1. — Academic Office' } },
  },
  {
    id: 'corper', name: 'NYSC Corper', tag: 'Corps member', color: '#c9a96e',
    blurb: 'Fresh out of Kubwa orientation camp, now serving your fatherland in Abuja. "Allawee" dey come every month.',
    money: 20000, clout: 3, salary: 2600, salaryFrom: 'NYSC (monthly allowance, paid daily)',
    look: { outfit: 'nysc', headwear: 'nyscCap', shoes: 'boots', watch: true },
    workplace: { name: 'GSS Kubwa (your PPA)', x: -456, z: -228.5, heading: 0 },
    work: { label: 'Go to your PPA (place of primary assignment)', hours: 4, pay: [500, 2500], clout: 2, lines: ['Your boss send you to buy fuel for generator. Na your PPA be that.', 'CDS Thursday: you paint one primary school wall.', 'You teach JSS2 Mathematics. Them call you "Uncle Corper".'] },
    perk: '"Corper wee!" Soldiers and police are gentler with you.',
    email: { domain: 'nysc.abujalife.ng', welcome: { subject: 'Welcome to the FCT — CDS every Thursday', body: 'Corps Member, report to your PPA on Monday. Community Development Service holds every Thursday. Wear your khaki with pride. — NYSC FCT' } },
  },
  {
    id: 'pos', name: 'POS Agent', tag: 'Small business', color: '#6c2c91',
    blurb: 'Your umbrella and POS machine na your office. Withdrawal, transfer, airtime — network permitting.',
    money: 50000, clout: 1, salary: 0, salaryFrom: '',
    look: { outfit: 'ankara', pattern: 'diamonds', primary: 10, secondary: 8, hair: 'braids', headwear: 'none', facialHair: 'none', bag: true },
    workplace: { name: 'Your POS stand, Garki', x: -30.8, z: 137.1, heading: Math.PI },
    work: { label: 'Run your POS stand', hours: 4, pay: [2000, 9000], clout: 1, lines: ['Busy day! ₦200 charge per ₦5k adds up.', 'Network fail for 2 hours. Customers vex but they wait.', 'One customer try "transfer don go" scam. You no gree.'] },
    perk: 'You earn fees and can talk shop with other POS agents.',
    email: { domain: 'agents.opay.abujalife.ng', welcome: { subject: 'Your agent terminal is active', body: 'Dear Agent, your POS terminal is now active. Keep your float funded and always confirm credit alerts. — OPay Agent Support' } },
  },
  {
    id: 'driver', name: 'Taxi Driver', tag: 'One-way cab', color: '#1f9a4f',
    blurb: 'Green-and-white Abuja cab. "One-way! Wuse! Berger!" Fuel price na your enemy.',
    money: 8000, clout: 1, salary: 0, salaryFrom: '',
    look: { outfit: 'kaftan', primary: 12, secondary: 11, headwear: 'cap', shoes: 'sandals' },
    workplace: { name: 'Jabi Motor Park', x: -300, z: 150, heading: 0 },
    work: { label: 'Do one-way runs', hours: 3, pay: [3000, 8000], clout: 1, lines: ['Four passengers to Wuse, two to Berger. Good morning!', 'VIO stop you twice. You still make am.', 'Passenger no get change. You collect ₦1,000 for ₦800 trip. Bonus!'] },
    perk: 'You know every shortcut: cheaper taxi rides with Danladi.',
    email: { domain: 'cabs.abujalife.ng', welcome: { subject: 'Your cab permit has been renewed', body: 'Your FCT commercial vehicle permit is valid for 12 months. Keep your car green-and-white and drive with sense. — Transport Secretariat' } },
  },
  {
    id: 'trader', name: 'Market Trader', tag: 'Wuse Market', color: '#e8a317',
    blurb: 'Your shop for Wuse Market sell everything from lace to Ankara. Customers no dey carry last.',
    money: 40000, clout: 2, salary: 0, salaryFrom: '',
    look: { outfit: 'iroBuba', pattern: 'circles', primary: 8, secondary: 2, hair: 'gele', headwear: 'none', facialHair: 'none', build: 'heavy' },
    workplace: { name: 'Your shop, Wuse Market', x: -221.5, z: 142.6, heading: 0 },
    work: { label: 'Sell fabrics at your Wuse Market shop', hours: 4, pay: [4000, 14000], clout: 2, lines: ['Owambe season: aso-ebi sell like hot cake!', 'Customer price am from ₦20k to ₦12k. You still gain.', 'Market levy man come collect ₦1,000. "Na government".'] },
    perk: 'Wholesale prices at Wuse Market.',
    email: { domain: 'wusemarket.abujalife.ng', welcome: { subject: 'Shop rent reminder', body: 'Dear shop owner, your annual rent is due next month. Keep your receipts. — Wuse Market Management' } },
  },
  {
    id: 'civil', name: 'Civil Servant', tag: 'Federal ministry', color: '#123e7c',
    blurb: 'Grade Level 08 at the Federal Ministry of Wahala. Now YOU fit tell people "come back tomorrow".',
    money: 30000, clout: 3, salary: 5000, salaryFrom: 'Federal Government (IPPIS)',
    look: { outfit: 'senator', primary: 13, secondary: 1, headwear: 'none', shoes: 'loafers', specs: true, watch: true },
    workplace: { name: 'Federal Ministry of Wahala', x: 300, z: 58, heading: Math.PI },
    work: { label: 'Resume at the ministry', hours: 6, pay: [0, 2000], clout: 2, lines: ['You reach 9am, tea break 10am, lunch 12pm, close 2pm. Productive day.', 'You move one file from left table to right table.', 'Oga travel. Everybody "dey work from home".'] },
    perk: 'Special choices at the ministry and with government offices.',
    email: { domain: 'ministry.gov.abujalife.ng', welcome: { subject: 'Memo: Resumption time is 8am', body: 'All staff are reminded that resumption is 8am sharp. Staff who sign in after 9am will be queried. — Permanent Secretary' } },
  },
  {
    id: 'techbro', name: 'Tech Bro', tag: 'Remote dev, Wuse 2', color: '#00a6a6',
    blurb: 'You code for a foreign startup from a Wuse 2 co-working space. Salary in dollars, wahala in naira.',
    money: 250000, clout: 5, salary: 15000, salaryFrom: 'Startup payroll (USD → NGN)',
    look: { outfit: 'jersey', primary: 11, headwear: 'none', hair: 'twists', shoes: 'sneakers', specs: true, watch: true, bag: true },
    workplace: { name: 'Wuse Tech Hub', x: 36, z: -25, heading: Math.PI },
    work: { label: 'Ship code at the co-working space', hours: 4, pay: [5000, 20000], clout: 2, lines: ['You fix a bug in production. Slack dey celebrate you.', 'NEPA take light. You code on hotspot and battery.', 'Stand-up meeting by 3am because US time.'] },
    perk: 'Dollar salary — and everyone asks you for "small loan".',
    email: { domain: 'startup.io', welcome: { subject: 'Welcome aboard! 🚀', body: 'Hey! Glad to have you on the team. Your laptop is shipping. Daily stand-up is at 3pm WAT. — The Founders' } },
  },
  {
    id: 'senator', name: 'Politician (Senator)', tag: 'National Assembly', color: '#0f6b3a',
    blurb: 'Distinguished Senator of the Federal Republic. Constituency projects, motions, and plenty "allowances".',
    money: 2500000, clout: 35, salary: 150000, salaryFrom: 'National Assembly (salary & allowances)',
    look: { outfit: 'agbada', primary: 0, secondary: 8, headwear: 'fila', shoes: 'loafers', build: 'heavy', watch: true, chain: false, shades: true },
    workplace: { name: 'National Assembly', x: 470, z: 30, heading: Math.PI / 2 },
    work: { label: 'Attend plenary at the National Assembly', hours: 4, pay: [20000, 80000], clout: 4, lines: ['You raise a motion about Kubwa road. Everybody clap.', 'Plenary adjourned for lunch. "Distinguished colleagues!"', 'You sleep small during budget debate. Nobody notice.'] },
    perk: 'Huge clout: VIO, soldiers and bouncers wave you through.',
    email: { domain: 'senate.gov.abujalife.ng', welcome: { subject: 'Order Paper: plenary resumes Tuesday', body: 'Distinguished Senator, plenary resumes Tuesday 10am. Your constituency project proposals are due. — Clerk of the Senate' } },
  },
  {
    id: 'minister', name: 'FCT Minister', tag: 'Runs Abuja', color: '#d4a62a',
    blurb: 'Honourable Minister of the Federal Capital Territory. Roads, land allocations and convoys. Abuja na your yard.',
    money: 10000000, clout: 60, salary: 300000, salaryFrom: 'Federal Government',
    look: { outfit: 'babariga', primary: 0, secondary: 2, headwear: 'zanna', shoes: 'loafers', build: 'heavy', watch: true, shades: true },
    workplace: { name: 'FCTA Secretariat', x: 345, z: 28.5, heading: 0 },
    work: { label: 'Commission a project', hours: 3, pay: [50000, 200000], clout: 6, lines: ['You cut ribbon for new Kubwa road. Cameras everywhere!', 'Land allocation meeting. Everybody suddenly be your cousin.', 'You inspect Area 1 roundabout. Traffic stop for your convoy.'] },
    perk: 'Maximum clout. Every door for Abuja dey open for you.',
    email: { domain: 'fcta.gov.abujalife.ng', welcome: { subject: 'Your schedule for the week', body: 'Honourable Minister, you have 4 commissionings, 2 town hall meetings and the land allocation committee this week. — Chief of Staff' } },
  },
];

export function roleById(id: string | null | undefined): Role | null {
  return ROLES.find((r) => r.id === id) ?? null;
}

export function playerEmail(name: string, role: Role | null): string {
  const n = (name || 'player').toLowerCase().replace(/[^a-z0-9]/g, '') || 'player';
  return `${n}@${role?.email.domain ?? 'abujalife.ng'}`;
}
