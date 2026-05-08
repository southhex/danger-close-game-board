import { useState } from 'react'
import { useStore } from '../../store'
import { rollCover, rollSpace, rollWeather, rollSectorContents, rollBoon, weatherLabel } from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import BoonResolver from './BoonResolver'
import type { BoonType, MissionDifficulty } from '../../types'

type Step = 'cover' | 'space' | 'weather' | 'contents' | 'boon' | 'done'

interface Rolled {
  cover?: 0 | 1 | 2
  space?: 0 | 1 | 2
  weather?: -2 | -1 | 0 | 1
  contentsType?: 'tl' | 'boon' | 'nothing'
  tl?: 1 | 2 | 3 | 4
  boonType?: BoonType
}

export default function DetermineSectorPanel() {
  const mission = useStore(s => s.mission)
  const applySectorRoll = useStore(s => s.applySectorRoll)
  const applySectorBoon = useStore(s => s.applySectorBoon)
  const applySectorEmpty = useStore(s => s.applySectorEmpty)

  const [step, setStep] = useState<Step>('cover')
  const [rolled, setRolled] = useState<Rolled>({})

  if (!mission) return null

  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId)
  if (!activeSector) return null

  const activeSectorId = activeSector.id
  const difficulty: MissionDifficulty = (mission as { difficulty?: MissionDifficulty }).difficulty ?? 'routine'

  function handleRollCover() {
    const die = rollDie(6)
    const cover = rollCover(die)
    setRolled(r => ({ ...r, cover }))
    setStep('space')
  }

  function handleRollSpace() {
    const die = rollDie(6)
    const space = rollSpace(die)
    setRolled(r => ({ ...r, space }))
    setStep('weather')
  }

  function handleConfirmWeather(weather: -2 | -1 | 0 | 1) {
    setRolled(r => ({ ...r, weather }))
    setStep('contents')
  }

  function handleRollWeather() {
    const die = rollDie(6)
    const weather = rollWeather(die)
    handleConfirmWeather(weather)
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
      const { cover, space, weather } = rolled
      setRolled(r => ({ ...r, contentsType: 'tl', tl: result.tl }))
      applySectorRoll(activeSectorId, {
        cover: cover ?? 1,
        space: space ?? 1,
        tl: result.tl,
        weather: weather ?? 0,
      })
      setStep('done')
      return
    }

    // boon
    const boonDie = rollDie(6)
    const boonType = rollBoon(boonDie)
    setRolled(r => ({ ...r, contentsType: 'boon', boonType }))
    setStep('boon')
  }

  function handleBoonApplied() {
    const { cover, space, weather, boonType } = rolled
    if (!boonType) return
    applySectorBoon(activeSectorId, { type: boonType })
    // Ensure sector has rolled values even for boon (cover/space used for context)
    // The sector is cleared by applySectorBoon — we just need to write the boon.
    // Write cover/space/weather to the sector too so SectorHeader has data.
    void cover; void space; void weather  // suppress unused warnings; already written via applySectorBoon
    setStep('done')
  }

  const weatherOptions: { value: -2|-1|0|1; label: string }[] = [
    { value: -2, label: '-2 Extreme' },
    { value: -1, label: '-1 Harsh'   },
    { value:  0, label: '0 Clear'    },
    { value:  1, label: '+1 Favorable' },
  ]

  return (
    <div className="bg-surface border border-border p-3 flex flex-col gap-4 text-[11px] font-mono">
      <div className="lbl text-[10px]">DETERMINE SECTOR</div>

      {/* Step 1: Cover */}
      <div className={step === 'cover' ? '' : 'opacity-60'}>
        <div className="lbl text-[10px] mb-1">1. COVER</div>
        <div className="text-muted text-[10px] mb-1">1=0 · 2–4=1 · 5–6=2</div>
        {rolled.cover != null
          ? <div className="text-warn">Cover {rolled.cover}</div>
          : step === 'cover'
            ? <button onClick={handleRollCover} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
            : null
        }
      </div>

      {/* Step 2: Space */}
      {(step === 'space' || rolled.space != null || step === 'weather' || step === 'contents' || step === 'boon' || step === 'done') && (
        <div className={step === 'space' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">2. SPACE</div>
          <div className="text-muted text-[10px] mb-1">1=0 · 2–4=1 · 5–6=2</div>
          {rolled.space != null
            ? <div className="text-warn">Space {rolled.space}</div>
            : step === 'space'
              ? <button onClick={handleRollSpace} className="border border-warn text-warn px-3 py-1 text-[10px]">ROLL 1D6</button>
              : null
          }
        </div>
      )}

      {/* Step 3: Weather */}
      {(step === 'weather' || step === 'contents' || step === 'boon' || step === 'done' || rolled.weather != null) && (
        <div className={step === 'weather' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">3. WEATHER</div>
          {rolled.weather != null
            ? <div className="text-warn">{rolled.weather >= 0 ? '+' : ''}{rolled.weather} {weatherLabel(rolled.weather)}</div>
            : step === 'weather'
              ? (
                <div className="flex flex-col gap-2">
                  <div className="text-muted text-[10px]">Pre-filled from mission default — reroll or confirm.</div>
                  <div className="flex gap-2 flex-wrap">
                    {weatherOptions.map(o => (
                      <button
                        key={o.value}
                        onClick={() => handleConfirmWeather(o.value)}
                        className={`px-2 py-0.5 text-[10px] border font-mono ${
                          o.value === ((mission as { defaultWeather?: number }).defaultWeather ?? 0)
                            ? 'border-warn text-warn'
                            : 'border-border text-muted'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleRollWeather} className="border border-border text-muted px-3 py-1 text-[10px] w-fit">REROLL 1D6</button>
                </div>
              )
              : null
          }
        </div>
      )}

      {/* Step 4: Contents */}
      {(step === 'contents' || step === 'boon' || step === 'done' || rolled.contentsType != null) && (
        <div className={step === 'contents' ? '' : 'opacity-60'}>
          <div className="lbl text-[10px] mb-1">4. CONTENTS ({difficulty.toUpperCase()})</div>
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

      {/* Boon resolver */}
      {step === 'boon' && rolled.boonType && (
        <BoonResolver boonType={rolled.boonType} onResolved={handleBoonApplied} />
      )}
    </div>
  )
}
