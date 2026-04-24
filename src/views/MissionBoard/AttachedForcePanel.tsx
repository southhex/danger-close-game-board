import { useState } from 'react'
import { useStore } from '../../store'
import type { AttachedForce } from '../../types'

type ForceSize = 'Small' | 'Medium' | 'Large'
const SIZE_DICE: Record<ForceSize, number> = { Small: 1, Medium: 2, Large: 3 }

interface Props {
  forces: AttachedForce[]
}

export default function AttachedForcePanel({ forces }: Props) {
  const addAttachedForce = useStore(s => s.addAttachedForce)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [size, setSize] = useState<ForceSize>('Small')
  const [isVip, setIsVip] = useState(false)

  function handleAdd() {
    const forceName = name.trim() || 'Attached Force'
    addAttachedForce({
      name: forceName,
      dice: SIZE_DICE[size],
      isVip,
      committed: false,
    })
    setName('')
    setSize('Small')
    setIsVip(false)
    setOpen(false)
  }

  return (
    <div className="bg-surface border border-border p-3">
      <div className="lbl mb-2">ATTACHED FORCES</div>

      {forces.length === 0 && (
        <div className="text-[10px] text-muted italic mb-2">No attached forces</div>
      )}

      {forces.map(af => (
        <div key={af.id} className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-ink flex-1">{af.name}</span>
          <span className="text-[11px] text-ok tracking-widest">{'●'.repeat(af.dice)}</span>
          {af.isVip && (
            <span className="text-[9px] text-warn border border-warn px-1">VIP</span>
          )}
          {af.committed && (
            <span className="text-[9px] text-neutral border border-border px-1">COMMITTED</span>
          )}
        </div>
      ))}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] text-muted border border-border px-2 py-0.5 mt-1 hover:text-ink"
        >
          ▾ ADD ATTACHED FORCE
        </button>
      )}

      {open && (
        <div className="mt-2 border border-border p-2 flex flex-col gap-2">
          <div>
            <div className="lbl text-[9px] mb-1">NAME</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Attached Force"
              className="bg-bg border border-border text-ink text-[11px] px-2 py-0.5 w-full focus:outline-none focus:border-neutral"
            />
          </div>
          <div>
            <div className="lbl text-[9px] mb-1">SIZE</div>
            <div className="flex gap-1">
              {(['Small', 'Medium', 'Large'] as ForceSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`text-[9px] px-1.5 py-0.5 border ${size === s ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >
                  {s.toUpperCase()} ({SIZE_DICE[s]}d)
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVip}
              onChange={e => setIsVip(e.target.checked)}
              className="accent-warn"
            />
            <span className="text-[10px] text-muted">VIP</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="text-[10px] text-ok border border-ok px-2 py-0.5"
            >
              ADD
            </button>
            <button
              onClick={() => { setOpen(false); setName(''); setSize('Small'); setIsVip(false) }}
              className="text-[10px] text-muted border border-border px-2 py-0.5"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
