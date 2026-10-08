import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Check, ChevronLeft, ChevronRight, Dumbbell, History, Home, Play, Plus, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { fetchPortal, portalDeleteSession, portalSaveSession, portalUpdateSettings } from '../lib/db'
import type { Portal as PortalData, WorkoutSession, WorkoutSet } from '../lib/types'
import { exerciseHistory, exerciseNames, sessionDoneSets, sessionVolume, summary, weeklySeries } from '../lib/stats'
import { e1rm, fmtDate, fmtDateTime, ytThumb, ytWatch } from '../lib/format'
import { Empty, ErrorBox, Modal, Spinner, VideoEmbed } from '../components/ui'
import { ExerciseChart, WeeklyChart } from '../components/Charts'

type Day = NonNullable<PortalData['program']>['days'][number]
type Exercise = Day['exercises'][number]
type Entry = { w: string; r: string; x: string; done: boolean }
type Active = { dayId: string; startedAt: string; entries: Record<string, Entry[]> }

const akey = (t: string) => `coachsheet_active_${t}`
const loadActive = (t: string): Active | null => { try { return JSON.parse(localStorage.getItem(akey(t)) || 'null') } catch { return null } }
const isNumericReps = (reps: string) => /^\d+(\s*[-–]\s*\d+)?$/.test(reps.trim()) || reps.trim() === ''

