import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox } from '../components/ui'
import { libraryCount } from '../lib/videos'

export default function Settings() {
  const { user } = useAuth()
  const [name, setName] = useState(''); const [saved, setSaved] = useState(false); const [error, setError] = useState<string | null>(null)
  const [pw, setPw] = useState(''); const [pwMsg, setPwMsg] = useState<string | null>(null)
  useEffect(() => { if (user) supabase.from('coaches').select('name').eq('id', user.id).maybeSingle().then(({ data }) => setName(data?.name ?? '')) }, [user])
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSaved(false)
    const { error } = await supabase.from('coaches').upsert({ id: user!.id, name, email: user!.email })
    if (error) setError(error.message); else setSaved(true)
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwMsg(error ? error.message : 'Password updated.'); setPw('')
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form onSubmit={save} className="card space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <div><label className="label">Display name (clients see this)</label><input className="w-full" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="w-full" value={user?.email ?? ''} disabled /></div>
        <ErrorBox error={error} />
        {saved && <div className="text-emerald-300 text-sm">Saved.</div>}
        <button className="btn-primary">Save</button>
      </form>
      <form onSubmit={changePw} className="card space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <input className="w-full" type="password" minLength={6} placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} required />
        {pwMsg && <div className="text-sm text-slate-300">{pwMsg}</div>}
        <button className="btn-secondary">Update password</button>
      </form>
      <div className="card text-sm text-slate-400">
        <h2 className="font-semibold text-slate-100 mb-1">Video library</h2>
        {libraryCount} exercises with curated form videos are matched automatically. Any video you choose manually is remembered for your future imports.
      </div>
    </div>
  )
}
