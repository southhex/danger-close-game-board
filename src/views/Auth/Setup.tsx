import { useState } from 'react'
import { useStore } from '../../store'

interface Props {
  onBack?: () => void
}

export default function Setup({ onBack }: Props) {
  const setup = useStore(s => s.setup)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await setup(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-7 bg-accent text-bg flex items-center justify-center font-bold text-[12px]">
            DC
          </div>
          <div>
            <div className="text-[15px] font-bold text-ink">Danger Close</div>
            <div className="text-[10px] text-muted tracking-widest uppercase">Play aid</div>
          </div>
        </div>

        <div className="bg-surface border border-border p-4">
          <div className="text-[10px] tracking-widest text-muted uppercase mb-1">First run setup</div>
          <div className="text-[11px] text-muted mb-4">Create your account to get started.</div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest text-muted uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="bg-bg border border-border text-ink font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest text-muted uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="bg-bg border border-border text-ink font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-widest text-muted uppercase">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="bg-bg border border-border text-ink font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="text-[11px] text-bad border border-bad px-2.5 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-bg font-bold text-[12px] tracking-widest uppercase px-3 py-2 hover:opacity-90 disabled:opacity-50 mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-3 text-[11px] text-muted hover:text-ink underline"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  )
}
