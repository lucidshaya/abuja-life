import type { Rect } from '../MapData';

/**
 * Fast-travel destinations, walk-in interiors and the doors between them.
 * Interiors live far east of the city (x > 1300), outside the fog, so they
 * are separate rooms you reach through a door.
 */

export interface Interior {
  id: string;
  name: string;
  tagline: string;
  rect: Rect;
  light: 'mall' | 'club' | 'hall';
  music: 'city' | 'club';
}

export const INTERIORS: Interior[] = [
  { id: 'mall', name: 'Jabi Lake Mall', tagline: 'AC, shopping and small chops. Enjoyment don land.', rect: { x0: 1400, z0: -60, x1: 1540, z1: 40 }, light: 'mall', music: 'city' },
  { id: 'cage', name: 'The Cage', tagline: 'Amapiano till morning. No sleeping for here.', rect: { x0: 1400, z0: 180, x1: 1446, z1: 216 }, light: 'club', music: 'club' },
  { id: 'lt1', name: 'Lecture Theatre 1', tagline: 'Sit down. Attendance dey count.', rect: { x0: 1600, z0: -20, x1: 1640, z1: 12 }, light: 'hall', music: 'city' },
];

export function interiorAt(x: number, z: number): Interior | null {
  for (const i of INTERIORS) if (x >= i.rect.x0 - 2 && x <= i.rect.x1 + 2 && z >= i.rect.z0 - 2 && z <= i.rect.z1 + 2) return i;
  return null;
}

export interface Portal {
  id: string;
  label: string;
  x: number;
  z: number;
  to: { x: number; z: number; heading: number };
  /** Requirement checked by the game before letting you through. */
  gate?: 'cage';
}

export const PORTALS: Portal[] = [
  // Jabi Lake Mall
  { id: 'mall-in', label: 'Enter Jabi Lake Mall', x: -152, z: -93, to: { x: 1470, z: 33, heading: Math.PI } },
  { id: 'mall-out', label: 'Exit to the car park', x: 1470, z: 37.5, to: { x: -148.5, z: -93, heading: Math.PI / 2 } },
  // The Cage
  { id: 'cage-in', label: 'Enter The Cage', x: 85, z: -70.5, to: { x: 1423, z: 210, heading: Math.PI }, gate: 'cage' },
  { id: 'cage-out', label: 'Exit to Wuse 2', x: 1423, z: 214.5, to: { x: 85, z: -65, heading: 0 } },
  // Nile University lecture theatre
  { id: 'lt1-in', label: 'Enter Lecture Theatre 1', x: -520, z: 132, to: { x: 1620, z: 6.5, heading: Math.PI } },
  { id: 'lt1-out', label: 'Exit to campus', x: 1620, z: 10.5, to: { x: -520, z: 137, heading: 0 } },
];

export interface TravelSpot {
  id: string;
  name: string;
  area: string;
  desc: string;
  featured: boolean;
  color: string;
  x: number;
  z: number;
  heading: number;
  /** Where the pin sits on the bird's-eye map (for interiors: the building outside). */
  pin?: { x: number; z: number };
}

export const TRAVEL: TravelSpot[] = [
  {
    id: 'mall', name: 'Jabi Lake Mall', area: 'Jabi', featured: true, color: '#2a64c9',
    desc: 'Full mall: ShopRight supermarket, food court, cinema, phone shop, and the fountain atrium.',
    x: 1470, z: 30, heading: Math.PI, pin: { x: -185, z: -93 },
  },
  {
    id: 'nile', name: 'Nile University', area: 'Jabi Airport Road', featured: true, color: '#7a1f3d',
    desc: 'Campus life: lectures, library, Mama Caf, SUG politics and Faculty football.',
    x: -402, z: 58, heading: -Math.PI / 2,
  },
  {
    id: 'park', name: 'Millennium Park', area: 'Maitama', featured: true, color: '#1f8a4b',
    desc: 'Fountains, water channel, picnics, horse rides and pre-wedding photo shoots.',
    x: 250, z: -142, heading: Math.PI,
  },
  {
    id: 'cage', name: 'The Cage', area: 'Wuse 2', featured: false, color: '#6c2c91',
    desc: 'Nightclub. Amapiano, bottle service and dance-offs. Opens 9pm.',
    x: 85, z: -64, heading: Math.PI, pin: { x: 85, z: -85 },
  },
  {
    id: 'wuse', name: 'Wuse 2', area: 'Your flat & suya', featured: false, color: '#e0915a',
    desc: 'Your flat, Mallam Musa suya spot and enjoyment central.',
    x: 10, z: -14, heading: Math.PI / 2,
  },
  {
    id: 'maitama', name: 'Maitama', area: 'Big man land', featured: false, color: '#8fbf7a',
    desc: 'Mansions, gatemen and "Do you know who I am?"',
    x: 22, z: -228, heading: Math.PI,
  },
  {
    id: 'guzape', name: 'Guzape Hills', area: 'New money', featured: false, color: '#9ccf7e',
    desc: 'Hillside mansions, the best view of Abuja and an estate agent with "offers".',
    x: 418, z: 246, heading: Math.PI / 2,
  },
  {
    id: 'market', name: 'Wuse Market', area: 'Utako', featured: false, color: '#e8a317',
    desc: 'Haggle with Mama Nkechi for aso-ebi fabric. Bring your bargaining power.',
    x: -232, z: 142, heading: 0,
  },
];
