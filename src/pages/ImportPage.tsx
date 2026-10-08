import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { ArrowLeft, Check, Download, FileSpreadsheet, Plus, Trash2, Upload, Video, VideoOff } from 'lucide-react'
import { parseWorkbook, type ParsedDay, type ParsedExercise, type ParsedProgram } from '../lib/excel'
import { matchVideo } from '../lib/videos'
import { createEmptyProgram, getVideoOverrides, saveProgram, saveVideoOverride } from '../lib/db'
import { supabase } from '../lib/supabase'
import { ytThumb } from '../lib/format'
import { ErrorBox } from '../components/ui'
import { VideoPicker } from '../components/VideoPicker'

type RowEx = ParsedExercise & { videoId: string | null; confidence: string | null }
type RowDay = { name: string; isRest: boolean; exercises: RowEx[] }

export default function ImportPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [clientName, setClientName] = useState('')
  const [program, setProgram] = useState<{ name: string; days: RowDay[]; warnings: string[]; filename: string } | null>(null)
  const [overrides, setOverrides] = useState<Map<string, { videoId: string; title?: string }>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<{ d: number; e: number } | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('clients').select('name').eq('id', id).single().then(({ data }) => setClientName(data?.name ?? ''))
    getVideoOverrides().then(setOverrides).catch(() => {})
  }, [id])

  function enrich(p: ParsedProgram, filename: string) {
    const days: RowDay[] = p.days.map(d => ({ name: d.name, isRest: d.isRest, exercises: d.exercises.map(ex => { const m = matchVideo(ex.name, overrides); return { ...ex, videoId: m?.videoId ?? null, confidence: m?.confidence ?? null } }) }))
    setProgram({ name: p.name, days, warnings: p.warnings, filename })
  }
  async function onFile(f: File) {
    setError(null)
    try { enrich(parseWorkbook(await f.arrayBuffer(), f.name), f.name) } catch (e) { setError('Could not read this file: ' + (e as Error).message) }
  }
  const stats = useMemo(() => {
    if (!program) return null
    const exs = program.days.flatMap(d => d.exercises)
    return { days: program.days.length, exercises: exs.length, withVideo: exs.filter(e => e.videoId).length }
  }, [program])

  function update(d: number, e: number, patch: Partial<RowEx>) {
    setProgram(p => { if (!p) return p; const days = p.days.map((day, i) => i !== d ? day : { ...day, exercises: day.exercises.map((ex, j) => j !== e ? ex : { ...ex, ...patch }) }); return { ...p, days } })
  }
  function updateDay(d: number, patch: Partial<RowDay>) { setProgram(p => p ? { ...p, days: p.days.map((day, i) => i !== d ? day : { ...day, ...patch }) } : p) }
  function addExercise(d: number) { setProgram(p => p ? { ...p, days: p.days.map((day, i) => i !== d ? day : { ...day, isRest: false, exercises: [...day.exercises, { name: '', sets: 3, reps: '8-12', notes: '', optional: false, videoId: null, confidence: null }] }) } : p) }
  function removeExercise(d: number, e: number) { setProgram(p => p ? { ...p, days: p.days.map((day, i) => i !== d ? day : { ...day, exercises: day.exercises.filter((_, j) => j !== e) }) } : p) }
  function addDay() { setProgram(p => p ? { ...p, days: [...p.days, { name: `Day ${p.days.length + 1}`, isRest: false, exercises: [] }] } : p) }
  function removeDay(d: number) { setProgram(p => p ? { ...p, days: p.days.filter((_, i) => i !== d) } : p) }
  function rematch(d: number, e: number, name: string) { const m = matchVideo(name, overrides); update(d, e, { name, videoId: m?.videoId ?? null, confidence: m?.confidence ?? null }) }

  async function save() {
    if (!program || !id) return
    setBusy(true); setError(null)
    try {
      const map = new Map<string, string | null>()
      for (const d of program.days) for (const ex of d.exercises) if (ex.name.trim()) map.set(ex.name.trim(), ex.videoId)
      const parsed: ParsedProgram = { name: program.name, warnings: [], days: program.days.map(d => ({ name: d.name, isRest: d.isRest, exercises: d.exercises.filter(e => e.name.trim()).map(({ videoId: _v, confidence: _c, ...ex }) => ({ ...ex, name: ex.name.trim() })) })) as ParsedDay[] }
      await saveProgram(id, parsed, program.filename || null, name => map.get(name) ?? null)
      nav(`/app/clients/${id}`)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function startBlank() {
    if (!id) return
    setBusy(true)
    try { await createEmptyProgram(id, 'New program'); nav(`/app/clients/${id}`) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  function downloadTemplate() {
    const rows = [['Day 1 - Upper', 'Sets x Reps'], ['Bench press', '3 x 8-12'], ['Lat pulldown', '3 x 8-12'], ['Lateral raise', '3 x 12-15'], [], ['Day 2 - Lower', ''], ['Back squat', '3 x 5'], ['Romanian deadlift', '3 x 8-10'], ['Optional: Calf raise', '2 x 15-20'], [], ['Day 3 - Rest', '']]
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 32 }, { wch: 14 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Program'); XLSX.writeFile(wb, 'coachsheet-template.xlsx')
  }

  const pickTarget = picker ? program?.days[picker.d]?.exercises[picker.e] : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/app/clients/${id}`} className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div><h1 className="page-title">Upload program{clientName && <span className="text-zinc-400 font-normal"> — {clientName}</span>}</h1></div>
      </div>

      {!program ? (
        <div className="grid md:grid-cols-3 gap-4">
          <div className={`md:col-span-2 card border-dashed border-2 ${drag ? 'border-brand-400 bg-brand-500/5' : 'border-zinc-700'} flex flex-col items-center justify-center text-center py-16 cursor-pointer`}
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }} onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet size={44} className="text-brand-400 mb-3" />
            <div className="text-lg font-medium">Drop the client's Excel file here</div>
            <div className="text-zinc-400 text-sm mt-1">.xlsx, .xls or .csv — one row per exercise, e.g. <code className="text-zinc-300">Bench press | 3 x 8-12</code>, with "Day 1", "Day 2"… headers.</div>
            <button className="btn-primary mt-5"><Upload size={16} /> Choose file</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          </div>
          <div className="space-y-3">
            <div className="card text-sm text-zinc-300"><div className="font-medium text-zinc-100 mb-2">What happens next</div><ol className="list-decimal ml-4 space-y-1"><li>We read days, exercises, sets and reps.</li><li>Each exercise gets a form video automatically.</li><li>You review, fix anything, and save.</li><li>Your client gets a private link.</li></ol></div>
            <button className="btn-secondary w-full" onClick={downloadTemplate}><Download size={16} /> Download Excel template</button>
            <button className="btn-ghost w-full" onClick={startBlank} disabled={busy}>Or build the program by hand</button>
          </div>
          <div className="md:col-span-3"><ErrorBox error={error} /></div>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-60"><label className="label">Program name</label><input className="w-full" value={program.name} onChange={e => setProgram({ ...program, name: e.target.value })} /></div>
            <div className="text-sm text-zinc-300 flex gap-4"><span><b>{stats!.days}</b> days</span><span><b>{stats!.exercises}</b> exercises</span><span className={stats!.withVideo === stats!.exercises ? 'text-emerald-300' : 'text-amber-300'}><b>{stats!.withVideo}/{stats!.exercises}</b> videos matched</span></div>
            <button className="btn-ghost" onClick={() => setProgram(null)}>Choose another file</button>
          </div>
          {program.warnings.length > 0 && <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{program.warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>}

          {program.days.map((day, d) => (
            <div key={d} className="card space-y-3">
              <div className="flex items-center gap-3">
                <input className="font-semibold text-lg flex-1 bg-transparent border-transparent hover:border-zinc-700 px-2" value={day.name} onChange={e => updateDay(d, { name: e.target.value })} />
                <label className="text-sm text-zinc-400 flex items-center gap-2"><input type="checkbox" checked={day.isRest} onChange={e => updateDay(d, { isRest: e.target.checked })} /> Rest day</label>
                <button className="btn-ghost p-2 text-rose-300" onClick={() => removeDay(d)} title="Remove day"><Trash2 size={16} /></button>
              </div>
              {!day.isRest && (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[56px_1fr_70px_110px_1fr_40px] gap-2 text-xs text-zinc-500 px-1"><span>Video</span><span>Exercise</span><span>Sets</span><span>Reps</span><span>Notes</span><span></span></div>
                  {day.exercises.map((ex, e) => (
                    <div key={e} className="grid grid-cols-[56px_1fr_40px] sm:grid-cols-[56px_1fr_70px_110px_1fr_40px] gap-2 items-center">
                      <button className="relative w-14 h-10 rounded-md overflow-hidden bg-zinc-800 flex items-center justify-center" onClick={() => setPicker({ d, e })} title={ex.videoId ? `Video matched (${ex.confidence}) — click to change` : 'No video — click to add'}>
                        {ex.videoId ? <img src={ytThumb(ex.videoId)} alt="" className="w-full h-full object-cover" /> : <VideoOff size={16} className="text-amber-400" />}
                        {ex.videoId && <span className={`absolute bottom-0 right-0 p-0.5 rounded-tl ${ex.confidence === 'fuzzy' ? 'bg-amber-500' : 'bg-emerald-500'}`}><Check size={10} className="text-zinc-950" /></span>}
                      </button>
                      <input value={ex.name} onChange={ev => rematch(d, e, ev.target.value)} placeholder="Exercise name" className={`w-full ${ex.optional ? 'italic' : ''}`} />
                      <button className="btn-ghost p-2 text-rose-300 sm:hidden" onClick={() => removeExercise(d, e)}><Trash2 size={16} /></button>
                      <input type="number" min={1} value={ex.sets} onChange={ev => update(d, e, { sets: Number(ev.target.value) })} className="col-start-1 sm:col-auto w-full" />
                      <input value={ex.reps} className="w-full" onChange={ev => update(d, e, { reps: ev.target.value })} placeholder="8-12" />
                      <div className="flex gap-2 items-center col-span-3 sm:col-span-1 min-w-0"><input className="flex-1" value={ex.notes} onChange={ev => update(d, e, { notes: ev.target.value })} placeholder="Tempo, cues…" /><label className="text-xs text-zinc-400 flex items-center gap-1 whitespace-nowrap"><input type="checkbox" checked={ex.optional} onChange={ev => update(d, e, { optional: ev.target.checked })} />opt.</label></div>
                      <button className="btn-ghost p-2 text-rose-300 hidden sm:inline-flex" onClick={() => removeExercise(d, e)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button className="btn-ghost text-sm" onClick={() => addExercise(d)}><Plus size={14} /> Add exercise</button>
                </div>
              )}
            </div>
          ))}
          <button className="btn-secondary" onClick={addDay}><Plus size={16} /> Add day</button>
          <ErrorBox error={error} />
          <div className="sticky bottom-0 py-3 bg-zinc-950/90 backdrop-blur border-t border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-zinc-400"><Video size={14} className="inline mr-1" />Amber = best guess, click a thumbnail to check or change it.</div>
            <button className="btn-primary px-6" onClick={save} disabled={busy || !program.days.length}>{busy ? 'Saving…' : 'Save program'}</button>
          </div>
        </>
      )}
      {pickTarget && picker && (
        <VideoPicker open onClose={() => setPicker(null)} exerciseName={pickTarget.name} currentId={pickTarget.videoId}
          onPick={async vid => { update(picker.d, picker.e, { videoId: vid, confidence: vid ? 'override' : null }); if (vid && pickTarget.name.trim()) { try { await saveVideoOverride(pickTarget.name.trim(), vid); setOverrides(await getVideoOverrides()) } catch { /* ignore */ } } }} />
      )}
    </div>
  )
}
