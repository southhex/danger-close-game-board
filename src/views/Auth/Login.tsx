import { useState } from 'react'
import { useStore } from '../../store'
import Setup from './Setup'

export default function Login() {
  const login = useStore(s => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (showSetup) {
    return <Setup onBack={() => setShowSetup(false)} />
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-7 bg-accent text-bg rounded-md flex items-center justify-center font-bold text-[12px]">
            DC
          </div>
          <div>
            <div className="text-[15px] font-bold text-ink">Danger Close</div>
            <div className="text-[10px] text-muted tracking-widest uppercase">Play aid</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-[10px] tracking-widest text-muted uppercase mb-4">Sign in</div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest text-muted uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="bg-bg border border-border rounded-md text-ink text-[13px] px-2.5 py-2 outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest text-muted uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="bg-bg border border-border rounded-md text-ink text-[13px] px-2.5 py-2 outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="text-[11px] text-bad border border-bad rounded-md px-2.5 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-bg rounded-md font-bold text-[12px] tracking-widest uppercase px-3 py-2 hover:opacity-90 disabled:opacity-50 mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <button
          onClick={() => setShowSetup(true)}
          className="mt-3 text-[11px] text-muted hover:text-ink underline"
        >
          First time? Set up your account
        </button>
      </div>
    </div>
  )
}
