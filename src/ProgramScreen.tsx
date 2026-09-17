import { useEffect, useState, type FormEvent } from 'react';
import { exercisesFor, sortedCategories, useGym } from './store';

export function ProgramScreen() {
  const {
    state,
    setTitle,
    lockProgram,
    unlockProgram,
    addCategory,
    renameCategory,
    removeCategory,
    moveCategory,
    addExercise,
    renameExercise,
    removeExercise,
    moveExercise,
    swapExercise,
  } = useGym();
  const [title, setTitleDraft] = useState(state?.program.title ?? '');
  const [newDay, setNewDay] = useState('');
  const [newLifts, setNewLifts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [swapName, setSwapName] = useState('');

  useEffect(() => {
    setTitleDraft(state?.program.title ?? '');
  }, [state?.program.title]);

  if (!state) return null;
  const locked = state.program.locked;
  const categories = sortedCategories(state);
  const exerciseNames = [
    ...new Set(
      state.programExercises.filter((ex) => !ex.retired).map((ex) => ex.name),
    ),
  ].sort((a, b) => a.localeCompare(b));

  async function onSwap(event: FormEvent) {
    event.preventDefault();
    if (!swappingId) return;
    setMessage(null);
    try {
      await swapExercise(swappingId, swapName);
      setSwappingId(null);
      setSwapName('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not swap');
    }
  }

  async function onLock() {
    setMessage(null);
    try {
      await lockProgram();
      setMessage('Program locked. Log against this until you unlock.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not lock');
    }
  }

  async function onUnlock() {
    if (!window.confirm('Unlock and allow swapping days/exercises? Logged sets stay.')) {
      return;
    }
    setMessage(null);
    setSwappingId(null);
    setSwapName('');
    await unlockProgram();
  }

  async function saveTitle(event: FormEvent) {
    event.preventDefault();
    await setTitle(title);
  }

  async function onAddDay(event: FormEvent) {
    event.preventDefault();
    await addCategory(newDay);
    setNewDay('');
  }

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">{locked ? 'Locked' : 'Setup'}</p>
          <h2>Program</h2>
        </div>
        {locked ? (
          <button className="btn danger" type="button" onClick={() => void onUnlock()}>
            Unlock
          </button>
        ) : (
          <button className="btn primary" type="button" onClick={() => void onLock()}>
            Lock
          </button>
        )}
      </header>

      {message && <p className="banner-note">{message}</p>}

      <datalist id="exercise-names">
        {exerciseNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <form className="card title-row" onSubmit={(event) => void saveTitle(event)}>
        <label>
          <span>Weekly program</span>
          <input
            value={title}
            onChange={(event) => setTitleDraft(event.target.value)}
            disabled={locked}
            maxLength={48}
          />
        </label>
        {!locked && (
          <button className="btn ghost" type="submit">
            Save
          </button>
        )}
      </form>

      <div className="stack">
        {categories.map((cat, index) => {
          const lifts = exercisesFor(state, cat.id);
          return (
            <article key={cat.id} className="card">
              <div className="row-between">
                {locked ? (
                  <h3>{cat.name}</h3>
                ) : (
                  <input
                    className="inline-name"
                    defaultValue={cat.name}
                    onBlur={(event) => void renameCategory(cat.id, event.target.value)}
                    aria-label="Day name"
                  />
                )}
                {!locked && (
                  <div className="icon-row">
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={index === 0}
                      onClick={() => void moveCategory(cat.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={index === categories.length - 1}
                      onClick={() => void moveCategory(cat.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger-text"
                      onClick={() => {
                        if (window.confirm(`Remove ${cat.name}?`)) void removeCategory(cat.id);
                      }}
                    >
                      ⌫
                    </button>
                  </div>
                )}
              </div>
              <ul className="lift-list">
                {lifts.map((lift, liftIndex) => (
                  <li key={lift.id} className={swappingId === lift.id ? 'swapping' : undefined}>
                    {locked && swappingId === lift.id ? (
                      <form className="swap-form" onSubmit={(event) => void onSwap(event)}>
                        <input
                          value={swapName}
                          onChange={(event) => setSwapName(event.target.value)}
                          placeholder="Replacement"
                          list="exercise-names"
                          aria-label="Replacement exercise"
                          autoFocus
                        />
                        <button className="btn primary swap-btn" type="submit">
                          Save
                        </button>
                        <button
                          className="btn ghost swap-btn"
                          type="button"
                          onClick={() => {
                            setSwappingId(null);
                            setSwapName('');
                          }}
                        >
                          ×
                        </button>
                      </form>
                    ) : locked ? (
                      <>
                        <span>{lift.name}</span>
                        <button
                          type="button"
                          className="btn ghost swap-btn"
                          onClick={() => {
                            setSwappingId(lift.id);
                            setSwapName('');
                            setMessage(null);
                          }}
                        >
                          Swap
                        </button>
                      </>
                    ) : (
                      <input
                        className="inline-name"
                        defaultValue={lift.name}
                        onBlur={(event) => void renameExercise(lift.id, event.target.value)}
                        aria-label="Exercise name"
                      />
                    )}
                    {!locked && (
                      <div className="icon-row">
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={liftIndex === 0}
                          onClick={() => void moveExercise(lift.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={liftIndex === lifts.length - 1}
                          onClick={() => void moveExercise(lift.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger-text"
                          onClick={() => void removeExercise(lift.id)}
                        >
                          ⌫
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {!locked && (
                <form
                  className="add-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = newLifts[cat.id] ?? '';
                    void addExercise(cat.id, name).then(() => {
                      setNewLifts((prev) => ({ ...prev, [cat.id]: '' }));
                    });
                  }}
                >
                  <input
                    value={newLifts[cat.id] ?? ''}
                    onChange={(event) =>
                      setNewLifts((prev) => ({ ...prev, [cat.id]: event.target.value }))
                    }
                    placeholder="Add exercise"
                  />
                  <button className="btn ghost" type="submit">
                    Add
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      {!locked && (
        <form className="card add-row" onSubmit={(event) => void onAddDay(event)}>
          <input
            value={newDay}
            onChange={(event) => setNewDay(event.target.value)}
            placeholder="Add day (e.g. Pull)"
          />
          <button className="btn ghost" type="submit">
            Add day
          </button>
        </form>
      )}
    </section>
  );
}
