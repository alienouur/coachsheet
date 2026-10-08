import { Link, NavLink } from 'react-router-dom'
import { Dumbbell, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3 sm:gap-6">
          <Link to="/app" className="flex items-center gap-2"><span className="bg-brand-500 text-zinc-950 rounded-md p-1"><Dumbbell size={16} /></span><span className="display text-2xl">CoachSheet</span></Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink to="/app" end className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'bg-zinc-800 text-brand-400' : ''}`}><Users size={16} /><span className="hidden sm:inline">Clients</span></NavLink>
            <NavLink to="/app/settings" className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'bg-zinc-800 text-brand-400' : ''}`}><Settings size={16} /><span className="hidden sm:inline">Settings</span></NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-zinc-400">
            <span className="hidden sm:inline">{user?.email}</span>
            <button className="btn-ghost px-2 py-1.5" onClick={signOut} title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
