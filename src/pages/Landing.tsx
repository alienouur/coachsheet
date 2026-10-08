import { Link } from 'react-router-dom'
import { Dumbbell, FileSpreadsheet, LineChart, Link2, PlaySquare } from 'lucide-react'
import { useAuth } from '../lib/auth'

const features = [
  { icon: FileSpreadsheet, title: 'Upload your Excel', text: 'Keep programming the way you already do. Drop the spreadsheet in and CoachSheet turns it into a clean, mobile-ready plan.' },
  { icon: PlaySquare, title: 'Videos, automatically', text: 'Every exercise gets a form video matched from a curated library. Swap any video in one click.' },
  { icon: Link2, title: 'One link per client', text: 'No app to install, no sign-up for clients. They open their link, see today\'s workout and log every set.' },
  { icon: LineChart, title: 'Track everyone', text: 'See who trained this week, who went quiet, PRs and volume per client — all in one dashboard.' },
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="min-h-full">
      <header className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg"><Dumbbell className="text-sky-400" /> CoachSheet</div>
        <nav className="flex gap-2">{user ? <Link className="btn-primary" to="/app">Open dashboard</Link> : <><Link className="btn-ghost" to="/login">Sign in</Link><Link className="btn-primary" to="/signup">Start free</Link></>}</nav>
      </header>
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Turn your Excel programs into a <span className="text-sky-400">client dashboard</span></h1>
        <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">CoachSheet gives personal trainers a private dashboard per client — with exercise videos, set-by-set logging and progress tracking — straight from the spreadsheet you already write.</p>
        <div className="mt-8 flex gap-3 justify-center"><Link className="btn-primary text-base px-6 py-3" to="/signup">Create free account</Link><Link className="btn-secondary text-base px-6 py-3" to="/login">Sign in</Link></div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-20 grid sm:grid-cols-2 gap-4">
        {features.map(f => <div key={f.title} className="card"><f.icon className="text-sky-400 mb-3" /><h3 className="font-semibold text-lg">{f.title}</h3><p className="text-slate-400 mt-1">{f.text}</p></div>)}
      </section>
      <footer className="text-center text-slate-500 text-sm pb-8">© {new Date().getFullYear()} CoachSheet</footer>
    </div>
  )
}
