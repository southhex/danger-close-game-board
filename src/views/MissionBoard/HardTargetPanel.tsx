import { useState } from 'react'
import { useStore } from '../../store'
import { hardTargetMaxHp } from '../../utils/gameRules'
import { HT_LABEL, HT_DAMAGE, HT_NOTES } from '../../data/hardTargets'
import type { HardTarget } from '../../types'

const HT_TYPES: HardTarget['type'][] = ['brute', 'sniper', 'grenadier', 'gun_nest', 'tank']

interface Props {
  hardTargets: HardTarget[]
}

export default function HardTargetPanel({ hardTargets }: Props) {
  const addHardTarget = useStore(s => s.addHardTarget)
  const applyHardTargetHit = useStore(s => s.applyHardTargetHit)

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<HardTarget['type']>('brute')
  const [name, setName] = useState('')

  function handleAdd() {
    const htName = name.trim() || HT_LABEL[type]
    const maxHp = hardTargetMaxHp(type)
    addHardTarget({
      type,
      name: htName,
      maxHp,
      currentHp: maxHp,
      isGround: type === 'tank',
    })
    setName('')
    setType('brute')
    setOpen(false)
  }

  return (
    <div className="bg-surface border border-border p-3">
      <div className="lbl mb-2">HARD TARGETS</div>

      {hardTargets.length === 0 && (
        <div className="text-[10px] text-muted italic mb-2">No hard targets</div>
      )}

      {hardTargets.map(ht => {
        const destroyed = ht.currentHp <= 0
        return (
          <div
            key={ht.id}
            className={`border border-border p-2 mb-1.5 flex flex-col gap-1 ${destroyed ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-[11px] text-ink flex-1 ${destroyed ? 'line-through' : ''}`}>{ht.name}</span>
              <span className="text-[9px] text-neutral border border-border px-1">{HT_LABEL[ht.type]}</span>
              {ht.isGround && (
                <span className="text-[9px] text-warn border border-warn px-1">GROUND</span>
              )}
              <span className="text-[11px] tracking-widest text-ok" aria-label={`HP ${ht.currentHp} of ${ht.maxHp}`}>
                {'●'.repeat(Math.max(0, ht.currentHp))}{'○'.repeat(Math.max(0, ht.maxHp - ht.currentHp))}
              </span>
              <button
                onClick={() => applyHardTargetHit(ht.id, false)}
                disabled={destroyed}
                className="text-[10px] text-bad border border-border px-1 hover:border-bad disabled:opacity-30 disabled:cursor-not-allowed"
                title="Apply hit"
              >
                HIT
              </button>
            </div>
            <div className="text-[9px] text-muted pl-1">
              {HT_DAMAGE[ht.type]}
            </div>
            {HT_NOTES[ht.type] && (
              <div className="text-[9px] text-muted italic pl-1">
                {HT_NOTES[ht.type]}
              </div>
            )}
          </div>
        )
      })}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] text-muted border border-border px-2 py-0.5 mt-1 hover:text-ink"
        >
          ▾ ADD HARD TARGET
        </button>
      )}

      {open && (
        <div className="mt-2 border border-border p-2 flex flex-col gap-2">
          <div>
            <div className="lbl text-[9px] mb-1">TYPE</div>
            <div className="flex flex-wrap gap-1">
              {HT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setType(t)
                    if (!name) setName('')
                  }}
                  className={`text-[9px] px-1.5 py-0.5 border ${type === t ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >
                  {HT_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="lbl text-[9px] mb-1">NAME</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={HT_LABEL[type]}
              className="bg-bg border border-border text-ink text-[11px] px-2 py-0.5 w-full focus:outline-none focus:border-neutral"
            />
          </div>
          <div className="text-[9px] text-muted flex flex-col gap-0.5">
            <div>HP: {hardTargetMaxHp(type)} · Damage: {HT_DAMAGE[type]}</div>
            {HT_NOTES[type] && <div className="italic">{HT_NOTES[type]}</div>}
            {type === 'tank' && <div>(GROUND TARGET)</div>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="text-[10px] text-ok border border-ok px-2 py-0.5"
            >
              ADD
            </button>
            <button
              onClick={() => { setOpen(false); setName(''); setType('brute') }}
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
