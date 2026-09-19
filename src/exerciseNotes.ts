import type { ExerciseNote } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeExerciseNotes(raw: unknown): ExerciseNote[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const notes: ExerciseNote[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (typeof item.sessionId !== 'string' || item.sessionId.length === 0) continue;
    if (typeof item.programExerciseId !== 'string' || item.programExerciseId.length === 0) {
      continue;
    }
    if (typeof item.text !== 'string') continue;
    const text = item.text.trim();
    if (!text) continue;
    const key = `${item.sessionId}\0${item.programExerciseId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      sessionId: item.sessionId,
      programExerciseId: item.programExerciseId,
      text,
    });
  }
  return notes;
}

export function noteText(
  notes: ExerciseNote[],
  sessionId: string | undefined,
  programExerciseId: string,
): string {
  if (!sessionId) return '';
  return (
    notes.find(
      (note) => note.sessionId === sessionId && note.programExerciseId === programExerciseId,
    )?.text ?? ''
  );
}

export function upsertExerciseNote(
  notes: ExerciseNote[],
  sessionId: string,
  programExerciseId: string,
  text: string,
): ExerciseNote[] {
  const others = notes.filter(
    (note) => !(note.sessionId === sessionId && note.programExerciseId === programExerciseId),
  );
  const trimmed = text.trim();
  if (!trimmed) return others;
  return [...others, { sessionId, programExerciseId, text: trimmed }];
}
