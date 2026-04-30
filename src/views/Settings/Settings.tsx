import { useState } from 'react'
import { useStore } from '../../store'
import { ConfirmDialog } from '../../components'

export default function Settings() {
  const resetMission   = useStore(s => s.resetMission)
  const changePassword = useStore(s => s.changePassword)
  const logout         = useStore(s => s.logout)
  const user           = useStore(s => s.user)
  const mission        = useStore(s => s.mission)

  const [confirmReset, setConfirmReset] = useState(false)

  // Change password form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(false)
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return }
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters'); return }
    setPwdLoading(true)
    try {
      await changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Account */}
      <section className="bg-surface border border-border p-3 flex flex-col gap-3">
        <div className="lbl text-[10px]">ACCOUNT</div>

        {user && (
          <div className="text-[11px] text-muted">
            Signed in as <span className="text-ink font-semibold">{user.username}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="flex flex-col gap-2">
          <div className="text-[10px] tracking-widest text-muted uppercase">Change password</div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-widest">Current password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
              required
              className="bg-bg border border-border text-ink font-mono text-[12px] px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-widest">New password</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              autoComplete="new-password"
              required
              className="bg-bg border border-border text-ink font-mono text-[12px] px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-widest">Confirm new password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              required
              className="bg-bg border border-border text-ink font-mono text-[12px] px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>

          {pwdError && (
            <div className="text-[11px] text-bad border border-bad px-2 py-1.5">{pwdError}</div>
          )}
          {pwdSuccess && (
            <div className="text-[11px] text-ok border border-ok px-2 py-1.5">Password changed.</div>
          )}

          <button
            type="submit"
            disabled={pwdLoading}
            className="text-[11px] text-accent border border-accent px-3 py-1 self-start hover:opacity-80 disabled:opacity-50"
          >
            {pwdLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <div className="border-t border-border pt-2">
          <button
            onClick={() => logout()}
            className="text-[11px] text-muted border border-border px-3 py-1 hover:text-ink hover:border-ink"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Mission */}
      {mission && (
        <section className="bg-surface border border-border p-3 flex flex-col gap-2">
          <div className="lbl text-[10px]">MISSION</div>
          <div>
            <button
              onClick={() => setConfirmReset(true)}
              className="text-[11px] text-bad border border-bad px-3 py-1"
            >
              RESET MISSION
            </button>
            <div className="text-[10px] text-muted italic mt-1">Clears all mission state and resets trooper positions.</div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="RESET MISSION"
        message="Reset all mission state? Trooper positions, momentum, and advance rolls will be cleared."
        confirmLabel="RESET"
        tone="danger"
        onConfirm={() => { resetMission(); setConfirmReset(false) }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
