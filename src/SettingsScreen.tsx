import { useRef, useState } from 'react';
import { backupFilename } from './backup';
import { useGym } from './store';

export function SettingsScreen() {
  const { exportBackup, importBackup, state } = useGym();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  function onExport() {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = backupFilename();
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded.');
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      if (
        !window.confirm(
          'Replace everything on this phone with the backup? This cannot be undone.',
        )
      ) {
        return;
      }
      await importBackup(raw);
      setStatus('Restored from backup.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">This device</p>
          <h2>Settings</h2>
        </div>
      </header>

      <article className="card">
        <h3>Backup</h3>
        <p className="muted">
          Full JSON of program, sessions, and sets. Stored in IndexedDB until you export.
        </p>
        <div className="btn-col">
          <button className="btn primary" type="button" onClick={onExport}>
            Export JSON
          </button>
          <button className="btn ghost" type="button" onClick={() => fileRef.current?.click()}>
            Import / restore
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void onPickFile(event.target.files?.[0])}
          />
        </div>
        {status && <p className="banner-note">{status}</p>}
      </article>

      <article className="card">
        <h3>About</h3>
        <p className="muted">
          Local-first gym logger. No accounts, no cloud. History stays on this phone. Add to Home
          Screen from Safari for the PWA.
        </p>
        {state && (
          <p className="heaviest">
            {state.program.title} · {state.setEntries.length} sets · updated{' '}
            {new Date(state.program.updatedAt).toLocaleDateString()}
          </p>
        )}
      </article>
    </section>
  );
}
