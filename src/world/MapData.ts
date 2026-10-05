/**
 * Stylized, compressed Abuja. +x is east, -z is north. Units are metres.
 * Everything here is plain data so the minimap, city builder and event
 * system all agree on where things are.
 */

export type DistrictStyle = 'tower' | 'mixed' | 'estate' | 'mansion' | 'gov' | 'market' | 'park' | 'none';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface District extends Rect {
  id: string;
  name: string;
  tagline: string;
  color: string;
  ground: number;
  style: DistrictStyle;
  minH: number;
  maxH: number;
  density: number;
  palette: number[];
  minorRoads: boolean;
}

export interface RoadSeg {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
  kind: 'major' | 'minor' | 'expressway';
}

export type NpcLook =
  | 'vio' | 'mallam' | 'mama' | 'bigman' | 'clerk' | 'pastor' | 'uncle' | 'guard' | 'boatman' | 'driver' | 'pos' | 'aunty'
  | 'mallguard' | 'cashier' | 'promo' | 'chef' | 'phoneguy' | 'uniguard' | 'lecturer' | 'librarian' | 'cafmama' | 'captain'
  | 'sugguy' | 'photographer' | 'groom' | 'icecream' | 'horseman' | 'picnic' | 'bouncer' | 'bartender' | 'dj' | 'agent'
  | 'waiter' | 'musician' | 'operator' | 'vendor' | 'receptionist' | 'activist' | 'coach' | 'journalist' | 'senator'
  | 'star' | 'tout' | 'airline' | 'customs' | 'traveller'
  /** An interactive object (no person), shown with a marker only. */
  | 'none';

export interface NpcSpot {
  id: string;
  name: string;
  x: number;
  z: number;
  facing: number;
  eventId: string;
  /** Fire automatically when the player gets close (e.g. VIO checkpoint). */
  auto?: 'car' | 'foot' | 'any';
  look: NpcLook;
}

export interface CarSpot {
  x: number;
  z: number;
  heading: number;
  color: number;
  model: 'corolla' | 'benz' | 'suv';
}

const COLS = [-625, -375, -125, 125, 375];
const ROWS = [-375, -125, 125, 375];

function cell(col: number, row: number): Rect {
  return { x0: COLS[col], x1: COLS[col + 1], z0: ROWS[row], z1: ROWS[row + 1] };
}

export const WORLD: Rect = { x0: -920, z0: -420, x1: 560, z1: 420 };

