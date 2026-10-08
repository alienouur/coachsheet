import library from '../data/videoLibrary.json'

export type LibraryEntry = { name: string; videoId: string; title?: string }
export type VideoMatch = { videoId: string; title?: string; confidence: 'exact' | 'fuzzy' | 'override' } | null

const SYNONYMS: [RegExp, string][] = [
  [/\bdb\b/g, 'dumbbell'], [/\bdumbell\b/g, 'dumbbell'], [/\bbb\b/g, 'barbell'], [/\bkb\b/g, 'kettlebell'],
  [/\brdls?\b/g, 'romanian deadlift'], [/\bsldl\b/g, 'stiff leg deadlift'], [/\bohp\b/g, 'overhead press'],
  [/\bbss\b/g, 'bulgarian split squat'], [/\bnordics?\b/g, 'nordic curl'], [/\bnordic hamstring curl\b/g, 'nordic curl'],
  [/\btris?\b/g, 'tricep'], [/\btriceps\b/g, 'tricep'], [/\bbis?\b/g, 'bicep'], [/\bbiceps\b/g, 'bicep'],
  [/\blat raise\b/g, 'lateral raise'], [/\bside raise\b/g, 'lateral raise'], [/\bmil(itary)? press\b/g, 'overhead press'],
  [/\bbent[- ]over\b/g, 'bent over'], [/\bchin[- ]ups?\b/g, 'chin up'], [/\bpull[- ]ups?\b/g, 'pull up'], [/\bpush[- ]ups?\b/g, 'push up'],
  [/\bsit[- ]ups?\b/g, 'sit up'], [/\bstep[- ]ups?\b/g, 'step up'], [/\bt[- ]bar\b/g, 't-bar'], [/\btrap (3|three|iii)\b/g, 'trap 3'],
  [/\bpulldowns\b/g, 'pulldown'], [/\bpull downs?\b/g, 'pulldown'], [/\bhammstring\b/g, 'hamstring'], [/\bcalve\b/g, 'calf'], [/\bcalves\b/g, 'calf'],
  [/\bskullcrushers?\b/g, 'skull crusher'], [/\bez[- ]bar\b/g, 'ez bar'], [/\brear delt flys?\b/g, 'rear delt fly'],
]
const PLURALS: [RegExp, string][] = [
  [/raises\b/g, 'raise'], [/curls\b/g, 'curl'], [/presses\b/g, 'press'], [/extensions\b/g, 'extension'], [/rows\b/g, 'row'],
  [/squats\b/g, 'squat'], [/dips\b/g, 'dip'], [/pulls\b/g, 'pull'], [/fl(ys|ies)\b/g, 'fly'], [/crunches\b/g, 'crunch'],
  [/lunges\b/g, 'lunge'], [/mornings\b/g, 'morning'], [/pullovers\b/g, 'pullover'], [/deadlifts\b/g, 'deadlift'], [/thrusts\b/g, 'thrust'],
  [/shrugs\b/g, 'shrug'], [/kickbacks\b/g, 'kickback'], [/swings\b/g, 'swing'], [/planks\b/g, 'plank'], [/twists\b/g, 'twist'],
  [/pushdowns\b/g, 'pushdown'], [/bridges\b/g, 'bridge'], [/carries\b/g, 'carry'], [/jumps\b/g, 'jump'], [/pushes\b/g, 'push'],
  [/rollouts\b/g, 'rollout'], [/climbers\b/g, 'climber'], [/stretches\b/g, 'stretch'], [/rotations\b/g, 'rotation'], [/holds\b/g, 'hold'],
]
const STOP = new Set(['the', 'a', 'an', 'with', 'and', 'for', 'on', 'of', 'to', 'optional', 'warm', 'warmup', 'up:', 'exercise', 'variation', 'alt', 'alternating', 'each', 'side', 'per', 'leg', 'arm'])

export function normalizeName(raw: string): string {
  let s = raw.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/optional:?/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep)
  for (const [re, rep] of PLURALS) s = s.replace(re, rep)
  return s.replace(/\s+/g, ' ').trim()
}
const tokens = (s: string) => s.split(' ').filter(t => t && !STOP.has(t))

type Indexed = LibraryEntry & { key: string; toks: string[] }
const INDEX: Indexed[] = (library as LibraryEntry[]).map(e => { const key = normalizeName(e.name); return { ...e, key, toks: tokens(key) } })

export function matchVideo(name: string, overrides?: Map<string, { videoId: string; title?: string }>): VideoMatch {
  const key = normalizeName(name)
  if (!key) return null
  const ov = overrides?.get(key)
  if (ov) return { videoId: ov.videoId, title: ov.title, confidence: 'override' }
  const exact = INDEX.find(e => e.key === key)
  if (exact) return { videoId: exact.videoId, title: exact.title, confidence: 'exact' }
  const q = tokens(key)
  if (!q.length) return null
  let best: Indexed | null = null, bestScore = 0
  for (const e of INDEX) {
    const inter = e.toks.filter(t => q.includes(t)).length
    if (!inter) continue
    const union = new Set([...e.toks, ...q]).size
    let score = inter / union
    if (q.every(t => e.toks.includes(t)) || e.toks.every(t => q.includes(t))) score = Math.max(score, 0.75)
    if (score > bestScore) { bestScore = score; best = e }
  }
  if (best && bestScore >= 0.6) return { videoId: best.videoId, title: best.title, confidence: 'fuzzy' }
  return null
}

export const libraryCount = INDEX.length
