import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox } from '../components/ui'

export default function Login({ mode }: { mode: 'login' | 'signup' }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [info, setInfo] = useState<string | null>(null)
  if (user) return <Navigate to="/app" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setInfo(null)
    try {
      if (!supabaseConfigured) throw new Error('Backend not configured yet (missing Supabase keys).')
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}app` } })
        if (error) throw error
        if (!data.session) { setInfo('Check your email to confirm your account, then sign in.'); return }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error
      }
      nav('/app')
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-xl justify-center"><Dumbbell className="text-sky-400" /> CoachSheet</Link>
        <h1 className="text-lg font-semibold text-center">{mode === 'signup' ? 'Create your coach account' : 'Welcome back, coach'}</h1>
        {mode === 'signup' && <div><label className="label">Your name</label><input className="w-full" value={name} onChange={e => setName(e.target.value)} required /></div>}
        <div><label className="label">Email</label><input className="w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div><label className="label">Password</label><input className="w-full" type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <ErrorBox error={error} />
        {info && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 text-sm px-3 py-2">{info}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <p className="text-sm text-center text-slate-400">
          {mode === 'signup' ? <>Already have an account? <Link className="text-sky-400" to="/login">Sign in</Link></> : <>New here? <Link className="text-sky-400" to="/signup">Create a free account</Link></>}
        </p>
      </form>
    </div>
  )
}
