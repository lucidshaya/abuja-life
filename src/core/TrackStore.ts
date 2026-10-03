/** Keeps the player's chosen song in IndexedDB so it survives reloads (this device only). */
const DB = 'abuja-life-music';
const STORE = 'tracks';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function saveTrack(file: Blob, name: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ file, name }, 'user');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* storage blocked: the song still plays this session */
  }
}

export async function loadTrack(): Promise<{ file: Blob; name: string } | null> {
  try {
    const db = await open();
    return await new Promise((res) => {
      const r = db.transaction(STORE).objectStore(STORE).get('user');
      r.onsuccess = () => res((r.result as { file: Blob; name: string } | undefined) ?? null);
      r.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

export async function clearTrack(): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete('user');
  } catch {
    /* ignore */
  }
}
