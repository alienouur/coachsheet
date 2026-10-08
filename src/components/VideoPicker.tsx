import { useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { Modal, VideoEmbed } from './ui'
import { parseYouTubeId, ytSearch, ytThumb } from '../lib/format'

export function VideoPicker({ open, onClose, exerciseName, currentId, onPick }: { open: boolean; onClose: () => void; exerciseName: string; currentId: string | null; onPick: (id: string | null) => void }) {
  const [input, setInput] = useState('')
  const parsed = parseYouTubeId(input)
  return (
    <Modal open={open} onClose={onClose} title={`Video — ${exerciseName}`}>
      {currentId ? <VideoEmbed videoId={currentId} title={exerciseName} /> : <div className="aspect-video rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">No video yet</div>}
      <div className="mt-4 space-y-3">
        <a className="btn-secondary w-full" href={ytSearch(exerciseName)} target="_blank" rel="noreferrer"><Search size={16} /> Search YouTube for "{exerciseName}" <ExternalLink size={14} /></a>
        <div>
          <label className="label">Paste a YouTube link to use instead</label>
          <div className="flex gap-2">
            <input className="flex-1" placeholder="https://www.youtube.com/watch?v=…" value={input} onChange={e => setInput(e.target.value)} />
            <button className="btn-primary" disabled={!parsed} onClick={() => { onPick(parsed); setInput(''); onClose() }}>Use</button>
          </div>
          {parsed && <img className="mt-2 rounded-lg w-40" src={ytThumb(parsed)} alt="" />}
        </div>
        {currentId && <button className="btn-ghost text-rose-300" onClick={() => { onPick(null); onClose() }}>Remove video</button>}
      </div>
    </Modal>
  )
}
