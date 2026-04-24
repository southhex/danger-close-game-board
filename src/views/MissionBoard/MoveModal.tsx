import { useState } from 'react'
import { Modal } from '../../components'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { mobilityCheck, effectiveMobility } from '../../utils/gameRules'
import { useStore } from '../../store'
import type { Trooper, MissionSector, TrooperIntent } from '../../types'

interface Props {
  trooper: Trooper
  sector: MissionSector
  open: boolean
  onClose: () => void
  onConfirm: (intent: Partial<TrooperIntent>) => void
}

type MoveType = 'move_up' | 'fall_back' | 'reposition'

const MOVE_LABEL: Record<MoveType, string> = {
  move_up: 'MOVE UP',
  fall_back: 'FALL BACK',
  reposition: 'REPOSITION',
}

export default function MoveModal({ trooper, sector, open, onClose, onConfirm }: Props) {
  const addRoll = useStore(s => s.addRoll)
  const [moveType, setMoveType] = useState<MoveType>('move_up')
  const [mobilityRoll, setMobilityRoll] = useState<number | null>(null)
  const [rerolled, setRerolled] = useState(false)
  const [manualRoll, setManualRoll] = useState('')

  const effMob = effectiveMobility(trooper)

  function doRoll() {
    const result = rollDie(6)
    setMobilityRoll(result)
    setManualRoll(String(result))
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: `${trooper.name} Mobility Check (${MOVE_LABEL[moveType]})`,
      dice: '1d6',
      results: [result],
      modifier: 0,
      total: result,
    })
  }

  function doGritReroll() {
    if (trooper.grit <= 0 || rerolled) return
    const result = rollDie(6)
    setMobilityRoll(result)
    setManualRoll(String(result))
    setRerolled(true)
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: `${trooper.name} Mobility Reroll (Grit)`,
      dice: '1d6',
      results: [result],
      modifier: 0,
      total: result,
    })
  }

  function handleManualChange(v: string) {
    setManualRoll(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 1 && n <= 6) setMobilityRoll(n)
  }

  const passed = mobilityRoll !== null ? mobilityCheck(effMob, mobilityRoll) : null

  // Describe resulting position hint
  function positionHint(): string {
    if (moveType === 'move_up') {
      if (trooper.offpos === 'limited') return '→ Engaged'
      if (trooper.offpos === 'engaged') {
        return sector.space > 0 ? '→ Flanking' : '→ Engaged (no space)'
      }
      return '→ Already Flanking'
    }
    if (moveType === 'fall_back') {
      if (trooper.offpos === 'flanking') return '→ Engaged'
      if (trooper.offpos === 'engaged') return '→ Limited'
      return '→ Already Limited'
    }
    return '→ Freely chosen'
  }

  function handleConfirm() {
    if (mobilityRoll === null) return
    onConfirm({
      action: 'move',
      moveType,
      mobilityRoll,
      mobilityPassed: passed ?? false,
      atkContribution: 0,
      ammoSpent: 0,
    })
    // Reset local state
    setMobilityRoll(null)
    setManualRoll('')
    setRerolled(false)
    setMoveType('move_up')
    onClose()
  }

  // Reset when closed
  function handleClose() {
    setMobilityRoll(null)
    setManualRoll('')
    setRerolled(false)
    setMoveType('move_up')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`MOVE — ${trooper.name}`}>
      <div className="flex flex-col gap-4">
        {/* Sub-action */}
        <div>
          <div className="lbl text-[9px] mb-2">SUB-ACTION</div>
          <div className="flex gap-2 flex-wrap">
            {(['move_up', 'fall_back', 'reposition'] as MoveType[]).map(mt => (
              <button
                key={mt}
                onClick={() => setMoveType(mt)}
                className={`text-[10px] px-3 py-1 border ${
                  moveType === mt ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
                }`}
              >
                {MOVE_LABEL[mt]}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted mt-1">{positionHint()}</div>
        </div>

        {/* Mobility info */}
        <div className="text-[10px] text-muted">
          MOBILITY: <span className="text-ink">{effMob}</span>
          {effMob !== trooper.mobility && (
            <span className="text-warn ml-1">(base {trooper.mobility} −1 wound penalty)</span>
          )}
        </div>

        {/* Roll section */}
        <div>
          <div className="lbl text-[9px] mb-2">MOBILITY CHECK — ROLL 1D6 ≤ {effMob}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={doRoll}
              className="text-[10px] text-ok border border-ok px-3 py-1 hover:bg-ok/10"
            >
              ROLL 1D6
            </button>
            <span className="text-muted text-[10px]">or enter:</span>
            <input
              type="number"
              min={1}
              max={6}
              value={manualRoll}
              onChange={e => handleManualChange(e.target.value)}
              className="bg-bg border border-border text-ink text-[11px] w-12 px-2 py-0.5 text-center"
            />
          </div>

          {mobilityRoll !== null && (
            <div className={`mt-2 text-[11px] font-bold ${passed ? 'text-ok' : 'text-bad'}`}>
              ROLLED {mobilityRoll} — {passed ? 'PASS' : 'FAIL'}
            </div>
          )}

          {/* Grit reroll */}
          {mobilityRoll !== null && !passed && trooper.grit > 0 && !rerolled && (
            <button
              onClick={doGritReroll}
              className="mt-2 text-[10px] text-warn border border-warn px-3 py-0.5 hover:bg-warn/10"
            >
              REROLL (SPEND 1 GRIT — {trooper.grit} remaining)
            </button>
          )}
          {rerolled && (
            <div className="text-[9px] text-muted mt-1">Grit reroll used.</div>
          )}
        </div>

        {/* Confirm */}
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={mobilityRoll === null}
            className="text-[10px] px-4 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
          >
            CONFIRM MOVE
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
