import { useState } from 'react'
import { Modal } from '../../components'
import type { Trooper, MissionSector, TrooperIntent } from '../../types'

interface Props {
  trooper: Trooper           // the covering fire provider
  allTroopers: Trooper[]     // all active non-dead troopers
  sector: MissionSector
  open: boolean
  onClose: () => void
  onConfirm: (intent: Partial<TrooperIntent>) => void
}

const _ = (x: unknown) => x  // suppress unused warning

export default function CoveringFireModal({ trooper, allTroopers, sector: _sector, open, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const hasLMG = trooper.special_weapon === 'LMG'
  const isHMG = trooper.special_weapon === 'HMG'
  const maxTargets = isHMG ? 3 : Infinity

  const candidates = allTroopers.filter(t => t.id !== trooper.id)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!isHMG || next.size < maxTargets) {
          next.add(id)
        }
      }
      return next
    })
  }

  function handleConfirm() {
    onConfirm({
      action: 'covering_fire',
      coveringFireTargets: Array.from(selected),
      atkContribution: 0,
      ammoSpent: 0,
    })
    setSelected(new Set())
    onClose()
  }

  function handleClose() {
    setSelected(new Set())
    onClose()
  }

  _(_sector)

  return (
    <Modal open={open} onClose={handleClose} title={`COVERING FIRE — ${trooper.name}`}>
      <div className="flex flex-col gap-4">
        <div className="text-[10px] text-muted">
          Select troopers to cover. Each selected trooper gains{' '}
          <span className="text-ok">+1 DEF</span> this exchange.
          {hasLMG && (
            <span className="text-ok ml-1">(LMG: +1 additional DEF bonus)</span>
          )}
          {isHMG && (
            <span className="text-warn ml-1">(HMG: max 3 targets, costs 1 Ammo)</span>
          )}
        </div>

        {candidates.length === 0 && (
          <div className="text-[10px] text-muted italic">No other troopers available.</div>
        )}

        <div className="flex flex-col gap-2">
          {candidates.map(t => {
            const isSelected = selected.has(t.id)
            const atMax = isHMG && selected.size >= maxTargets && !isSelected
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                disabled={atMax}
                className={`flex items-center gap-3 px-3 py-2 border text-left ${
                  isSelected
                    ? 'border-ok text-ok'
                    : atMax
                    ? 'border-border text-muted opacity-40 cursor-not-allowed'
                    : 'border-border text-muted hover:text-ink'
                }`}
              >
                <span className={`w-3 h-3 border inline-block flex-shrink-0 ${isSelected ? 'bg-ok border-ok' : 'border-muted'}`} />
                <span className="text-[10px]">
                  {t.name}
                  <span className="ml-2 text-[9px] opacity-70">{t.offpos.toUpperCase()} / {t.defpos.toUpperCase()}</span>
                </span>
                {isSelected && hasLMG && (
                  <span className="ml-auto text-[9px] text-ok">+2 DEF</span>
                )}
                {isSelected && !hasLMG && (
                  <span className="ml-auto text-[9px] text-ok">+1 DEF</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            onClick={handleConfirm}
            className="text-[10px] px-4 py-1 border border-warn text-warn hover:bg-warn/10"
          >
            CONFIRM ({selected.size} target{selected.size !== 1 ? 's' : ''})
          </button>
          <button
            onClick={handleClose}
            className="text-[10px] px-4 py-1 border border-border text-muted hover:text-ink"
          >
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  )
}
