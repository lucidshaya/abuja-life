import type { CollisionWorld } from '../../core/Collision';
import { newBuild, type LocationBuild } from './kit';

/** A proper workplace for every role that doesn't already have one. */
export function buildWorkspaces(_world: CollisionWorld): LocationBuild {
  return newBuild('workspaces');
}
