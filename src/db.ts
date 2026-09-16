import type { GymState } from './types';
import { seedGymState } from './seed';

const DB_NAME = 'gym-workout-logger';
const DB_VERSION = 1;
const STATE_KEY = 'state';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function loadState(): Promise<GymState> {
  const db = await openDb();
  try {
    const stored = await req<GymState | undefined>(
      db.transaction('kv', 'readonly').objectStore('kv').get(STATE_KEY),
    );
    if (stored?.program && Array.isArray(stored.categories)) {
      return stored;
    }
    const seeded = seedGymState();
    await saveState(seeded);
    return seeded;
  } finally {
    db.close();
  }
}

export async function saveState(state: GymState): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(state, STATE_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
    });
  } finally {
    db.close();
  }
}
