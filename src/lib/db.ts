import { supabase } from './supabase'
import type { Client, DayWithExercises, Portal, Program, ProgramDay, ProgramExercise, ProgramFull, WorkoutSession, WorkoutSet } from './types'
import type { ParsedProgram } from './excel'
import { normalizeName } from './videos'

const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null
const throwIf = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export type ClientSummary = Client & { lastSession: string | null; sessions7d: number; sessions30d: number; totalSessions: number; hasProgram: boolean; programName: string | null }

export async function listClients(): Promise<ClientSummary[]> {
  const { data: clients, error } = await supabase.from('clients').select('*').eq('archived', false).order('created_at')
  throwIf(error)
  const ids = (clients ?? []).map(c => c.id)
  if (!ids.length) return []
  const [{ data: programs }, { data: sessions }] = await Promise.all([
    supabase.from('programs').select('client_id,name,is_active').in('client_id', ids).eq('is_active', true),
    supabase.from('workout_sessions').select('client_id,finished_at').in('client_id', ids),
  ])
  const now = Date.now()
  return (clients as Client[]).map(c => {
    const ss = (sessions ?? []).filter(s => s.client_id === c.id)
    const p = (programs ?? []).find(p => p.client_id === c.id)
    const last = ss.map(s => s.finished_at).sort().at(-1) ?? null
    return {
      ...c, lastSession: last,
      sessions7d: ss.filter(s => now - new Date(s.finished_at).getTime() < 7 * 86400000).length,
      sessions30d: ss.filter(s => now - new Date(s.finished_at).getTime() < 30 * 86400000).length,
      totalSessions: ss.length, hasProgram: !!p, programName: p?.name ?? null,
    }
  })
}

export async function createClient(input: { name: string; email?: string; notes?: string }): Promise<Client> {
  const coach_id = await uid()
  const { data, error } = await supabase.from('clients').insert({ coach_id, name: input.name, email: input.email || null, notes: input.notes || '' }).select().single()
  throwIf(error); return data as Client
}
export async function updateClient(id: string, patch: Partial<Pick<Client, 'name' | 'email' | 'notes' | 'unit' | 'rest_seconds' | 'archived'>>) {
  const { error } = await supabase.from('clients').update(patch).eq('id', id); throwIf(error)
}
export async function deleteClient(id: string) { const { error } = await supabase.from('clients').delete().eq('id', id); throwIf(error) }

export async function getClient(id: string): Promise<{ client: Client; program: ProgramFull | null; sessions: WorkoutSession[] }> {
  const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).single(); throwIf(error)
  const program = await getActiveProgram(id)
  const { data: sessions, error: e2 } = await supabase.from('workout_sessions').select('*, sets:workout_sets(*)').eq('client_id', id).order('finished_at', { ascending: false }).limit(200)
  throwIf(e2)
  const norm = (sessions ?? []).map(s => ({ ...s, sets: [...(s.sets as WorkoutSet[])].sort((a, b) => a.set_index - b.set_index) })) as WorkoutSession[]
  return { client: client as Client, program, sessions: norm }
}

export async function getActiveProgram(clientId: string): Promise<ProgramFull | null> {
  const { data: p } = await supabase.from('programs').select('*').eq('client_id', clientId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!p) return null
  const { data: days } = await supabase.from('program_days').select('*').eq('program_id', p.id).order('position')
  const dayIds = (days ?? []).map(d => d.id)
  const { data: exs } = dayIds.length ? await supabase.from('program_exercises').select('*').in('day_id', dayIds).order('position') : { data: [] }
  return { ...(p as Program), days: (days as ProgramDay[]).map(d => ({ ...d, exercises: (exs as ProgramExercise[]).filter(e => e.day_id === d.id) })) }
}

export async function saveProgram(clientId: string, parsed: ParsedProgram, filename: string | null, videoFor: (name: string) => string | null): Promise<string> {
  const coach_id = await uid()
  await supabase.from('programs').update({ is_active: false }).eq('client_id', clientId)
  const { data: p, error } = await supabase.from('programs').insert({ coach_id, client_id: clientId, name: parsed.name, source_filename: filename }).select().single(); throwIf(error)
  const { data: days, error: e2 } = await supabase.from('program_days').insert(parsed.days.map((d, i) => ({ program_id: p.id, position: i, name: d.name, is_rest: d.isRest }))).select(); throwIf(e2)
  const rows = parsed.days.flatMap((d, i) => d.exercises.map((ex, j) => ({
    day_id: (days as ProgramDay[]).find(x => x.position === i)!.id, position: j, name: ex.name, sets: ex.sets, reps: ex.reps, notes: ex.notes, optional: ex.optional, video_id: videoFor(ex.name),
  })))
  if (rows.length) { const { error: e3 } = await supabase.from('program_exercises').insert(rows); throwIf(e3) }
  return p.id as string
}

