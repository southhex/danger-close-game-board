import { useMemo, useState, useEffect } from 'react'
import { Modal, ConfirmDialog, Dropdown, Stepper } from '../../components'
import { gearByName, gearByType } from '../../data/gear'
import { TAGS } from '../../data/tags'
import { baseMobilityFromCosts } from '../../utils/gameRules'
import type { Trooper } from '../../types'
import { useStore } from '../../store'

const TAG_OPTIONS = [
  { value: '', label: '— No Tag —' },
  ...TAGS.map(t => ({ value: t.name, label: t.name })),
]

interface Props {
  open: boolean
  trooperId: string | null   // null = create mode
  onClose: () => void
}

const EMPTY: Omit<Trooper, 'id'> = {
  name: '', fullname: '', callsign: '', perkpoints: 0,
  mobility: 5, armor: 'Medium Armor', weapon: 'Assault Rifle',
  special_weapon: '', special_gear: '', tag: '', perks: [], notes: '',
  squadId: null, recovering: false,
  grit: 1, grit_max: 1, ammo: 3, ammo_max: 3,
  status: 'ok', offpos: 'engaged', defpos: 'incover',
  suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
}

function optionsFor(type: 'weapon' | 'specialweapon' | 'specialequipment' | 'armor', includeNone = false) {
  const base = includeNone ? [{ value: '', label: '— None —' }] : []
  return base.concat(gearByType(type).map(g => {
    const parts: string[] = [g.name]
    if (g.mobility_cost !== 0) parts.push(`MOB ${g.mobility_cost}`)
    if (g.reqcost !== 0) parts.push(`REQ ${g.reqcost}`)
    if (g.max_uses > 0) parts.push(`USES ${g.max_uses}`)
    return { value: g.name, label: parts.join(' · ') }
  }))
}

