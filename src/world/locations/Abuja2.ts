import type { CollisionWorld } from '../../core/Collision';
import { newBuild, type LocationBuild } from './kit';
import type { QuickZone } from './QuickPlaces';

/** The ten extra real Abuja places (Farm City, Transcorp Hilton, …). */
export function buildAbuja2(_world: CollisionWorld): LocationBuild {
  return newBuild('abuja2');
}

/** Quick-action lists for the places built in this file. */
export const ABUJA2_QUICK: QuickZone[] = [];
