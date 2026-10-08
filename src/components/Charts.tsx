import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ExerciseHistory } from '../lib/stats'
import { fmtDate } from '../lib/format'

const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' } }

export function WeeklyChart({ data, unit }: { data: { label: string; sessions: number; volume: number }[]; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis yAxisId="r" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend />
        <Bar yAxisId="l" dataKey="sessions" name="Sessions" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        <Line yAxisId="r" dataKey="volume" name={`Volume (${unit})`} stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function ExerciseChart({ h, unit }: { h: ExerciseHistory; unit: string }) {
  const data = h.points.map(p => ({ ...p, label: fmtDate(p.date) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis yAxisId="r" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend />
        <Line yAxisId="l" dataKey="best" name={`Top weight (${unit})`} stroke="#38bdf8" strokeWidth={2} />
        <Line yAxisId="l" dataKey="e1rm" name="Est. 1RM" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 3" />
        <Line yAxisId="r" dataKey="volume" name="Volume" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
