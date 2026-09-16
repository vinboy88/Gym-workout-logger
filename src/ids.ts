export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return crypto.randomUUID();
}

export function formatSet(weight: number, reps: number): string {
  return `${trimNum(weight)} × ${reps}`;
}

export function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}
