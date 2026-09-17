import { isDateKey, toLocalDateKey } from './dates';
import { nowIso } from './ids';
import type { BackupPayload, GymState } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function reqString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Backup missing ${field}`);
  }
  return value;
}

function reqNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Backup missing ${field}`);
  }
  return value;
}

function reqBool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Backup missing ${field}`);
  }
  return value;
}

export function serializeBackup(state: GymState): BackupPayload {
  return {
    version: 1,
    exportedAt: nowIso(),
    program: state.program,
    categories: state.categories,
    programExercises: state.programExercises,
    sessions: state.sessions,
    setEntries: state.setEntries,
  };
}

export function parseBackup(raw: unknown): GymState {
  if (!isRecord(raw) || raw.version !== 1) {
    throw new Error('Not a v1 gym backup JSON');
  }
  if (!isRecord(raw.program)) throw new Error('Backup missing program');
  if (!Array.isArray(raw.categories)) throw new Error('Backup missing categories');
  if (!Array.isArray(raw.programExercises)) {
    throw new Error('Backup missing programExercises');
  }
  if (!Array.isArray(raw.sessions)) throw new Error('Backup missing sessions');
  if (!Array.isArray(raw.setEntries)) throw new Error('Backup missing setEntries');

  const program = {
    id: reqString(raw.program.id, 'program.id'),
    title: reqString(raw.program.title, 'program.title'),
    locked: reqBool(raw.program.locked, 'program.locked'),
    updatedAt: reqString(raw.program.updatedAt, 'program.updatedAt'),
  };

  const categories = raw.categories.map((item, i) => {
    if (!isRecord(item)) throw new Error(`Bad category ${i}`);
    return {
      id: reqString(item.id, 'category.id'),
      programId: reqString(item.programId, 'category.programId'),
      name: reqString(item.name, 'category.name'),
      sortOrder: reqNumber(item.sortOrder, 'category.sortOrder'),
    };
  });

  const programExercises = raw.programExercises.map((item, i) => {
    if (!isRecord(item)) throw new Error(`Bad exercise ${i}`);
    return {
      id: reqString(item.id, 'exercise.id'),
      categoryId: reqString(item.categoryId, 'exercise.categoryId'),
      name: reqString(item.name, 'exercise.name'),
      sortOrder: reqNumber(item.sortOrder, 'exercise.sortOrder'),
    };
  });

  const sessions = raw.sessions.map((item, i) => {
    if (!isRecord(item)) throw new Error(`Bad session ${i}`);
    const endedAt =
      item.endedAt === undefined || item.endedAt === null
        ? undefined
        : reqString(item.endedAt, 'session.endedAt');
    const startedAt = reqString(item.startedAt, 'session.startedAt');
    return {
      id: reqString(item.id, 'session.id'),
      programId: reqString(item.programId, 'session.programId'),
      date: isDateKey(item.date) ? item.date : toLocalDateKey(startedAt),
      startedAt,
      ...(endedAt ? { endedAt } : {}),
    };
  });

  const setEntries = raw.setEntries.map((item, i) => {
    if (!isRecord(item)) throw new Error(`Bad set ${i}`);
    return {
      id: reqString(item.id, 'set.id'),
      sessionId: reqString(item.sessionId, 'set.sessionId'),
      programExerciseId: reqString(item.programExerciseId, 'set.programExerciseId'),
      weight: reqNumber(item.weight, 'set.weight'),
      reps: reqNumber(item.reps, 'set.reps'),
      sortOrder: reqNumber(item.sortOrder, 'set.sortOrder'),
      createdAt: reqString(item.createdAt, 'set.createdAt'),
    };
  });

  return { program, categories, programExercises, sessions, setEntries };
}

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `gym-backup-${y}-${m}-${d}.json`;
}
