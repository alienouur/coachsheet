import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ExternalLink, Plus, Trash2, Upload, VideoOff } from 'lucide-react'
import { addDay, addExercise, deleteClient, deleteDay, deleteExercise, deleteSession, getClient, getVideoOverrides, reorderExercises, saveVideoOverride, updateClient, updateDay, updateExercise, updateProgram } from '../lib/db'
import type { Client, ProgramExercise, ProgramFull, WorkoutSession } from '../lib/types'
import { exerciseHistory, exerciseNames, sessionDoneSets, sessionVolume, summary, weeklySeries } from '../lib/stats'
import { daysAgo, fmtDate, fmtDateTime, ytThumb } from '../lib/format'
import { matchVideo } from '../lib/videos'
import { Empty, ErrorBox, Spinner, Stat } from '../components/ui'
import { ExerciseChart, WeeklyChart } from '../components/Charts'
import { VideoPicker } from '../components/VideoPicker'

type Tab = 'program' | 'progress' | 'sessions' | 'settings'

export default function ClientPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<{ client: Client; program: ProgramFull | null; sessions: WorkoutSession[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('program')
  const [copied, setCopied] = useState(false)

  const reload = useCallback(() => { if (id) getClient(id).then(setData).catch(e => setError(e.message)) }, [id])
  useEffect(reload, [reload])

  if (error) return <ErrorBox error={error} />
  if (!data) return <Spinner />
  const { client, program, sessions } = data
  const link = `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/c/${client.token}`
  const copy = async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const s = summary(sessions)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/app" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-48">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <div className="text-sm text-slate-400">{s.last ? `Last session ${fmtDate(s.last)} · ${daysAgo(s.last) === 0 ? 'today' : `${daysAgo(s.last)}d ago`}` : 'No sessions yet'} · {s.total} sessions total</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden text-sm">
            <span className="px-3 py-2 text-slate-400 hidden md:inline max-w-72 truncate">{link}</span>
            <button className="btn-ghost rounded-none px-3 py-2 border-l border-slate-700" onClick={copy}>{copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy client link'}</button>
            <a className="btn-ghost rounded-none px-3 py-2 border-l border-slate-700" href={link} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>
          </div>
          <Link className="btn-primary" to={`/app/clients/${id}/import`}><Upload size={16} /> {program ? 'Upload new program' : 'Upload program'}</Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800 text-sm">
        {(['program', 'progress', 'sessions', 'settings'] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px border-b-2 capitalize ${tab === t ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>{t}</button>)}
      </div>

      {tab === 'program' && (program ? <ProgramEditor program={program} onChange={reload} /> : <Empty title="No program yet">Upload the client's Excel file to create their plan.<div className="mt-4"><Link className="btn-primary" to={`/app/clients/${id}/import`}><Upload size={16} /> Upload program</Link></div></Empty>)}
      {tab === 'progress' && <Progress sessions={sessions} unit={client.unit} />}
      {tab === 'sessions' && <Sessions sessions={sessions} unit={client.unit} onDelete={async sid => { await deleteSession(sid); reload() }} />}
      {tab === 'settings' && <ClientSettings client={client} onSaved={reload} onDeleted={() => nav('/app')} />}
    </div>
  )
}

function ProgramEditor({ program, onChange }: { program: ProgramFull; onChange: () => void }) {
  const [name, setName] = useState(program.name)
  const [picker, setPicker] = useState<ProgramExercise | null>(null)
  const [overrides, setOverrides] = useState<Map<string, { videoId: string; title?: string }>>(new Map())
  useEffect(() => { getVideoOverrides().then(setOverrides).catch(() => {}) }, [])
  const total = program.days.reduce((a, d) => a + d.exercises.length, 0)
  const noVideo = program.days.reduce((a, d) => a + d.exercises.filter(e => !e.video_id).length, 0)

  async function move(dayIdx: number, i: number, dir: -1 | 1) {
    const list = [...program.days[dayIdx].exercises]; const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    await reorderExercises(list.map((e, k) => ({ id: e.id, position: k }))); onChange()
  }
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-60"><label className="label">Program name</label><input className="w-full" value={name} onChange={e => setName(e.target.value)} onBlur={() => name !== program.name && updateProgram(program.id, { name }).then(onChange)} /></div>
        <div className="text-sm text-slate-300"><b>{program.days.length}</b> days · <b>{total}</b> exercises{noVideo > 0 && <span className="text-amber-300"> · {noVideo} without video</span>}</div>
        {program.source_filename && <div className="text-xs text-slate-500">from {program.source_filename}</div>}
      </div>
      {program.days.map((day, di) => (
        <div key={day.id} className="card space-y-3">
          <div className="flex items-center gap-3">
            <input className="font-semibold text-lg flex-1 bg-transparent border-transparent hover:border-slate-700 px-2" defaultValue={day.name} onBlur={e => e.target.value !== day.name && updateDay(day.id, { name: e.target.value }).then(onChange)} />
            <label className="text-sm text-slate-400 flex items-center gap-2"><input type="checkbox" checked={day.is_rest} onChange={e => updateDay(day.id, { is_rest: e.target.checked }).then(onChange)} /> Rest day</label>
            <button className="btn-ghost p-2 text-rose-300" onClick={() => confirm(`Delete "${day.name}" and its exercises?`) && deleteDay(day.id).then(onChange)}><Trash2 size={16} /></button>
          </div>
          {!day.is_rest && (
            <div className="space-y-2">
              {day.exercises.map((ex, i) => (
                <div key={ex.id} className="grid grid-cols-[56px_1fr_auto] sm:grid-cols-[56px_1fr_70px_110px_1fr_auto] gap-2 items-center">
                  <button className="w-14 h-10 rounded-md overflow-hidden bg-slate-800 flex items-center justify-center" onClick={() => setPicker(ex)} title="Change video">{ex.video_id ? <img src={ytThumb(ex.video_id)} alt="" className="w-full h-full object-cover" /> : <VideoOff size={16} className="text-amber-400" />}</button>
                  <input defaultValue={ex.name} className={ex.optional ? 'italic' : ''} onBlur={e => { const v = e.target.value.trim(); if (v && v !== ex.name) { const m = ex.video_id ? null : matchVideo(v, overrides); updateExercise(ex.id, { name: v, ...(m ? { video_id: m.videoId } : {}) }).then(onChange) } }} />
                  <div className="flex items-center sm:order-last"><button className="btn-ghost p-1.5" onClick={() => move(di, i, -1)} disabled={i === 0}><ArrowUp size={14} /></button><button className="btn-ghost p-1.5" onClick={() => move(di, i, 1)} disabled={i === day.exercises.length - 1}><ArrowDown size={14} /></button><button className="btn-ghost p-1.5 text-rose-300" onClick={() => deleteExercise(ex.id).then(onChange)}><Trash2 size={14} /></button></div>
                  <input type="number" min={1} defaultValue={ex.sets} className="col-start-1 sm:col-auto" onBlur={e => Number(e.target.value) !== ex.sets && updateExercise(ex.id, { sets: Number(e.target.value) || 1 }).then(onChange)} />
                  <input defaultValue={ex.reps} onBlur={e => e.target.value !== ex.reps && updateExercise(ex.id, { reps: e.target.value }).then(onChange)} />
                  <div className="flex gap-2 items-center"><input className="flex-1" defaultValue={ex.notes} placeholder="Notes" onBlur={e => e.target.value !== ex.notes && updateExercise(ex.id, { notes: e.target.value }).then(onChange)} /><label className="text-xs text-slate-400 flex items-center gap-1"><input type="checkbox" checked={ex.optional} onChange={e => updateExercise(ex.id, { optional: e.target.checked }).then(onChange)} />opt.</label></div>
                </div>
              ))}
              <button className="btn-ghost text-sm" onClick={async () => { const n = prompt('Exercise name'); if (!n) return; const m = matchVideo(n, overrides); await addExercise(day.id, day.exercises.length, { name: n, sets: 3, reps: '8-12', notes: '', optional: false, video_id: m?.videoId ?? null }); onChange() }}><Plus size={14} /> Add exercise</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn-secondary" onClick={async () => { await addDay(program.id, program.days.length, `Day ${program.days.length + 1}`); onChange() }}><Plus size={16} /> Add day</button>
      {picker && <VideoPicker open onClose={() => setPicker(null)} exerciseName={picker.name} currentId={picker.video_id} onPick={async vid => { await updateExercise(picker.id, { video_id: vid }); if (vid) { try { await saveVideoOverride(picker.name, vid) } catch { /* ignore */ } } onChange() }} />}
    </div>
  )
}

function Progress({ sessions, unit }: { sessions: WorkoutSession[]; unit: string }) {
  const names = useMemo(() => exerciseNames(sessions), [sessions])
  const [sel, setSel] = useState<string>('')
  const name = sel || names[0]
  const h = useMemo(() => name ? exerciseHistory(sessions, name) : null, [sessions, name])
  const s = summary(sessions)
  if (!sessions.length) return <Empty title="No sessions logged yet">Progress charts appear once the client logs their first workout from their link.</Empty>
  const prs = names.map(n => exerciseHistory(sessions, n)).filter(x => x.pr && x.pr.weight > 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total sessions" value={s.total} /><Stat label="This week" value={s.thisWeek} /><Stat label="Week streak" value={s.streak} /><Stat label="Avg. duration" value={`${s.avgMin} min`} />
        <Stat label={`Total volume (${unit})`} value={s.volume.toLocaleString()} /><Stat label="Sets completed" value={s.sets} /><Stat label="This month" value={s.thisMonth} /><Stat label="Exercises tracked" value={names.length} />
      </div>
      <div className="card"><h3 className="font-semibold mb-3">Sessions & volume per week</h3><WeeklyChart data={weeklySeries(sessions)} unit={unit} /></div>
      {h && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Exercise progress</h3><select className="ml-auto" value={name} onChange={e => setSel(e.target.value)}>{names.map(n => <option key={n}>{n}</option>)}</select></div>
          {h.pr && h.pr.weight > 0 && <div className="text-sm text-slate-300">PR: <b>{h.pr.weight} {unit} × {h.pr.reps}</b> on {fmtDate(h.pr.date)} · {h.sessions} sessions</div>}
          <ExerciseChart h={h} unit={unit} />
          <table className="w-full text-sm"><thead className="text-slate-400 text-left"><tr><th className="py-1">Date</th><th>Sets</th><th className="text-right">Volume</th></tr></thead><tbody>{[...h.points].reverse().slice(0, 10).map(p => <tr key={p.date} className="border-t border-slate-800"><td className="py-1.5">{fmtDate(p.date)}</td><td className="text-slate-300">{p.sets}</td><td className="text-right">{p.volume}</td></tr>)}</tbody></table>
        </div>
      )}
      {prs.length > 0 && <div className="card"><h3 className="font-semibold mb-2">Personal records</h3><table className="w-full text-sm"><thead className="text-slate-400 text-left"><tr><th className="py-1">Exercise</th><th>Best set</th><th>Date</th></tr></thead><tbody>{prs.map(x => <tr key={x.name} className="border-t border-slate-800"><td className="py-1.5">{x.name}</td><td>{x.pr!.weight} {unit} × {x.pr!.reps}</td><td className="text-slate-400">{fmtDate(x.pr!.date)}</td></tr>)}</tbody></table></div>}
    </div>
  )
}

function Sessions({ sessions, unit, onDelete }: { sessions: WorkoutSession[]; unit: string; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  if (!sessions.length) return <Empty title="No sessions yet" />
  return (
    <div className="space-y-2">
      {sessions.map(s => {
        const byEx = new Map<string, typeof s.sets>(); for (const x of s.sets) { if (!byEx.has(x.exercise_name)) byEx.set(x.exercise_name, []); byEx.get(x.exercise_name)!.push(x) }
        return (
          <div key={s.id} className="card py-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <div className="flex-1"><div className="font-medium">{s.day_name || 'Workout'}</div><div className="text-xs text-slate-400">{fmtDateTime(s.finished_at)} · {s.duration_min} min</div></div>
              <div className="text-sm text-slate-300 text-right"><div>{sessionDoneSets(s)} sets</div><div className="text-xs text-slate-500">{Math.round(sessionVolume(s)).toLocaleString()} {unit}</div></div>
              <button className="btn-ghost p-2 text-rose-300" onClick={e => { e.stopPropagation(); if (confirm('Delete this session?')) onDelete(s.id) }}><Trash2 size={14} /></button>
            </div>
            {open === s.id && <div className="mt-3 border-t border-slate-800 pt-3 grid sm:grid-cols-2 gap-2 text-sm">{[...byEx.entries()].map(([n, sets]) => <div key={n}><div className="text-slate-300">{n}</div><div className="text-slate-500">{sets.filter(x => x.done).map(x => x.weight ? `${x.weight}×${x.reps ?? '-'}` : x.extra || `${x.reps ?? '-'} reps`).join(' · ') || '—'}</div></div>)}</div>}
          </div>
        )
      })}
    </div>
  )
}

function ClientSettings({ client, onSaved, onDeleted }: { client: Client; onSaved: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({ name: client.name, email: client.email ?? '', notes: client.notes ?? '', unit: client.unit, rest_seconds: client.rest_seconds })
  const [msg, setMsg] = useState<string | null>(null)
  async function save(e: React.FormEvent) { e.preventDefault(); await updateClient(client.id, { ...form, email: form.email || null }); setMsg('Saved.'); onSaved() }
  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={save} className="card space-y-3">
        <div><label className="label">Name</label><input className="w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Notes</label><textarea className="w-full" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Weight unit</label><select className="w-full" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value as 'kg' | 'lb' })}><option value="kg">kg</option><option value="lb">lb</option></select></div>
          <div><label className="label">Rest timer (seconds)</label><input className="w-full" type="number" min={0} value={form.rest_seconds} onChange={e => setForm({ ...form, rest_seconds: Number(e.target.value) })} /></div>
        </div>
        {msg && <div className="text-emerald-300 text-sm">{msg}</div>}
        <button className="btn-primary">Save</button>
      </form>
      <div className="card border-rose-500/40 space-y-2">
        <h3 className="font-semibold text-rose-200">Danger zone</h3>
        <p className="text-sm text-slate-400">Deleting removes the client, their program and all logged sessions. Their link stops working immediately.</p>
        <button className="btn-danger" onClick={async () => { if (confirm(`Delete ${client.name} permanently?`)) { await deleteClient(client.id); onDeleted() } }}>Delete client</button>
      </div>
    </div>
  )
}
