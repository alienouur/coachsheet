import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ExerciseHistory } from '../lib/stats'
import { fmtDate } from '../lib/format'

const tip = { contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#e2e8f0' } }

export function WeeklyChart({ data, unit }: { data: { label: string; sessions: number; volume: number }[]; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis yAxisId="r" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend />
        <Bar yAxisId="l" dataKey="sessions" name="Sessions" fill="#fb923c" radius={[4, 4, 0, 0]} />
        <Line yAxisId="r" dataKey="volume" name={`Volume (${unit})`} stroke="#a3e635" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function ExerciseChart({ h, unit }: { h: ExerciseHistory; unit: string }) {
  const data = h.points.map(p => ({ ...p, label: fmtDate(p.date) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis yAxisId="r" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <Tooltip {...tip} />
        <Legend />
        <Line yAxisId="l" dataKey="best" name={`Top weight (${unit})`} stroke="#fb923c" strokeWidth={2} />
        <Line yAxisId="l" dataKey="e1rm" name="Est. 1RM" stroke="#e4e4e7" strokeWidth={2} strokeDasharray="4 3" />
        <Line yAxisId="r" dataKey="volume" name="Volume" stroke="#a3e635" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
