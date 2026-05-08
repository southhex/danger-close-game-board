import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { newId } from '../../utils/id'
import { rollDie } from '../../utils/dice'
import { useToast } from '../../components/Toast'
import type {
  Airspace,
  Mission,
  MissionDifficulty,
  MissionInsertion,
  MissionObjectiveCategory,
  MissionObjectiveSubtype,
  MissionSector,
  SectorContentsState,
  InsertionType,
} from '../../types'
import SectorBlueprintCard from './SectorBlueprintCard'
import DeployConfirmModal from '../MissionBoard/DeployConfirmModal'

const DIFFICULTY_OPTIONS: { value: MissionDifficulty; label: string }[] = [
  { value: 'routine',   label: 'Routine'   },
  { value: 'hazardous', label: 'Hazardous' },
  { value: 'desperate', label: 'Desperate' },
]

const AIRSPACE_OPTIONS: { value: Airspace; label: string }[] = [
  { value: 'friendly',  label: 'Friendly'  },
  { value: 'contested', label: 'Contested' },
  { value: 'denied',    label: 'Denied'    },
]

const WEATHER_OPTIONS: { value: -2 | -1 | 0 | 1; label: string }[] = [
  { value: -2, label: '-2 Extreme'   },
  { value: -1, label: '-1 Harsh'     },
  { value:  0, label: '0 Clear'      },
  { value:  1, label: '+1 Favorable' },
]

const OBJECTIVE_CATEGORIES: { value: MissionObjectiveCategory; label: string }[] = [
  { value: 'seize_secure', label: 'Seize & Secure' },
  { value: 'hit_run',      label: 'Hit & Run'      },
  { value: 'defensive',    label: 'Defensive'      },
]

const OBJECTIVE_SUBTYPES: Record<MissionObjectiveCategory, { value: MissionObjectiveSubtype; label: string }[]> = {
  seize_secure: [
    { value: 'assault',         label: 'Assault'         },
    { value: 'search_destroy',  label: 'Search & Destroy'},
    { value: 'breach',          label: 'Breach'          },
  ],
  hit_run: [
    { value: 'raid',       label: 'Raid'       },
    { value: 'recon',      label: 'Recon'      },
    { value: 'extraction', label: 'Extraction' },
    { value: 'recovery',   label: 'Recovery'   },
    { value: 'sabotage',   label: 'Sabotage'   },
  ],
  defensive: [
    { value: 'siege',      label: 'Siege'      },
    { value: 'evacuation', label: 'Evacuation' },
    { value: 'last_stand', label: 'Last Stand' },
  ],
}

// Hit & Run subtypes require an EZ.
const HIT_RUN_REQUIRES_EZ: MissionObjectiveSubtype[] = ['raid', 'recon', 'extraction', 'recovery', 'sabotage']

interface FormState {
  name: string
  description: string
  difficulty: MissionDifficulty
  airspace: Airspace
  defaultWeather: -2 | -1 | 0 | 1
  objectiveCategory: MissionObjectiveCategory
  objectiveSubtype: MissionObjectiveSubtype
  insertion: MissionInsertion
  stealthStart: boolean
  sectors: MissionSector[]
}

function emptySector(weather: -2 | -1 | 0 | 1, role: MissionSector['role'] = 'standard'): MissionSector {
  return {
    id: newId(),
    name: '',
    description: '',
    role,
    contentsState: 'predetermined',
    contentsType: 'engagement',
    cover: 1,
    space: 1,
    tl: 2,
    weather,
    status: 'pending',
  }
}

function rollDifficulty(): MissionDifficulty {
  const d = rollDie(6)
  if (d <= 3) return 'routine'
  if (d <= 5) return 'hazardous'
  return 'desperate'
}

function defaultsFromCampaign(airspace: Airspace | undefined): FormState {
  const weather = 0 as const
  return {
    name: '',
    description: '',
    difficulty: 'routine',
    airspace: airspace ?? 'contested',
    defaultWeather: weather,
    objectiveCategory: 'seize_secure',
    objectiveSubtype: 'assault',
    insertion: { lz: 'air', ez: null },
    stealthStart: false,
    sectors: [
      { ...emptySector(weather, 'lz'),        name: 'Landing Zone' },
      { ...emptySector(weather, 'objective'), name: 'Objective'    },
    ],
  }
}

function fromMission(m: Mission, fallbackAirspace: Airspace | undefined): FormState {
  const weather = m.defaultWeather ?? 0
  return {
    name: m.name,
    description: m.description ?? '',
    difficulty: m.difficulty ?? 'routine',
    airspace: m.airspace ?? fallbackAirspace ?? 'contested',
    defaultWeather: weather,
    objectiveCategory: m.objectiveCategory ?? 'seize_secure',
    objectiveSubtype: m.objectiveSubtype ?? OBJECTIVE_SUBTYPES[m.objectiveCategory ?? 'seize_secure'][0].value,
    insertion: m.insertion ?? { lz: 'air', ez: null },
    stealthStart: m.stealthStart ?? false,
    sectors: m.sectors && m.sectors.length > 0
      ? m.sectors.map(s => {
          const rollAll = s.contentsState === 'undetermined'
          return {
            ...s,
            rollCover:    rollAll || false,
            rollSpace:    rollAll || false,
            rollContents: rollAll || false,
            rollTL:       rollAll || false,
            contentsType: s.contentsType ?? 'engagement',
          }
        })
      : defaultsFromCampaign(fallbackAirspace).sectors,
  }
}

