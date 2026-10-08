export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
export const e1rm = (w: number, r: number) => (r > 0 && w > 0 ? Math.round(w * (1 + r / 30) * 10) / 10 : 0)
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
export const ytWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const ytSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' exercise how to')}`
export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}
