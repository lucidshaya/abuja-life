import { DISTRICTS, NPC_SPOTS, inRect, type Rect } from '../MapData';
import { interiorAt } from './Locations';

/**
 * Quick-action lists: when the player is inside one of these zones a side
 * panel lists the places inside it. Picking one fades the player there and,
 * when `npc` is set (an NpcSpot id), starts talking to that person.
 */
export interface QuickItem {
  label: string;
  icon: string;
  x: number;
  z: number;
  heading: number;
  npc?: string;
}

export interface QuickZone {
  id: string;
  name: string;
  /** Outdoor rects that count as "inside" the place. */
  rects: Rect[];
  /** Interior ids (see Locations.INTERIORS) that also count. */
  interiors?: string[];
  items: QuickItem[];
}

/** Stand in front of an NPC spot (where it's facing), looking at it. */
export function standBy(id: string, label: string, icon: string, dist = 1.8): QuickItem {
  const s = NPC_SPOTS.find((n) => n.id === id);
  if (!s) throw new Error(`No NPC spot ${id}`);
  const x = s.x + Math.sin(s.facing) * dist;
  const z = s.z + Math.cos(s.facing) * dist;
  return { label, icon, x, z, heading: Math.atan2(s.x - x, s.z - z), npc: id };
}

const district = (id: string): Rect => {
  const d = DISTRICTS.find((x) => x.id === id);
  if (!d) throw new Error(`No district ${id}`);
  return { x0: d.x0, z0: d.z0, x1: d.x1, z1: d.z1 };
};

const mallItems = (): QuickItem[] => [
  { label: 'ShopRite aisles', icon: '🛒', x: 1503.5, z: -10, heading: Math.PI },
  standBy('cashier', 'ShopRite checkout', '🧾', 3.4),
  standBy('water', 'Buy bottled water', '💧'),
  standBy('food', 'Food court (Jollof Junction)', '🍛'),
  standBy('cinema', 'Lakeside Cinemas', '🎬'),
  standBy('phone', 'Gadget Palace (phones)', '📱'),
  standBy('promo', 'Promo girl (free samples)', '🎁'),
  { label: 'Kiddies play zone', icon: '🧸', x: 1510, z: 24, heading: 0 },
];

export const QUICK_ZONES: QuickZone[] = [
  {
    id: 'nile', name: 'Nile University', rects: [district('nile')], interiors: ['lt1'],
    items: [
      { label: 'Go to class (LT1)', icon: '🎓', x: 1620, z: -12.6, heading: Math.PI, npc: 'lecturer' },
      standBy('librarian', 'Library', '📚'),
      standBy('cafmama', 'Mama Caf', '🍛'),
      standBy('captain', 'Faculty football', '⚽'),
      standBy('sug', 'SUG election board', '🗳️'),
      { label: 'Senate building', icon: '🏛️', x: -500, z: 29, heading: Math.PI },
      { label: 'Hostels', icon: '🛏️', x: -545, z: -66, heading: Math.PI },
      standBy('uniguard', 'Main gate', '🚧'),
    ],
  },
  {
    id: 'mall-in', name: 'Jabi Lake Mall', rects: [], interiors: ['mall'],
    items: [...mallItems(), { label: 'Exit to car park', icon: '🚪', x: -148.5, z: -93, heading: Math.PI / 2 }],
  },
  {
    id: 'mall-out', name: 'Jabi Lake Mall', rects: [{ x0: -248, z0: -122, x1: -126, z1: -50 }],
    items: [
      { label: 'Enter the mall', icon: '🏬', x: 1470, z: 30, heading: Math.PI },
      ...mallItems().slice(0, 5),
      standBy('boat', 'Jabi Lake boat ride', '🚤'),
    ],
  },
  {
    id: 'park', name: 'Millennium Park', rects: [district('park')],
    items: [
      { label: 'Main entrance', icon: '🌳', x: 250, z: -145, heading: Math.PI },
      { label: 'Central fountain', icon: '⛲', x: 241, z: -238, heading: Math.atan2(9, -12) },
      standBy('groom', 'Pre-wedding shoot', '💍'),
      standBy('picnic', 'Picnic', '🧺'),
      standBy('photographer', 'Park photographer', '📸'),
      standBy('icecream', 'Ice cream', '🍦'),
      { label: 'Playground', icon: '🛝', x: 322, z: -178, heading: Math.PI },
      standBy('horse', 'Horse ride', '🐎'),
    ],
  },
  {
    id: 'cage-out', name: 'The Cage', rects: [{ x0: 62, z0: -110, x1: 112, z1: -58 }],
    items: [standBy('bouncer', 'Talk to the bouncer', '🕶️')],
  },
  {
    id: 'cage', name: 'The Cage', rects: [], interiors: ['cage'],
    items: [
      standBy('dancefloor', 'Dance floor', '💃', 0),
      standBy('bartender', 'Bar', '🍾', 3),
      standBy('dj', 'DJ booth', '🎧'),
      { label: 'Exit to Wuse 2', icon: '🚪', x: 85, z: -65, heading: 0 },
    ],
  },
  {
    id: 'guzape', name: 'Guzape Hills', rects: [district('guzape')],
    items: [standBy('agent', 'Estate agent (buy land)', '🏡'), standBy('viewpoint', 'Viewpoint', '🌄', 1.6)],
  },
];

/** The zone the player is standing in, if any. Interiors win over outdoor rects. */
export function quickZoneAt(zones: QuickZone[], x: number, z: number): QuickZone | null {
  const inside = interiorAt(x, z);
  if (inside) return zones.find((q) => q.interiors?.includes(inside.id)) ?? null;
  return zones.find((q) => q.rects.some((r) => inRect(r, x, z))) ?? null;
}
