import { toLocalDateKey } from './dates';
import { nowIso } from './ids';
import { DEFAULT_REST_SECONDS, normalizeRestSeconds } from './restTimer';
import type { BackupPrefs, SetEntry } from './types';

export const DEFAULT_EVERY_DAYS = 7;
export const DEFAULT_AFTER_SESSIONS = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampInt(value: unknown, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function loggedSessionCount(setEntries: SetEntry[]): number {
  return new Set(setEntries.map((set) => set.sessionId)).size;
}

export function defaultBackupPrefs(
  sessionCount = 0,
  now = new Date(),
): BackupPrefs {
  return {
    remindEnabled: true,
    everyDays: DEFAULT_EVERY_DAYS,
    afterSessions: DEFAULT_AFTER_SESSIONS,
    lastExportedAt: null,
    lastResetAt: now.toISOString(),
    sessionCountAtReset: sessionCount,
    restSeconds: DEFAULT_REST_SECONDS,
  };
}

export function normalizeBackupPrefs(
  raw: unknown,
  sessionCount: number,
  now = new Date(),
): BackupPrefs {
  const defaults = defaultBackupPrefs(sessionCount, now);
  if (!isRecord(raw)) return defaults;
  return {
    remindEnabled:
      typeof raw.remindEnabled === 'boolean' ? raw.remindEnabled : defaults.remindEnabled,
    everyDays: clampInt(raw.everyDays, defaults.everyDays, 365),
    afterSessions: clampInt(raw.afterSessions, defaults.afterSessions, 99),
    lastExportedAt: typeof raw.lastExportedAt === 'string' ? raw.lastExportedAt : null,
    lastResetAt: typeof raw.lastResetAt === 'string' ? raw.lastResetAt : defaults.lastResetAt,
    sessionCountAtReset: clampInt(raw.sessionCountAtReset, sessionCount, 1_000_000),
    restSeconds: normalizeRestSeconds(raw.restSeconds),
  };
}

export function daysSinceReset(lastResetAt: string, now = new Date()): number {
  const from = new Date(`${toLocalDateKey(lastResetAt)}T00:00:00`);
  const to = new Date(`${toLocalDateKey(now)}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function isBackupDue(
  prefs: BackupPrefs,
  setEntries: SetEntry[],
  now = new Date(),
): boolean {
  if (!prefs.remindEnabled) return false;
  const sessionsSince = loggedSessionCount(setEntries) - prefs.sessionCountAtReset;
  const sessionDue = prefs.afterSessions > 0 && sessionsSince >= prefs.afterSessions;
  const daysDue = prefs.everyDays > 0 && daysSinceReset(prefs.lastResetAt, now) >= prefs.everyDays;
  return sessionDue || daysDue;
}

export function resetBackupSchedule(
  prefs: BackupPrefs,
  sessionCount: number,
  exportedAt = nowIso(),
): BackupPrefs {
  return {
    ...prefs,
    lastExportedAt: exportedAt,
    lastResetAt: exportedAt,
    sessionCountAtReset: sessionCount,
  };
}

export function snoozeBackupSchedule(
  prefs: BackupPrefs,
  sessionCount: number,
  at = nowIso(),
): BackupPrefs {
  return {
    ...prefs,
    lastResetAt: at,
    sessionCountAtReset: sessionCount,
  };
}
