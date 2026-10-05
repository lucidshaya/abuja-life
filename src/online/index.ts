import { LocalBackend, MockBackend } from './LocalBackend';
import type { OnlineBackend } from './types';

export * from './types';

/**
 * Picks the online backend:
 * - Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time (real players),
 * - a fake multi-tab server with ?mock=1 (tests),
 * - otherwise single-player accounts kept on this device.
 */
export async function createBackend(): Promise<OnlineBackend> {
  try {
    if (new URLSearchParams(location.search).has('mock')) return new MockBackend();
  } catch {
    /* no location */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) {
    try {
      const { SupabaseBackend } = await import('./SupabaseBackend');
      return new SupabaseBackend(url, key);
    } catch {
      /* fall through to offline */
    }
  }
  return new LocalBackend();
}
