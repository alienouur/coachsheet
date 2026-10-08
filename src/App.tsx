import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClientPage from './pages/ClientPage'
import ImportPage from './pages/ImportPage'
import Portal from './pages/Portal'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-10 text-center text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login mode="login" />} />
      <Route path="/signup" element={<Login mode="signup" />} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/clients/:id" element={<Protected><ClientPage /></Protected>} />
      <Route path="/app/clients/:id/import" element={<Protected><ImportPage /></Protected>} />
      <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/c/:token/*" element={<Portal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
