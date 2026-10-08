export type Client = { id: string; coach_id: string; name: string; email: string | null; notes: string; token: string; unit: 'kg' | 'lb'; rest_seconds: number; archived: boolean; created_at: string }
export type Program = { id: string; coach_id: string; client_id: string; name: string; source_filename: string | null; is_active: boolean; created_at: string }
export type ProgramDay = { id: string; program_id: string; position: number; name: string; is_rest: boolean }
export type ProgramExercise = { id: string; day_id: string; position: number; name: string; sets: number; reps: string; notes: string; optional: boolean; video_id: string | null }
export type DayWithExercises = ProgramDay & { exercises: ProgramExercise[] }
export type ProgramFull = Program & { days: DayWithExercises[] }
export type WorkoutSet = { exercise_id: string | null; exercise_name: string; set_index: number; weight: number | null; reps: number | null; extra: string | null; done: boolean }
export type WorkoutSession = { id: string; client_id?: string; day_id: string | null; day_name: string; started_at: string; finished_at: string; duration_min: number; sets: WorkoutSet[] }
export type Portal = {
  client: { id: string; name: string; unit: 'kg' | 'lb'; rest_seconds: number }
  coach: { name: string } | null
  program: (Pick<Program, 'id' | 'name'> & { days: (Omit<DayWithExercises, 'program_id'>)[] }) | null
  sessions: WorkoutSession[]
}
