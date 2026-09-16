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
};

export type Session = {
  id: string;
  programId: string;
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

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  program: Program;
  categories: Category[];
  programExercises: ProgramExercise[];
  sessions: Session[];
  setEntries: SetEntry[];
};

export type GymState = {
  program: Program;
  categories: Category[];
  programExercises: ProgramExercise[];
  sessions: Session[];
  setEntries: SetEntry[];
};
