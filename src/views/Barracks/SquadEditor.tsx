import { useEffect, useState } from 'react'
import { Modal, ConfirmDialog, Dropdown } from '../../components'
import { useStore } from '../../store'
import type { Squad, Perk } from '../../types'

interface Props {
  open: boolean
  squadId: string | null
  onClose: () => void
}

export default function SquadEditor({ open, squadId, onClose }: Props) {
  const squads = useStore(s => s.squads)
  const allTroopers = useStore(s => s.troopers)
  const renameSquad = useStore(s => s.renameSquad)
  const setSquadSergeant = useStore(s => s.setSquadSergeant)
  const setSquadPerks = useStore(s => s.setSquadPerks)
  const setSquadNotes = useStore(s => s.setSquadNotes)
  const deleteSquad = useStore(s => s.deleteSquad)

  const squad: Squad | undefined = squadId ? squads.find(s => s.id === squadId) : undefined

  const [name, setName] = useState('')
  const [sergeantId, setSergeantId] = useState<string>('')
  const [perks, setPerks] = useState<Perk[]>([])
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && squad) {
      setName(squad.name)
      setSergeantId(squad.sergeantId ?? '')
      setPerks(squad.perks)
      setNotes(squad.notes)
    }
  }, [open, squad])

  if (!squad) return null

  const members = allTroopers.filter(t => t.squadId === squad.id)
  const sergeantOptions = [
    { value: '', label: '— None —' },
    ...members.map(t => ({ value: t.id, label: t.name })),
  ]

  const save = async () => {
    if (name !== squad.name) await renameSquad(squad.id, name)
    if ((sergeantId || null) !== squad.sergeantId) await setSquadSergeant(squad.id, sergeantId || null)
    if (JSON.stringify(perks) !== JSON.stringify(squad.perks)) await setSquadPerks(squad.id, perks)
    if (notes !== squad.notes) await setSquadNotes(squad.id, notes)
    onClose()
  }

  const handleDelete = async () => {
    await deleteSquad(squad.id)
    setConfirmDelete(false)
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`EDIT SQUAD · ${squad.name}`}>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">NAME</div>
            <input
              className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <Dropdown
            className="col-span-2"
            label="SERGEANT"
            value={sergeantId}
            options={sergeantOptions}
            onChange={v => setSergeantId(v)}
          />

          <div className="col-span-2 border-t border-border pt-2 mt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="lbl text-[10px]">PERKS</div>
              <button
                type="button"
                onClick={() => setPerks([...perks, { name: '', description: '' }])}
                className="text-[10px] text-ok border border-ok px-2 py-0.5"
              >+ ADD</button>
            </div>
            {perks.length === 0 && (
              <div className="text-[10px] text-muted italic">No perks.</div>
            )}
            {perks.map((perk, i) => (
              <div key={i} className="flex flex-col gap-1 mb-2 border border-border rounded-md p-2">
                <div className="flex items-center gap-1">
                  <input
                    placeholder="Perk name"
                    className="flex-1 bg-bg border border-border rounded-md text-ink text-xs px-2 py-0.5 focus:outline-none focus:border-accent"
                    value={perk.name}
                    onChange={e => setPerks(perks.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                  />
                  <button
                    type="button"
                    onClick={() => setPerks(perks.filter((_, j) => j !== i))}
                    className="text-[10px] text-bad border border-bad px-2 py-0.5"
                  >×</button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Description"
                  className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent"
                  value={perk.description}
                  onChange={e => setPerks(perks.map((p, j) => j === i ? { ...p, description: e.target.value } : p))}
                />
              </div>
            ))}
          </div>

          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">NOTES</div>
            <textarea
              rows={3}
              className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t border-border">
          <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-bad border border-bad px-3 py-1">DELETE</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[11px] text-muted border border-border px-3 py-1">CANCEL</button>
            <button onClick={save} className="text-[11px] text-ok border border-ok px-3 py-1">SAVE</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="DELETE SQUAD"
        message={`Permanently delete ${squad.name}? Members will be unassigned.`}
        confirmLabel="DELETE"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
