import * as XLSX from 'xlsx'

export type ParsedExercise = { name: string; sets: number; reps: string; notes: string; optional: boolean }
export type ParsedDay = { name: string; isRest: boolean; exercises: ParsedExercise[] }
export type ParsedProgram = { name: string; days: ParsedDay[]; warnings: string[] }

const DAY_RE = /^(day|session|workout|training|week)\s*\d+|^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|^(push|pull|legs?|upper|lower|full\s*body|arms|chest|back|shoulders)\b|^rest\b/i
const REST_RE = /\b(rest|off|recovery)\b/i
const SETS_REPS_RE = /(\d+)\s*(?:sets?)?\s*[x×*]\s*(\d+(?:\s*[-–to]+\s*\d+)?)(?:\s*(?:reps?))?(.*)/i
const HEADER_RE = /^(exercise|movement|sets?\s*[x×]\s*reps?|sets?|reps?|notes?|tempo|rest|rpe|load|weight)\s*$/i

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

function parseSetsReps(cells: string[]): { sets: number; reps: string; notes: string } | null {
  for (const c of cells) {
    const m = c.match(SETS_REPS_RE)
    if (m) {
      const sets = Number(m[1])
      const reps = m[2].replace(/\s+/g, '').replace('–', '-').replace('to', '-')
      const notes = clean(m[3]).replace(/^[,;-]\s*/, '')
      return { sets, reps, notes }
    }
  }
  return null
}

export function parseWorkbook(data: ArrayBuffer, filename: string): ParsedProgram {
  const wb = XLSX.read(data, { type: 'array' })
  const days: ParsedDay[] = []
  const warnings: string[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: '' })
    let current: ParsedDay | null = null
    let colSets = -1, colReps = -1, colNotes = -1, colName = 0

    const pushDay = (d: ParsedDay) => { days.push(d); current = d }

    for (const raw of rows) {
      const cells = (raw as unknown[]).map(clean)
      const nonEmpty = cells.filter(Boolean)
      if (nonEmpty.length === 0) continue
      const firstIdx = cells.findIndex(Boolean)
      const first = cells[firstIdx]
      const rest = cells.slice(firstIdx + 1).filter(Boolean)

      // header row ("Exercise | Sets | Reps")
      if (nonEmpty.length >= 2 && nonEmpty.every(c => HEADER_RE.test(c))) {
        cells.forEach((c, i) => {
          if (/^exercise|movement/i.test(c)) colName = i
          else if (/^sets?$/i.test(c)) colSets = i
          else if (/^reps?$/i.test(c)) colReps = i
          else if (/^notes?/i.test(c)) colNotes = i
        })
        continue
      }
      // Day header: "Day 1 - Upper" possibly with a "Sets x Reps" label beside it
      const restLooksLikeData = parseSetsReps(rest) !== null || (colSets >= 0 && /^\d+$/.test(cells[colSets] || ''))
      if (DAY_RE.test(first) && !restLooksLikeData) {
        pushDay({ name: first.replace(/\s*[-–:]\s*$/, ''), isRest: REST_RE.test(first), exercises: [] })
        continue
      }
      // Exercise row
      if (!current) pushDay({ name: wb.SheetNames.length > 1 ? sheetName : 'Day 1', isRest: false, exercises: [] })
      const cur: ParsedDay = current!
      let name = cells[colName] || first
      let optional = false
      const opt = name.match(/^\s*\(?optional\)?\s*[:\-–]?\s*(.*)$/i)
      if (opt) { optional = true; name = opt[1] || name }
      let sets = 0, reps = '', notes = ''
      const sr = parseSetsReps(rest)
      if (sr) ({ sets, reps, notes } = sr)
      else if (colSets >= 0 && /^\d+$/.test(cells[colSets] || '')) { sets = Number(cells[colSets]); reps = cells[colReps] || '' }
      else if (rest.length) { sets = 1; reps = rest[0] }
      else {
        const inline = name.match(/^(.*?)[:\-–]\s*(\d.*)$/)
        if (inline) { name = inline[1].trim(); sets = 1; reps = inline[2].trim() } else { sets = 1; reps = ''; warnings.push(`No sets/reps found for "${name}" (${cur.name})`) }
      }
      if (colNotes >= 0 && cells[colNotes]) notes = [notes, cells[colNotes]].filter(Boolean).join(' · ')
      if (/\beach\b/i.test(reps + ' ' + notes) && !/each/i.test(notes)) notes = [notes, 'each side'].filter(Boolean).join(' · ')
      if (cur.isRest) cur.isRest = false
      cur.exercises.push({ name: name.replace(/\s+/g, ' ').trim(), sets: sets || 1, reps, notes, optional })
    }
  }
  const programName = filename.replace(/\.(xlsx|xlsm|xls|csv)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Program'
  if (!days.length) warnings.push('No exercises detected. Expected rows like "Bench press | 3 x 8-12" under headers like "Day 1".')
  return { name: programName, days, warnings }
}
