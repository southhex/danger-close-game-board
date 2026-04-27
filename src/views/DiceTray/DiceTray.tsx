import { useStore } from '../../store'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import DiceControls from './DiceControls'
import MobilityCheckRoll from './MobilityCheckRoll'
import RollHistory from './RollHistory'

export default function DiceTray() {
  const setDiceTrayOpen = useStore(s => s.setDiceTrayOpen)
  const close = () => setDiceTrayOpen(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const panel = isDesktop
    ? 'w-80 flex-shrink-0 h-full bg-surface border-l border-border flex flex-col overflow-hidden'
    : 'fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border rounded-t-xl flex flex-col shadow-2xl'

  return (
    <>
      {!isDesktop && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={close} />
      )}
      <div className={panel} style={isDesktop ? undefined : { maxHeight: '65vh' }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border flex-shrink-0">
          <div className="lbl">Dice Tray</div>
          <button onClick={close}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-surface2 border border-border text-muted text-sm">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-5">
          <DiceControls />
          <div className="border-t border-border pt-4">
            <div className="lbl mb-3">Mobility Checks</div>
            <MobilityCheckRoll />
          </div>
          <div className="border-t border-border pt-4">
            <RollHistory />
          </div>
        </div>
      </div>
    </>
  )
}
