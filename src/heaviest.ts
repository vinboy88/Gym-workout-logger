import type { HeaviestSet, SetEntry } from './types';

/** Heaviest set = max weight, then max reps at that weight. */
export function heaviestForExercise(
  programExerciseId: string,
  sets: SetEntry[],
): HeaviestSet | null {
  let best: HeaviestSet | null = null;
  for (const set of sets) {
    if (set.programExerciseId !== programExerciseId) continue;
    if (
      !best ||
      set.weight > best.weight ||
      (set.weight === best.weight && set.reps > best.reps)
    ) {
      best = { weight: set.weight, reps: set.reps };
    }
  }
  return best;
}

export function heaviestMap(sets: SetEntry[]): Map<string, HeaviestSet> {
  const map = new Map<string, HeaviestSet>();
  for (const set of sets) {
    const current = map.get(set.programExerciseId);
    if (
      !current ||
      set.weight > current.weight ||
      (set.weight === current.weight && set.reps > current.reps)
    ) {
      map.set(set.programExerciseId, { weight: set.weight, reps: set.reps });
    }
  }
  return map;
}
