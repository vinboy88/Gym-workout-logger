export type Program = {
  id: string;
  title: string;
  locked: boolean;
  updatedAt: string;
};

export type Category = {
  id: string;
  programId: string;
  name: string;
  sortOrder: number;
};

export type ProgramExercise = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  /** Hidden from Program/Log after a locked swap; kept so History still has the name. */
  retired?: boolean;
};

export type Session = {
  id: string;
  programId: string;
  /** Local calendar day (YYYY-MM-DD) the workout belongs to. */
  date: string;
  startedAt: string;
  endedAt?: string;
};

export type SetEntry = {
  id: string;
  sessionId: string;
  programExerciseId: string;
  weight: number;
  reps: number;
  sortOrder: number;
  createdAt: string;
};

export type HeaviestSet = {
  weight: number;
  reps: number;
};

export type LastSessionGlance = {
  weight: number;
  reps: number;
  date: string;
};

export type BackupPrefs = {
  remindEnabled: boolean;
  everyDays: number;
  afterSessions: number;
  lastExportedAt: string | null;
  lastResetAt: string;
  sessionCountAtReset: number;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  program: Program;
  categories: Category[];
  programExercises: ProgramExercise[];
  sessions: Session[];
  setEntries: SetEntry[];
  prefs: BackupPrefs;
};

export type GymState = {
  program: Program;
  categories: Category[];
  programExercises: ProgramExercise[];
  sessions: Session[];
  setEntries: SetEntry[];
  prefs: BackupPrefs;
};
