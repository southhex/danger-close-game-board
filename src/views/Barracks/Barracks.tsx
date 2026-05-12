import { useState } from 'react'
import { useStore } from '../../store'
import TrooperCard from './TrooperCard'
import TrooperEditor from './TrooperEditor'
import SquadEditor from './SquadEditor'

export default function Barracks() {
  const troopers   = useStore(s => s.troopers)
  const squads     = useStore(s => s.squads)
  const createSquad = useStore(s => s.createSquad)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorId, setEditorId] = useState<string | null>(null)
  const [squadEditorOpen, setSquadEditorOpen] = useState(false)
  const [squadEditorId, setSquadEditorId] = useState<string | null>(null)

  const openNew = () => { setEditorId(null); setEditorOpen(true) }
  const openEdit = (id: string) => { setEditorId(id); setEditorOpen(true) }
  const openSquadEdit = (id: string) => { setSquadEditorId(id); setSquadEditorOpen(true) }
  const handleNewSquad = async () => { await createSquad({ name: `Squad ${squads.length + 1}` }) }

  const unassigned = troopers.filter(t => t.squadId == null)

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={openNew} className="text-[11px] text-ok border border-ok px-3 py-1">+ TROOPER</button>
        <button onClick={handleNewSquad} className="text-[11px] text-accent border border-accent px-3 py-1">+ SQUAD</button>
      </div>

      {/* Squads */}
      {squads.length === 0 && troopers.length === 0 && (
        <div className="text-[11px] text-muted italic">No squads or troopers yet. Add a trooper or create a squad.</div>
      )}

      <div className="flex flex-col gap-4">
        {squads.map(squad => {
          const members = troopers.filter(t => t.squadId === squad.id)
          const sergeant = squad.sergeantId ? troopers.find(t => t.id === squad.sergeantId) ?? null : null
          return (
            <section key={squad.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <div className="text-[13px] font-semibold">{squad.name}</div>
                  <div className="text-[10px] text-muted">
                    {squad.callsign ? `${squad.callsign} · ` : ''}
                    {members.length}/5
                    {sergeant ? ` · SGT ${sergeant.name}` : ' · NO SERGEANT'}
                  </div>
                </div>
                <button
                  onClick={() => openSquadEdit(squad.id)}
                  className="text-[10px] text-muted border border-border px-2 py-0.5 hover:text-accent hover:border-accent"
                >EDIT</button>
              </div>
              {members.length === 0 ? (
                <div className="text-[10px] text-muted italic px-2 py-3">No members assigned.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {members.map(t => <TrooperCard key={t.id} trooper={t} onClick={() => openEdit(t.id)} />)}
                </div>
              )}
            </section>
          )
        })}

        {/* Unassigned pool */}
        {unassigned.length > 0 && (
          <section className="border-t border-border pt-3">
            <div className="lbl text-[10px] mb-2">UNASSIGNED ({unassigned.length})</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unassigned.map(t => <TrooperCard key={t.id} trooper={t} onClick={() => openEdit(t.id)} />)}
            </div>
          </section>
        )}
      </div>

      <TrooperEditor open={editorOpen} trooperId={editorId} onClose={() => setEditorOpen(false)} />
      <SquadEditor open={squadEditorOpen} squadId={squadEditorId} onClose={() => setSquadEditorOpen(false)} />
    </div>
  )
}