function deriveContentsState(s: MissionSector): SectorContentsState {
  const needsRoll = !!(s.rollCover || s.rollSpace || s.rollContents ||
    (s.rollTL && !s.rollContents && s.contentsType === 'engagement'))
  return needsRoll ? 'undetermined' : 'predetermined'
}

interface ValidationState {
  errors: string[]
  ok: boolean
}

function validate(form: FormState): ValidationState {
  const errors: string[] = []
  if (!form.name.trim()) errors.push('Mission name required.')
  const lzCount = form.sectors.filter(s => s.role === 'lz').length
  if (lzCount !== 1) errors.push('Exactly one LZ sector required.')
  const objCount = form.sectors.filter(s => s.role === 'objective').length
  if (objCount < 1) errors.push('At least one Objective sector required.')
  const ezCount = form.sectors.filter(s => s.role === 'ez').length
  if (form.insertion.ez !== null && ezCount !== 1) errors.push('Exactly one EZ sector required when EZ insertion is set.')
  if (form.insertion.ez === null && HIT_RUN_REQUIRES_EZ.includes(form.objectiveSubtype)) {
    errors.push('Hit & Run subtypes require an EZ insertion.')
  }
  return { errors, ok: errors.length === 0 }
}

export default function MissionBuilder() {
  const builderMissionId = useStore(s => s.builderMissionId)
  const missions         = useStore(s => s.missions)
  const campaigns        = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const createMission    = useStore(s => s.createMission)
  const updateBlueprint  = useStore(s => s.updateMissionBlueprint)
  const setView          = useStore(s => s.setView)
  const { showToast }    = useToast()

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null
  const editing  = builderMissionId !== null
  const editingMission = editing ? missions.find(m => m.id === builderMissionId) ?? null : null
  const isLocked = editingMission !== null && editingMission.status !== 'blueprint'

  const [form, setForm] = useState<FormState>(() =>
    editingMission ? fromMission(editingMission, campaign?.defaultAirspace) : defaultsFromCampaign(campaign?.defaultAirspace),
  )
  const [saving, setSaving] = useState(false)
  const [deployModalOpen, setDeployModalOpen] = useState(false)

  // Re-init when builder target changes
  useEffect(() => {
    setForm(editingMission ? fromMission(editingMission, campaign?.defaultAirspace) : defaultsFromCampaign(campaign?.defaultAirspace))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderMissionId])

  const validation = useMemo(() => validate(form), [form])

  function patch(p: Partial<FormState>) {
    setForm(f => ({ ...f, ...p }))
  }

  function setObjectiveCategory(cat: MissionObjectiveCategory) {
    const firstSubtype = OBJECTIVE_SUBTYPES[cat][0].value
    patch({ objectiveCategory: cat, objectiveSubtype: firstSubtype })
  }

  function setEzInsertion(value: 'none' | InsertionType) {
    patch({ insertion: { ...form.insertion, ez: value === 'none' ? null : value } })
  }

  function updateSectorAt(idx: number, sectorPatch: Partial<MissionSector>) {
    setForm(f => ({
      ...f,
      sectors: f.sectors.map((s, i) => i === idx ? { ...s, ...sectorPatch } : s),
    }))
  }

  function addSector() {
    setForm(f => ({ ...f, sectors: [...f.sectors, emptySector(f.defaultWeather)] }))
  }

  function deleteSector(idx: number) {
    setForm(f => ({ ...f, sectors: f.sectors.filter((_, i) => i !== idx) }))
  }

  function moveSector(idx: number, delta: -1 | 1) {
    setForm(f => {
      const target = idx + delta
      if (target < 0 || target >= f.sectors.length) return f
      const next = [...f.sectors]
      const [m] = next.splice(idx, 1)
      next.splice(target, 0, m)
      return { ...f, sectors: next }
    })
  }

  async function handleSave() {
    if (!validation.ok || saving) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        difficulty: form.difficulty,
        airspace: form.airspace,
        defaultWeather: form.defaultWeather,
        objectiveCategory: form.objectiveCategory,
        objectiveSubtype: form.objectiveSubtype,
        insertion: form.insertion,
        stealthStart: form.stealthStart,
        sectors: form.sectors.map(s => ({ ...s, contentsState: deriveContentsState(s) })),
        squadId: null,
      }
      if (editing && editingMission) {
        await updateBlueprint({ ...editingMission, ...payload })
        showToast('Blueprint saved')
      } else {
        await createMission(payload)
        showToast('Blueprint created')
      }
      setView('hq')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {editing ? 'Edit Blueprint' : 'New Blueprint'}
          </div>
          <h2 className="text-[15px] font-bold text-ink">{form.name || 'Untitled Mission'}</h2>
          {isLocked && (
            <div className="text-[11px] text-warn mt-1">
              Mission is {editingMission?.status}; blueprint editing locked.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('hq')}
            className="px-3 py-1.5 text-xs border border-border text-muted font-mono"
          >CANCEL</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.ok || saving || isLocked}
            className="px-3 py-1.5 text-xs border border-warn text-warn font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          >{editing ? 'SAVE BLUEPRINT' : 'CREATE BLUEPRINT'}</button>
          <button
            type="button"
            onClick={() => setDeployModalOpen(true)}
            disabled={!editing || !editingMission || !validation.ok}
            className="px-3 py-1.5 text-xs border border-warn text-warn font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          >DEPLOY NOW</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: meta */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col gap-4">
          <div>
            <div className="lbl text-[10px] mb-1">NAME</div>
            <input
              type="text"
              value={form.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder="Mission name"
              className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
            />
          </div>

          <div>
            <div className="lbl text-[10px] mb-1 flex items-center gap-2">
              <span>DIFFICULTY</span>
              <button
                type="button"
                onClick={() => patch({ difficulty: rollDifficulty() })}
                className="text-[10px] text-muted hover:text-warn font-mono"
                aria-label="Roll difficulty"
              >⬡</button>
            </div>
            <div className="flex gap-1">
              {DIFFICULTY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => patch({ difficulty: o.value })}
                  className={`px-2 py-0.5 text-[10px] border font-mono flex-1 ${form.difficulty === o.value ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >{o.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="lbl text-[10px] mb-1">AIRSPACE</div>
            <div className="flex gap-1">
              {AIRSPACE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => patch({ airspace: o.value })}
                  className={`px-2 py-0.5 text-[10px] border font-mono flex-1 ${form.airspace === o.value ? 'border-warn text-warn' : 'border-border text-muted'}`}
                >{o.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="lbl text-[10px] mb-1">DEFAULT WEATHER</div>
            <select
              value={form.defaultWeather}
              onChange={e => patch({ defaultWeather: Number(e.target.value) as -2 | -1 | 0 | 1 })}
              className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
            >
              {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <div className="lbl text-[10px] mb-1">OBJECTIVE</div>
            <div className="flex gap-2">
              <select
                value={form.objectiveCategory}
                onChange={e => setObjectiveCategory(e.target.value as MissionObjectiveCategory)}
                className="flex-1 bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
              >
                {OBJECTIVE_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={form.objectiveSubtype}
                onChange={e => patch({ objectiveSubtype: e.target.value as MissionObjectiveSubtype })}
                className="flex-1 bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
              >
                {OBJECTIVE_SUBTYPES[form.objectiveCategory].map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="lbl text-[10px] mb-1">DESCRIPTION</div>
            <textarea
              value={form.description}
              onChange={e => patch({ description: e.target.value })}
              rows={3}
              placeholder="Briefing, narrative hook, GM notes…"
              className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn resize-none"
            />
          </div>

          <div>
            <div className="lbl text-[10px] mb-1">INSERTION</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-6 font-mono">LZ</span>
                {(['air', 'ground'] as InsertionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ insertion: { ...form.insertion, lz: t } })}
                    className={`px-2 py-0.5 text-[10px] border font-mono flex-1 ${form.insertion.lz === t ? 'border-warn text-warn' : 'border-border text-muted'}`}
                  >{t.toUpperCase()}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-6 font-mono">EZ</span>
                {(['none', 'air', 'ground'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEzInsertion(t)}
                    className={`px-2 py-0.5 text-[10px] border font-mono flex-1 ${(t === 'none' ? form.insertion.ez === null : form.insertion.ez === t) ? 'border-warn text-warn' : 'border-border text-muted'}`}
                  >{t.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-ink font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.stealthStart}
              onChange={e => patch({ stealthStart: e.target.checked })}
              className="accent-warn"
            />
            <span>STEALTH START</span>
          </label>
        </section>

        {/* Right: sector chain */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-muted">Sector Chain</div>
            <button
              type="button"
              onClick={addSector}
              className="px-2 py-1 text-[11px] border border-border text-muted hover:text-ink font-mono"
            >+ ADD SECTOR</button>
          </div>
          <div className="flex flex-col gap-3">
            {form.sectors.map((s, i) => (
              <SectorBlueprintCard
                key={s.id}
                sector={s}
                index={i}
                total={form.sectors.length}
                onChange={p => updateSectorAt(i, p)}
                onMove={d => moveSector(i, d)}
                onDelete={() => deleteSector(i)}
              />
            ))}
            {form.sectors.length === 0 && (
              <div className="text-[11px] text-muted font-mono py-3 text-center">
                No sectors yet. Add at least one LZ and one Objective.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Validation summary */}
      {!validation.ok && (
        <div className="bg-surface border border-bad rounded-md p-3 flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-widest text-bad">Validation</div>
          {validation.errors.map(err => (
            <div key={err} className="text-[11px] text-bad font-mono">• {err}</div>
          ))}
        </div>
      )}

      {deployModalOpen && editingMission && (
        <DeployConfirmModal
          mission={editingMission}
          onClose={() => setDeployModalOpen(false)}
        />
      )}
    </div>
  )
}