export const DISTRICTS: District[] = [
  {
    id: 'highway', name: 'Abuja–Kaduna Expressway', tagline: 'Zuma Rock don welcome you to the FCT',
    x0: -920, x1: -625, z0: -375, z1: -125, color: '#b9a46a', ground: 0x9c8a55,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'kubwa', name: 'Kubwa', tagline: 'Expressway warriors. Traffic na lifestyle.',
    ...cell(0, 0), color: '#c7a36b', ground: 0x8f8a52,
    style: 'estate', minH: 4, maxH: 9, density: 0.75, palette: [0xe9d8b4, 0xd9b38c, 0xf1e5c8, 0xcfa77a, 0xe2c6a1], minorRoads: true,
  },
  {
    id: 'gwarinpa', name: 'Gwarinpa Estate', tagline: 'Biggest estate for West Africa, abi?',
    ...cell(1, 0), color: '#d1b483', ground: 0x7f9150,
    style: 'estate', minH: 5, maxH: 10, density: 0.8, palette: [0xf3ead7, 0xe5d0aa, 0xd8e0c8, 0xf0d8c0, 0xc9d6e3], minorRoads: true,
  },
  {
    id: 'maitama', name: 'Maitama', tagline: 'Where the big men sleep. Gate man dey check you.',
    ...cell(2, 0), color: '#8fbf7a', ground: 0x6f9a4a,
    style: 'mansion', minH: 7, maxH: 13, density: 0.85, palette: [0xffffff, 0xf4efe6, 0xe8e2d6, 0xdfe7ee, 0xf6e7d2], minorRoads: true,
  },
  {
    id: 'park', name: 'Millennium Park', tagline: 'Fountains, picnics and pre-wedding shoots. Aso Rock dey watch.',
    ...cell(3, 0), color: '#6fcf6a', ground: 0x5fa83f,
    style: 'park', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'nile', name: 'Nile University', tagline: 'Lectures, caf runs and Faculty football. Carry-over no be your portion.',
    x0: -620, x1: -385, z0: -115, z1: 245, color: '#5b8fd6', ground: 0x6f9a4a,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'guzape', name: 'Guzape Hills', tagline: 'New money, big views. Land here cost pass your village.',
    x0: 383, x1: 556, z0: 133, z1: 380, color: '#9ccf7e', ground: 0x6a9a44,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'jabi', name: 'Jabi Lake', tagline: 'Chill spot. Boat ride, small chops, cruise.',
    ...cell(1, 1), color: '#6fb3c9', ground: 0x6e9e4c,
    style: 'park', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'wuse', name: 'Wuse 2', tagline: 'Enjoyment central. Suya, lounges, and big boys.',
    ...cell(2, 1), color: '#e0915a', ground: 0x8a8a6a,
    style: 'tower', minH: 14, maxH: 48, density: 0.85, palette: [0xdfe6ec, 0xc9d3db, 0xe8dcc8, 0x9fb4c7, 0xf1f1ee, 0xb7c2a8], minorRoads: true,
  },
  {
    id: 'central', name: 'Central Area', tagline: 'Federal might. Mosque, Church, Eagle Square.',
    ...cell(3, 1), color: '#c9c1a6', ground: 0x7d9a52,
    style: 'gov', minH: 18, maxH: 55, density: 0.7, palette: [0xf0ece2, 0xd9d4c5, 0xbfc9d1, 0xe4dccb], minorRoads: true,
  },
  {
    id: 'utako', name: 'Utako & Wuse Market', tagline: 'Market women no dey carry last.',
    ...cell(1, 2), color: '#e8b04d', ground: 0x9a8656,
    style: 'market', minH: 5, maxH: 14, density: 0.85, palette: [0xe8d2a6, 0xd9b37a, 0xf0e2c0, 0xc79a62, 0xe0c9a0], minorRoads: true,
  },
  {
    id: 'garki', name: 'Garki & Area 1', tagline: 'Area 1 roundabout: enter at your own risk.',
    ...cell(2, 2), color: '#d97a6c', ground: 0x8d8a5e,
    style: 'mixed', minH: 7, maxH: 26, density: 0.85, palette: [0xe8dcc6, 0xd6c3a5, 0xc9d1d6, 0xf0e6d6, 0xbfae92], minorRoads: true,
  },
  {
    id: 'asokoro', name: 'Asokoro', tagline: 'Hilly, quiet and very, very expensive.',
    ...cell(3, 2), color: '#a3c58c', ground: 0x6a9446,
    style: 'mansion', minH: 7, maxH: 14, density: 0.8, palette: [0xffffff, 0xf2ece0, 0xe3ddd0, 0xf5e9dc], minorRoads: true,
  },
  // ---- Areas built by locations/Abuja2.ts ----
  {
    id: 'assembly', name: 'Three Arms Zone', tagline: 'National Assembly, Aso Rock and plenty soldiers. Behave yourself.',
    x0: 383, x1: 556, z0: -115, z1: 125, color: '#c9d9b0', ground: 0x739a4c,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'stadium', name: 'National Stadium', tagline: 'Moshood Abiola Stadium. Super Eagles, vuvuzela and jollof outside.',
    x0: -625, x1: -385, z0: 247, z1: 420, color: '#7fc46a', ground: 0x86a052,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
  {
    id: 'airport', name: 'Nnamdi Azikiwe Airport', tagline: 'Flight dey delay but the airport fine. Welcome to Abuja!',
    x0: -920, x1: -625, z0: -115, z1: 420, color: '#a9b8c9', ground: 0x9a9258,
    style: 'none', minH: 0, maxH: 0, density: 0, palette: [], minorRoads: false,
  },
];

/** Areas that the procedural builder must leave empty for landmarks. */
export const RESERVED: Rect[] = [
  { x0: -360, z0: -110, x1: -140, z1: 110 }, // Jabi Lake + park
  { x0: 140, z0: -110, x1: 240, z1: -10 }, // National Mosque
  { x0: 260, z0: -110, x1: 360, z1: -10 }, // Christian Centre
  { x0: 140, z0: 10, x1: 240, z1: 110 }, // Eagle Square
  { x0: -240, z0: 140, x1: -135, z1: 240 }, // Wuse Market stalls
  { x0: -30, z0: 220, x1: 30, z1: 280 }, // Area 1 roundabout
  { x0: -360, z0: -360, x1: -270, z1: -270 }, // Owambe hall, Gwarinpa
  { x0: -110, z0: -110, x1: -60, z1: -60 }, // Your flat in Wuse 2
  { x0: 6, z0: 6, x1: 60, z1: 40 }, // Suya joint
  { x0: 278, z0: 30, x1: 322, z1: 62 }, // Ministry of Wahala
  { x0: 62, z0: -110, x1: 112, z1: -60 }, // The Cage club
  // ---- Abuja2 places ----
  { x0: 46, z0: 46, x1: 114, z1: 114 }, // Farm City, Wuse 2
  { x0: -114, z0: 46, x1: -8, z1: 114 }, // Banex Plaza, Wuse 2
  { x0: 8, z0: -364, x1: 114, z1: -256 }, // Transcorp Hilton, Maitama
  { x0: 8, z0: -244, x1: 114, z1: -134 }, // Unity Fountain, Maitama
  { x0: 294, z0: 66, x1: 364, z1: 114 }, // Silverbird Galleria, Central
  { x0: 8, z0: 256, x1: 114, z1: 364 }, // Wonderland, Garki
  { x0: -364, z0: 134, x1: -256, z1: 244 }, // Jabi Motor Park, Utako
  { x0: -245, z0: -368, x1: -131, z1: -261 }, // Sunshine Court Estate (your house), Gwarinpa
  // ---- Role workplaces (locations/Workspaces.ts) ----
  { x0: 12, z0: -60, x1: 60, z1: -10 }, // Wuse Tech Hub (Tech Bro), Wuse 2
  { x0: -488, z0: -238, x1: -423, z1: -158 }, // Government Secondary School Kubwa (NYSC PPA)
  { x0: 324, z0: 6, x1: 366, z1: 64 }, // FCTA Secretariat (FCT Minister), Central Area
];

/** Areas kept free of scattered trees because a location is built there. */
export const NO_TREES: Rect[] = [
  { x0: -622, z0: -117, x1: -383, z1: 247 }, // Nile University
  { x0: -248, z0: -118, x1: -128, z1: -50 }, // Jabi Lake Mall + car park
  { x0: 381, z0: 131, x1: 558, z1: 382 }, // Guzape
  { x0: 133, z0: -367, x1: 367, z1: -133 }, // Millennium Park interior
  // ---- Abuja2 places ----
  { x0: 46, z0: 46, x1: 114, z1: 114 }, // Farm City
  { x0: -114, z0: 46, x1: -8, z1: 114 }, // Banex Plaza
  { x0: 8, z0: -364, x1: 114, z1: -256 }, // Transcorp Hilton
  { x0: 8, z0: -244, x1: 114, z1: -134 }, // Unity Fountain
  { x0: 294, z0: 66, x1: 364, z1: 114 }, // Silverbird Galleria
  { x0: 8, z0: 256, x1: 114, z1: 364 }, // Wonderland
  { x0: -364, z0: 134, x1: -256, z1: 244 }, // Jabi Motor Park
  { x0: 383, z0: -115, x1: 556, z1: 122 }, // National Assembly
  { x0: -625, z0: 246, x1: -385, z1: 420 }, // National Stadium
  { x0: -915, z0: -100, x1: -640, z1: 300 }, // Airport terminal, apron, runway
  { x0: -915, z0: 300, x1: -862, z1: 415 }, // Runway (south end)
  { x0: -245, z0: -368, x1: -131, z1: -249 }, // Sunshine Court Estate + driveway
  // ---- Role workplaces (locations/Workspaces.ts) ----
  { x0: 12, z0: -60, x1: 60, z1: -10 }, // Wuse Tech Hub
  { x0: -488, z0: -239, x1: -423, z1: -158 }, // GSS Kubwa
  { x0: 322, z0: 5.5, x1: 367, z1: 64 }, // FCTA Secretariat
  { x0: -37, z0: 131, x1: -23, z1: 140 }, // Your POS stand, Garki
  { x0: -230, z0: 133, x1: -212, z1: 153 }, // Your fabric shop, Wuse Market
  { x0: -247, z0: 203, x1: -229, z1: 224 }, // Tsangaya, Wuse Market
];

export const LANDMARKS = {
  zuma: { x: -800, z: -340, r: 48, h: 120 },
  aso: { x: 480, z: -240, r: 75, h: 95 },
  cityGate: { x: -660, z: -250 },
  mosque: { x: 190, z: -60 },
  church: { x: 310, z: -60 },
  eagleSquare: { x: 190, z: 60 },
  lake: { x: -255, z: 15, rx: 78, rz: 62 },
  jabiMall: { x: -200, z: -93 },
  market: { x: -188, z: 190 },
  area1: { x: 0, z: 250, r: 18 },
  owambe: { x: -315, z: -315 },
  home: { x: -85, z: -85 },
  suya: { x: 30, z: 22 },
};

export const SPAWN = { x: -704, z: -236.6, heading: Math.PI / 2 };
export const HOME_SPAWN = { x: -85, z: -58, heading: 0 };

export const NPC_SPOTS: NpcSpot[] = [
  { id: 'uncle', name: 'Uncle Emeka', x: -697, z: -236.2, facing: -Math.PI / 2, eventId: 'welcome', look: 'uncle' },
  { id: 'vio', name: 'VIO Officer Bature', x: 136, z: 205, facing: -Math.PI / 2, eventId: 'vio', auto: 'car', look: 'vio' },
  { id: 'suya', name: 'Mallam Musa (Suya)', x: 24, z: 14, facing: Math.PI, eventId: 'suya', look: 'mallam' },
  { id: 'market', name: 'Mama Nkechi', x: -186, z: 182, facing: Math.PI, eventId: 'market', look: 'mama' },
  { id: 'owambe', name: 'Aunty Funmi (Celebrant)', x: -300, z: -296, facing: 0, eventId: 'owambe', look: 'aunty' },
  { id: 'ministry', name: 'Mr. Danjuma (Clerk)', x: 300, z: 56.5, facing: 0, eventId: 'ministry', look: 'clerk' },
  { id: 'bigman', name: 'Chief "Do You Know Me"', x: 12, z: -238, facing: Math.PI, eventId: 'bigman', look: 'bigman' },
  { id: 'pastor', name: 'Evangelist Joshua', x: 28, z: 226, facing: Math.PI / 2, eventId: 'preacher', look: 'pastor' },
  { id: 'boat', name: 'Baba Boat', x: -255, z: -54, facing: 0, eventId: 'jabi-boat', look: 'boatman' },
  { id: 'oneway', name: 'Danladi (One-Way Driver)', x: -500, z: -236, facing: Math.PI, eventId: 'oneway', look: 'driver' },
  { id: 'guard', name: 'Soldier at Checkpoint', x: 368, z: -250, facing: -Math.PI / 2, eventId: 'aso-guard', auto: 'any', look: 'guard' },
  { id: 'pos', name: 'POS Babe', x: -40, z: 136, facing: Math.PI, eventId: 'pos', look: 'pos' },
  { id: 'gateman', name: 'Gateman Sule', x: -85, z: -64, facing: Math.PI, eventId: 'gateman', look: 'mallam' },
  // ---- Jabi Lake Mall (interior) ----
  { id: 'mallguard', name: 'Mall Security', x: 1478, z: 30, facing: Math.PI, eventId: 'mall-security', look: 'mallguard' },
  { id: 'cashier', name: 'Cashier Blessing', x: 1491.2, z: -18, facing: -Math.PI / 2, eventId: 'mall-checkout', look: 'cashier' },
  { id: 'water', name: 'Bottled Water Stack', x: 1508, z: 8.2, facing: 0, eventId: 'mall-water', look: 'none' },
  { id: 'promo', name: 'Promo Girl', x: 1512, z: -53, facing: 0, eventId: 'mall-promo', look: 'promo' },
  { id: 'food', name: 'Jollof Junction', x: 1435, z: -44, facing: 0, eventId: 'mall-food', look: 'chef' },
  { id: 'cinema', name: 'Lakeside Cinemas', x: 1424, z: -10.8, facing: Math.PI / 2, eventId: 'mall-cinema', look: 'promo' },
  { id: 'phone', name: 'Gadget Palace', x: 1424, z: 2, facing: Math.PI / 2, eventId: 'mall-phone', look: 'phoneguy' },
  // ---- Nile University ----
  { id: 'uniguard', name: 'Campus Security', x: -396, z: 70, facing: -Math.PI / 2, eventId: 'nile-gate', look: 'uniguard' },
  { id: 'lecturer', name: 'Dr. Okafor', x: 1620, z: -15, facing: 0, eventId: 'nile-lecture', look: 'lecturer' },
  { id: 'librarian', name: 'Librarian', x: -440, z: 134, facing: 0, eventId: 'nile-library', look: 'librarian' },
  { id: 'cafmama', name: 'Mama Caf', x: -430, z: 195, facing: 0, eventId: 'nile-caf', look: 'cafmama' },
  { id: 'captain', name: 'Team Captain Tunde', x: -540, z: 165, facing: Math.PI, eventId: 'nile-football', look: 'captain' },
  { id: 'sug', name: 'SUG Candidate', x: -484, z: 86, facing: 0, eventId: 'nile-sug', look: 'sugguy' },
  // ---- Millennium Park ----
  { id: 'photographer', name: 'Park Photographer', x: 238, z: -146, facing: 0, eventId: 'park-photo', look: 'photographer' },
  { id: 'groom', name: 'Pre-wedding Couple', x: 204, z: -250, facing: Math.PI / 2, eventId: 'park-wedding', look: 'groom' },
  { id: 'icecream', name: 'Ice Cream Man', x: 265, z: -152, facing: 0, eventId: 'park-icecream', look: 'icecream' },
  { id: 'horse', name: 'Horse Ride', x: 302, z: -326, facing: -Math.PI / 2, eventId: 'park-horse', look: 'horseman' },
  { id: 'picnic', name: 'Picnic Family', x: 186, z: -296, facing: Math.PI / 2, eventId: 'park-picnic', look: 'picnic' },
  // ---- The Cage (club) ----
  { id: 'bouncer', name: 'Bouncer Big Joe', x: 94, z: -69, facing: 0, eventId: 'cage-bouncer', look: 'bouncer' },
  { id: 'bartender', name: 'Bartender', x: 1404, z: 198, facing: Math.PI / 2, eventId: 'cage-bar', look: 'bartender' },
  { id: 'dj', name: 'DJ Spinall-Abuja', x: 1423, z: 183, facing: 0, eventId: 'cage-dj', look: 'dj' },
  { id: 'dancefloor', name: 'Dance Floor', x: 1423, z: 203.5, facing: 0, eventId: 'cage-dance', look: 'none' },
  // ---- Guzape ----
  { id: 'agent', name: 'Estate Agent Kola', x: 425, z: 240, facing: Math.PI / 2, eventId: 'guzape-agent', look: 'agent' },
  { id: 'viewpoint', name: 'Guzape Viewpoint', x: 470, z: 150, facing: 0, eventId: 'guzape-view', look: 'none' },
  // ======== Abuja2 places (locations/Abuja2.ts, events/eventsPlaces.ts) ========
  // ---- Farm City (Wuse 2) + lounge interior ----
  { id: 'fc-waiter', name: 'Waitress Amaka', x: 60, z: 80, facing: Math.PI, eventId: 'farmcity-food', look: 'waiter' },
  { id: 'fc-band', name: 'Bandleader Chuks', x: 95, z: 91, facing: -Math.PI / 2, eventId: 'farmcity-band', look: 'musician' },
  { id: 'fc-arcade', name: 'Arcade Attendant', x: 1724, z: -34.5, facing: 0, eventId: 'farmcity-arcade', look: 'operator' },
  { id: 'fc-bar', name: 'Lounge Bartender', x: 1703.6, z: -22, facing: Math.PI / 2, eventId: 'farmcity-lounge', look: 'bartender' },
  // ---- Banex Plaza ----
  { id: 'banex-phone', name: 'Phone Hawker Ik', x: -58.5, z: 90, facing: 0, eventId: 'banex-buy', look: 'phoneguy' },
  { id: 'banex-repair', name: 'Screen Doctor', x: -39.5, z: 79.6, facing: 0, eventId: 'banex-repair', look: 'vendor' },
  { id: 'banex-buyer', name: 'Alhaji "Swap"', x: -82, z: 79.6, facing: 0, eventId: 'banex-sell', look: 'mallam' },
  // ---- Transcorp Hilton (+ lobby interior) ----
  { id: 'hilton-reception', name: 'Receptionist Zainab', x: 1730, z: 62, facing: 0, eventId: 'hilton-room', look: 'receptionist' },
  { id: 'hilton-bigman', name: 'Chief Dagogo (Oil Magnate)', x: 1712, z: 84, facing: Math.PI / 2, eventId: 'hilton-network', look: 'bigman' },
  { id: 'hilton-pool', name: 'Pool Waiter', x: 90, z: -350, facing: -Math.PI / 2, eventId: 'hilton-pool', look: 'waiter' },
  // ---- Unity Fountain ----
  { id: 'unity-vigil', name: 'Vigil Organiser', x: 58, z: -213, facing: 0, eventId: 'unity-vigil', look: 'activist' },
  { id: 'unity-jog', name: 'Coach Fatima', x: 99.5, z: -190, facing: -Math.PI / 2, eventId: 'unity-jog', look: 'coach' },
  { id: 'unity-photo', name: 'Fountain Photographer', x: 64, z: -164, facing: Math.PI, eventId: 'unity-photo', look: 'photographer' },
  // ---- National Assembly (Three Arms Zone) ----
  { id: 'nass-clerk', name: 'Clerk of the House', x: 464, z: -3.5, facing: 0, eventId: 'nass-gallery', look: 'clerk' },
  { id: 'nass-protest', name: 'Protest Leader Aisha', x: 440, z: 73, facing: 0, eventId: 'nass-protest', look: 'activist' },
  { id: 'nass-press', name: 'Reporter Tolu', x: 500, z: 73, facing: 0, eventId: 'nass-press', look: 'journalist' },
  { id: 'nass-senator', name: 'Distinguished Senator Okon', x: 484, z: 30, facing: -Math.PI / 2, eventId: 'nass-senator', look: 'senator' },
  // ---- Silverbird Galleria ----
  { id: 'sb-ticket', name: 'Cinema Ticket Girl', x: 319.5, z: 106, facing: 0, eventId: 'silverbird-movie', look: 'promo' },
  { id: 'sb-popcorn', name: 'Popcorn Seller', x: 342.5, z: 106, facing: 0, eventId: 'silverbird-popcorn', look: 'vendor' },
  { id: 'sb-star', name: 'Nollywood Star', x: 334.5, z: 108, facing: -Math.PI / 2, eventId: 'silverbird-star', look: 'star' },
  // ---- Wonderland Amusement Park ----
  { id: 'wl-ferris', name: 'Ferris Wheel Operator', x: 78, z: 327, facing: Math.PI, eventId: 'wonderland-ferris', look: 'operator' },
  { id: 'wl-bumper', name: 'Bumper Car Boy', x: 70, z: 280.5, facing: -Math.PI / 2, eventId: 'wonderland-bumper', look: 'operator' },
  { id: 'wl-candy', name: 'Candy Floss Mama', x: 46, z: 304.2, facing: 0, eventId: 'wonderland-candy', look: 'vendor' },
  // ---- Jabi Motor Park ----
  { id: 'jmp-ticket', name: 'Ticket Agent', x: -351.5, z: 172, facing: Math.PI / 2, eventId: 'motorpark-ticket', look: 'agent' },
  { id: 'jmp-tout', name: 'Agbero Tout', x: -312, z: 171, facing: Math.PI, eventId: 'motorpark-tout', look: 'tout' },
  { id: 'jmp-shayi', name: 'Mai Shayi', x: -268, z: 188.4, facing: 0, eventId: 'motorpark-shayi', look: 'mallam' },
  // ---- National Stadium ----
  { id: 'st-match', name: 'Match Steward', x: -528, z: 279, facing: Math.PI, eventId: 'stadium-match', look: 'uniguard' },
  { id: 'st-jersey', name: 'Jersey Seller', x: -478, z: 279, facing: Math.PI, eventId: 'stadium-jersey', look: 'vendor' },
  { id: 'st-coach', name: 'Track Coach', x: -505, z: 321.5, facing: Math.PI, eventId: 'stadium-jog', look: 'coach' },
  // ---- Nnamdi Azikiwe International Airport ----
  { id: 'ap-checkin', name: 'Air Naija Check-in', x: -765, z: 238.6, facing: 0, eventId: 'airport-checkin', look: 'airline' },
  { id: 'ap-customs', name: 'Customs Officer', x: -735, z: 238.6, facing: 0, eventId: 'airport-customs', look: 'customs' },
  { id: 'ap-relative', name: 'Cousin Ada (just landed)', x: -712, z: 241, facing: 0, eventId: 'airport-welcome', look: 'traveller' },
  // ---- Sunshine Court Estate (your house) + the waza plug ----
  { id: 'estate-gate', name: 'Estate Security (Baba Audu)', x: -194.2, z: -265.5, facing: Math.PI / 2, eventId: 'estate-gate', look: 'guard' },
  { id: 'estate-manager', name: 'Estate Manager Mrs. Okon', x: -182.6, z: -270, facing: -Math.PI / 2, eventId: 'estate-office', look: 'aunty' },
  { id: 'estate-door', name: 'Your front door', x: -207.6, z: -287, facing: Math.PI / 2, eventId: 'estate-home', look: 'none' },
  { id: 'estate-meter', name: 'Prepaid meter (AEDC)', x: -207.6, z: -290.5, facing: Math.PI / 2, eventId: 'estate-meter', look: 'none' },
  { id: 'home-bed', name: 'Bed', x: 1470.5, z: 245, facing: Math.PI / 2, eventId: 'home-bed', look: 'none' },
  { id: 'home-laptop', name: 'Laptop (Jumia furniture shop)', x: 1488, z: 259.2, facing: Math.PI, eventId: 'home-laptop', look: 'none' },
  { id: 'home-wardrobe', name: 'Wardrobe', x: 1473.75, z: 241.9, facing: 0, eventId: 'home-wardrobe', look: 'none' },
  { id: 'home-couch', name: 'Living room (TV & couch)', x: 1464.6, z: 256, facing: Math.PI / 2, eventId: 'home-couch', look: 'none' },
  { id: 'home-fridge', name: 'Kitchen', x: 1489, z: 242.2, facing: -Math.PI / 2, eventId: 'home-fridge', look: 'none' },
  { id: 'waza-plug', name: 'Waza Plug (Banex)', x: -70, z: 90, facing: 0, eventId: 'waza-plug', look: 'phoneguy' },
];

export const CAR_SPOTS: CarSpot[] = [
  { x: -713, z: -236.9, heading: Math.PI / 2, color: 0xc9ccd1, model: 'corolla' }, // spawn (City Gate)
  { x: -70, z: -64, heading: 0, color: 0x111111, model: 'benz' }, // home
  { x: 48, z: 30, heading: Math.PI / 2, color: 0x8a1c24, model: 'suv' }, // Wuse 2
  { x: -205, z: 146, heading: 0, color: 0xc0262d, model: 'corolla' }, // market
  { x: 145, z: 140, heading: 0, color: 0xe9e9e9, model: 'benz' }, // Garki
  { x: -410, z: 82, heading: Math.PI / 2, color: 0x1f3f7a, model: 'suv' }, // Nile University
  { x: 262, z: -112, heading: Math.PI / 2, color: 0xe8a317, model: 'corolla' }, // Millennium Park
  { x: -143.5, z: -58, heading: Math.PI, color: 0x5b5f66, model: 'benz' }, // Jabi Lake Mall car park
  { x: 410, z: 258, heading: Math.PI / 2, color: 0xffffff, model: 'suv' }, // Guzape
  // ---- Abuja2 places (append only: cars are reset by index) ----
  { x: -760, z: 262, heading: Math.PI / 2, color: 0x1f3f7a, model: 'benz' }, // Airport forecourt
  { x: -470, z: 275, heading: Math.PI / 2, color: 0x1f8a4b, model: 'corolla' }, // National Stadium plaza
  { x: 395, z: 74, heading: Math.PI / 2, color: 0x111111, model: 'suv' }, // National Assembly (outside the gate)
  { x: -204, z: -294.6, heading: 0, color: 0x2a64c9, model: 'corolla' }, // your compound, Sunshine Court Estate
];

const MAJOR = 16;
const MINOR = 10;
const EXPRESS = 22;

/** Road network: district edges are major roads, district centres get minor roads. */
export function buildRoads(): RoadSeg[] {
  const roads: RoadSeg[] = [];
  // Vertical majors through the main grid.
  for (const x of [-375, -125, 125, 375]) roads.push({ x0: x, z0: -375, x1: x, z1: 375, width: MAJOR, kind: 'major' });
  roads.push({ x0: -625, z0: -375, x1: -625, z1: -125, width: MAJOR, kind: 'major' });
  // Horizontal majors.
  for (const z of [-375, -125, 125, 375]) roads.push({ x0: -375, z0: z, x1: 375, z1: z, width: MAJOR, kind: 'major' });
  for (const z of [-375, -125]) roads.push({ x0: -625, z0: z, x1: -375, z1: z, width: MAJOR, kind: 'major' });
  // The expressway from Zuma Rock through Kubwa and Gwarinpa into the city.
  roads.push({ x0: -920, z0: -250, x1: -125, z1: -250, width: EXPRESS, kind: 'expressway' });
  // Minor roads through district centres.
  for (const d of DISTRICTS) {
    if (!d.minorRoads) continue;
    const cx = (d.x0 + d.x1) / 2;
    const cz = (d.z0 + d.z1) / 2;
    roads.push({ x0: cx, z0: d.z0, x1: cx, z1: d.z1, width: MINOR, kind: 'minor' });
    if (!(d.id === 'kubwa' || d.id === 'gwarinpa')) roads.push({ x0: d.x0, z0: cz, x1: d.x1, z1: cz, width: MINOR, kind: 'minor' });
  }
  // Ring road past Aso Rock.
  roads.push({ x0: 375, z0: -250, x1: 400, z1: -250, width: MINOR, kind: 'minor' });
  // Nile University driveway and the road up to Guzape.
  roads.push({ x0: -470, z0: 60, x1: -375, z1: 60, width: MINOR, kind: 'minor' });
  roads.push({ x0: 375, z0: 250, x1: 545, z1: 250, width: MINOR, kind: 'minor' });
  // Airport Road: from the x=-375 major past the National Stadium to the airport terminal.
  roads.push({ x0: -700, z0: 258, x1: -375, z1: 258, width: MAJOR, kind: 'major' });
  // Three Arms Zone access road in front of the National Assembly gate.
  roads.push({ x0: 375, z0: 85, x1: 548, z1: 85, width: MINOR, kind: 'minor' });
  return roads;
}

export const ROADS = buildRoads();

export function districtAt(x: number, z: number): District | null {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return null;
}

export function inRect(r: Rect, x: number, z: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

/** True if a point lies on any road surface (with optional padding). */
export function onRoad(x: number, z: number, pad = 0): RoadSeg | null {
  for (const r of ROADS) {
    const hw = r.width / 2 + pad;
    const minX = Math.min(r.x0, r.x1) - hw;
    const maxX = Math.max(r.x0, r.x1) + hw;
    const minZ = Math.min(r.z0, r.z1) - hw;
    const maxZ = Math.max(r.z0, r.z1) + hw;
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return r;
  }
  return null;
}
