import { parseBackup, serializeBackup } from './backup';
import {
  defaultBackupPrefs,
  isBackupDue,
  loggedSessionCount,
  normalizeBackupPrefs,
  resetBackupSchedule,
  snoozeBackupSchedule,
} from './backupPrefs';
import { migrateState } from './db';
import { lastSessionTopSet } from './lastSession';
import type { GymState, Session, SetEntry } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const programId = 'p1';
const exA = 'ex-a';
const sessionOld: Session = {
  id: 's-old',
  programId,
  date: '2026-09-01',
  startedAt: '2026-09-01T10:00:00.000Z',
  endedAt: '2026-09-01T11:00:00.000Z',
};
const sessionMid: Session = {
  id: 's-mid',
  programId,
  date: '2026-09-10',
  startedAt: '2026-09-10T10:00:00.000Z',
  endedAt: '2026-09-10T11:00:00.000Z',
};
const sessionOpen: Session = {
  id: 's-open',
  programId,
  date: '2026-09-17',
  startedAt: '2026-09-17T10:00:00.000Z',
};

const sets: SetEntry[] = [
  {
    id: '1',
    sessionId: sessionOld.id,
    programExerciseId: exA,
    weight: 100,
    reps: 5,
    sortOrder: 0,
    createdAt: '2026-09-01T10:01:00.000Z',
  },
  {
    id: '2',
    sessionId: sessionMid.id,
    programExerciseId: exA,
    weight: 80,
    reps: 8,
    sortOrder: 0,
    createdAt: '2026-09-10T10:01:00.000Z',
  },
  {
    id: '3',
    sessionId: sessionMid.id,
    programExerciseId: exA,
    weight: 80,
    reps: 6,
    sortOrder: 1,
    createdAt: '2026-09-10T10:02:00.000Z',
  },
  {
    id: '4',
    sessionId: sessionOpen.id,
    programExerciseId: exA,
    weight: 90,
    reps: 3,
    sortOrder: 0,
    createdAt: '2026-09-17T10:01:00.000Z',
  },
];

const lastOpen = lastSessionTopSet(exA, [sessionOld, sessionMid, sessionOpen], sets, sessionOpen.id);
assert(lastOpen?.weight === 80 && lastOpen.reps === 8 && lastOpen.date === '2026-09-10', 'top set from prior session');

const lastClosed = lastSessionTopSet(exA, [sessionOld, sessionMid, sessionOpen], sets, null);
assert(lastClosed?.weight === 90 && lastClosed.date === '2026-09-17', 'no open session uses most recent');

assert(
  lastSessionTopSet('missing', [sessionOld], sets, null) === null,
  'omit glance when no history',
);

const prefs = defaultBackupPrefs(0, new Date('2026-09-01T00:00:00'));
assert(prefs.remindEnabled && prefs.everyDays === 7 && prefs.afterSessions === 4, 'gentle defaults');
assert(!isBackupDue(prefs, [], new Date('2026-09-06')), 'not due before 7 days');
assert(isBackupDue(prefs, [], new Date('2026-09-08')), 'due after 7 days');

const fourSessions = [
  { ...sets[0], sessionId: 'a' },
  { ...sets[0], sessionId: 'b', id: 'b' },
  { ...sets[0], sessionId: 'c', id: 'c' },
  { ...sets[0], sessionId: 'd', id: 'd' },
];
assert(
  isBackupDue({ ...prefs, lastResetAt: '2026-09-17T00:00:00.000Z' }, fourSessions, new Date('2026-09-17')),
  'due after 4 sessions',
);

const snoozed = snoozeBackupSchedule(prefs, loggedSessionCount(fourSessions), '2026-09-17T12:00:00.000Z');
assert(
  !isBackupDue(snoozed, fourSessions, new Date('2026-09-17')),
  'dismiss snoozes until next interval',
);

const exported = resetBackupSchedule(prefs, 2, '2026-09-17T12:00:00.000Z');
assert(exported.lastExportedAt === '2026-09-17T12:00:00.000Z', 'export stamps lastExportedAt');
assert(!isBackupDue(exported, fourSessions.slice(0, 2), new Date('2026-09-17')), 'export resets schedule');

const migrated = migrateState({
  program: {
    id: programId,
    title: 'Weekly lift',
    locked: true,
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  categories: [{ id: 'c1', programId, name: 'Push', sortOrder: 0 }],
  programExercises: [{ id: exA, categoryId: 'c1', name: 'Bench press', sortOrder: 0 }],
  sessions: [sessionOld],
  setEntries: [sets[0]],
});
assert(migrated.changed, 'migrate adds prefs in place');
assert(migrated.state.prefs.remindEnabled, 'prefs default on');
assert(migrated.state.sessions[0].date === '2026-09-01', 'dates intact');
assert(migrated.state.setEntries[0].weight === 100, 'sets intact');

const state: GymState = {
  ...migrated.state,
  programExercises: [
    { ...migrated.state.programExercises[0], retired: true },
    { id: 'ex-new', categoryId: 'c1', name: 'Dumbbell press', sortOrder: 0 },
  ],
  prefs: exported,
};
const roundTrip = parseBackup(serializeBackup(state));
assert(roundTrip.prefs.lastExportedAt === exported.lastExportedAt, 'prefs round-trip');
assert(roundTrip.programExercises.some((ex) => ex.retired && ex.name === 'Bench press'), 'retired round-trip');
assert(roundTrip.programExercises.some((ex) => ex.id === 'ex-new'), 'swap slot round-trip');

const oldBackup = serializeBackup(state) as unknown as Record<string, unknown>;
delete oldBackup.prefs;
const fromOld = parseBackup(oldBackup);
assert(fromOld.prefs.remindEnabled, 'old backup gets default prefs');
assert(fromOld.setEntries.length === 1, 'old backup keeps sets');

assert(normalizeBackupPrefs(undefined, 3).sessionCountAtReset === 3, 'missing prefs uses current session count');

console.log('checkLogic: ok');
