# CoachSheet

Turn your Excel training programs into a private client dashboard.

- Coaches sign up, add clients and upload each client's Excel/CSV program.
- Days, exercises, sets and reps are parsed and reviewed before saving.
- Every exercise gets a form video automatically (243-exercise library + name normalization); coaches can swap any video.
- Each client gets a private link: today's workout, set-by-set logging, rest timer, PRs, history and progress charts.
- Coaches see adherence, last session, inactivity alerts and per-client progress.

## Stack
React + TypeScript + Vite + Tailwind, Supabase (Auth, Postgres, RLS, RPC for token-based client portal), SheetJS, Recharts.

## Development
```
npm install
cp .env.example .env.local   # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Apply `supabase/migrations/0001_init.sql` to your Supabase project.

## Deploy (GitHub Pages)
`npm run build:pages` builds with base `/coachsheet/` and a SPA `404.html`; publish `dist/` to the `gh-pages` branch.
