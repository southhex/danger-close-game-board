import { useState, useEffect } from 'react'
import { Modal, ConfirmDialog } from '../../components'
import { useStore } from '../../store'
import type { MissionSector } from '../../types'

interface Props {
  sector?: MissionSector
  open: boolean
  onClose: () => void
}

type WeatherValue = -2 | -1 | 0 | 1

interface FormState {
  name: string
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: WeatherValue
}

const WEATHER_OPTIONS: { value: WeatherValue; label: string }[] = [
  { value: -2, label: '-2 Extreme' },
  { value: -1, label: '-1 Harsh' },
  { value: 0,  label: '0 Clear' },
  { value: 1,  label: '+1 Favorable' },
]

const DEFAULTS: FormState = {
  name: '',
  cover: 1,
  space: 1,
  tl: 2,
  weather: 0,
}

export default function SectorEditorModal({ sector, open, onClose }: Props) {
  const addSector = useStore(s => s.addSector)
  const updateSector = useStore(s => s.updateSector)
  const deleteSector = useStore(s => s.deleteSector)

  const isEdit = sector !== undefined

  const [form, setForm] = useState<FormState>(() =>
    isEdit
      ? { name: sector.name, cover: sector.cover, space: sector.space, tl: sector.tl, weather: sector.weather }
      : { ...DEFAULTS }
  )

  useEffect(() => {
    if (open) {
      setForm(sector
        ? { name: sector.name, cover: sector.cover, space: sector.space, tl: sector.tl, weather: sector.weather }
        : { name: '', cover: 1 as const, space: 1 as const, tl: 2 as const, weather: 0 as const }
      )
    }
  }, [open, sector])

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  function handleSave() {
    if (isEdit && sector) {
      updateSector(sector.id, form)
    } else {
      addSector(form)
    }
    onClose()
  }

  function handleDelete() {
    if (sector) {
      deleteSector(sector.id)
      setConfirmDeleteOpen(false)
      onClose()
    }
  }

  const canDelete = isEdit && sector && sector.status !== 'active'

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEdit ? 'EDIT SECTOR' : 'ADD SECTOR'} width="min(90vw, 400px)">
        <div className="flex flex-col gap-4">

          {/* Name */}
          <div>
            <div className="lbl text-[10px] mb-1">NAME</div>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
              placeholder="Sector name"
            />
          </div>

          {/* Cover */}
          <div>
            <div className="lbl text-[10px] mb-1">COVER</div>
            <div className="flex gap-1">
              {([0, 1, 2] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, cover: v }))}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${form.cover === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Space */}
          <div>
            <div className="lbl text-[10px] mb-1">SPACE</div>
            <div className="flex gap-1">
              {([0, 1, 2] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, space: v }))}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${form.space === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* TL */}
          <div>
            <div className="lbl text-[10px] mb-1">TL</div>
            <div className="flex gap-1">
              {([1, 2, 3, 4] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, tl: v }))}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${form.tl === v ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div>
            <div className="lbl text-[10px] mb-1">WEATHER</div>
            <select
              value={form.weather}
              onChange={e => setForm(f => ({ ...f, weather: Number(e.target.value) as WeatherValue }))}
              className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
            >
              {WEATHER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {canDelete && (
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="px-3 py-1 text-xs border border-bad text-bad font-mono"
                >
                  DELETE
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 text-xs border border-border text-muted font-mono"
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs border border-warn text-warn font-mono"
              >
                SAVE
              </button>
            </div>
          </div>

        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="DELETE SECTOR"
        message={`Delete "${form.name}"? This cannot be undone.`}
        confirmLabel="DELETE"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        tone="danger"
      />
    </>
  )
}
