import { Link } from 'react-router-dom'
import { ArrowRight, Dumbbell, FileSpreadsheet, LineChart, Link2, PlaySquare, Smartphone, Timer } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { libraryCount } from '../lib/videos'

const features = [
  { icon: FileSpreadsheet, title: 'Upload your Excel', text: 'Keep programming the way you already do. Drop the spreadsheet in and CoachSheet turns it into a clean, mobile-ready plan.' },
  { icon: PlaySquare, title: 'Videos, automatically', text: `Every exercise gets a form video matched from a library of ${libraryCount} movements. Swap any video in one click.` },
  { icon: Link2, title: 'One link per client', text: 'No app to install, no sign-up for clients. They open their link, see today\'s session and log every set.' },
  { icon: LineChart, title: 'Track everyone', text: 'See who trained this week, who went quiet, PRs and volume per client — all in one dashboard.' },
  { icon: Timer, title: 'Built for the gym floor', text: 'Big tap targets, rest timer, last-time values pre-filled and PR alerts the moment they happen.' },
  { icon: Smartphone, title: 'Works on any phone', text: 'Clients add the link to their home screen and it behaves like an app — on iPhone and Android.' },
]
const steps = [
  ['01', 'Add a client', 'Name and a note — that\'s it.'],
  ['02', 'Drop in the Excel', 'Days, exercises, sets and reps are detected. You review and save.'],
  ['03', 'Send the link', 'Your client trains, logs sets and you watch the progress roll in.'],
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="min-h-full">
      <header className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="bg-brand-500 text-zinc-950 rounded-md p-1"><Dumbbell size={18} /></span><span className="display text-2xl">CoachSheet</span></div>
        <nav className="flex gap-2">{user ? <Link className="btn-primary" to="/app">Open dashboard</Link> : <><Link className="btn-ghost" to="/login">Sign in</Link><Link className="btn-primary" to="/signup">Start free</Link></>}</nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 stripes pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
          <div>
            <div className="eyebrow mb-4">For personal trainers & online coaches</div>
            <h1 className="display text-6xl sm:text-7xl lg:text-8xl">Your Excel.<br />Their <span className="text-brand-400">dashboard.</span></h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-xl">CoachSheet turns the training programs you already write in Excel into a private, mobile-ready dashboard for every client — exercise videos, set-by-set logging and progress charts included.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary text-base px-6 py-3" to="/signup">Create free account <ArrowRight size={18} /></Link><Link className="btn-secondary text-base px-6 py-3" to="/login">Sign in</Link></div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[[`${libraryCount}+`, 'exercise videos'], ['1 link', 'per client'], ['0 apps', 'to install']].map(([v, l]) => <div key={l}><div className="display text-4xl text-brand-400">{v}</div><div className="text-xs uppercase tracking-wider text-zinc-500">{l}</div></div>)}
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="eyebrow mb-3">How it works</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map(([n, t, d]) => <div key={n} className="card relative overflow-hidden"><div className="display text-6xl text-zinc-800 absolute -top-2 right-3">{n}</div><h3 className="display text-2xl relative">{t}</h3><p className="text-zinc-400 mt-2 relative">{d}</p></div>)}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="eyebrow mb-3">Everything a coach needs</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => <div key={f.title} className="card hover:border-brand-500/50 transition"><div className="inline-flex p-2 rounded-lg bg-brand-500/15 text-brand-400 mb-3"><f.icon size={20} /></div><h3 className="font-semibold text-lg">{f.title}</h3><p className="text-zinc-400 mt-1 text-sm">{f.text}</p></div>)}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 sm:p-12 text-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-6 stripes">
          <div><h2 className="display text-4xl sm:text-5xl">Stop sending screenshots of spreadsheets.</h2><p className="mt-2 font-medium text-zinc-900/80">Free while in beta. Takes two minutes to set up your first client.</p></div>
          <Link className="btn bg-zinc-950 text-white hover:bg-zinc-800 text-base px-6 py-3 shrink-0" to="/signup">Get started <ArrowRight size={18} /></Link>
        </div>
      </section>
      <footer className="text-center text-zinc-500 text-sm pb-8">© {new Date().getFullYear()} CoachSheet</footer>
    </div>
  )
}

function PhoneMock() {
  const rows = [['Trap three raise', '2 × 15-20', '8 × 18'], ['Incline bench press', '3 × 8-12', '60 × 10'], ['Lat pulldown', '3 × 8-12', '55 × 12'], ['Chest fly machine', '3 × 8-12', '35 × 12']]
  return (
    <div className="hidden lg:flex justify-center">
      <div className="w-[300px] rounded-[2.2rem] border border-zinc-700 bg-zinc-950 p-3 shadow-2xl shadow-brand-500/10 rotate-[-4deg]">
        <div className="rounded-[1.6rem] bg-zinc-900 overflow-hidden">
          <div className="p-4"><div className="text-xs text-zinc-500">Hi Ali · Coach: Sam</div>
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-zinc-950"><div className="text-[10px] font-bold uppercase tracking-widest">Up next</div><div className="display text-3xl mt-1">Day 1 · Upper</div><div className="text-xs font-medium mt-1">9 exercises · 25 sets</div></div>
            <div className="mt-3 space-y-2">{rows.map(([n, p, l]) => <div key={n} className="flex items-center gap-2 bg-zinc-800/70 rounded-xl p-2"><div className="w-9 h-7 rounded bg-zinc-700" /><div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{n}</div><div className="text-[10px] text-brand-300">{p}</div></div><div className="text-[10px] text-zinc-400">{l}</div></div>)}</div>
          </div>
          <div className="grid grid-cols-4 text-[9px] text-zinc-500 border-t border-zinc-800 py-2 text-center"><span className="text-brand-400">Home</span><span>Progress</span><span>History</span><span>Settings</span></div>
        </div>
      </div>
    </div>
  )
}
