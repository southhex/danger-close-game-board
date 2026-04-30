import { useState } from 'react'
import { useStore } from '../../store'
import type { MissionSector } from '../../types'
import SectorEditorModal from './SectorEditorModal'
import { ConfirmDialog } from '../../components'

function statusDotColor(status: MissionSector['status']): string {
  if (status === 'active') return 'text-ok'
  if (status === 'cleared') return 'text-muted opacity-60'
  return 'text-muted'
}

export default function SectorChainStrip() {
  const mission = useStore(s => s.mission)
  const setActiveSector = useStore(s => s.setActiveSector)
  const sectors = mission?.sectors
  const activeSectorId = mission?.activeSectorId

  const [editSector, setEditSector] = useState<MissionSector | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null)

  if (!sectors) return null

  function openEdit(sector: MissionSector) {
    setEditSector(sector)
    setModalOpen(true)
  }

  function openAdd() {
    setEditSector(undefined)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditSector(undefined)
  }

  function handleActivate(id: string) {
    if (id === activeSectorId) return
    // Confirm only if there's in-progress engagement state to discard
    const inProgress = !!mission && (mission.phase !== 'advance' || !!mission.engagement || mission.advance_rolls > 0)
    if (inProgress) {
      setPendingSwitchId(id)
    } else {
      setActiveSector(id)
    }
  }

  function confirmSwitch() {
    if (pendingSwitchId) setActiveSector(pendingSwitchId)
    setPendingSwitchId(null)
  }

  const pendingSwitchSector = pendingSwitchId
    ? sectors.find(s => s.id === pendingSwitchId)
    : undefined

  return (
    <>
      <div className="flex overflow-x-auto gap-2 py-2 px-1 scrollbar-none">
        {sectors.map(s => {
          const isActive = s.id === activeSectorId
          const isCleared = s.status === 'cleared'
          const notation = `C${s.cover}/S${s.space}/TL${s.tl}`

          const chipBorder = isActive ? 'border-ok' : 'border-border'
          const chipText = isActive ? 'text-ok' : 'text-muted'
          const chipOpacity = isCleared ? 'opacity-60' : ''

          return (
            <div
              key={s.id}
              className={`flex-shrink-0 flex items-center gap-1.5 pl-3 pr-1.5 py-1 border rounded-pill ${chipBorder} ${chipText} ${chipOpacity} text-[11px] font-mono whitespace-nowrap`}
            >
              <button
                onClick={() => handleActivate(s.id)}
                className="flex items-center gap-1.5"
                aria-label={`Activate sector ${s.name}`}
              >
                <span className={`text-[9px] ${statusDotColor(s.status)}`}>●</span>
                <span className={isCleared ? 'line-through' : ''}>{s.name}</span>
                <span className="text-muted text-[9px]">{notation}</span>
              </button>
              <button
                onClick={() => openEdit(s)}
                className="flex items-center justify-center w-5 h-5 rounded-pill text-muted hover:text-warn hover:border-warn border border-transparent text-[10px]"
                aria-label={`Edit sector ${s.name}`}
                title="Edit sector"
              >
                ✎
              </button>
            </div>
          )
        })}

        <button
          onClick={openAdd}
          className="flex-shrink-0 px-3 py-1 text-[11px] border border-border text-muted font-mono whitespace-nowrap rounded-pill"
        >
          +
        </button>
      </div>

      <SectorEditorModal
        sector={editSector}
        open={modalOpen}
        onClose={closeModal}
      />

      <ConfirmDialog
        open={pendingSwitchId !== null}
        title="SWITCH SECTOR"
        message={`Switch to "${pendingSwitchSector?.name ?? ''}"? Current engagement and advance roll progress will be discarded.`}
        confirmLabel="SWITCH"
        tone="default"
        onConfirm={confirmSwitch}
        onCancel={() => setPendingSwitchId(null)}
      />
    </>
  )
}
