import { useState } from 'react'
import { Modal } from '../../components'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import type { SectorRole, SectorContentsState } from '../../types'

const ROLE_OPTIONS: { value: SectorRole; label: string }[] = [
  { value: 'standard',  label: 'Standard'  },
  { value: 'lz',        label: 'LZ'        },
  { value: 'ez',        label: 'EZ'        },
  { value: 'objective', label: 'Objective' },
]

const WEATHER_OPTIONS: { value: -2|-1|0|1; label: string }[] = [
  { value: -2, label: '-2 Extreme'   },
  { value: -1, label: '-1 Harsh'     },
  { value:  0, label: '0 Clear'      },
  { value:  1, label: '+1 Favorable' },
]

// SRD roll helpers (inline — same tables as SectorBlueprintCard)
function rollCoverLocal(): 0 | 1 | 2 {
  const d = rollDie(6); return d === 1 ? 0 : d <= 4 ? 1 : 2
}
function rollTLLocal(): 1 | 2 | 3 | 4 {
  const d = rollDie(6)
  return d <= 2 ? 1 : d <= 4 ? 2 : d === 5 ? 3 : 4
}
function rollWeatherLocal(): -2 | -1 | 0 | 1 {
  const d = rollDie(6)
  return d === 1 ? -2 : d === 2 ? -1 : d <= 5 ? 0 : 1
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddSectorModal({ open, onClose }: Props) {
  const addSector = useStore(s => s.addSector)

  const [name, setName] = useState('')
  const [role, setRole] = useState<SectorRole>('standard')
  const [description, setDescription] = useState('')
  const [prefill, setPrefill] = useState(false)
  const [cover, setCover] = useState<0|1|2>(1)
  const [space, setSpace] = useState<0|1|2>(1)
  const [tl, setTl] = useState<1|2|3|4>(2)
  const [weather, setWeather] = useState<-2|-1|0|1>(0)

  function reset() {
    setName('')
    setRole('standard')
    setDescription('')
    setPrefill(false)
    setCover(1); setSpace(1); setTl(2); setWeather(0)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleAdd() {
    const contentsState: SectorContentsState = prefill ? 'predetermined' : 'undetermined'
    addSector({
      name: name.trim() || 'New Sector',
      cover,
      space,
      tl,
      weather,
      description,
      role,
      contentsState,
    })
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="ADD NEXT SECTOR" width="min(90vw, 420px)">
      <div className="flex flex-col gap-4">

        {/* Name */}
        <div>
          <div className="lbl text-[10px] mb-1">NAME</div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sector name"
            className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
          />
        </div>

        {/* Role */}
        <div>
          <div className="lbl text-[10px] mb-1">ROLE</div>
          <div className="flex gap-1 flex-wrap">
            {ROLE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setRole(o.value)}
                className={`px-2 py-0.5 text-[10px] border font-mono ${role === o.value ? 'border-warn text-warn' : 'border-border text-muted'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="lbl text-[10px] mb-1">DESCRIPTION</div>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
          />
        </div>

        {/* Pre-fill toggle */}
        <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={prefill}
            onChange={e => setPrefill(e.target.checked)}
          />
          PRE-FILL CONTENTS (determine now instead of on entry)
        </label>

        {prefill && (
          <>
            {/* Cover */}
            <div>
              <div className="lbl text-[10px] mb-1">COVER</div>
              <div className="flex gap-1 items-center">
                {([0, 1, 2] as const).map(v => (
                  <button key={v} onClick={() => setCover(v)}
                    className={`px-2 py-0.5 text-[10px] border font-mono ${cover === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                  >{v}</button>
                ))}
                <button onClick={() => setCover(rollCoverLocal())} className="ml-2 text-[10px] border border-border text-muted px-2 py-0.5">⬡</button>
              </div>
            </div>

            {/* Space */}
            <div>
              <div className="lbl text-[10px] mb-1">SPACE</div>
              <div className="flex gap-1 items-center">
                {([0, 1, 2] as const).map(v => (
                  <button key={v} onClick={() => setSpace(v)}
                    className={`px-2 py-0.5 text-[10px] border font-mono ${space === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                  >{v}</button>
                ))}
                <button onClick={() => setSpace(rollCoverLocal())} className="ml-2 text-[10px] border border-border text-muted px-2 py-0.5">⬡</button>
              </div>
            </div>

            {/* TL */}
            <div>
              <div className="lbl text-[10px] mb-1">TL</div>
              <div className="flex gap-1 items-center">
                {([1, 2, 3, 4] as const).map(v => (
                  <button key={v} onClick={() => setTl(v)}
                    className={`px-2 py-0.5 text-[10px] border font-mono ${tl === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                  >{v}</button>
                ))}
                <button onClick={() => setTl(rollTLLocal())} className="ml-2 text-[10px] border border-border text-muted px-2 py-0.5">⬡</button>
              </div>
            </div>

            {/* Weather */}
            <div>
              <div className="lbl text-[10px] mb-1">WEATHER</div>
              <div className="flex gap-1 items-center flex-wrap">
                <select
                  value={weather}
                  onChange={e => setWeather(Number(e.target.value) as -2|-1|0|1)}
                  className="bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
                >
                  {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => setWeather(rollWeatherLocal())} className="text-[10px] border border-border text-muted px-2 py-0.5">⬡</button>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={handleClose} className="px-3 py-1 text-xs border border-border text-muted font-mono">CANCEL</button>
          <button onClick={handleAdd} className="px-3 py-1 text-xs border border-warn text-warn font-mono">ADD SECTOR</button>
        </div>
      </div>
    </Modal>
  )
}
