import type { WorkoutSession } from './types'
import { e1rm } from './format'

export const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x }
export const weekKey = (iso: string) => startOfWeek(new Date(iso)).toISOString().slice(0, 10)

export function sessionVolume(s: WorkoutSession) { return s.sets.reduce((a, x) => a + (x.done && x.weight && x.reps ? Number(x.weight) * x.reps : 0), 0) }
export function sessionDoneSets(s: WorkoutSession) { return s.sets.filter(x => x.done).length }

export function weeklySeries(sessions: WorkoutSession[], weeks = 12) {
  const out: { week: string; label: string; sessions: number; volume: number }[] = []
  const start = startOfWeek(new Date()); start.setDate(start.getDate() - 7 * (weeks - 1))
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start); d.setDate(d.getDate() + 7 * i)
    const key = d.toISOString().slice(0, 10)
    const ss = sessions.filter(s => weekKey(s.finished_at) === key)
    out.push({ week: key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), sessions: ss.length, volume: Math.round(ss.reduce((a, s) => a + sessionVolume(s), 0)) })
  }
  return out
}

export function streakWeeks(sessions: WorkoutSession[]) {
  const keys = new Set(sessions.map(s => weekKey(s.finished_at)))
  let n = 0; const d = startOfWeek(new Date())
  while (keys.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 7) }
  return n
}

export type ExerciseHistory = { name: string; points: { date: string; best: number; e1rm: number; volume: number; sets: string }[]; pr: { weight: number; reps: number; date: string } | null; sessions: number }
export function exerciseHistory(sessions: WorkoutSession[], name: string): ExerciseHistory {
  const points: ExerciseHistory['points'] = []
  let pr: ExerciseHistory['pr'] = null
  for (const s of [...sessions].sort((a, b) => a.finished_at.localeCompare(b.finished_at))) {
    const sets = s.sets.filter(x => x.done && x.exercise_name === name)
    if (!sets.length) continue
    const best = Math.max(...sets.map(x => Number(x.weight) || 0))
    const bestE = Math.max(...sets.map(x => e1rm(Number(x.weight) || 0, x.reps || 0)))
    const volume = sets.reduce((a, x) => a + (Number(x.weight) || 0) * (x.reps || 0), 0)
    points.push({ date: s.finished_at, best, e1rm: bestE, volume: Math.round(volume), sets: sets.map(x => x.weight != null && x.weight !== undefined && Number(x.weight) > 0 ? `${x.weight}×${x.reps ?? '-'}` : x.extra || `${x.reps ?? '-'} reps`).join(', ') })
    for (const x of sets) {
      const w = Number(x.weight) || 0, r = x.reps || 0
      if (!pr || w > pr.weight || (w === pr.weight && r > pr.reps)) pr = { weight: w, reps: r, date: s.finished_at }
    }
  }
  return { name, points, pr, sessions: points.length }
}

export function exerciseNames(sessions: WorkoutSession[]) {
  const counts = new Map<string, number>()
  for (const s of sessions) for (const x of s.sets) if (x.done) counts.set(x.exercise_name, (counts.get(x.exercise_name) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0])
}

export function summary(sessions: WorkoutSession[]) {
  const now = new Date(); const wk = weekKey(now.toISOString())
  const month = sessions.filter(s => { const d = new Date(s.finished_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length
  return {
    total: sessions.length,
    thisWeek: sessions.filter(s => weekKey(s.finished_at) === wk).length,
    thisMonth: month,
    streak: streakWeeks(sessions),
    volume: Math.round(sessions.reduce((a, s) => a + sessionVolume(s), 0)),
    sets: sessions.reduce((a, s) => a + sessionDoneSets(s), 0),
    avgMin: sessions.length ? Math.round(sessions.reduce((a, s) => a + s.duration_min, 0) / sessions.length) : 0,
    last: sessions.map(s => s.finished_at).sort().at(-1) ?? null,
  }
}
