import { useState } from 'react'
import { useStore } from '../../store'
import { rollCover, rollSpace, rollSectorContents, rollBoon } from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import BoonResolver from './BoonResolver'
import type { BoonType, MissionDifficulty } from '../../types'

type Step = 'cover' | 'space' | 'contents' | 'tl_only' | 'boon' | 'done'

interface Rolled {
  cover?: 0 | 1 | 2
  space?: 0 | 1 | 2
  contentsType?: 'tl' | 'boon' | 'nothing'
  tl?: 1 | 2 | 3 | 4
  boonType?: BoonType
}

export default function DetermineSectorPanel() {
  const mission = useStore(s => s.mission)
  const applySectorRoll = useStore(s => s.applySectorRoll)
  const applySectorBoon = useStore(s => s.applySectorBoon)
  const applySectorEmpty = useStore(s => s.applySectorEmpty)

  const activeSector = mission?.sectors.find(s => s.id === mission.activeSectorId)

  const needRollCover    = !!activeSector?.rollCover
  const needRollSpace    = !!activeSector?.rollSpace
  const needRollContents = !!activeSector?.rollContents
  const needRollTL       = !!activeSector?.rollTL
  const sectContentsType = activeSector?.contentsType ?? 'engagement'

  // Compute the first step we actually need to show
  function firstStep(): Step {
    if (needRollCover) return 'cover'
    if (needRollSpace) return 'space'
    return firstContentsStep()
  }

  function firstContentsStep(): Step {
    if (needRollContents) return 'contents'
    if (!needRollContents && sectContentsType === 'engagement' && needRollTL) return 'tl_only'
    return 'done'
  }

  const [step, setStep] = useState<Step>(() => firstStep())
  const [rolled, setRolled] = useState<Rolled>({})

  if (!mission) return null
  if (!activeSector) return null

  const activeSectorId = activeSector.id
  const difficulty: MissionDifficulty = (mission as { difficulty?: MissionDifficulty }).difficulty ?? 'routine'

  // After cover/space are resolved (rolled or skipped), proceed to the contents phase.
  // Pass in any freshly-rolled cover/space so we don't rely on stale `rolled` state.
  function advanceToContentsOrDone(fresh: { cover?: 0|1|2; space?: 0|1|2 } = {}) {
    if (needRollContents) {
      setStep('contents')
      return
    }
    // No contents roll — resolve from contentsType
    if (sectContentsType === 'empty') {
      applySectorEmpty(activeSectorId)
      setStep('done')
      return
    }
    if (sectContentsType === 'boon') {
      const boonDie = rollDie(6)
      const boonType = rollBoon(boonDie)
      setRolled(r => ({ ...r, contentsType: 'boon', boonType }))
      setStep('boon')
      return
    }
    // engagement
    if (needRollTL) {
      setStep('tl_only')
      return
    }
    // Fully predetermined engagement — apply immediately using fresh values
    const cover   = fresh.cover   ?? rolled.cover   ?? (activeSector!.cover as 0|1|2)
    const space   = fresh.space   ?? rolled.space   ?? (activeSector!.space as 0|1|2)
    const tl      = rolled.tl     ?? (activeSector!.tl as 1|2|3|4)
    const weather = activeSector!.weather as -2|-1|0|1
    applySectorRoll(activeSectorId, { cover, space, tl, weather })
    setStep('done')
  }

  function applyEngagementWithRolled(extra: { cover?: 0|1|2; space?: 0|1|2; tl?: 1|2|3|4 }) {
    const cover = extra.cover ?? rolled.cover ?? (activeSector!.cover as 0|1|2)
    const space = extra.space ?? rolled.space ?? (activeSector!.space as 0|1|2)
    const tl    = extra.tl   ?? rolled.tl   ?? (activeSector!.tl   as 1|2|3|4)
    const weather = activeSector!.weather as -2|-1|0|1
    applySectorRoll(activeSectorId, { cover, space, tl, weather })
  }

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleRollCover() {
    const die = rollDie(6)
    const cover = rollCover(die)
    setRolled(r => ({ ...r, cover }))
    if (needRollSpace) {
      setStep('space')
    } else {
      advanceToContentsOrDone({ cover })
    }
  }

  function handleRollSpace() {
    const die = rollDie(6)
    const space = rollSpace(die)
    setRolled(r => ({ ...r, space }))
    advanceToContentsOrDone({ space })
  }

  function handleRollContents() {
    const die = rollDie(6)
    const result = rollSectorContents(die, difficulty)

    if (result.type === 'nothing') {
      setRolled(r => ({ ...r, contentsType: 'nothing' }))
      applySectorEmpty(activeSectorId)
      setStep('done')
      return
    }

    if (result.type === 'tl') {
      setRolled(r => ({ ...r, contentsType: 'tl', tl: result.tl }))
      applyEngagementWithRolled({ tl: result.tl })
      setStep('done')
      return
    }

    // boon
    const boonDie = rollDie(6)
    const boonType = rollBoon(boonDie)
    setRolled(r => ({ ...r, contentsType: 'boon', boonType }))
    setStep('boon')
  }

  function handleRollTLOnly() {
    const die = rollDie(6)
    const result = rollSectorContents(die, difficulty)
    const tl: 1|2|3|4 = result.type === 'tl' ? result.tl : (activeSector!.tl as 1|2|3|4)
    setRolled(r => ({ ...r, contentsType: 'tl', tl }))
    applyEngagementWithRolled({ tl })
    setStep('done')
  }

  function handleBoonApplied() {
    const { boonType } = rolled
    if (!boonType) return
    applySectorBoon(activeSectorId, { type: boonType })
    setStep('done')
  }

  // ── rendering helpers ──────────────────────────────────────────────────────

  const pastSteps: Set<Step> = new Set()
  const stepOrder: Step[] = ['cover', 'space', 'contents', 'tl_only', 'boon', 'done']
  const currentIdx = stepOrder.indexOf(step)
  stepOrder.slice(0, currentIdx).forEach(s => pastSteps.add(s))

  // Step numbers for display — only count steps that are actually shown
  const visibleSteps: Step[] = []
  if (needRollCover)    visibleSteps.push('cover')
  if (needRollSpace)    visibleSteps.push('space')
  if (needRollContents) visibleSteps.push('contents')
  else if (!needRollContents && sectContentsType === 'engagement' && needRollTL) visibleSteps.push('tl_only')

  function stepNum(s: Step) {
    const idx = visibleSteps.indexOf(s)
    return idx >= 0 ? idx + 1 : null
  }

  const showCoverSection    = needRollCover
  const showSpaceSection    = needRollSpace && (step === 'space' || pastSteps.has('space') || step === 'contents' || step === 'tl_only' || step === 'boon' || step === 'done')
  const showContentsSection = needRollContents && (step === 'contents' || step === 'boon' || step === 'done' || rolled.contentsType != null)
  const showTLOnlySection   = !needRollContents && sectContentsType === 'engagement' && needRollTL && (step === 'tl_only' || step === 'done')

  return (
    <div className="bg-surface border border-border p-3 flex flex-col gap-4 text-[11px] font-mono">
      <div className="lbl text-[10px]">DETERMINE SECTOR</div>

      {/* Cover step */}
      {showCoverSection && (
        <div className={step === 'cover' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">{stepNum('cover')}. COVER</div>
          <div className="text-muted text-[10px] mb-1">1=0 · 2–4=1 · 5–6=2</div>
          {rolled.cover != null
            ? <div className="text-warn">Cover {rolled.cover}</div>
            : step === 'cover'
              ? <button onClick={handleRollCover} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
              : null
          }
        </div>
      )}

      {/* Space step */}
      {showSpaceSection && (
        <div className={step === 'space' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">{stepNum('space')}. SPACE</div>
          <div className="text-muted text-[10px] mb-1">1=0 · 2–4=1 · 5–6=2</div>
          {rolled.space != null
            ? <div className="text-warn">Space {rolled.space}</div>
            : step === 'space'
              ? <button onClick={handleRollSpace} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
              : null
          }
        </div>
      )}

      {/* Contents step (full roll) */}
      {showContentsSection && (
        <div className={step === 'contents' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">{stepNum('contents')}. CONTENTS ({difficulty.toUpperCase()})</div>
          <div className="text-muted text-[10px] mb-1">1=Nothing · 2=Boon · 3+=Engagement (TL by difficulty)</div>
          {rolled.contentsType != null
            ? (
              <div className="text-warn">
                {rolled.contentsType === 'nothing' && 'Nothing — sector empty'}
                {rolled.contentsType === 'tl' && `Engagement — TL ${rolled.tl}`}
                {rolled.contentsType === 'boon' && `Boon — ${rolled.boonType?.replace(/_/g, ' ').toUpperCase()}`}
              </div>
            )
            : step === 'contents'
              ? <button onClick={handleRollContents} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
              : null
          }
        </div>
      )}

      {/* TL-only step */}
      {showTLOnlySection && (
        <div className={step === 'tl_only' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">{stepNum('tl_only')}. TL ({difficulty.toUpperCase()})</div>
          <div className="text-muted text-[10px] mb-1">Roll to determine threat level</div>
          {rolled.tl != null
            ? <div className="text-warn">Engagement — TL {rolled.tl}</div>
            : step === 'tl_only'
              ? <button onClick={handleRollTLOnly} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
              : null
          }
        </div>
      )}

      {/* Boon resolver */}
      {step === 'boon' && rolled.boonType && (
        <BoonResolver boonType={rolled.boonType} onResolved={handleBoonApplied} />
      )}
    </div>
  )
}