export default function TrooperEditor({ open, trooperId, onClose }: Props) {
  const allTroopers = useStore(s => s.troopers)
  const squads = useStore(s => s.squads)
  const existing = trooperId ? allTroopers.find(t => t.id === trooperId) : undefined
  const addTrooper = useStore(s => s.addTrooper)
  const updateTrooper = useStore(s => s.updateTrooper)
  const deleteTrooper = useStore(s => s.deleteTrooper)

  const [form, setForm] = useState<Omit<Trooper, 'id'>>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) setForm(existing ? { ...existing } : EMPTY)
  }, [open, existing])

  const computedMob = useMemo(() => {
    const costs = [
      gearByName(form.armor)?.mobility_cost ?? 0,
      gearByName(form.weapon)?.mobility_cost ?? 0,
      form.special_weapon ? (gearByName(form.special_weapon)?.mobility_cost ?? 0) : 0,
      form.special_gear ? (gearByName(form.special_gear)?.mobility_cost ?? 0) : 0,
    ]
    return Math.max(0, baseMobilityFromCosts(costs))
  }, [form.armor, form.weapon, form.special_weapon, form.special_gear])

  const save = () => {
    const swChanged = form.special_weapon !== existing?.special_weapon
    const sgChanged = form.special_gear !== existing?.special_gear
    const sw = swChanged
      ? (form.special_weapon ? (gearByName(form.special_weapon)?.max_uses ?? -1) : -1)
      : form.special_weapon_uses
    const sg = sgChanged
      ? (form.special_gear ? (gearByName(form.special_gear)?.max_uses ?? -1) : -1)
      : form.special_gear_uses
    const payload = {
      ...form,
      mobility: computedMob,
      special_weapon_uses: sw,
      special_gear_uses: sg,
    }
    if (trooperId) updateTrooper(trooperId, payload)
    else addTrooper(payload)
    onClose()
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const armorGear = gearByName(form.armor)
  const weaponGear = gearByName(form.weapon)
  const swGear = gearByName(form.special_weapon)
  const sgGear = gearByName(form.special_gear)

  return (
    <>
      <Modal open={open} onClose={onClose} title={trooperId ? 'EDIT TROOPER' : 'NEW TROOPER'}>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">NICKNAME</div>
            <input className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent" value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">CALLSIGN</div>
            <input className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent" value={form.callsign} onChange={e => set('callsign', e.target.value)} />
          </label>
          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">FULL NAME</div>
            <input className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent" value={form.fullname} onChange={e => set('fullname', e.target.value)} />
          </label>

          <Dropdown className="col-span-2" label="TAG" value={form.tag}
            options={TAG_OPTIONS} onChange={v => set('tag', v)} />
          {form.tag && (
            <div className="col-span-2 text-[10px] text-muted -mt-1">
              {TAGS.find(t => t.name === form.tag)?.description}
            </div>
          )}

          <Dropdown
            className="col-span-1"
            label="SQUAD"
            value={form.squadId ?? ''}
            options={[
              { value: '', label: '— Unassigned —' },
              ...squads.map(sq => {
                const memberCount = allTroopers.filter(t => t.squadId === sq.id && t.id !== trooperId).length
                const full = memberCount >= 5
                const recovering = form.recovering
                const disabled = (full && form.squadId !== sq.id) || recovering
                const suffix = full ? ' (FULL)' : ''
                return { value: sq.id, label: `${sq.name}${suffix}`, disabled }
              }),
            ]}
            onChange={v => set('squadId', v === '' ? null : v)}
          />
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">PERK POINTS</div>
            <input type="number" className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 font-mono focus:outline-none focus:border-accent" value={form.perkpoints} onChange={e => set('perkpoints', Number(e.target.value))} />
          </label>

          <div className="col-span-2 border-t border-border my-2" />

          <Dropdown className="col-span-2" label="ARMOR" value={form.armor} options={optionsFor('armor')} onChange={v => set('armor', v)} />
          {armorGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{armorGear.properties}</div>}

          <Dropdown className="col-span-2" label="WEAPON" value={form.weapon} options={optionsFor('weapon')} onChange={v => set('weapon', v)} />
          {weaponGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{weaponGear.properties}</div>}

          <Dropdown className="col-span-2" label="SPECIAL WEAPON" value={form.special_weapon} options={optionsFor('specialweapon', true)} onChange={v => set('special_weapon', v)} />
          {swGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{swGear.properties}</div>}

          <Dropdown className="col-span-2" label="SPECIAL GEAR" value={form.special_gear} options={optionsFor('specialequipment', true)} onChange={v => set('special_gear', v)} />
          {sgGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{sgGear.properties}</div>}

          <div className="col-span-2 flex items-center justify-between border-t border-border pt-2 mt-1">
            <div className="lbl text-[10px]">COMPUTED MOBILITY</div>
            <div className="text-ok text-sm font-mono">{computedMob}</div>
          </div>

          <div className="col-span-1">
            <Stepper label="GRIT MAX" value={form.grit_max}
              onChange={v => set('grit_max', v)} min={1} max={4} />
          </div>
          <div className="col-span-1">
            <Stepper label="AMMO MAX" value={form.ammo_max}
              onChange={v => set('ammo_max', v)} min={3} max={4} />
          </div>

          <div className="col-span-2 border-t border-border pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="lbl text-[10px]">PERKS</div>
              <button
                type="button"
                onClick={() => set('perks', [...form.perks, { name: '', description: '' }])}
                className="text-[10px] text-ok border border-ok px-2 py-0.5">+ ADD</button>
            </div>
            {form.perks.length === 0 && (
              <div className="text-[10px] text-muted italic">No perks.</div>
            )}
            {form.perks.map((perk, i) => (
              <div key={i} className="flex flex-col gap-1 mb-2 border border-border rounded-md p-2">
                <div className="flex items-center gap-1">
                  <input
                    placeholder="Perk name"
                    className="flex-1 bg-bg border border-border rounded-md text-ink text-xs px-2 py-0.5 focus:outline-none focus:border-accent"
                    value={perk.name}
                    onChange={e => {
                      const updated = form.perks.map((p, j) => j === i ? { ...p, name: e.target.value } : p)
                      set('perks', updated)
                    }} />
                  <button
                    type="button"
                    onClick={() => set('perks', form.perks.filter((_, j) => j !== i))}
                    className="text-[10px] text-bad border border-bad px-2 py-0.5">×</button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Description"
                  className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent"
                  value={perk.description}
                  onChange={e => {
                    const updated = form.perks.map((p, j) => j === i ? { ...p, description: e.target.value } : p)
                    set('perks', updated)
                  }} />
              </div>
            ))}
          </div>

          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">NOTES</div>
            <textarea rows={3} className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </label>
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t border-border">
          {trooperId ? (
            <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-bad border border-bad px-3 py-1">DELETE</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[11px] text-muted border border-border px-3 py-1">CANCEL</button>
            <button onClick={save} className="text-[11px] text-ok border border-ok px-3 py-1">SAVE</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="DELETE TROOPER"
        message={`Permanently delete ${form.name || 'this trooper'}?`}
        confirmLabel="DELETE"
        tone="danger"
        onConfirm={() => { if (trooperId) deleteTrooper(trooperId); setConfirmDelete(false); onClose() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
