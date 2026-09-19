import { defaultBackupPrefs } from './backupPrefs';
import { createId, nowIso } from './ids';
import type { Category, GymState, Program, ProgramExercise } from './types';

const PROGRAM_TITLE = 'Weekly lift';

function category(
  programId: string,
  name: string,
  sortOrder: number,
  lifts: string[],
): { category: Category; exercises: ProgramExercise[] } {
  const cat: Category = {
    id: createId(),
    programId,
    name,
    sortOrder,
  };
  const exercises = lifts.map((liftName, index) => ({
    id: createId(),
    categoryId: cat.id,
    name: liftName,
    sortOrder: index,
  }));
  return { category: cat, exercises };
}

export function seedGymState(): GymState {
  const program: Program = {
    id: createId(),
    title: PROGRAM_TITLE,
    locked: false,
    updatedAt: nowIso(),
  };

  const leg = category(program.id, 'Leg day', 0, [
    'Back squat',
    'Romanian deadlift',
    'Walking lunge',
    'Leg curl',
    'Standing calf raise',
  ]);
  const upper = category(program.id, 'Upper body', 1, [
    'Bench press',
    'Barbell row',
    'Overhead press',
    'Lat pulldown',
    'Dumbbell curl',
  ]);
  const push = category(program.id, 'Push', 2, [
    'Incline bench',
    'Overhead press',
    'Dip',
    'Lateral raise',
    'Tricep pushdown',
  ]);

  return {
    program,
    categories: [leg.category, upper.category, push.category],
    programExercises: [...leg.exercises, ...upper.exercises, ...push.exercises],
    sessions: [],
    setEntries: [],
    exerciseNotes: [],
    prefs: defaultBackupPrefs(0),
  };
}
