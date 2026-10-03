export type Tier = 'low' | 'medium' | 'high';

export interface TierConfig {
  pixelRatio: number;
  shadows: boolean;
  fogFar: number;
  walkers: number;
  traffic: number;
  npcCullDist: number;
}

export const TIERS: Record<Tier, TierConfig> = {
  low: { pixelRatio: 1, shadows: false, fogFar: 190, walkers: 14, traffic: 14, npcCullDist: 70 },
  medium: { pixelRatio: 1.5, shadows: false, fogFar: 300, walkers: 30, traffic: 26, npcCullDist: 110 },
  high: { pixelRatio: 2, shadows: true, fogFar: 460, walkers: 48, traffic: 40, npcCullDist: 160 },
};

export function isTouchDevice(): boolean {
  try {
    return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

/** First guess before we have measured anything. */
export function guessTier(touch: boolean, cores: number): Tier {
  if (touch) return cores >= 8 ? 'medium' : 'low';
  return cores >= 6 ? 'high' : 'medium';
}

export function lowerTier(t: Tier): Tier {
  return t === 'high' ? 'medium' : 'low';
}

/** Samples frame times; reports a tier change once if performance is poor. */
export class FpsSampler {
  private frames = 0;
  private time = 0;
  private warm = 0;
  fps = 60;
  done = false;

  /** Returns the measured FPS once the sample window completes, else null. */
  sample(dt: number): number | null {
    if (this.done) return null;
    if (this.warm < 1.5) {
      this.warm += dt;
      return null;
    }
    this.frames++;
    this.time += dt;
    if (this.time >= 3) {
      this.fps = this.frames / this.time;
      this.done = true;
      return this.fps;
    }
    return null;
  }

  reset(): void {
    this.frames = 0;
    this.time = 0;
    this.warm = 0;
    this.done = false;
  }
}
