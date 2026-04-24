import { useState } from 'react'
import { useStore } from '../../store'
import type { MissionSector } from '../../types'
import SectorEditorModal from './SectorEditorModal'

function statusDotColor(status: MissionSector['status']): string {
  if (status === 'active') return 'text-ok'
  if (status === 'cleared') return 'text-muted opacity-60'
  return 'text-muted'
}

export default function SectorChainStrip() {
  const sectors = useStore(s => s.mission?.sectors)
  const activeSectorId = useStore(s => s.mission?.activeSectorId)

  const [editSector, setEditSector] = useState<MissionSector | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

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
            <button
              key={s.id}
              onClick={() => openEdit(s)}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 border ${chipBorder} ${chipText} ${chipOpacity} text-[10px] font-mono whitespace-nowrap`}
            >
              <span className={`text-[9px] ${statusDotColor(s.status)}`}>●</span>
              <span className={isCleared ? 'line-through' : ''}>{s.name}</span>
              <span className="text-muted text-[9px]">{notation}</span>
            </button>
          )
        })}

        <button
          onClick={openAdd}
          className="flex-shrink-0 px-2 py-1 text-[10px] border border-border text-muted font-mono whitespace-nowrap"
        >
          +
        </button>
      </div>

      <SectorEditorModal
        sector={editSector}
        open={modalOpen}
        onClose={closeModal}
      />
    </>
  )
}
