import { useMemo, useState, useEffect } from 'react'
import { Modal, ConfirmDialog, Dropdown } from '../../components'
import { gearByName, gearByType } from '../../data/gear'
import { baseMobilityFromCosts } from '../../utils/gameRules'
import type { Trooper } from '../../types'
import { useStore } from '../../store'

interface Props {
  open: boolean
  trooperId: string | null   // null = create mode
  onClose: () => void
}

const EMPTY: Omit<Trooper, 'id'> = {
  name: '', fullname: '', callsign: '', active: true, perkpoints: 0,
  mobility: 5, armor: 'Medium Armor', weapon: 'Assault Rifle',
  special_weapon: '', special_gear: '', tag: '', perks: [], notes: '',
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
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">CALLSIGN</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.callsign} onChange={e => set('callsign', e.target.value)} />
          </label>
          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">FULL NAME</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.fullname} onChange={e => set('fullname', e.target.value)} />
          </label>

          <label className="col-span-1 flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            <span className="lbl text-[10px]">ACTIVE</span>
          </label>
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">PERK POINTS</div>
            <input type="number" className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.perkpoints} onChange={e => set('perkpoints', Number(e.target.value))} />
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
            <div className="text-ok text-sm">{computedMob}</div>
          </div>

          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">NOTES</div>
            <textarea rows={3} className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.notes} onChange={e => set('notes', e.target.value)} />
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
