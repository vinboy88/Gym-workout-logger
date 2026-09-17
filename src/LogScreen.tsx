import { useMemo, useState, type FormEvent } from 'react';
import { formatDateKey, formatDateKeyCompact, isDateKey, todayLocalDateKey } from './dates';
import { formatSet } from './ids';
import { lastSessionTopSet } from './lastSession';
import { exercisesFor, sortedCategories, useGym } from './store';
import type { LastSessionGlance, ProgramExercise, SetEntry } from './types';

function parseWeight(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function parseReps(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function ExerciseCard({
  exercise,
  sessionSets,
  last,
  locked,
  onLog,
  onRemoveSet,
}: {
  exercise: ProgramExercise;
  sessionSets: SetEntry[];
  last: LastSessionGlance | null;
  locked: boolean;
  onLog: (weight: number, reps: number) => Promise<void>;
  onRemoveSet: (id: string) => Promise<void>;
}) {
  const { heaviest } = useGym();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const best = heaviest.get(exercise.id);
  const sets = sessionSets.filter((set) => set.programExerciseId === exercise.id);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const w = parseWeight(weight);
    const r = parseReps(reps);
    if (w === null) {
      setError('Weight');
      return;
    }
    if (r === null) {
      setError('Reps');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onLog(w, r);
      setReps('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card exercise">
      <div className="exercise-head">
        <h3>{exercise.name}</h3>
        <p className="heaviest">
          {best ? `heaviest ${formatSet(best.weight, best.reps)}` : 'heaviest —'}
        </p>
        {last && (
          <p className="heaviest last-glance">
            last: {formatSet(last.weight, last.reps)} ({formatDateKeyCompact(last.date)})
          </p>
        )}
      </div>
      {sets.length > 0 && (
        <ol className="set-pills">
          {sets.map((set, index) => (
            <li key={set.id}>
              <button
                type="button"
                className="pill"
                onClick={() => void onRemoveSet(set.id)}
                aria-label={`Remove set ${index + 1}`}
              >
                {formatSet(set.weight, set.reps)}
              </button>
            </li>
          ))}
        </ol>
      )}
      <form className="log-row" onSubmit={(event) => void submit(event)}>
        <label>
          <span>kg</span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="0"
            aria-label="Weight in kilograms"
            disabled={!locked || busy}
          />
        </label>
        <label>
          <span>reps</span>
          <input
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            placeholder="0"
            disabled={!locked || busy}
          />
        </label>
        <button className="btn primary" type="submit" disabled={!locked || busy}>
          Log
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </article>
  );
}

export function LogScreen({ onNeedProgram }: { onNeedProgram: () => void }) {
  const { state, openSession, startSession, setSessionDate, endSession, logSet, removeSet } =
    useGym();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState(todayLocalDateKey);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = state ? sortedCategories(state) : [];
  const activeId = categoryId && categories.some((cat) => cat.id === categoryId)
    ? categoryId
    : categories[0]?.id ?? null;
  const exercises = state && activeId ? exercisesFor(state, activeId) : [];
  const sessionSets = useMemo(() => {
    if (!state || !openSession) return [];
    return state.setEntries
      .filter((set) => set.sessionId === openSession.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }, [openSession, state]);
  const lastByExercise = useMemo(() => {
    const map = new Map<string, LastSessionGlance>();
    if (!state) return map;
    for (const exercise of state.programExercises) {
      if (exercise.retired) continue;
      const glance = lastSessionTopSet(
        exercise.id,
        state.sessions,
        state.setEntries,
        openSession?.id,
      );
      if (glance) map.set(exercise.id, glance);
    }
    return map;
  }, [openSession?.id, state]);

  if (!state) return null;

  const locked = state.program.locked;
  const selectedDate = openSession?.date ?? draftDate;

  async function onDateChange(next: string) {
    if (!isDateKey(next)) return;
    setActionError(null);
    if (openSession) {
      try {
        await setSessionDate(next);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not change date');
      }
    } else {
      setDraftDate(next);
    }
  }

  async function onStart() {
    setActionError(null);
    try {
      await startSession(selectedDate);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start');
    }
  }

  async function onEnd() {
    setActionError(null);
    try {
      await endSession();
      setDraftDate(todayLocalDateKey());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not end');
    }
  }

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">{formatDateKey(selectedDate)}</p>
          <h2>Log</h2>
        </div>
        {locked && openSession ? (
          <button className="btn ghost" type="button" onClick={() => void onEnd()}>
            End
          </button>
        ) : locked ? (
          <button className="btn ghost" type="button" onClick={() => void onStart()}>
            Start
          </button>
        ) : null}
      </header>

      {!locked && (
        <div className="banner">
          <p>Lock your weekly program before logging sets.</p>
          <button className="btn primary" type="button" onClick={onNeedProgram}>
            Open program
          </button>
        </div>
      )}

      {locked && (
        <label className="date-field">
          <span>Workout date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => void onDateChange(event.target.value)}
          />
        </label>
      )}

      {locked && (
        <p className="session-line">
          {openSession
            ? `Workout open for ${formatDateKey(openSession.date)}.`
            : `Log a set to start a workout on ${formatDateKey(selectedDate)}.`}
        </p>
      )}

      {actionError && <p className="form-error">{actionError}</p>}

      <div className="chips" role="tablist" aria-label="Day">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={cat.id === activeId}
            className={cat.id === activeId ? 'chip on' : 'chip'}
            onClick={() => setCategoryId(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="stack">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionSets={sessionSets}
            last={lastByExercise.get(exercise.id) ?? null}
            locked={locked}
            onLog={(weight, reps) => logSet(exercise.id, weight, reps, selectedDate)}
            onRemoveSet={removeSet}
          />
        ))}
        {exercises.length === 0 && <p className="muted">No exercises on this day.</p>}
      </div>
    </section>
  );
}