export default function Portal() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PortalData | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [active, setActiveState] = useState<Active | null>(() => loadActive(token))
  const [toast, setToast] = useState<string | null>(null)
  const reload = useCallback(() => fetchPortal(token).then(setData).catch(e => setError(e.message)), [token])
  useEffect(() => { reload() }, [reload])
  const setActive = (a: Active | null) => { setActiveState(a); if (a) localStorage.setItem(akey(token), JSON.stringify(a)); else localStorage.removeItem(akey(token)) }
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  if (error) return <div className="p-6"><ErrorBox error={error} /></div>
  if (data === undefined) return <Spinner />
  if (data === null) return <div className="min-h-full flex items-center justify-center p-6 text-center"><div><Dumbbell className="mx-auto text-zinc-600 mb-3" size={40} /><h1 className="text-xl font-semibold">This link is not valid</h1><p className="text-zinc-400 mt-1">Ask your coach for a new link.</p></div></div>

  const ctx = { token, data, active, setActive, reload, say }
  return (
    <div className="min-h-full pb-24 max-w-2xl mx-auto">
      <Routes>
        <Route index element={<PHome {...ctx} />} />
        <Route path="day/:dayId" element={<PDay {...ctx} />} />
        <Route path="stats" element={<PStats {...ctx} />} />
        <Route path="history" element={<PHistory {...ctx} />} />
        <Route path="settings" element={<PSettings {...ctx} />} />
      </Routes>
      <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"><div className="max-w-2xl mx-auto grid grid-cols-4 text-xs">
        {[['', Home, 'Home'], ['stats', BarChart3, 'Progress'], ['history', History, 'History'], ['settings', SettingsIcon, 'Settings']].map(([p, Icon, label]) => {
          const I = Icon as typeof Home
          return <NavLink key={label as string} end={p === ''} to={`/c/${token}/${p}`} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 ${isActive ? 'text-brand-400' : 'text-zinc-400'}`}><I size={20} />{label as string}</NavLink>
        })}
      </div></nav>
      {toast && <div className="fixed bottom-20 inset-x-0 flex justify-center px-4 pointer-events-none"><div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm shadow-lg">{toast}</div></div>}
    </div>
  )
}

type Ctx = { token: string; data: PortalData; active: Active | null; setActive: (a: Active | null) => void; reload: () => Promise<void>; say: (m: string) => void }

function Header({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return <header className="px-4 pt-5 pb-3 flex items-center gap-2">{back && <Link to={back} className="btn-ghost p-1.5 -ml-2"><ChevronLeft /></Link>}<div><h1 className="page-title">{title}</h1>{sub && <div className="text-sm text-zinc-400">{sub}</div>}</div></header>
}

function PHome({ token, data, active }: Ctx) {
  const days = data.program?.days ?? []
  const s = summary(data.sessions)
  const trainDays = days.filter(d => !d.is_rest)
  const lastDayId = data.sessions[0]?.day_id
  const idx = trainDays.findIndex(d => d.id === lastDayId)
  const next = trainDays.length ? trainDays[(idx + 1) % trainDays.length] : null
  const activeDay = active ? days.find(d => d.id === active.dayId) : null
  return (
    <div>
      <Header title={`Hi ${data.client.name.split(' ')[0]}`} sub={data.coach?.name ? `Coach: ${data.coach.name}` : undefined} />
      <div className="px-4 space-y-4">
        {!data.program || !days.length ? <Empty title="No program yet">Your coach hasn't published your program yet.</Empty> : (
          <>
            {activeDay ? (
              <Link to={`/c/${token}/day/${activeDay.id}`} className="block rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 p-5 text-zinc-950 stripes"><div className="text-[11px] font-bold uppercase tracking-[0.2em]">Workout in progress</div><div className="display text-4xl mt-1">{activeDay.name}</div><div className="mt-3 inline-flex items-center gap-2 bg-zinc-950 text-white rounded-lg px-4 py-2 font-semibold"><Play size={16} /> Continue</div></Link>
            ) : next && (
              <Link to={`/c/${token}/day/${next.id}`} className="block rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-zinc-950 stripes"><div className="text-[11px] font-bold uppercase tracking-[0.2em]">Up next</div><div className="display text-4xl mt-1">{next.name}</div><div className="text-zinc-900/80 text-sm font-medium mt-1">{next.exercises.length} exercises · {next.exercises.reduce((a, e) => a + e.sets, 0)} sets</div><div className="mt-3 inline-flex items-center gap-2 bg-zinc-950 text-white rounded-lg px-4 py-2 font-semibold">Open workout <ChevronRight size={16} /></div></Link>
            )}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[[s.thisWeek, 'this week'], [s.total, 'sessions'], [s.streak, 'week streak'], [s.last ? fmtDate(s.last) : '—', 'last']].map(([v, l]) => <div key={l as string} className="card py-3 px-1"><div className="display text-2xl text-brand-400">{v as string}</div><div className="text-[11px] text-zinc-400">{l as string}</div></div>)}
            </div>
            <h2 className="font-semibold pt-2">{data.program.name}</h2>
            <div className="space-y-2">
              {days.map(d => d.is_rest ? <div key={d.id} className="card py-3 flex items-center gap-3 opacity-70"><span className="w-2 h-2 rounded-full bg-zinc-500" /><div><div className="font-medium">{d.name}</div><div className="text-xs text-zinc-400">Rest day — walk, stretch, sleep well</div></div></div>
                : <Link key={d.id} to={`/c/${token}/day/${d.id}`} className="card py-3 flex items-center gap-3 hover:border-zinc-600"><span className={`w-2 h-2 rounded-full ${d.id === next?.id ? 'bg-brand-400' : 'bg-zinc-500'}`} /><div className="flex-1"><div className="font-medium">{d.name}</div><div className="text-xs text-zinc-400">{d.exercises.length} exercises</div></div><ChevronRight className="text-zinc-500" size={18} /></Link>)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function lastEntries(sessions: WorkoutSession[], exId: string, exName: string): WorkoutSet[] {
  for (const s of sessions) { const sets = s.sets.filter(x => x.done && (x.exercise_id === exId || x.exercise_name === exName)); if (sets.length) return sets }
  return []
}
function bestSet(sessions: WorkoutSession[], exId: string, exName: string) {
  let best: { w: number; r: number } | null = null
  for (const s of sessions) for (const x of s.sets) if (x.done && (x.exercise_id === exId || x.exercise_name === exName) && x.weight) { const w = Number(x.weight), r = x.reps || 0; if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r } }
  return best
}

function PDay({ token, data, active, setActive, reload, say }: Ctx) {
  const { dayId } = useParams()
  const nav = useNavigate()
  const day = data.program?.days.find(d => d.id === dayId)
  const [video, setVideo] = useState<Exercise | null>(null)
  const [rest, setRest] = useState<number>(0)
  const [summaryOpen, setSummaryOpen] = useState<{ sets: number; volume: number; min: number } | null>(null)
  const timer = useRef<number | null>(null)
  const unit = data.client.unit
  const isActive = active?.dayId === dayId

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  const startRest = () => { const secs = data.client.rest_seconds; if (!secs) return; if (timer.current) clearInterval(timer.current); setRest(secs); timer.current = window.setInterval(() => setRest(r => { if (r <= 1) { clearInterval(timer.current!); say('Rest over — next set!'); return 0 } return r - 1 }), 1000) }

  if (!day) return <div className="p-6"><Empty title="Day not found" /></div>

  const start = () => { const entries: Record<string, Entry[]> = {}; day.exercises.forEach(e => entries[e.id] = Array.from({ length: e.sets }, () => ({ w: '', r: '', x: '', done: false }))); setActive({ dayId: day.id, startedAt: new Date().toISOString(), entries }) }
  const setEntry = (exId: string, i: number, patch: Partial<Entry>) => { if (!active) return; const list = [...(active.entries[exId] || [])]; list[i] = { ...list[i], ...patch }; setActive({ ...active, entries: { ...active.entries, [exId]: list } }) }
  const addSet = (exId: string) => { if (!active) return; setActive({ ...active, entries: { ...active.entries, [exId]: [...(active.entries[exId] || []), { w: '', r: '', x: '', done: false }] } }) }
  const removeSet = (exId: string) => { if (!active) return; const list = [...(active.entries[exId] || [])]; if (list.length <= 1) return; list.pop(); setActive({ ...active, entries: { ...active.entries, [exId]: list } }) }
  const toggleDone = (ex: Exercise, i: number) => {
    if (!active) return
    const e = active.entries[ex.id][i]; const done = !e.done
    setEntry(ex.id, i, { done })
    if (done) {
      startRest()
      const w = Number(e.w), r = Number(e.r); const b = bestSet(data.sessions, ex.id, ex.name)
      if (w > 0 && r > 0 && (!b || w > b.w || (w === b.w && r > b.r))) say(`🏆 New record: ${w} ${unit} × ${r}`)
    }
  }
  const doneCount = active ? Object.values(active.entries).flat().filter(e => e.done).length : 0
  const finish = async () => {
    if (!active) return
    const sets: WorkoutSet[] = []
    for (const ex of day.exercises) (active.entries[ex.id] || []).forEach((e, i) => { if (e.done || e.w || e.r || e.x) sets.push({ exercise_id: ex.id, exercise_name: ex.name, set_index: i, weight: e.w ? Number(e.w) : null, reps: e.r ? Number(e.r) : null, extra: e.x || null, done: e.done }) })
    const min = Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000))
    try {
      await portalSaveSession(token, { day_id: day.id, day_name: day.name, started_at: active.startedAt, duration_min: min, sets })
      setActive(null); if (timer.current) clearInterval(timer.current); setRest(0)
      await reload()
      setSummaryOpen({ sets: sets.filter(s => s.done).length, volume: Math.round(sets.reduce((a, s) => a + (s.done && s.weight && s.reps ? s.weight * s.reps : 0), 0)), min })
    } catch (e) { say('Could not save: ' + (e as Error).message) }
  }
  const cancel = () => { if (confirm('Discard this workout?')) { setActive(null); if (timer.current) clearInterval(timer.current); setRest(0) } }

  return (
    <div>
      <Header title={day.name} sub={`${day.exercises.length} exercises · ${day.exercises.reduce((a, e) => a + e.sets, 0)} sets`} back={`/c/${token}`} />
      <div className="px-4 space-y-3">
        {!isActive && <button className="btn-primary w-full py-3 text-base" onClick={start}><Play size={18} /> Start workout</button>}
        {day.exercises.map((ex, idx) => {
          const prev = lastEntries(data.sessions, ex.id, ex.name)
          const entries = isActive ? active!.entries[ex.id] || [] : []
          const numeric = isNumericReps(ex.reps)
          return (
            <div key={ex.id} className="card p-4">
              <div className="flex gap-3">
                <button className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center" onClick={() => ex.video_id && setVideo(ex)}>
                  {ex.video_id ? <><img src={ytThumb(ex.video_id)} alt="" className="w-full h-full object-cover" /><span className="absolute inset-0 flex items-center justify-center"><span className="bg-black/60 rounded-full p-2"><Play size={16} className="text-white" /></span></span></> : <Dumbbell className="text-zinc-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500">#{idx + 1}{ex.optional && ' · optional'}</div>
                  <div className="font-semibold leading-tight">{ex.name}</div>
                  <div className="text-sm text-brand-300 mt-1">{ex.sets} × {ex.reps || '—'}</div>
                  {ex.notes && <div className="text-xs text-zinc-400 mt-1">{ex.notes}</div>}
                  {prev.length > 0 && <div className="text-xs text-zinc-500 mt-1">Last time: {prev.map(p => p.weight ? `${p.weight}×${p.reps ?? '-'}` : p.extra || `${p.reps ?? '-'} reps`).join(', ')}</div>}
                </div>
              </div>
              {isActive && (
                <div className="mt-3 space-y-1.5">
                  <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 text-[11px] text-zinc-500 px-1"><span>Set</span>{numeric ? <><span>Weight ({unit})</span><span>Reps</span></> : <><span className="col-span-2">Result (time / distance / reps)</span></>}<span></span></div>
                  {entries.map((e, i) => (
                    <div key={i} className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center ${e.done ? 'opacity-80' : ''}`}>
                      <span className="text-sm text-zinc-400 text-center">{i + 1}</span>
                      {numeric ? <>
                        <input type="number" inputMode="decimal" step="0.5" placeholder={prev[i]?.weight != null ? String(prev[i].weight) : '—'} value={e.w} onChange={ev => setEntry(ex.id, i, { w: ev.target.value })} className="text-center" />
                        <input type="number" inputMode="numeric" placeholder={prev[i]?.reps != null ? String(prev[i].reps) : ex.reps.split('-')[0]} value={e.r} onChange={ev => setEntry(ex.id, i, { r: ev.target.value })} className="text-center" />
                      </> : <input className="col-span-2" placeholder={prev[i]?.extra || ex.reps} value={e.x} onChange={ev => setEntry(ex.id, i, { x: ev.target.value })} />}
                      <button onClick={() => toggleDone(ex, i)} className={`h-10 rounded-lg flex items-center justify-center ${e.done ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}><Check size={18} /></button>
                    </div>
                  ))}
                  <div className="flex gap-3 text-xs pt-1">
                    <button className="text-brand-300" onClick={() => addSet(ex.id)}><Plus size={12} className="inline" /> Add set</button>
                    <button className="text-zinc-400" onClick={() => removeSet(ex.id)}>Remove set</button>
                    {prev.length > 0 && numeric && <button className="text-zinc-400 ml-auto" onClick={() => setActive({ ...active!, entries: { ...active!.entries, [ex.id]: entries.map((e, i) => prev[i] ? { ...e, w: e.w || String(prev[i].weight ?? ''), r: e.r || String(prev[i].reps ?? '') } : e) } })}>Copy last time</button>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {isActive && (
        <div className="fixed bottom-16 inset-x-0 px-4"><div className="max-w-2xl mx-auto card py-3 flex items-center gap-3 shadow-xl">
          {rest > 0 ? <div className="flex items-center gap-2 text-sm"><span className="text-zinc-400">Rest</span><b className="text-xl tabular-nums">{String(Math.floor(rest / 60)).padStart(2, '0')}:{String(rest % 60).padStart(2, '0')}</b><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setRest(r => r + 30)}>+30</button><button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setRest(0); if (timer.current) clearInterval(timer.current) }}>Skip</button></div>
            : <div className="text-sm text-zinc-300"><b>{doneCount}</b> sets done</div>}
          <div className="ml-auto flex gap-2"><button className="btn-ghost text-rose-300 px-3" onClick={cancel}>Discard</button><button className="btn-primary" onClick={finish} disabled={doneCount === 0}>Finish</button></div>
        </div></div>
      )}
      {video && <Modal open onClose={() => setVideo(null)} title={video.name}><VideoEmbed videoId={video.video_id!} title={video.name} /><div className="mt-3 text-sm text-zinc-400 flex justify-between"><span>{video.sets} × {video.reps}</span><a className="text-brand-400" href={ytWatch(video.video_id!)} target="_blank" rel="noreferrer">Open on YouTube</a></div>{video.notes && <p className="mt-2 text-sm text-zinc-300">{video.notes}</p>}</Modal>}
      {summaryOpen && <Modal open onClose={() => { setSummaryOpen(null); nav(`/c/${token}`) }} title="Workout saved"><div className="grid grid-cols-3 gap-2 text-center"><div className="card py-3"><div className="display text-3xl text-brand-400">{summaryOpen.sets}</div><div className="text-xs text-zinc-400">sets</div></div><div className="card py-3"><div className="display text-3xl text-brand-400">{summaryOpen.volume.toLocaleString()}</div><div className="text-xs text-zinc-400">{unit} volume</div></div><div className="card py-3"><div className="display text-3xl text-brand-400">{summaryOpen.min}</div><div className="text-xs text-zinc-400">min</div></div></div><button className="btn-primary w-full mt-4" onClick={() => { setSummaryOpen(null); nav(`/c/${token}`) }}>Done</button></Modal>}
    </div>
  )
}

function PStats({ data }: Ctx) {
  const names = useMemo(() => exerciseNames(data.sessions), [data.sessions])
  const [sel, setSel] = useState('')
  const name = sel || names[0]
  const h = name ? exerciseHistory(data.sessions, name) : null
  const s = summary(data.sessions); const unit = data.client.unit
  return (
    <div>
      <Header title="Progress" />
      <div className="px-4 space-y-4">
        {!data.sessions.length ? <Empty title="No workouts yet">Finish your first workout to see progress here.</Empty> : <>
          <div className="grid grid-cols-4 gap-2 text-center">{[[s.total, 'sessions'], [s.thisWeek, 'this week'], [s.thisMonth, 'this month'], [s.streak, 'week streak'], [s.volume.toLocaleString(), `volume ${unit}`], [s.sets, 'sets done'], [`${s.avgMin}m`, 'avg. time'], [names.length, 'exercises']].map(([v, l]) => <div key={l as string} className="card py-3 px-1"><div className="display text-2xl text-brand-400">{v as string}</div><div className="text-[11px] text-zinc-400">{l as string}</div></div>)}</div>
          <div className="card"><h3 className="font-semibold mb-2">Weekly sessions & volume</h3><WeeklyChart data={weeklySeries(data.sessions)} unit={unit} /></div>
          {h && <div className="card space-y-3"><select className="w-full" value={name} onChange={e => setSel(e.target.value)}>{names.map(n => <option key={n}>{n}</option>)}</select>
            {h.pr && h.pr.weight > 0 && <div className="text-sm">🏆 Best: <b>{h.pr.weight} {unit} × {h.pr.reps}</b> · est. 1RM {e1rm(h.pr.weight, h.pr.reps)} {unit}</div>}
            <ExerciseChart h={h} unit={unit} />
            <table className="w-full text-sm"><tbody>{[...h.points].reverse().slice(0, 8).map(p => <tr key={p.date} className="border-t border-zinc-800"><td className="py-1.5 text-zinc-400">{fmtDate(p.date)}</td><td>{p.sets}</td><td className="text-right text-zinc-400">{p.volume}</td></tr>)}</tbody></table></div>}
        </>}
      </div>
    </div>
  )
}

function PHistory({ token, data, reload }: Ctx) {
  const [open, setOpen] = useState<string | null>(null)
  const unit = data.client.unit
  return (
    <div>
      <Header title="History" />
      <div className="px-4 space-y-2">
        {!data.sessions.length ? <Empty title="No workouts yet" /> : data.sessions.map(s => {
          const byEx = new Map<string, WorkoutSet[]>(); for (const x of s.sets) { if (!byEx.has(x.exercise_name)) byEx.set(x.exercise_name, []); byEx.get(x.exercise_name)!.push(x) }
          return <div key={s.id} className="card py-3">
            <div className="flex items-center gap-3" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <div className="flex-1"><div className="font-medium">{s.day_name || 'Workout'}</div><div className="text-xs text-zinc-400">{fmtDateTime(s.finished_at)} · {s.duration_min} min</div></div>
              <div className="text-right text-sm"><div>{sessionDoneSets(s)} sets</div><div className="text-xs text-zinc-500">{Math.round(sessionVolume(s)).toLocaleString()} {unit}</div></div>
              <button className="btn-ghost p-2 text-rose-300" onClick={async e => { e.stopPropagation(); if (confirm('Delete this workout?')) { await portalDeleteSession(token, s.id); reload() } }}><Trash2 size={14} /></button>
            </div>
            {open === s.id && <div className="mt-3 border-t border-zinc-800 pt-3 space-y-1 text-sm">{[...byEx.entries()].map(([n, sets]) => <div key={n}><span className="text-zinc-300">{n}</span> <span className="text-zinc-500">{sets.filter(x => x.done).map(x => x.weight ? `${x.weight}×${x.reps ?? '-'}` : x.extra || `${x.reps ?? '-'} reps`).join(' · ')}</span></div>)}</div>}
          </div>
        })}
      </div>
    </div>
  )
}

function PSettings({ token, data, reload, say }: Ctx) {
  const [unit, setUnit] = useState(data.client.unit); const [rest, setRest] = useState(data.client.rest_seconds)
  return (
    <div>
      <Header title="Settings" />
      <div className="px-4 space-y-4">
        <div className="card space-y-3">
          <div><label className="label">Weight unit</label><div className="grid grid-cols-2 gap-2">{(['kg', 'lb'] as const).map(u => <button key={u} className={u === unit ? 'btn-primary' : 'btn-secondary'} onClick={() => setUnit(u)}>{u}</button>)}</div></div>
          <div><label className="label">Rest timer between sets (seconds, 0 = off)</label><input type="number" min={0} className="w-full" value={rest} onChange={e => setRest(Number(e.target.value))} /></div>
          <button className="btn-primary" onClick={async () => { await portalUpdateSettings(token, unit, rest); await reload(); say('Saved') }}>Save</button>
        </div>
        <div className="card text-sm text-zinc-400"><div className="font-medium text-zinc-100 mb-1">Add to your home screen</div>iPhone: Safari → Share → "Add to Home Screen". Android: Chrome menu ⋮ → "Add to Home screen".</div>
        <div className="card text-sm text-zinc-400">Your coach{data.coach?.name ? ` (${data.coach.name})` : ''} sees everything you log here. Keep this link private — anyone with it can view your program.</div>
      </div>
    </div>
  )
}
