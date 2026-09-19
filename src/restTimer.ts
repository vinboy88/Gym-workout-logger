export const REST_PRESETS = [45, 60, 90] as const;
export type RestPreset = (typeof REST_PRESETS)[number];
export const DEFAULT_REST_SECONDS: RestPreset = 60;

export function isRestPreset(value: unknown): value is RestPreset {
  return typeof value === 'number' && (REST_PRESETS as readonly number[]).includes(value);
}

export function normalizeRestSeconds(value: unknown): RestPreset {
  return isRestPreset(value) ? value : DEFAULT_REST_SECONDS;
}

/** Remaining whole seconds to show on the gym-floor clock. */
export function restSecondsLeft(endsAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function formatRestClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
