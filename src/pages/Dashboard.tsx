import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, UserPlus } from 'lucide-react'
import { createClient, listClients, type ClientSummary } from '../lib/db'
import { daysAgo, fmtDate } from '../lib/format'
import { Empty, ErrorBox, Modal, Spinner, Stat } from '../components/ui'

export default function Dashboard() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const nav = useNavigate()
  useEffect(() => { listClients().then(setClients).catch(e => setError(e.message)) }, [])

  if (error) return <ErrorBox error={error} />
  if (!clients) return <Spinner />
  const active7 = clients.filter(c => c.sessions7d > 0).length
  const quiet = clients.filter(c => c.hasProgram && (!c.lastSession || daysAgo(c.lastSession) >= 5))
  const totalSessions30 = clients.reduce((a, c) => a + c.sessions30d, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}><UserPlus size={18} /> Add client</button>
      </div>
      {clients.length === 0 ? (
        <Empty title="No clients yet">Add your first client, then upload their Excel program. They get a private link to train from.<div className="mt-4"><button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add client</button></div></Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Clients" value={clients.length} />
            <Stat label="Trained this week" value={`${active7}/${clients.length}`} />
            <Stat label="Sessions (30 days)" value={totalSessions30} />
            <Stat label="Need attention" value={quiet.length} sub="no session in 5+ days" />
          </div>
          {quiet.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div><b>Check in:</b> {quiet.map(c => <Link key={c.id} to={`/app/clients/${c.id}`} className="underline mr-2">{c.name}</Link>)} {quiet.length === 1 ? 'has' : 'have'} not logged a workout recently.</div>
            </div>
          )}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-left"><tr><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Program</th><th className="px-4 py-3 font-medium">Last session</th><th className="px-4 py-3 font-medium">This week</th><th className="px-4 py-3 font-medium">30 days</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
              <tbody>
                {clients.map(c => <Row key={c.id} c={c} onOpen={() => nav(`/app/clients/${c.id}`)} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
      <AddClientModal open={adding} onClose={() => setAdding(false)} onCreated={id => nav(`/app/clients/${id}/import`)} />
    </div>
  )
}

function Row({ c, onOpen }: { c: ClientSummary; onOpen: () => void }) {
  const d = c.lastSession ? daysAgo(c.lastSession) : null
  const status = !c.hasProgram ? ['No program', 'bg-slate-700 text-slate-200'] : d === null ? ['Not started', 'bg-slate-700 text-slate-200'] : d <= 2 ? ['Active', 'bg-emerald-500/20 text-emerald-300'] : d <= 4 ? ['On track', 'bg-sky-500/20 text-sky-300'] : ['Inactive', 'bg-amber-500/20 text-amber-300']
  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer" onClick={onOpen}>
      <td className="px-4 py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-slate-500">{c.email}</div></td>
      <td className="px-4 py-3 text-slate-300">{c.programName ?? <span className="text-slate-500">—</span>}</td>
      <td className="px-4 py-3 text-slate-300">{c.lastSession ? `${fmtDate(c.lastSession)} (${d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`})` : '—'}</td>
      <td className="px-4 py-3">{c.sessions7d}</td>
      <td className="px-4 py-3">{c.sessions30d}</td>
      <td className="px-4 py-3"><span className={`badge ${status[1]}`}>{status[0]}</span></td>
    </tr>
  )
}

export function AddClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null)
    try { const c = await createClient({ name, email, notes }); onCreated(c.id) } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add client">
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Name</label><input className="w-full" value={name} onChange={e => setName(e.target.value)} required autoFocus /></div>
        <div><label className="label">Email (optional)</label><input className="w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label className="label">Notes (optional)</label><textarea className="w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Goals, injuries, schedule…" /></div>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>Create & upload program</button></div>
      </form>
    </Modal>
  )
}