export async function updateProgram(id: string, patch: Partial<Pick<Program, 'name'>>) { const { error } = await supabase.from('programs').update(patch).eq('id', id); throwIf(error) }
export async function updateDay(id: string, patch: Partial<Pick<ProgramDay, 'name' | 'is_rest' | 'position'>>) { const { error } = await supabase.from('program_days').update(patch).eq('id', id); throwIf(error) }
export async function addDay(programId: string, position: number, name: string): Promise<DayWithExercises> {
  const { data, error } = await supabase.from('program_days').insert({ program_id: programId, position, name, is_rest: false }).select().single(); throwIf(error); return { ...(data as ProgramDay), exercises: [] }
}
export async function deleteDay(id: string) { const { error } = await supabase.from('program_days').delete().eq('id', id); throwIf(error) }
export async function updateExercise(id: string, patch: Partial<Omit<ProgramExercise, 'id' | 'day_id'>>) { const { error } = await supabase.from('program_exercises').update(patch).eq('id', id); throwIf(error) }
export async function addExercise(dayId: string, position: number, ex: Omit<ProgramExercise, 'id' | 'day_id' | 'position'>): Promise<ProgramExercise> {
  const { data, error } = await supabase.from('program_exercises').insert({ ...ex, day_id: dayId, position }).select().single(); throwIf(error); return data as ProgramExercise
}
export async function deleteExercise(id: string) { const { error } = await supabase.from('program_exercises').delete().eq('id', id); throwIf(error) }
export async function reorderExercises(items: { id: string; position: number }[]) {
  await Promise.all(items.map(i => supabase.from('program_exercises').update({ position: i.position }).eq('id', i.id)))
}
export async function createEmptyProgram(clientId: string, name: string): Promise<string> {
  const coach_id = await uid()
  await supabase.from('programs').update({ is_active: false }).eq('client_id', clientId)
  const { data, error } = await supabase.from('programs').insert({ coach_id, client_id: clientId, name }).select().single(); throwIf(error)
  return data.id as string
}

export async function getVideoOverrides(): Promise<Map<string, { videoId: string; title?: string }>> {
  const { data } = await supabase.from('exercise_videos').select('key,video_id,title,coach_id')
  const m = new Map<string, { videoId: string; title?: string }>()
  for (const r of (data ?? []).sort((a, b) => (a.coach_id ? 1 : 0) - (b.coach_id ? 1 : 0))) m.set(r.key, { videoId: r.video_id, title: r.title ?? undefined })
  return m
}
export async function saveVideoOverride(name: string, videoId: string, title?: string) {
  const coach_id = await uid()
  const { error } = await supabase.from('exercise_videos').upsert({ key: normalizeName(name), name, video_id: videoId, title: title ?? null, source: 'coach', coach_id }, { onConflict: 'key,coach_id' }); throwIf(error)
}

export async function deleteSession(id: string) { const { error } = await supabase.from('workout_sessions').delete().eq('id', id); throwIf(error) }

// ---- client portal (token based) ----
export async function fetchPortal(token: string): Promise<Portal | null> {
  const { data, error } = await supabase.rpc('client_portal', { p_token: token }); throwIf(error); return (data as Portal) ?? null
}
export async function portalSaveSession(token: string, session: { day_id: string | null; day_name: string; started_at: string; duration_min: number; sets: WorkoutSet[] }): Promise<string> {
  const { data, error } = await supabase.rpc('client_save_session', { p_token: token, p_session: session }); throwIf(error); return data as string
}
export async function portalDeleteSession(token: string, sessionId: string) { const { error } = await supabase.rpc('client_delete_session', { p_token: token, p_session_id: sessionId }); throwIf(error) }
export async function portalUpdateSettings(token: string, unit: 'kg' | 'lb', rest: number) { const { error } = await supabase.rpc('client_update_settings', { p_token: token, p_unit: unit, p_rest: rest }); throwIf(error) }
