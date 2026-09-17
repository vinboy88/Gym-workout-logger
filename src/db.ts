import { withCalendarDate } from './dates';
import { seedGymState } from './seed';
import type { GymState, Session } from './types';

const DB_NAME = 'gym-workout-logger';
/** Single kv blob — do not bump; migrate fields in migrateState instead of wiping. */
const DB_VERSION = 1;
const STATE_KEY = 'state';

type StoredState = Omit<GymState, 'sessions'> & {
  sessions: Array<Session & { date?: string }>;
};

export function migrateState(stored: StoredState): { state: GymState; changed: boolean } {
  let changed = false;
  const sessions = stored.sessions.map((session) => {
    const next = withCalendarDate(session);
    if (next.date !== session.date) changed = true;
    return next;
  });
  return { state: { ...stored, sessions }, changed };
}

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
  let stored: StoredState | undefined;
  try {
    stored = await req<StoredState | undefined>(
      db.transaction('kv', 'readonly').objectStore('kv').get(STATE_KEY),
    );
  } finally {
    db.close();
  }

  if (stored?.program && Array.isArray(stored.categories)) {
    const { state, changed } = migrateState({
      ...stored,
      sessions: Array.isArray(stored.sessions) ? stored.sessions : [],
      setEntries: Array.isArray(stored.setEntries) ? stored.setEntries : [],
      programExercises: Array.isArray(stored.programExercises) ? stored.programExercises : [],
    });
    if (changed) {
      await saveState(state);
    }
    return state;
  }

  const seeded = seedGymState();
  await saveState(seeded);
  return seeded;
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
