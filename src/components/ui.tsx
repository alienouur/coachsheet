import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className={`bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h3 className="font-semibold">{title}</h3>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function VideoEmbed({ videoId, title }: { videoId: string; title?: string }) {
  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
      <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`} title={title || 'Exercise video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card py-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="card text-center py-12"><div className="text-lg font-medium mb-2">{title}</div><div className="text-slate-400 text-sm">{children}</div></div>
}

export function Spinner() { return <div className="p-10 text-center text-slate-400">Loading…</div> }

export function ErrorBox({ error }: { error: string | null }) { return error ? <div className="rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm px-3 py-2">{error}</div> : null }
