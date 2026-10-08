import { Link, NavLink } from 'react-router-dom'
import { Dumbbell, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/app" className="flex items-center gap-2 font-semibold text-lg"><Dumbbell className="text-sky-400" size={22} /> CoachSheet</Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink to="/app" end className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'bg-slate-800 text-white' : ''}`}><Users size={16} /> Clients</NavLink>
            <NavLink to="/app/settings" className={({ isActive }) => `btn-ghost px-3 py-1.5 ${isActive ? 'bg-slate-800 text-white' : ''}`}><Settings size={16} /> Settings</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:inline">{user?.email}</span>
            <button className="btn-ghost px-2 py-1.5" onClick={signOut} title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
