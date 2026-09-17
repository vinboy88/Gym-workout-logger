import { useMemo, useState } from 'react';
import { formatDateKey, formatDateKeyLong } from './dates';
import { formatSet } from './ids';
import { useGym } from './store';
import type { ProgramExercise, Session, SetEntry } from './types';

type GroupedLift = {
  id: string;
  name: string;
  sets: SetEntry[];
};

function groupSessionLifts(
  session: Session,
  setEntries: SetEntry[],
  exercises: ProgramExercise[],
): GroupedLift[] {
  const nameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const grouped = new Map<string, SetEntry[]>();
  const order: string[] = [];
  const sets = setEntries
    .filter((set) => set.sessionId === session.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  for (const set of sets) {
    if (!grouped.has(set.programExerciseId)) {
      grouped.set(set.programExerciseId, []);
      order.push(set.programExerciseId);
    }
    grouped.get(set.programExerciseId)?.push(set);
  }
  return order.map((id) => ({
    id,
    name: nameById.get(id) ?? 'Removed exercise',
    sets: grouped.get(id) ?? [],
  }));
}

function sessionSummary(lifts: GroupedLift[]): string {
  const setCount = lifts.reduce((sum, lift) => sum + lift.sets.length, 0);
  if (setCount === 0) return 'No sets';
  const names = lifts.map((lift) => lift.name);
  const preview = names.slice(0, 2).join(', ');
  const extra = names.length > 2 ? ` +${names.length - 2}` : '';
  return `${setCount} set${setCount === 1 ? '' : 's'} · ${preview}${extra}`;
}

export function HistoryScreen() {
  const { state } = useGym();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    if (!state) return [];
    return [...state.sessions]
      .filter((session) => session.programId === state.program.id)
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.startedAt.localeCompare(a.startedAt);
      });
  }, [state]);

  const selected = sessions.find((session) => session.id === sessionId) ?? null;
  const lifts = state && selected
    ? groupSessionLifts(selected, state.setEntries, state.programExercises)
    : [];

  if (!state) return null;

  if (selected) {
    const setCount = lifts.reduce((sum, lift) => sum + lift.sets.length, 0);
    return (
      <section className="screen">
        <header className="screen-head">
          <div>
            <p className="eyebrow">{selected.endedAt ? 'Workout' : 'Open workout'}</p>
            <h2>{formatDateKey(selected.date)}</h2>
          </div>
          <button className="btn ghost" type="button" onClick={() => setSessionId(null)}>
            Back
          </button>
        </header>
        <p className="session-line">
          {formatDateKeyLong(selected.date)}
          {' · '}
          {setCount} set{setCount === 1 ? '' : 's'}
        </p>
        <div className="stack">
          {lifts.map((lift) => (
            <article key={lift.id} className="card exercise">
              <div className="exercise-head">
                <h3>{lift.name}</h3>
              </div>
              <ol className="set-pills">
                {lift.sets.map((set) => (
                  <li key={set.id}>
                    <span className="pill">{formatSet(set.weight, set.reps)}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
          {lifts.length === 0 && <p className="muted">No sets logged this day.</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Past workouts</p>
          <h2>History</h2>
        </div>
      </header>
      {sessions.length === 0 ? (
        <p className="muted">No workouts yet. Log a set and it will show up here by date.</p>
      ) : (
        <div className="stack">
          {sessions.map((session) => {
            const grouped = groupSessionLifts(session, state.setEntries, state.programExercises);
            return (
              <button
                key={session.id}
                type="button"
                className="history-item"
                onClick={() => setSessionId(session.id)}
              >
                <span className="history-item-top">
                  <span>{formatDateKey(session.date)}</span>
                  {!session.endedAt && <span className="lock-pill on">Open</span>}
                </span>
                <span className="history-item-meta">{sessionSummary(grouped)}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
