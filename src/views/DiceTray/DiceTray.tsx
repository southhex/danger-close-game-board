import { useStore } from '../../store'
import DiceControls from './DiceControls'
import MobilityCheckRoll from './MobilityCheckRoll'
import RollHistory from './RollHistory'

export default function DiceTray() {
  const setDiceTrayOpen = useStore(s => s.setDiceTrayOpen)
  const close = () => setDiceTrayOpen(false)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-0 md:p-4" onClick={close}>
      <div className="bg-surface border border-border w-full h-full md:w-[min(90vw,480px)] md:h-auto md:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <div className="lbl">DICE TRAY</div>
          <button onClick={close} aria-label="Close dice tray" className="text-muted text-sm">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          <DiceControls />
          <div className="border-t border-border pt-3">
            <div className="lbl text-[10px] mb-2">MOBILITY CHECKS</div>
            <MobilityCheckRoll />
          </div>
          <div className="border-t border-border pt-3">
            <RollHistory />
          </div>
        </div>
      </div>
    </div>
  )
}
